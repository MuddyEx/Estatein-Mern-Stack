const express = require('express');
const router = express.Router();
const { protect } = require('../middleware/auth');
const {
  initializePayment,
  verifyPayment,
  handleWebhook,
  getPaymentHistory
} = require('../controllers/paymentController');

// Protected routes (require authentication)
router.post('/initialize', protect, initializePayment);
router.get('/verify/:transactionReference', protect, verifyPayment);
router.get('/history', protect, getPaymentHistory);

// Webhook route (public)
router.post('/webhook', handleWebhook);

module.exports = router; 