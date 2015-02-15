/**
 * Created by tyan on 15-2-13.
 */
(function(){

  $('#test1').click(function(event){
      data = {
          poritrait: 'images/default.jpeg',
          username: 'fuckman',
          content: 'i fuck you!'
      };
      var $new_msg = $(TEMP.message);
      $new_msg.children('img').attr('src', data.poritrait);
      $new_msg.children('.chat_nick').text(data.username);
      $new_msg.children('.chat_content').text(data.content);
      $('#Main').append($new_msg);
  });

  $('#send').click(function(event){
    var content = $('message_input').val();
  });

}());
