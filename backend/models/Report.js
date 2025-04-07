const mongoose = require('mongoose');

const reportSchema = new mongoose.Schema({
  propertyId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Property',
    required: true
  },
  propertyTitle: {
    type: String,
    required: true
  },
  propertyLocation: {
    type: String,
    required: true
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userName: {
    type: String,
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  reason: {
    type: String,
    required: true,
    enum: ['incorrect_info', 'suspicious', 'inappropriate', 'scam', 'other']
  },
  details: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'resolved', 'dismissed'],
    default: 'pending'
  },
  reportDate: {
    type: Date,
    default: Date.now
  },
  resolvedDate: {
    type: Date
  },
  resolvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Admin'
  }
});

module.exports = mongoose.model('Report', reportSchema);