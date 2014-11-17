var mongoose = require('mongoose');
var bcrypt = require('bcrypt-nodejs');
var Schema = mongoose.Schema;

// USER 
var userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { 
    required:true,
    type: String,
    validate:[validateEmail, 'Sorry email address in not valid'],
    unique: true 
  },
  password: { type: String, required: true },
  resetPasswordToken: String,
  resetPasswordExpires: Date
});

function validateEmail(email){
  var re = /^\w+([\.-]?\w+)*@\w+([\.-]?\w+)*(\.\w{2,3})+$/;
  return re.test(email);
}

userSchema.pre('save', function(next) {
  var user = this;
  var SALT_FACTOR = 5;

  if (!user.isModified('password')) return next();

  bcrypt.genSalt(SALT_FACTOR, function(err, salt) {
    if (err) return next(err);

    bcrypt.hash(user.password, salt, null, function(err, hash) {
      if (err) return next(err);
      user.password = hash;
      next();
    });
  });
});



userSchema.methods.comparePassword = function(candidatePassword, cb) {
  bcrypt.compare(candidatePassword, this.password, function(err, isMatch) {
    if (err) return cb(err);
    cb(null, isMatch);
  });
};


module.exports = mongoose.model('User', userSchema);