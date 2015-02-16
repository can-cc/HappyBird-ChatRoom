var express = require('express');
var helper = require('./helper');
var router = express.Router();
var db = require('../db');

/* GET home page. */
router.get('/', function(req, res, next) {
  var user_str = JSON.stringify({
          passwd: 'fuck',
          fuck: 'dick'
        });
  if (req.session.user) res.render('index', {
    user: user_str
  });
  else res.redirect('/login.html');
});

router.get('/reg', function(req, res, next) {
  res.redirect('/reg.html');
});

router.post('/reg', function(req, res, next) {
  user = new db.User(req.body.username, req.body.password);
  user.checkExist(function(exist) {
    if (exist) {
      res.send({error: 'username already exist!'});
    } else {
      user.save();
      res.send({success: 'register success!'});
    }
  });
});

router.post('/login', function(req, res, next) {
  db.User.checkPasswd(req.body.username, req.body.password, function(
    correct) {
    if (correct) {
      req.session.user = db.User.get(req.body.username, function(user) {
        req.session.user = user;
        res.send({success: 'login success!'});
      });
    } else {
      res.send({error: 'username or password error!'});
    }
  });
});

router.post('/logout', function(req, res, next) {
  req.session.destroy(function(){
    res.redirect('/login.html');
  });
});


router.post('/api/broadcast/', helper.requireAuthentication, helper.sanitizeMessage,
  function(req, res) {
    helper.sendBroadcast(req.sanitizedMessage);
    res.send(201, "Message sent to all rooms");
  }
);


module.exports = router;
