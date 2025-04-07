const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: [true, 'User ID is required']
  },
  apartmentId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Apartment',
    required: [true, 'Apartment ID is required']
  },
  bookingData: {
    checkIn: { type: Date, required: true },
    checkOut: { type: Date, required: true },
    adults: { type: Number, required: true },
    children: { type: Number, default: 0 },
    additionalInfo: String,
    totalAmount: { type: Number, required: true }
  },
  amount: {
    type: Number,
    required: [true, 'Amount is required'],
    min: [1, 'Amount must be greater than 0']
  },
  adminCommission: {
    type: Number,
    required: true,
    default: 0
  },
  agentAmount: {
    type: Number,
    required: true,
    default: 0
  },
  type: {
    type: String,
    enum: ['booking', 'commission'],
    default: 'booking'
  },
  currency: {
    type: String,
    default: 'NGN',
    enum: ['NGN']
  },
  status: {
    type: String,
    enum: ['pending', 'completed', 'failed'],
    default: 'pending'
  },
  transactionReference: {
    type: String,
    required: true,
    index: { unique: true }
  },
  paymentMethod: {
    type: String,
    enum: ['card', 'bank_transfer', 'ussd'],
    required: true
  },
  paymentDate: {
    type: Date
  },
  metadata: {
    type: mongoose.Schema.Types.Mixed
  }
}, { timestamps: true });

// Indexes for faster queries
paymentSchema.index({ userId: 1, status: 1 });
paymentSchema.index({ type: 1, status: 1 });

module.exports = mongoose.model('Payment', paymentSchema); 