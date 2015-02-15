var express = require('express');
var db = require('../db');

var router = express.Router();

/* GET users listing. */
router.get('/', function(req, res, next) {
	res.send('can not get anything!');
});

router.post('/', function(req, res, next) {

});

module.exports = router;
