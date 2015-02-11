console.log('\'Allo \'Allo!');

$(document).ready(function(){

  $('.tab-title').click(function(e){
    $('.tab-title').removeClass('active');
    $(this).addClass('active');
  });
});
