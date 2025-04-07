const mongoose = require('mongoose');

const adminSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true }, // Hashed with bcrypt
  role: { type: String, default: 'admin' },
  profilePicture: { type: String, default: '' },
  otp: { type: String }, // Store OTP for verification
  verified: { type: Boolean, default: false }, // Email verification status
}, { timestamps: true });

const Admin = mongoose.model('Admin', adminSchema);
console.log('Admin model created');
module.exports = Admin;