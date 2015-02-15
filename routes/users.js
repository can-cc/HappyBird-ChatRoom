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

module.exports = router;
