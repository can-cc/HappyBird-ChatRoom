
var current_room;
(function (){



  var init = function () {
    helper.add_room_tab('Main');
    helper.add_room('Main');
    helper.activate_room_tab('Main');
    current_room = 'Main';
  };

  init();

}());
