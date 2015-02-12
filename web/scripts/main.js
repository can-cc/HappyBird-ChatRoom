console.log('\'Allo \'Allo!');

//$(function(){
//  var nav_total = 239;
//  var nav_visible_first = 1;
//  var nav_visible_last = 1;
//
//  $('.tab-title').click(function(e){
//    $('.tab-title').removeClass('active');
//    $(this).addClass('active');
//  });
//
//  $('#fuck').click(function(e){
//    $('.message-window').append('<span class="radius label">Advanced Label:</span><br>');
//    $('.message-window').animate({
//      scrollTop: $('.message-window').height()
//    }, 300);
//  });
//
//  $('#fuck2').click(function(e){
//    var $new_nav = $('<li class="current"><a href="">Main</a></li>');
//    $new_nav.hide();
//    $('#msg_wins').append($new_nav);
//   // $new_nav.prepend('Fuck');
//    nav_total -= $new_nav.width();
//    $new_nav.show();
//    alert($new_nav.width());
//    ////var ssx= $('.rooms :visible :first-child');
//    ////alert(ssx.text());
//    //nav_visible_last++;
//    //if(nav_total > 797){
//    //  $('.rooms').children(':eq(nav_visible_first)').hide();
//    //  nav_visible_first++;
//    //  $new_nav.show();
//    //} else {
//    //  $('.rooms').append($new_nav);
//    //  $new_nav.show();
//    //}
//
//  });
//
//  $('#send').click(function(e){
//    $('.message-window').append('<div style="float:right;">sadsads<span class="radius label" >Advanced Label:</span></div><br>');
//    $('.message-window').animate({
//      scrollTop: $('.message-window').height()
//    }, 300);
//  });
//
//});
(function($){
  var rooms = {};

  var debug = false;

  // ***************************************************************************
  // Socket.io events
  // ***************************************************************************

  var socket = io.connect('http://localhost:8888');

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
    addMessage(info);
  });

  // Reconnected to server
  socket.on('reconnect', function (data) {
    var info = {'room':'MainRoom', 'username':'ServerBot', 'msg':'----- Reconnected to server -----'};
    addMessage(info);
  });

  // Subscription to room confirmed
  socket.on('subscriptionConfirmed', function(data) {
    // Create room space in interface
    if (!roomExists(data.room)) {
      addRoomTab(data.room);
      addRoom(data.room);
    }

    // Close modal if opened
    //$('#modal_joinroom').modal('hide');
  });

  // Unsubscription to room confirmed
  socket.on('unsubscriptionConfirmed', function(data) {
    // Remove room space in interface
    if (roomExists(data.room)) {
      removeRoomTab(data.room);
      removeRoom(data.room);
    }
  });

  // User joins room
  socket.on('userJoinsRoom', function(data) {
    console.log('i log in ');
    console.log("userJoinsRoom: %s", JSON.stringify(data));
    // Log join in conversation
    addMessage(data);

    // Add user to connected users list
    addUser(data);
  });

  // User leaves room
  socket.on('userLeavesRoom', function(data) {
    console.log("userLeavesRoom: %s", JSON.stringify(data));
    // Log leave in conversation
    addMessage(data);

    // Remove user from connected users list
    removeUser(data);
  });

  // Message received
  socket.on('newMessage', function (data) {
    console.log("newMessage: %s", JSON.stringify(data));
    addMessage(data);

    // Scroll down room messages
    var room_messages = '#'+data.room+' #room_messages';
    $(room_messages).animate({
      scrollTop: $(room_messages).height()
    }, 300);
  });

  // Users in room received
  socket.on('usersInRoom', function(data) {
    console.log('usersInRoom: %s', JSON.stringify(data));
    _.each(data.users, function(user) {
      addUser(user);
    });
  });

  // User nickname updated
  socket.on('userNicknameUpdated', function(data) {
    console.log("userNicknameUpdated: %s", JSON.stringify(data));
    updateNickname(data);

    msg = '----- ' + data.oldUsername + ' is now ' + data.newUsername + ' -----';
    var info = {'room':data.room, 'username':'ServerBot', 'msg':msg};
    addMessage(info);
  });

  // ***************************************************************************
  // Templates and helpers
  // ***************************************************************************
  var add_room_tab = function (RoomName) {
    var $new_nav = $('<li class="room_tab"><i class="fi-x"></li>');
    $new_nav.prepend(RoomName);
    $new_nav.id(RoomName + '_tab');
    $('#room_tab').append($new_nav);
  };

  var add_room = function (RoomName) {
    var $new_room = $('<div class="panel room"></div>');
    $new_room.id(RoomName);
    $('.All-Chat').append($new_room);
  };

  var show_room = function (RoomName) {
    $('room').hide();
    $('#' + RoomName).show();
  };

  var remove_room_tab = function (RoomName) {
    $('#' + RoomName + '_tab').remove();
  };

  var removeRoom = function (RoomName) {
    remove_room_tab(RoomName);
    $('#' + RoomName).remove();
  };

  var activate_room_tab = function (RoomName) {
    $('.room_tab').removeClass('current');
    $('#' + RoomName + '_tab').addClass('current');
  };

  $('#fuck').click(function(e){
    $('.message-window').append('<span class="radius label">Advanced Label:</span><br>');
    $('.message-window').animate({
      scrollTop: $('.message-window').height()
    }, 300);
  });

  var addMessage = function (RoomName, Message) {
    $('#' + RoomName).append('<span class="radius label">Advanced Label:</span><br>');
  };



  var templates = {};
  var getTemplate = function(path, callback) {
    var source;
    var template;

    // Check first if we've the template cached
    if (_.has(templates, path)) {
      if (callback) callback(templates[path]);
      // If not we get and compile it
    } else {
      $.ajax({
        url: path,
        success: function(data) {
          source = data;
          template = Handlebars.compile(source);
          // Store compiled template in cache
          templates[path] = template;
          if (callback) callback(template);
        }
      });
    }
  };

  // Add room tab
  //var addRoomTab = function(room) {
  //  getTemplate('templates/room_tab.handlebars', function(template) {
  //    $('#rooms_tabs').append(template({'room':room}));
  //  });
  //};
  //
  //// Remove room tab
  //var removeRoomTab = function(room) {
  //  var tab_id = "#"+room+"_tab";
  //  $(tab_id).remove();
  //};
  //
  //// Add room
  //var addRoom = function(room) {
  //  getTemplate('templates/room.handlebars', function(template) {
  //    $('#rooms').append(template({'room':room}));
  //
  //    // Toogle to created room
  //    var newroomtab = '[href="#'+room+'"]';
  //    $(newroomtab).click();
  //
  //    // Get users connected to room
  //    socket.emit('getUsersInRoom', {'room':room});
  //  });
  //};

  // Remove room
  //var removeRoom = function(room) {
  //  var room_id = "#"+room;
  //  $(room_id).remove();
  //};

  // Add message to room
  var addMessage = function(msg) {
    getTemplate('templates/message.handlebars', function(template) {
      var room_messages = '#'+msg.room+' #room_messages';
      $(room_messages).append(template(msg));
    });
  };

  // Add user to connected users list
  var addUser = function(user) {
    getTemplate('templates/user.handlebars', function(template) {
      var room_users = '#'+user.room+' #room_users';
      // Add only if it doesn't exist in the room
      var user_badge = '#'+user.room+' #'+user.id;
      if (!($(user_badge).length)) {
        $(room_users).append(template(user));
      }
    });
  }

  // Remove user from connected users list
  var removeUser = function(user) {
    var user_badge = '#'+user.room+' #'+user.id;
    $(user_badge).remove();
  };

  // Check if room exists
  var roomExists = function(room) {
    var room_selector = '#'+room;
    if ($(room_selector).length) {
      return true;
    } else {
      return false;
    }
  };

  // Get current room
  var getCurrentRoom = function() {
    return $('li[id$="_tab"][class="active"]').text();
  };

  // Get message text from input field
  var getMessageText = function() {
    var text = $('#message_text').val();
    $('#message_text').val("");
    return text;
  };

  // Get room name from input field
  var getRoomName = function() {
    var name = $('#room_name').val();
    $('#room_name').val("");
    return name;
  };

  // Get nickname from input field
  var getNickname = function() {
    var nickname = $('#nickname').val();
    $('#nickname').val("");
    return nickname;
  };

  // Update nickname in badges
  var updateNickname = function(data) {
    var badges = '#'+data.room+' #'+data.id;
    $(badges).text(data.newUsername);
  };

  // ***************************************************************************
  // Events
  // ***************************************************************************

  // Send new message
  $('#b_send_message').click(function(eventObject) {

    eventObject.preventDefault();
    if ($('#message_text').val() != "") {
      socket.emit('newMessage', {'room':getCurrentRoom(), 'msg':getMessageText()});
    }
  });

  // Join new room
  //$('#b_join_room').click(function(eventObject) {
  //  eventObject.preventDefault();
  //  socket.emit('subscribe', {'rooms':[getRoomName()]});
  //});
  //
  //// Leave current room
  //$('#b_leave_room').click(function(eventObject) {
  //  eventObject.preventDefault();
  //  var currentRoom = getCurrentRoom();
  //  if (currentRoom != 'MainRoom') {
  //    socket.emit('unsubscribe', {'rooms':[getCurrentRoom()]});
  //
  //    // Toogle to MainRoom
  //    $('[href="#MainRoom"]').click();
  //  } else {
  //    console.log('Cannot leave MainRoom, sorry');
  //  }
  //});
  //
  //// Set nickname
  //$('#b_set_nickname').click(function(eventObject) {
  //  $('#modal_setnick').modal();
  //  eventObject.preventDefault();
  //  socket.emit('setNickname', {'username':getNickname()});
  //
  //  // Close modal if opened
  //  $('#modal_setnick').modal('hide');
  //});
}(jQuery));
