
/**
 * Module dependencies.
 */


/**
 * 主模块
 *
 * 注意每一个set get 方法其实是一个函数
 */

var http = require('http');
var read = require('fs').readFileSync;
var parse = require('url').parse;
var engine = require('engine.io');
var client = require('socket.io-client');
var clientVersion = require('socket.io-client/package').version;
var Client = require('./client');
var Namespace = require('./namespace');
var Adapter = require('socket.io-adapter');
var debug = require('debug')('socket.io:server');
var url = require('url');

/**
 * Module exports.
 */

module.exports = Server;

/**
 * Socket.IO client source.
 */

var clientSource = read(require.resolve('socket.io-client/socket.io.js'), 'utf-8');

/**
 * Server constructor.
 *
 * @param {http.Server|Number|Object} http server, port or options
 * @param {Object} options
 * @api public
 */
//构造器
function Server(srv, opts){
  //如果不是Server对象则new一个返回
  if (!(this instanceof Server)) return new Server(srv, opts);
  if ('object' == typeof srv && !srv.listen) {
    opts = srv;
    srv = null;
  }
  //如果uundefined则初始化为{}
  opts = opts || {};
  this.nsps = {};
  this.path(opts.path || '/socket.io');
  //判断是否客户端
  this.serveClient(false !== opts.serveClient);
  //如果uundefined则初始化为{}
  this.adapter(opts.adapter || Adapter);
  //ip：port
  this.origins(opts.origins || '*:*');
  //TODO
  this.sockets = this.of('/');
  if (srv) this.attach(srv, opts);
}

/**
 * Server request verification function, that checks for allowed origins
 *
 * @param {http.IncomingMessage} request
 * @param {Function} callback to be called with the result: `fn(err, success)`
 */

Server.prototype.checkRequest = function(req, fn) {
  var origin = req.headers.origin || req.headers.referer;

  // file:// URLs produce a null Origin which can't be authorized via echo-back
  if ('null' == origin || null == origin) origin = '*';

  if (!!origin && typeof(this._origins) == 'function') return this._origins(origin, fn);
  if (this._origins.indexOf('*:*') !== -1) return fn(null, true);
  if (origin) {
    try {
      var parts = url.parse(origin);
      parts.port = parts.port || 80;
      var ok =
        ~this._origins.indexOf(parts.hostname + ':' + parts.port) ||
        ~this._origins.indexOf(parts.hostname + ':*') ||
        ~this._origins.indexOf('*:' + parts.port);
      return fn(null, !!ok);
    } catch (ex) {
    }
  }
  fn(null, false);
};

/**
 * Sets/gets whether client code is being served.
 *
 * @param {Boolean} whether to serve client code
 * @return {Server|Boolean} self when setting or value when getting
 * @api public
 */

//绑定函数，as _binAll（）
//是否为客户端服务
Server.prototype.serveClient = function(v){
  if (!arguments.length) return this._serveClient;
  this._serveClient = v;
  return this;
};

/**
 * Old settings for backwards compatibility
 */

var oldSettings = {
  "transports": "transports",
  "heartbeat timeout": "pingTimeout",
  "heartbeat interval": "pingInterval",
  "destroy buffer size": "maxHttpBufferSize"
};

/**
 * Backwards compatiblity.
 *
 * @api public
 */

//向后兼容set方法
Server.prototype.set = function(key, val){
  if ('authorization' == key && val) {
    this.use(function(socket, next) {
      val(socket.request, function(err, authorized) {
        if (err) return next(new Error(err));
        if (!authorized) return next(new Error('Not authorized'));
        next();
      });
    });
  } else if ('origins' == key && val) {
    this.origins(val);
  } else if ('resource' == key) {
    this.path(val);
  } else if (oldSettings[key] && this.eio[oldSettings[key]]) {
    this.eio[oldSettings[key]] = val;
  } else {
    console.error('Option %s is not valid. Please refer to the README.', key);
  }

  return this;
};

/**
 * Sets the client serving path.
 *
 * @param {String} pathname
 * @return {Server|String} self when setting or value when getting
 * @api public
 */

Server.prototype.path = function(v){
  if (!arguments.length) return this._path;
  //转义
  this._path = v.replace(/\/$/, '');
  return this;
};

/**
 * Sets the adapter for rooms.
 *
 * @param {Adapter} pathname
 * @return {Server|Adapter} self when setting or value when getting
 * @api public
 */

//为所有房间设置适配器，adapter相当于之前版本的manager
Server.prototype.adapter = function(v){
  if (!arguments.length) return this._adapter;
  this._adapter = v;
  for (var i in this.nsps) {
    if (this.nsps.hasOwnProperty(i)) {
      //TODO
      this.nsps[i].initAdapter();
    }
  }
  return this;
};

/**
 * Sets the allowed origins for requests.
 *
 * @param {String} origins
 * @return {Server|Adapter} self when setting or value when getting
 * @api public
 */


//设置允许的客户端地址，传入参数是{String}
Server.prototype.origins = function(v){
  if (!arguments.length) return this._origins;

  this._origins = v;
  return this;
};

/**
 * Attaches socket.io to a server or port.
 *
 * @param {http.Server|Number} server or port
 * @param {Object} options passed to engine.io
 * @return {Server} self
 * @api public
 */

//这样一下子建挺有意思的
Server.prototype.listen =
Server.prototype.attach = function(srv, opts){
  //判断错误，因为attach给express的话就是function
  if ('function' == typeof srv) {
    var msg = 'You are trying to attach socket.io to an express ' +
    'request handler function. Please pass a http.Server instance.';
    throw new Error(msg);
  }

  // handle a port as a string
  //转为数字类型
  if (Number(srv) == srv) {
    srv = Number(srv);
  }

  if ('number' == typeof srv) {
    debug('creating http server and binding to %d', srv);
    var port = srv;
    //http访访问就404
    srv = http.Server(function(req, res){
      res.writeHead(404);
      res.end();
    });
    srv.listen(port);

  }

  //使用engine.io处理
  // set engine.io path to `/socket.io`
  opts = opts || {};
  opts.path = opts.path || this.path();
  // set origins verification
  opts.allowRequest = this.checkRequest.bind(this);

  // initialize engine
  debug('creating engine.io instance with opts %j', opts);
  this.eio = engine.attach(srv, opts);

  // attach static file serving
  //处理静态文件
  if (this._serveClient) this.attachServe(srv);

  // Export http server
  this.httpServer = srv;

  // bind to engine events
  //绑定engine的作用域
  this.bind(this.eio);

  return this;
};

/**
 * Attaches the static file serving.
 *
 * @param {Function|http.Server} http server
 * @api private
 */

Server.prototype.attachServe = function(srv){
  debug('attaching client serving req handler');
  var url = this._path + '/socket.io.js';
  var evs = srv.listeners('request').slice(0);
  var self = this;
  srv.removeAllListeners('request');
  srv.on('request', function(req, res) {
    if (0 == req.url.indexOf(url)) {
      self.serve(req, res);
    } else {
      for (var i = 0; i < evs.length; i++) {
        evs[i].call(srv, req, res);
      }
    }
  });
};

/**
 * Handles a request serving `/socket.io.js`
 *
 * @param {http.Request} req
 * @param {http.Response} res
 * @api private
 */

//给客户端发送程序
Server.prototype.serve = function(req, res){
  //处理非匹配客户端
  var etag = req.headers['if-none-match'];
  if (etag) {
    if (clientVersion == etag) {
      debug('serve client 304');
      res.writeHead(304);
      res.end();
      return;
    }
  }

  debug('serve client source');
  res.setHeader('Content-Type', 'application/javascript');
  res.setHeader('ETag', clientVersion);
  res.writeHead(200);
  res.end(clientSource);
};

/**
 * Binds socket.io to an engine.io instance.
 *
 * @param {engine.Server} engine.io (or compatible) server
 * @return {Server} self
 * @api public
 */
//绑定engine作作用域
Server.prototype.bind = function(engine){
  this.engine = engine;
  this.engine.on('connection', this.onconnection.bind(this));
  return this;
};

/**
 * Called with each incoming transport connection.
 *
 * @param {engine.Socket} socket
 * @return {Server} self
 * @api public
 */

Server.prototype.onconnection = function(conn){
  debug('incoming connection with id %s', conn.id);
  var client = new Client(this, conn);
  client.connect('/');
  return this;
};

/**
 * Looks up a namespace.
 *
 * @param {String} nsp name
 * @param {Function} optional, nsp `connection` ev handler
 * @api public
 */
//作用域函数
Server.prototype.of = function(name, fn){
  if (String(name)[0] !== '/') name = '/' + name;
  //如果名字不存在则新建
  if (!this.nsps[name]) {
    debug('initializing namespace %s', name);
    var nsp = new Namespace(this, name);
    this.nsps[name] = nsp;
  }
  if (fn) this.nsps[name].on('connect', fn);
  return this.nsps[name];
};

/**
 * Closes server connection
 *
 * @api public
 */

//关闭
Server.prototype.close = function(){
  this.nsps['/'].sockets.forEach(function(socket){
    socket.onclose();
  });

  this.engine.close();

  if(this.httpServer){
    this.httpServer.close();
  }
};

/**
 * Expose main namespace (/).
 */

['on', 'to', 'in', 'use', 'emit', 'send', 'write'].forEach(function(fn){
  Server.prototype[fn] = function(){
    var nsp = this.sockets[fn];
    return nsp.apply(this.sockets, arguments);
  };
});

Namespace.flags.forEach(function(flag){
  Server.prototype.__defineGetter__(flag, function(name){
    this.flags.push(name);
    return this;
  });
});

/**
 * BC with `io.listen`
 */

Server.listen = Server;
