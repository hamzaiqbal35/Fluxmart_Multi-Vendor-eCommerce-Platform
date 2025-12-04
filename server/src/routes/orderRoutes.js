const express = require('express');
const router = express.Router();
const {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrder,
  cancelOrder,
  updateOrderStatus,
  getAllOrders,
  updateOrderPaymentToggle,
  fixOrderConsistency,
  requestOrderCancellation
} = require('../controllers/orderController');
const { protect, authorize } = require('../middleware/auth');
const { validateUpdateOrder, validateCancelOrder } = require('../middleware/orderValidation');

router.use(protect);

router.post('/', createOrder);
router.get('/my-orders', getMyOrders);
router.get('/all', authorize('admin', 'vendor'), getAllOrders);
router.get('/:id', getOrder);

router.put('/:id', validateUpdateOrder, updateOrder);
router.put('/:id/cancel', validateCancelOrder, cancelOrder);

router.put('/:id/status', authorize('admin', 'vendor'), updateOrderStatus);
router.put('/:id/pay', authorize('admin', 'vendor'), updateOrderPaymentToggle);
router.put('/:id/cancel-request', authorize('vendor'), requestOrderCancellation);

// Admin utility route to fix inconsistent orders
router.put('/:id/fix-consistency', authorize('admin'), fixOrderConsistency);

module.exports = router;