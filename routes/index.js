var express = require('express');
var helper = require('./helper');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res, next) {
  res.redirect('/reg');
});

router.get('/cr', function(req, res, next) {
  res.render('index', { title: 'cr' });
});

router.get('/im', function(req, res, next) {
  res.render('index', { title: 'im' });
});

router.post('/api/broadcast/', helper.requireAuthentication, helper.sanitizeMessage,
    function (req, res) {
      helper.sendBroadcast(req.sanitizedMessage);
      res.send(201, "Message sent to all rooms");
    }
);


module.exports = router;
