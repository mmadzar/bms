var express = require('express'),
  fs = require('fs'),
  path = require('path'),
  settings = require('./bin/settings'),
  favicon = require('serve-favicon'),
  logger = require('morgan'),
  cookieParser = require('cookie-parser'),
  bodyParser = require('body-parser'),
  sassMiddleware = require('node-sass-middleware'),
  index = require('./routes/index');

//config settings - load settings from file
settings.load();

var app = express();

// Event emitter
const EventEmitter = require('events');
class CarCtrlEmitter extends EventEmitter { }
const evEmitter = new CarCtrlEmitter();
console.log('EventEmitter created.');

// BMS dependencies and settings.
var Bms = require('./bin/bmsdevice.js');
const bms = new Bms(settings, evEmitter);

// view engine setup - HTML
app.use(express.static(__dirname + '/public'));
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'pug');

// uncomment after placing your favicon in /public
app.use(favicon(path.join(__dirname, 'public', 'favicon.ico')));
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({
  extended: false
}));
app.use(cookieParser());
app.use(sassMiddleware({
  src: path.join(__dirname, 'public'),
  dest: path.join(__dirname, 'public'),
  indentedSyntax: true, // true = .sass and false = .scss
  sourceMap: true
}));
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', index);
app.use('/users', users);

// catch 404 and forward to error handler
app.use(function (req, res, next) {
  var err = new Error('Not Found');
  err.status = 404;
  next(err);
});

// error handler
app.use(function (err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

exports.app = app;
exports.evEmitter = evEmitter;
exports.bms = bms;