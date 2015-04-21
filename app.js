var express = require('express');
var session = require('express-session');
var path = require('path');
var http = require('http');
var favicon = require('serve-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var setting = require('./setting');
var chatsocket = require('./chatsocket');
var debug = require('debug')('HappyBird-ChatRoom:server');
var db = require('./db');
var multer = require('multer');


var routes = require('./routes/index');
var users = require('./routes/users');

var app = express();

app.use(multer({
  dest: './upload',

  changeDest:  function(dest, req, res) {
    if ( req.url === '/avatar_raw/' ) {
      return dest  + '/avatar_temp'
    }
    return dest;
  },

    rename: function (fieldname, filename, req, res) {
      return filename +  new Date().toString().slice(0, 24).replace(/\s+/g, '');
    },
    onFileUploadStart: function(file, req, res) {
        //Todo:
        //should use Debug
        //console.log(file.fieldname + ' uploaded to  ' + file.path)
    },
    onFileUploadComplete: function(file, req, res) {
        //console.log(file.fieldname + ' uploaded to  ' + file.path)
    }
}));

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

app.use(favicon(__dirname + '/web/images/favicon.jpg'));

app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());

app.use(session({
  store: db.sessionStore,
  secret: 'happy bird',
  key: 'esid'
}));


app.use('/', routes);
//app.use(users);

app.use(express.static('www/src'));
app.use('/upload', express.static('upload'));
app.use('/raw', express.static('/home/linaro/WORKSHOP/FoundationLearn/'));

//app.use('www', express.static(path.join(__dirname, './www')));
app.use(express.static(path.join(__dirname, './web')));


app.use(function(req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// development error handler
// will print stacktrace
console.log('env = ' + app.get('env'));
if (app.get('env') === 'development') {
  app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
      message: err.message,
      error: err
    });
    console.log('error', err.message);
  });
}

//production error handler
//no stacktraces leaked to user
app.use(function(err, req, res, next) {
  res.status(err.status || 500);
  res.render('error', {
    message: err.message,
    error: {}
  });
});


//run part
// *****************************************************************************
// *****************************************************************************
// *****************************************************************************



var port = normalizePort(setting.PORT || '3000');
app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app);

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

chatsocket.listen(server);


/**
 * Normalize a port into a number, string, or false.
 */

function normalizePort(val) {
  var port = parseInt(val, 10);

  if (isNaN(port)) {
    // named pipe
    return val;
  }

  if (port >= 0) {
    // port number
    return port;
  }

  return false;
}

/**
 * Event listener for HTTP server "error" event.
 */

function onError(error) {
  if (error.syscall !== 'listen') {
    throw error;
  }

  var bind = typeof port === 'string' ? 'Pipe ' + port : 'Port ' + port

  // handle specific listen errors with friendly messages
  switch (error.code) {
    case 'EACCES':
      console.error(bind + ' requires elevated privileges');
      process.exit(1);
      break;
    case 'EADDRINUSE':
      console.error(bind + ' is already in use');
      process.exit(1);
      break;
    default:
      throw error;
  }
}

/**
 * Event listener for HTTP server "listening" event.
 */

function onListening() {
  var addr = server.address();
  var bind = typeof addr === 'string' ? 'pipe ' + addr : 'port ' + addr.port;
  debug('Listening on ' + bind);
}
