/**
 * Created by tyan on 15-2-4.
 */

var app = require('./app');
var logger = require('./logger');
var io = require('socket.io')();
var ioredis = require('socket.io-redis');
var redis = require('redis');
var events = require('events');
var setting = require('./setting');
var db = require('./db');
var _ = require('underscore');
var helper = require('./routes/helper');

io.adapter( ioredis({
    redisPub: db.pub,
    redisSub: db.sub,
    redisClient: db.dbClient
}));

io.sockets.on('connection', function(socket) {

    // Welcome message on connection
    socket.emit('connected', 'Welcome to the chat server');
    logger.emit('newEvent', 'userConnected', {'socket':socket.id});

    // Store user data in db
    db.dbClient.hset([socket.id, 'connectionDate', new Date()], redis.print);
    db.dbClient.hset([socket.id, 'socketID', socket.id], redis.print);
    db.dbClient.hset([socket.id, 'username', 'anonymous'], redis.print);

    // Join user to 'MainRoom'
    socket.join(setting.mainroom);
    logger.emit('newEvent', 'userJoinsRoom', {'socket':socket.id, 'room':setting.mainroom});
    // Confirm subscription to user
    socket.emit('subscriptionConfirmed', {'room':setting.mainroom});
    // Notify subscription to all users in room
    var data = {'room':setting.mainroom, 'username':'anonymous', 'msg':'----- Joined the room -----', 'id':socket.id};
    io.sockets.in(setting.mainroom).emit('userJoinsRoom', data);

    // User wants to subscribe to [data.rooms]
    socket.on('subscribe', function(data) {
        // Get user info from db
        db.dbClient.hget([socket.id, 'username'], function(err, username) {
            console.log('haha');
            // Subscribe user to chosen rooms
            _.each(data.rooms, function(room) {
                room = room.replace(" ","");
                socket.join(room);
                console.log('haha');
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
                if (room != setting.mainroom) {
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
        console.log('hi im getUsersInRoom');
        var usersInRoom = [];
        //socket.join(data.room);
        var socketsInRoom = io.sockets.adapter.rooms[data.room];

        console.log(io.sockets.adapter.rooms);
        console.log(socketsInRoom);
        console.log(data.room);
        console.log(typeof (socketsInRoom.length));
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
            _.each(_.keys(io.sockets.adapter.rooms[socket.id]), function(room) {
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

            //console.log(socket.id);
            //console.log(_.has(io.sockets.adapter.rooms[socket.id], "/"+data.room));
            //console.log(io.sockets.adapter.rooms[socket.id]);
            //console.log(typeof(io.sockets.adapter.rooms[socket.id]));

            // Check if user is subscribed to room before sending his message
            //if (_.has(io.sockets.adapter.rooms[socket.id], "/"+data.room)) {
                var message = {'room':data.room, 'username':obj.username, 'msg':data.msg, 'date':new Date()};
                // Send message to room
                io.sockets.in(data.room).emit('newMessage', message);
                logger.emit('newEvent', 'newMessage', message);
            //}
        });
    });

    // Clean up on disconnect
    socket.on('disconnect', function() {

        // Get current rooms of user
        var rooms = _.clone(io.sockets.adapter.rooms[socket.id]);

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
//if (setting.debug) {
//    setInterval(function() {
//        var text = 'Testing rooms';
//        helper.sendBroadcast(text);
//    }, 60000);
//}

module.exports = io;