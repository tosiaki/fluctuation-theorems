var events = require('events');

var createError = require('http-errors');
var express = require('express');
var cors = require('cors');
var app = express();

app.use(cors());
app.set('port', process.env.PORT || 3000);

var server = require('http').createServer(app);
var io = require('socket.io')(server);
io.set('origins', 'https://tosiaki.github.io:80');

var path = require('path');
var cookieParser = require('cookie-parser');
var logger = require('morgan');

var indexRouter = require('./routes/index');
var usersRouter = require('./routes/users');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'jade');

app.use(logger('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: false }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

app.use('/', indexRouter);
app.use('/users', usersRouter);

// catch 404 and forward to error handler
app.use(function(req, res, next) {
  next(createError(404));
});

// error handler
app.use(function(err, req, res, next) {
  // set locals, only providing error in development
  res.locals.message = err.message;
  res.locals.error = req.app.get('env') === 'development' ? err : {};

  // render the error page
  res.status(err.status || 500);
  res.render('error');
});

module.exports = app;

k1 = 0.05;
k2 = 0.01;
epsilon = 80;
omega = 5e-9;
M=100;
x0=62.5;
xm=64;

v=1e-2;

maxSteps = M*5;

function energy0(position) {
  return 0.5*k1*position*position-epsilon;
}

function energy1(position) {
  return 0.5*k2*position*position;
}

function energyFunction(state) {
  if (state===false) {
    return energy0;
  } else {
    return energy1;
  }
}

function W12(position) {
  return omega*Math.exp(energy1(position));
}

function W21(position) {
  return omega*Math.exp(energy0(position));
}

function state0probabilityFrom0(position, deltaT) {
  return (W12(position)+W21(position)*Math.exp(-deltaT*(W12(position)+W21(position))))/(W12(position)+W21(position));
}

function state0probabilityFrom1(position, deltaT) {
  return (W12(position)-W12(position)*Math.exp(-deltaT*(W12(position)+W21(position))))/(W12(position)+W21(position));
}

function state0probabilityFunction(state) {
  if (state===false) {
    return state0probabilityFrom0;
  } else {
    return state0probabilityFrom1;
  }
}

function positionAtStep(step) {
  return Math.min(x0 + (xm-x0)*step/M,xm);
}

function equilibriumProbability(position) {
  return (Math.exp(-0.5*k1*position*position-epsilon))/(Math.exp(-0.5*k1*position*position-epsilon)+Math.exp(-0.5*k2*position*position));
}

n0probability = equilibriumProbability(x0);

function partitionFunction(position) {
  return Math.exp(-energy0(position)) + Math.exp(-energy1(position));
}

function helmholtzFreeEnergy(position) {
  return -Math.log(partitionFunction(position));
}

function CalculationPerformer(velocity) {
  deltaT = (xm-x0)/(velocity*M);
  this.totalWork = 0;
  this.workHistory = [];
  this.state = Math.random() > n0probability;
  this.step = 0;
  while (this.step < maxSteps) {
    this.totalWork += energyFunction(this.state)(positionAtStep(this.step)) - energyFunction(this.state)(positionAtStep(this.step+1));
    this.step++;
    this.state = Math.random() > state0probabilityFunction(this.state)(positionAtStep(this.step), deltaT);
    this.workHistory.push(this.totalWork);
  }
  io.emit("calculationResult", { velocity: velocity, workHistory: this.workHistory, totalWork: this.totalWork });
}

function performCalculation(velocity) {
  calculation = new CalculationPerformer(velocity);
  setImmediate(performCalculation);
}

[1e-2,1e-1,1,1e1,1e2].forEach(function(velocity) {
  performCalculation(velocity);
});

io.on('connection', function(socket) {
  var socketId = socket.id;
  var clientIp = socket.request.connection.remoteAddress;
  console.log('New connection from ' + clientIp);
});
