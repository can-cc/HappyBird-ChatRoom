/**
 * Created by tyan on 15-2-13.
 */
 var socket = io.connect('http://localhost:8888');
(function(){
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
        helper.add_sys_message(data.room, '---------- Lost connection to server ----------');
    });

    // Reconnected to server
    socket.on('reconnect', function (data) {
      helper.add_sys_message(data.room, '---------- Reconnected to server ----------');
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
        helper.add_sys_message(data.room,
                        '----------' + data.username + ' join room! ----------');
    });

    // User leaves room
    socket.on('userLeavesRoom', function(data) {
        console.log("userLeavesRoom: %s", JSON.stringify(data));
        // Log leave in conversation
        helper.add_sys_message(data.room,
                        '----------' + data.username + ' leave room! ----------');
    });

    // Message received
    socket.on('newMessage', function (data) {
        console.log('hi , i re it!');
        console.log("newMessage: %s", JSON.stringify(data));
        helper.add_message(data);
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
