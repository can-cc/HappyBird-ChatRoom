/**
 * Created by tyan on 15-2-4.
 */

var app = require('./app');
var logger = require('./logger');
var io = require('socket.io')(app);
var events = require('events');
var redis = require('redis');
var setting = require('./setting');
var db = require('./db');
var _ = require('underscore');
var RedisStore = require('socket.io/lib/stores/redis');

io.sockets.on('connection', function(socket) {

    // Welcome message on connection
    socket.emit('connected', 'Welcome to the chat server');
    logger.emit('newEvent', 'userConnected', {'socket':socket.id});

    // Store user data in db
    db.dbClient.hset([socket.id, 'connectionDate', new Date()], redis.print);
    db.dbClient.hset([socket.id, 'socketID', socket.id], redis.print);
    db.dbClient.hset([socket.id, 'username', 'anonymous'], redis.print);

    // Join user to 'MainRoom'
    socket.join(conf.mainroom);
    logger.emit('newEvent', 'userJoinsRoom', {'socket':socket.id, 'room':conf.mainroom});
    // Confirm subscription to user
    socket.emit('subscriptionConfirmed', {'room':conf.mainroom});
    // Notify subscription to all users in room
    var data = {'room':conf.mainroom, 'username':'anonymous', 'msg':'----- Joined the room -----', 'id':socket.id};
    io.sockets.in(conf.mainroom).emit('userJoinsRoom', data);

    // User wants to subscribe to [data.rooms]
    socket.on('subscribe', function(data) {
        // Get user info from db
        db.dbClient.hget([socket.id, 'username'], function(err, username) {

            // Subscribe user to chosen rooms
            _.each(data.rooms, function(room) {
                room = room.replace(" ","");
                socket.join(room);
                logger.emit('newEvent', 'userJoinsRoom', {'socket':socket.id, 'username':username, 'room':room});

                // Confirm subscription to user
                socket.emit('subscriptionConfirmed', {'room': room});

                // Notify subscription to all users in room
                var message = {'room':room, 'username':username, 'msg':'----- Joined the room -----', 'id':socket.id};
                io.sockets.in(room).emit('userJoinsRoom', message);
            });
        });
    });

    // User wants to unsubscribe from [data.rooms]
    socket.on('unsubscribe', function(data) {
        // Get user info from db
        db.dbClient.hget([socket.id, 'username'], function(err, username) {

            // Unsubscribe user from chosen rooms
            _.each(data.rooms, function(room) {
                if (room != conf.mainroom) {
                    socket.leave(room);
                    logger.emit('newEvent', 'userLeavesRoom', {'socket':socket.id, 'username':username, 'room':room});

                    // Confirm unsubscription to user
                    socket.emit('unsubscriptionConfirmed', {'room': room});

                    // Notify unsubscription to all users in room
                    var message = {'room':room, 'username':username, 'msg':'----- Left the room -----', 'id': socket.id};
                    io.sockets.in(room).emit('userLeavesRoom', message);
                }
            });
        });
    });

    // User wants to know what rooms he has joined
    socket.on('getRooms', function(data) {
        socket.emit('roomsReceived', io.sockets.manager.roomClients[socket.id]);
        logger.emit('newEvent', 'userGetsRooms', {'socket':socket.id});
    });

    // Get users in given room
    socket.on('getUsersInRoom', function(data) {
        var usersInRoom = [];
        var socketsInRoom = io.sockets.clients(data.room);
        for (var i=0; i<socketsInRoom.length; i++) {
            db.dbClient.hgetall(socketsInRoom[i].id, function(err, obj) {
                usersInRoom.push({'room':data.room, 'username':obj.username, 'id':obj.socketID});
                // When we've finished with the last one, notify user
                if (usersInRoom.length == socketsInRoom.length) {
                    socket.emit('usersInRoom', {'users':usersInRoom});
                }
            });
        }
    });

    // User wants to change his nickname
    socket.on('setNickname', function(data) {
        // Get user info from db
        db.dbClient.hget([socket.id, 'username'], function(err, username) {

            // Store user data in db
            db.dbClient.hset([socket.id, 'username', data.username], redis.print);
            logger.emit('newEvent', 'userSetsNickname', {'socket':socket.id, 'oldUsername':username, 'newUsername':data.username});

            // Notify all users who belong to the same rooms that this one
            _.each(_.keys(io.sockets.manager.roomClients[socket.id]), function(room) {
                room = room.substr(1); // Forward slash before room name (socket.io)
                if (room) {
                    var info = {'room':room, 'oldUsername':username, 'newUsername':data.username, 'id':socket.id};
                    io.sockets.in(room).emit('userNicknameUpdated', info);
                }
            });
        });
    });

    // New message sent to group
    socket.on('newMessage', function(data) {
        db.dbClient.hgetall(socket.id, function(err, obj) {
            if (err) return logger.emit('newEvent', 'error', err);

            // Check if user is subscribed to room before sending his message
            if (_.has(io.sockets.manager.roomClients[socket.id], "/"+data.room)) {
                var message = {'room':data.room, 'username':obj.username, 'msg':data.msg, 'date':new Date()};
                // Send message to room
                io.sockets.in(data.room).emit('newMessage', message);
                logger.emit('newEvent', 'newMessage', message);
            }
        });
    });

    // Clean up on disconnect
    socket.on('disconnect', function() {

        // Get current rooms of user
        var rooms = _.clone(io.sockets.manager.roomClients[socket.id]);

        // Get user info from db
        db.dbClient.hgetall(socket.id, function(err, obj) {
            if (err) return logger.emit('newEvent', 'error', err);
            logger.emit('newEvent', 'userDisconnected', {'socket':socket.id, 'username':obj.username});

            // Notify all users who belong to the same rooms that this one
            _.each(_.keys(rooms), function(room) {
                room = room.substr(1); // Forward slash before room name (socket.io)
                if (room) {
                    var message = {'room':room, 'username':obj.username, 'msg':'----- Left the room -----', 'id':obj.socketID};
                    io.sockets.in(room).emit('userLeavesRoom', message);
                }
            });
        });

        // Delete user from db
        db.dbClient.del(socket.id, redis.print);
    });
});

// Automatic message generation (for testing purposes)
if (setting.debug) {
    setInterval(function() {
        var text = 'Testing rooms';
        sendBroadcast(text);
    }, 60000);
}

module.exports = io;