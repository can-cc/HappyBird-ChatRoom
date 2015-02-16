/**
 * Created by tyan on 15-2-13.
 */
 // socket defined in chatsocket.js
(function(){

  $('#test1').click(function(event){
      data = {
          poritrait: 'images/default.jpeg',
          username: 'fuckman',
          msg: 'i fuck you!'
      };
      var $new_msg = $(TEMP.message);
      $new_msg.children('img').attr('src', data.poritrait);
      $new_msg.children('.chat_nick').text(data.username);
      $new_msg.children('.chat_content').text(data.msg);
      $('#Main').append($new_msg);
  });

  $('#send').click(function(event){
    //var ss = JSON.parse(user.replace(/&quot;/g,'"'));
    event.preventDefault();
    var content = $('#message_input').val();
    console.log(content);
    socket.emit('newMessage', {room: current_room, msg: content});
  });

}());
