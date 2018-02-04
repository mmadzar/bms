#!/usr/bin/env node

/**
 * Module dependencies.
 */

var app = require('../app');
var debug = require('debug')('carctrl:server');
var http = require('http');
var dateVar = new Date();

/**
 * Get port from environment and store in Express.
 */

var port = normalizePort(process.env.PORT || '3001');
app.app.set('port', port);

/**
 * Create HTTP server.
 */

var server = http.createServer(app.app);

// socket.io
var io = require('socket.io')(server);
io.on('connection', function (socket) {
  console.log('user connected');
  var dt = new Date();
  //app.bms.resetInMemoryStatus();
  io.emit('chat message', dt.toJSON() + '\t' + 'io ready.');
  socket.on('send message', function (msg) {
    app.bms.sendMessage(msg);
  });
  socket.on('start monitor', function (msg) {
    var dt1 = new Date();
    app.bms.startMonitor();
    io.emit('chat message', dt1.toJSON() + '\tmonitor started.');
  });
  socket.on('stop monitor', function (msg) {
    var dt2 = new Date();
    app.bms.stopMonitor();
    io.emit('chat message', dt2.toJSON() + '\tmonitor stopped.');
  });
});

//The Emitter events
app.evEmitter.on('sent', function (data) {
  // all messages to serial (including monitor)
  // var dt = new Date();
  // io.emit('chat message', dt.toJSON() + '\t' + data);
});
app.evEmitter.on('msgsent', function (data) {
  // only messages sent by user
  var dt = new Date();
  io.emit('chat message', dt.toJSON() + '\tsend\t' + data.toString('hex'));
});
app.evEmitter.on('device', function (data) {
  var dt = new Date();
  io.emit('chat message', dt.toJSON() + '\t' + data);
});
app.evEmitter.on('status', function (data) {
  io.emit('status update', data);
});

/**
 * Listen on provided port, on all network interfaces.
 */

server.listen(port);
server.on('error', onError);
server.on('listening', onListening);

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

  var bind = typeof port === 'string' ?
    'Pipe ' + port :
    'Port ' + port;

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
  var bind = typeof addr === 'string' ?
    'pipe ' + addr :
    'port ' + addr.port;
  debug('Listening on ' + bind);
}