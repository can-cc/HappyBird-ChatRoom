/**
 * Created by tyan on 15-2-4.
 */
var redis = require('redis');
var setting = require('./setting');
var bcrypt = require('bcrypt');
var session = require('express-session');
var RedisStore = require('connect-redis')(session);


exports.sessionStore = new RedisStore();

exports.pub = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);
exports.sub = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);
exports.dbClient = redis.createClient(setting.redisPort, setting.dbHost,
	setting.dbOptions);

var modelsDB = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);

var User = function(username, password) {
	this.username = username;
	this.password = password;
};

User.prototype.save = function(callback) {
	var username = this.username;
	var password = this.password;

	bcrypt.genSalt(10, function(err, salt) {
		err && callback(err);
		bcrypt.hash(password, salt, function(err, hash) {
			// Store
			modelsDB.hmset('HC_User:' + username,
				'password', hash,
				redis.print);

		});
	});
};

User.prototype.checkExist = function(callback) {
	var username = this.username;
	modelsDB.hgetall('HC_User:' + username, function(err, reply) {
		if (reply) callback(true)
		else callback(false)
	});
};

User.checkPasswd = function(username, password, callback) {
	modelsDB.hget('HC_User:' + username, 'password', function(err, reply) {
		// Load hash from your password DB.
		bcrypt.compare(password, reply, function(err, res) {
			callback(res);
		});


	});
};

User.get = function(username, callback) {
	modelsDB.hgetall('HC_User:' + username, function(err, reply) {
		callback(reply);
	});
};

exports.User = User;
