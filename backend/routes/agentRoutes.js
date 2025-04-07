const express = require('express');
const router = express.Router();
const { 
  registerAgent, 
  loginAgent, 
  getAgentProfile,
  updateAgentProfile,
  postApartment,
  getAgentApartments,
  updateApartment,
  deleteApartment,
  deleteAgentAccount,
  getApartments,
  getApartmentById,
  verifyOTP,
  resendOTP,
  getAgentTransactions
} = require('../controllers/agentController');
const { protect } = require('../middleware/auth');

// Agent authentication routes
router.post('/register', registerAgent);
router.post('/login', loginAgent);
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Protected agent routes
router.get('/profile', protect, getAgentProfile);
router.put('/profile', protect, updateAgentProfile);
router.post('/apartments', protect, postApartment);
router.get('/apartments', protect, getAgentApartments);
router.put('/apartments/:id', protect, updateApartment);
router.delete('/apartments/:id', protect, deleteApartment);
router.delete('/account', protect, deleteAgentAccount);
router.get('/transactions', protect, getAgentTransactions);

// Property fetch routes (accessible to all)
router.get('/all-apartments', getApartments);
router.get('/apartments/:id', getApartmentById);

console.log('Agent routes loaded');
module.exports = router;