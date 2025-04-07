const express = require('express');
const router = express.Router();
const { protect, restrictTo } = require('../middleware/authMiddleware');
const {
  createReport,
  getAllReports,
  updateReportStatus
} = require('../controllers/reportController');

// Protected routes (require authentication)
router.post('/properties/report', protect, createReport);

// Admin only routes
router.get('/reports', protect, restrictTo('admin'), getAllReports);
router.patch('/reports/:reportId/status', protect, restrictTo('admin'), updateReportStatus);

module.exports = router; 