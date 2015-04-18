var express = require('express');
var db = require('../db');

var router = express.Router();


/* GET users listing. */
router.get('/', function(req, res, next) {
  res.send('can not get anything!');
});

router.post('/', function(req, res, next) {
  console.log(req.body.username);
  user = new db.User(req.body.username, req.body.password);
  user.checkExist(function(exist) {
    if (exist) {
      res.send('already exist!!!!@');
    } else {
      user.save();
      res.send('reg success!');
    }
  });
});


/*************************************
 * Todo : auth
 *************************************/
router.post('/avatar', function(req, res, next){
  var keys = []
  for (var key in req.files) {
        keys.push(key)
    }
   //I only want first element, may be can opti..
  res.send( {src: req.files[keys[0]].path} || {Error: 'unkown!'})
  res.end()
});

module.exports = router;
