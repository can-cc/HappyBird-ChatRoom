/**
 * Created by tyan on 15-2-13.
 */
(function(){
    var socket = io.connect('http://localhost:8888');
    var debug = false;

    // Connection established
    socket.on('connected', function (data) {
        console.log(data);

        // Get users connected to mainroom
        socket.emit('getUsersInRoom', {'room':'MainRoom'});

        if (debug) {
            // Subscription to rooms
            socket.emit('subscribe', {'username':'sergio', 'rooms':['sampleroom']});

            // Send sample message to room
            socket.emit('newMessage', {'room':'sampleroom', 'msg':'Hellooooooo!'});

            // Auto-disconnect after 10 minutes
            setInterval(function() {
                socket.emit('unsubscribe', {'rooms':['sampleroom']});
                socket.disconnect();
            }, 600000);
        }
    });

    // Disconnected from server
    socket.on('disconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Lost connection to server -----'};
        helper.addMessage(info);
    });

    // Reconnected to server
    socket.on('reconnect', function (data) {
        var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Reconnected to server -----'};
        helper.addMessage(info);
    });

    // Subscription to room confirmed
    //socket.on('subscriptionConfirmed', function(data) {
    //    // Create room space in interface
    //    if (!roomExists(data.room)) {
    //        addRoomTab(data.room);
    //        addRoom(data.room);
    //    }
    //
    //    // Close modal if opened
    //    //$('#modal_joinroom').modal('hide');
    //});

    // Unsubscription to room confirmed
    //socket.on('unsubscriptionConfirmed', function(data) {
    //    // Remove room space in interface
    //    if (roomExists(data.room)) {
    //        removeRoomTab(data.room);
    //        removeRoom(data.room);
    //    }
    //});

    // User joins room
    socket.on('userJoinsRoom', function(data) {
        console.log("userJoinsRoom: %s", JSON.stringify(data));
        // Log join in conversation
        helper.addMessage(data);

        // Add user to connected users list
        //addUser(data);
    });

    // User leaves room
    socket.on('userLeavesRoom', function(data) {
        console.log("userLeavesRoom: %s", JSON.stringify(data));
        // Log leave in conversation
        helper.addMessage(data);

        // Remove user from connected users list
        //removeUser(data);
    });

    // Message received
    socket.on('newMessage', function (data) {
        console.log("newMessage: %s", JSON.stringify(data));
        helper.addMessage(data);

    });

    // Users in room received
    socket.on('usersInRoom', function(data) {
        console.log('usersInRoom: %s', JSON.stringify(data));
        _.each(data.users, function(user) {
            //addUser(user);
        });
    });

    // User nickname updated
    //socket.on('userNicknameUpdated', function(data) {
    //    console.log("userNicknameUpdated: %s", JSON.stringify(data));
    //    updateNickname(data);
    //
    //    msg = '----- ' + data.oldUsername + ' is now ' + data.newUsername + ' -----';
    //    var info = {'room':data.room, 'username':'ServerBot', 'msg':msg};
    //    addMessage(info);
    //});

}());