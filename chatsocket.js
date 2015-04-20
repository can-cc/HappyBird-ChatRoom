/**
 * Created by tyan on 15-2-4.
 */

var app = require('./app');
var cookieParser = require('cookie-parser');
var logger = require('./logger');
var io = require('socket.io')();
var ioredis = require('socket.io-redis');
var redis = require('redis');
var events = require('events');
var setting = require('./setting');
var db = require('./db');
var _ = require('underscore');
var helper = require('./routes/helper');
var signature = require('cookie-signature');

var debug = require('debug')('chatsocket');

io.adapter(ioredis({
    redisPub: db.pub,
    redisSub: db.sub,
    redisClient: db.dbClient
}));


/******************************************************
 * Authorization:
 * @handshakeData{ String: socket-client-request}
 * @callback {function: {error, boolean}  to next "set"}
 * When connect start and invoke
 * get esid from socket-client-request(handshakeData).headers.cookies
 * get session from redis by esid
 * set session to socket.client.request
 ******************************************************/
io.set('authorization', function(handshakeData, callback) {
    logger.emit('logging', 'authorization start');

    if (!handshakeData.headers.cookie)
        return callback('No cookie transmitted.', false);
    var cookies = handshakeData.headers.cookie.split('; ');
    var sessionid;
    for (var i = 0; i < cookies.length; i++) {
        if (cookies[i].indexOf('esid') != -1) {
            sessionid = cookies[i].split('=')[1];
            break;
        }
    }
    var sid = encodeURI(sessionid).slice(6, sessionid.indexOf('.') + 2);
    logger.emit('logging', 'sid=', sid);
    db.sessionStore.get(sid, function(err, session) {
        if (err) callback('Get session error.', false);
        handshakeData.session = session;
      logger.emit('logging', 'user authorization success session=', session);
        return callback(null, true);
    });
});


/*********************************************
 * User connnect start
 * After Authorization
 *********************************************/
io.sockets.on('connection', function(socket) {
    var session = socket.request.session;
  logger.emit('logging', 'session', session);
    var socket_username = session.user.username;
    // Welcome message on connection
    socket.emit('connected', 'Welcome to the chat server');
    logger.emit('logging', 'userConnected', {
        'socket': socket.id,
        'username': socket_username
    });

    // Store user data in db
    db.dbClient.hset(['SocketID:' + socket.id, 'connectionDate', new Date().toString()], redis.print);
    db.dbClient.hset(['SocketID:' + socket.id, 'socketID', socket.id], redis.print);
    db.dbClient.hset(['SocketID:' + socket.id, 'username', socket_username], redis.print);

  /****************************************************
   * Add this socket to dictionary
   ****************************************************/
  io.userSockets = io.userSockets || {};
  io.userSockets[socket.id] = socket;

  db.dbClient.hmset(['UserSocket:' + socket_username, 'socketID', socket.id, 'avatar', session.user.avatar], redis.print);
  var userData = {
    username: session.user.username,
    avatar: session.user.avatar
  };
  db.dbClient.hset('ActiveUser', session.user.username, JSON.stringify(userData), redis.print);
    // Join user to 'MainRoom'

    socket.join(setting.mainroom);

logger.emit('logging', 'userJoinsRoom', {
        'socket': socket.id,
        'room': setting.mainroom
    });

    // Confirm subscription to user
    socket.emit('subscriptionConfirmed', {
        'room': setting.mainroom
    });
    // Notify subscription to all users in room
    var data = {
        'room': setting.mainroom,
        'username': socket_username,
        'msg': '----- Joined the room -----',
        'id': socket.id
    };

    io.sockets.in(setting.mainroom).emit('userJoinsRoom', data);

    // User wants to subscribe to [data.rooms]
    socket.on('subscribe', function(data) {
        // Get user info from db
        db.dbClient.hget(['SocketID:' + socket.id, 'username'], function(err, username) {
            // Subscribe user to chosen rooms
            _.each(data.rooms, function(room) {
                room = room.replace(" ", "");
                socket.join(room);
                logger.emit('logging', 'userJoinsRoom', {
                    'socket': socket.id,
                    'username': username,
                    'room': room
                });

                // Confirm subscription to user
                socket.emit('subscriptionConfirmed', {
                    'room': room
                });

                // Notify subscription to all users in room
                var message = {
                    'room': room,
                    'username': username,
                    'msg': '----- Joined the room -----',
                    'id': socket.id
                };
                io.sockets.in(room).emit('userJoinsRoom', message);
            });
        });
    });

    // User wants to unsubscribe from [data.rooms]
    socket.on('unsubscribe', function(data) {
        // Get user info from db
        db.dbClient.hget(['SocketID:' + socket.id, 'username'], function(err, username) {

            // Unsubscribe user from chosen rooms
            _.each(data.rooms, function(room) {
                if (room != setting.mainroom) {
                    socket.leave(room);
                    logger.emit('logging', 'userLeavesRoom', {
                        'socket': socket.id,
                        'username': username,
                        'room': room
                    });

                    // Confirm unsubscription to user
                    socket.emit('unsubscriptionConfirmed', {
                        'room': room
                    });

                    // Notify unsubscription to all users in room
                    var message = {
                        'room': room,
                        'username': username,
                        'msg': '----- Left the room -----',
                        'id': socket.id
                    };
                    io.sockets.in(room).emit('userLeavesRoom', message);
                }
            });
        });
    });

    // User wants to know what rooms he has joined
    socket.on('getRooms', function(data) {
        socket.emit('roomsReceived', socket.rooms);
        logger.emit('logging', 'userGetsRooms', {
            'socket': socket.id
        });
    });

  /**************************************
   *getActiveUser only return name
   *
   * @options should be null
   ***************************************/
  socket.on('getActiveUserName', function(options){
    db.dbClient.keys('UserSocket:*', function(err,resp){
      if(err){
        return logger.emit('logging', 'error: getActiveUser', err);
      }
      logger.emit('logging', 'active users ', resp);
      var activeUsers = [];
      resp.forEach(function(users){
        activeUsers.push(users.split(':')[1]);
      });
      logger.emit('logging', 'activeUsers ', activeUsers);
      socket.emit('receiveActiveUserName', activeUsers);
    });

  });


  /**************************************
   *getActiveUser
   *
   * return user all
   * @options should be null
   ***************************************/
  socket.on('getActiveUser', function(options){
    db.dbClient.hgetall('ActiveUser', function(err, resp){
      if(err){
        return socket.emit('receiveActiveUser', {error: 'Unknown!'});
      }
      logger.emit('logging', 'All Active User!', resp);
      socket.emit('receiveActiveUser', resp);
    });
    // db.dbClient.hscan('UserSocket','*', function(err,resp){
    //   if(err){
    //     return logger.emit('logging', 'error: getActiveUser', err);
    //   }
    //   logger.emit('logging', 'active users(all) ', resp);
    //   socket.emit('receiveActiveUser', resp);
    // });

  });


    // Get users in given room
    socket.on('getUsersInRoom', function(data) {
      logger.emit('logging', 'getUsersInRoom start', data);

        var usersInRoom = [];
        //socket.join(data.room);
        var socketsInRoom = io.sockets.adapter.rooms[data.room];
        for (var i = 0; i < socketsInRoom.length; i++) {
            db.dbClient.hgetall('SocketID:' + socketsInRoom[i].id, function(err, obj) {
                usersInRoom.push({
                    'room': data.room,
                    'username': obj.username,
                    'id': obj.socketID
                });
                // When we've finished with the last one, notify user
                if (usersInRoom.length === socketsInRoom.length) {
                    socket.emit('usersInRoom', {
                        'users': usersInRoom
                    });
                }
            });
        }
    });

    socket.on('chatPeopleNewMessage', function(data) {
        db.dbClient.hgetall(['UserSocket:' + data.username], function(err, reply) {
            if (reply) {
                var message = {
                    from: socket.socket_username,
                    msg: data.msg,
                    data: new Date()
                };
                io.sockets[reply.socketID].emit('newPeopleMsg', message);
            } else {
                var errormsg = {
                    event: chatPeopleNewMessage,
                    detail: 'unknown'
                };
                socket.emit('peopleMsgError', errormsg);
            }
        });
    });

  /****************************************************
   * Two User Chat Message
   ****************************************************/
  socket.on('UserSendMessage', function(data){
    logger.emit('logging', 'get User send to other mesage',data);
    if(data.target){
      db.dbClient.hgetall('UserSocket:' + data.target, function(err, resp){
        if(err) {
          logger.emit('logging', 'error- get User socket id', 'not found in redis');
          return socket.emit('receiveOtherMessage',{err: 'Not Found Target User Connection(socket)'});
        }
        logger.emit('logging', 'target user socket', resp);
        logger.emit('logging', 'target user socket', typeof(socket.nsp.sockets[0]));

        io.userSockets[resp.socketID].emit('receiveOtherMessage', 'test');
        // socket.nsp.sockets[0].emit('receiveOtherMessage', 'test');
        // socket.nsp.sockets[1].emit('receiveOtherMessage', 'test');
        // socket.nsp.emit('receiveOtherMessage', 'test');
        logger.emit('logging', 'sse');
      });
    } else{
      logger.emit('logging', 'error- get User socket id', 'not found');
      socket.emit('receiveOtherMessage', {err: 'Not Found Target User'});
    }
  });


    // New message sent to group.
    socket.on('chatRoomNewMessage', function(data) {

        db.dbClient.hgetall('UserSocket:' + socket.id, function(err, obj) {
            if (err) return logger.emit('logging', 'error', err);
            var message = {
                'room': data.room,
                'username': obj.username,
                'msg': data.msg,
                'date': new Date()
            };
            io.sockets.in(data.room).emit('newMessage', message);
            logger.emit('logging', 'newMessage', message);
        });
    });


    // Clean up on disconnect
    socket.on('disconnect', function() {

        // Get current rooms of user
        var rooms = _.clone(socket.rooms);

        // Get user info from db
        db.dbClient.hgetall('SocketID:' + socket.id, function(err, obj) {
            if (err) return logger.emit('logging', 'error', err);
            logger.emit('logging', 'userDisconnected', {
                'socket': socket.id,
                'username': obj.username
            });

            // Notify all users who belong to the same rooms that this one
            _.each(_.keys(rooms), function(room) {
                room = room.substr(1); // Forward slash before room name (socket.io)
                if (room) {
                    var message = {
                        'room': room,
                        'username': obj.username,
                        'msg': '----- Left the room -----',
                        'id': obj.socketID
                    };
                    io.sockets.in(room).emit('userLeavesRoom', message);

                  /******
                   * Namespace room remove sockets
                   *******/
                }
            });
        });

        // Delete user from db
        db.dbClient.del('SocketID:' + socket.id, redis.print);
        db.dbClient.del('UserSocket:' + socket_username, redis.print);
      db.dbClient.hdel('ActiveUser', socket_username, redis.print);

    });
});

module.exports = io;



