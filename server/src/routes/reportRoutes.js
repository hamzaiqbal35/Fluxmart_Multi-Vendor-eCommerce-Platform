const express = require('express');
const router = express.Router();
const { protect, authorize } = require('../middleware/auth');
const {
  getSalesReport,
  getTopProducts,
  getTopCategories,
  exportReport
} = require('../controllers/reportController');

// Admin routes (protected by admin middleware)
router.get('/sales', protect, authorize('admin'), getSalesReport);
router.get('/top-products', protect, authorize('admin'), getTopProducts);
router.get('/top-categories', protect, authorize('admin'), getTopCategories);
router.get('/export', protect, authorize('admin'), exportReport);

module.exports = router;