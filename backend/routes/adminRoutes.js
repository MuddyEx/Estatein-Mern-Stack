const express = require('express');
const router = express.Router();
const { 
  createAdmin,
  validateAgent, 
  viewAllAgents, 
  getAgentDetails,
  banOrDeleteAgent,
  sendEmailToAgents,
  getPendingAgents,
  getAllUsers,
  deactivateUser,
  deleteApartment,
  getAllReports,
  resolveReport,
  updateAdminProfile,
  approveApartment,
  declineApartment,
  verifyOTP,
  resendOTP,
  getAdminProfile
} = require('../controllers/adminController');
const { protect, admin } = require('../middleware/auth');

// Authentication routes
router.post('/verify-otp', verifyOTP);
router.post('/resend-otp', resendOTP);

// Agent management routes
router.put('/agents/:agentId/validate', protect, admin, validateAgent);
router.get('/agents', protect, admin, viewAllAgents);
router.get('/agents/pending', protect, admin, getPendingAgents);
router.get('/agents/:agentId', protect, admin, getAgentDetails);
router.post('/agents/ban-delete', protect, admin, banOrDeleteAgent);
router.post('/agents/send-email', protect, admin, sendEmailToAgents);

// User management routes
router.get('/users', protect, admin, getAllUsers);
router.put('/users/:id/toggle-status', protect, admin, deactivateUser);

// Apartment management routes
router.delete('/apartments/:id', protect, admin, deleteApartment);
router.put('/apartments/:apartmentId/approve', protect, admin, approveApartment);
router.put('/apartments/:apartmentId/decline', protect, admin, declineApartment);

// Report management routes
router.get('/reports', protect, admin, getAllReports);
router.put('/reports/:id/resolve', protect, admin, resolveReport);

// Admin profile routes
router.post('/create', createAdmin);
router.get('/profile', protect, admin, getAdminProfile);
router.put('/profile', protect, admin, updateAdminProfile);

console.log('Admin routes loaded');
module.exports = router;