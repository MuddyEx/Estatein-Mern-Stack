const mongoose = require('mongoose');

const agentSchema = new mongoose.Schema({
  fullName: { type: String, required: true },
  username: { type: String, required: true, unique: true }, // Replaced agentId with username
  email: { type: String, required: true, unique: true },
  phone: { type: String, required: true },
  address: { type: String, required: true },
  passportPhoto: { type: String, required: true }, // URL from Cloudinary
  certificate: { type: String, required: true }, // URL from Cloudinary
  status: { type: String, default: 'pending', enum: ['pending', 'approved', 'rejected', 'banned'] },
  statusReason: { type: String }, // Reason for rejection or ban
  password: { type: String, required: true },
  otp: { type: String },
  verified: { type: Boolean, default: false },
  active: { type: Boolean, default: true }, // For soft delete functionality
}, { timestamps: true });

const Agent = mongoose.model('Agent', agentSchema);
console.log('Agent model created');
module.exports = Agent;