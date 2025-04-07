
const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  fullName: { 
    type: String, 
    required: true 
  },
  email: { 
    type: String, 
    required: true, 
    unique: true 
  },
  password: { 
    type: String, 
    required: true 
  },
  role: { 
    type: String, 
    default: 'user' 
  },
  otp: { 
    type: String 
  }, // Store OTP for verification
  verified: { 
    type: Boolean, 
    default: false 
  }, // Email verification status
  active: { 
    type: Boolean, 
    default: true 
  }, // New field to track active/inactive status
}, { timestamps: true });

const User = mongoose.model('User', userSchema);
console.log('User model created');
module.exports = User;