var express = require('express');
var path = require('path');
var favicon = require('static-favicon');
var logger = require('morgan');
var cookieParser = require('cookie-parser');
var bodyParser = require('body-parser');
var session = require('express-session');
var MongoStore = require('connect-mongo')(session);
var MongoClient = require('mongodb').MongoClient;
var routes = require('./routes/index');
var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var multer  = require('multer')
var partials = require('express-partials');
var passport = require('passport');
var flash = require('express-flash');
var LocalStrategy = require('passport-local').Strategy;
var app = express();
var settings = require('./settings/settings');

// view engine setup
app.set('views', path.join(__dirname, 'views'));
app.set('view engine', 'ejs');

// middleware
app.use(partials());
app.use(logger('dev'));
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(cookieParser());
app.use(express.static(path.join(__dirname, 'public')));

/*=====
MONGO CONNECTION
=======*/

mongoose.connect(settings.db.address);

/*====
SESSIONS
======*/

app.use(require('express-session')({
    key: 'session',
    secret: settings.cookies.secret,
    store: require('mongoose-session')(mongoose)
}));

app.use(flash());

/*=====
MODELS
=======*/

var User = require('./models/user');

/*======
PASPORT 
=======*/

passport.use(new LocalStrategy({
    usernameField: 'email',
    passwordField: 'password'
  },
  function(email, password, done) {

  User.findOne({ email: email }, function(err, user) {
    if (err) return done(err);
    if (!user) return done(null, false, { message: 'Incorrect username.' });
    user.comparePassword(password, function(err, isMatch) {
      if (isMatch) {
        return done(null, user);
      } else {
        return done(null, false, { message: 'Incorrect password.' });
      }
    });
  });
}));

passport.serializeUser(function(user, done) {
  done(null, user.id);
});

passport.deserializeUser(function(id, done) {
  User.findById(id, function(err, user) {
    done(err, user);
  });
});

app.use(passport.initialize());
app.use(passport.session());

/*=====
ROUTES
=======*/

app.use('/', routes);

/*=====
404 HANDELING
=======*/

app.use(function(req, res, next) {
    var err = new Error('Not Found');
    err.status = 404;
    next(err);
});

// development error handler
if (app.get('env') === 'development') {
    app.use(function(err, req, res, next) {
        res.status(err.status || 500);
        res.render('error', {
            message: err.message,
            error: err
        });
    });
}

// production error handler
app.use(function(err, req, res, next) {
    res.status(err.status || 500);
    res.render('error', {
        message: err.message,
        error: {}
    });
});

/*=====
START APP 
=======*/

app.listen(3004);
module.exports = app;
