var express = require('express');
var router = express.Router();
var User = require('../models/user');
var passport = require('passport');
var nodemailer = require('nodemailer');
var crypto = require('crypto');
var async = require('async');
var settings = require('../settings/settings');

/* home page */
router.get('/', function(req, res) {
	if(req.user) var username = req.user.name;
  res.render('index', { title: 'Express',  username: username});
});

/* Create account */
router.get('/create', function(req, res) {
  res.render('create', { title: 'Express' });
});

router.post('/create', function(req, res) {
		// get all the params
		var params = req.body;
		var u = {
			name:params.name,
			email:params.email,
			password:params.password
		}

	  User.create(u, function(err, user){
	  		// TODO: Error should be handled
	  	  if(err){
          var errors = '';
          for(key in err.errors){
            errors += err.errors[key].message;
            errors += ' ';
          }

          console.log(Object.keys(err.errors).length)
       

          if(Object.keys(err.errors).length >= 1 ){
               console.log(errors)
            req.flash('info', errors);
            res.redirect('/create');
          }else{
            req.flash('info', 'Sorry an error has occurred');
            res.redirect('/create');
          }
        }else{
          req.flash('info', 'Your account has been created');
          res.redirect('/');
        }

	  });
});

/* login */
router.post('/login', function(req, res, next) {
  passport.authenticate('local', function(err, user, info) {
    if (err) { return next(err) }
    if (!user) {
      req.flash('info', 'Email address or password is incorrect');
      return res.redirect('/login')
    }
    req.logIn(user, function(err) {
      if (err) { return next(err); }
      return res.redirect('/');
    });
  })(req, res, next);
});


router.get('/login', function(req, res) {
  res.render('login', { title: 'Express' });
});

/* logout */
router.get('/logout', function(req, res) {
  req.logout();
  res.redirect('/');
});

/* Reset Password */

router.post('/reset/:token', function(req, res) {
  async.waterfall([
    function(done) {
      User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
        if (!user) {
          req.flash('info', 'Password reset token is invalid or has expired.');
          return res.redirect('back');
        }

        user.password = req.body.password;
        user.resetPasswordToken = undefined;
        user.resetPasswordExpires = undefined;

        user.save(function(err) {
          req.logIn(user, function(err) {
            done(err, user);
          });
        });
      });
    },
    function(user, done) {
      var smtpTransport = nodemailer.createTransport('SMTP', {
        service: 'SendGrid',
        auth: {
            user:settings.email.user,
            pass:settings.email.pass
        }
      });
      var mailOptions = {
        to: user.email,
        from: 'contact@scottw.io',
        subject: 'Password Changed',
        text:'emails been changed '
      };
      smtpTransport.sendMail(mailOptions, function(err) {
        req.flash('info', 'Success! Your password has been changed.');
        done(err);
      });
    }
  ], function(err) {
    res.redirect('/');
  });
});

router.get('/reset/:token', function(req, res) {
  console.log(req.params);
  User.findOne({ resetPasswordToken: req.params.token, resetPasswordExpires: { $gt: Date.now() } }, function(err, user) {
    if (!user) {
      console.log('no user');
      req.flash('info', 'Password reset token is invalid or has expired.');
      return res.redirect('/forgot');
    }
    res.render('reset', {
      user: req.user
    });
  });
});

/* Forgot password */
router.get('/forgot', function(req, res) {
  res.render('forgot', { title: 'Express' });
});

router.post('/forgot', function(req, res) {
  async.waterfall([
      function(done){
        crypto.randomBytes(20, function(err, buf) {
          var token = buf.toString('hex');
          done(err, token);
        });
      },
      function(token, done){  
          User.findOne(
          {email:req.body.fpassword},
          function(err, user){
            if(err) throw err;
            if (user === null) {
              req.flash('info', 'No account with that email address exists.');
              return res.redirect('/forgot');
            }
            user.resetPasswordToken = token;
            user.resetPasswordExpires = Date.now() + 3600000; // 1 hour

            user.save(function(err) {
              done(err, token, user);
            });
          });
      },
      function(token, user, done){
        // send forgotten password email
        var smtpTransport = nodemailer.createTransport({
          service:'SendGrid',
          auth:{
            user:settings.email.user,
            pass:settings.email.pass
          }
        });

        var mailOptions = {
          to: user.email,
          from: 'passwordreset@scottw.io', // TODO: needs real address
          subject:'Password reset',
          text:'Password reset '+ req.headers.host +'/reset/'+token  
        };

        smtpTransport.sendMail(mailOptions, function(err, info){
          if(err){
            req.flash('info', 'Failed to send email ');
          }else{
            req.flash('info', 'An e-mail has been send to '+user.email);
            done(err,' done');
          }
        });
      }
      ],
      function(err) {
        if (err) return next(err);
        res.redirect('/forgot');
      });
});

module.exports = router;
