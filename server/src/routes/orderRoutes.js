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
  updateOrderPaymentToggle
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

// UPDATED: this replaces /pay fixed version
router.put('/:id/pay', authorize('admin', 'vendor'), updateOrderPaymentToggle);

module.exports = router;
