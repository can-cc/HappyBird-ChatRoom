/**
 * Created by tyan on 15-2-4.
 */
var io = require('../socketIO');
var _ = require('underscore');
helper = {}

helper.requireAuthentication = function(req, res, next) {
    // TODO
    next();
};

// Sanitize message to avoid security problems
helper.sanitizeMessage = function(req, res, next) {
    if (req.body.msg) {
        req.sanitizedMessage = sanitize(req.body.msg).xss();
        next();
    } else {
        res.send(400, "No message provided");
    }
};

helper.sendBroadcast = function(text) {
    _.each(_.keys(io.sockets.manager.rooms), function(room) {
        room = room.substr(1); // Forward slash before room name (socket.io)
        // Don't send messages to default "" room
        if (room) {
            var message = {'room':room, 'username':'ServerBot', 'msg':text, 'date':new Date()};
            io.sockets.in(room).emit('newMessage', message);
        }
    });
    logger.emit('newEvent', 'newBroadcastMessage', {'msg':text});
};

module.exports = helper;