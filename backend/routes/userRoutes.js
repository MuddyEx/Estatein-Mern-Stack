const express = require('express');
const router = express.Router();
const { 
  registerUser, 
  loginUser, 
  getUserProfile, 
  updateUserProfile,
  verifyOTP,
  resendOTP,
  viewApartments,
  bookInspection,
  makePayment,
  reportApartment,
  getApartmentById,
  deleteUserAccount,
  contactAgent,
  getUserBookings
} = require('../controllers/userController');
const { protect } = require('../middleware/auth');

// Authentication routes
router.post('/register', registerUser);
router.post('/login', loginUser);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Apartment routes (some don't require auth)
router.get('/apartments', viewApartments);
router.get('/apartments/:id', getApartmentById);

// Protected routes - require authentication
router.get('/profile', protect, getUserProfile);
router.put('/profile', protect, updateUserProfile);
router.get('/bookings', protect, getUserBookings);
router.post('/book-inspection', protect, bookInspection);
router.post('/pay', protect, makePayment);
router.post('/report', protect, reportApartment);
router.delete('/account', protect, deleteUserAccount);
router.post('/contact', protect, contactAgent);

console.log('User routes loaded');
module.exports = router;