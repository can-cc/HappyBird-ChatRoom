/**
 * Created by tyan on 15-2-4.
 */
var redis = require('redis');
var setting = require('./setting');

exports.pub = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);
exports.sub = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);
exports.dbClient = redis.createClient(setting.redisPort, setting.dbHost, setting.dbOptions);