/**
 * Created by tyan on 15-2-4.
 */
var events = require('events');

var logger = new events.EventEmitter();
logger.on('logging', function(event, data) {
    // Console log
    console.log('%s: %s', event, JSON.stringify(data));
    // Persistent log storage too?
    // TODO
});


module.exports = logger;
