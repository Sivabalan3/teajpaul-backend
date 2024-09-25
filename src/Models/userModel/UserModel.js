const mongoose = require('mongoose');

// Define the User Schema
const userSchema = new mongoose.Schema({
  username: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  email: {
    type: String,
    required: true,
    trim: true,
    unique: true,
    lowercase: true,
    match: [/.+\@.+\..+/, 'Please enter a valid email address']
  },
  password: {
    type: String,
    required: true,
    // minlength: 6
  }
}, { timestamps: true });

// Method to compare passwords (without hashing)
userSchema.methods.comparePassword = function (candidatePassword) {
  return candidatePassword === this.password;
};

// Create the User Model
const User = mongoose.model('User', userSchema);

module.exports = User;
