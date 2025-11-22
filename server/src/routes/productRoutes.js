const express = require('express');
const router = express.Router();
const {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  uploadImages
} = require('../controllers/productController');
const { protect, authorize } = require('../middleware/auth');
const { isVerifiedVendor } = require('../middleware/isVerifiedVendor');
const { uploadProductImages } = require('../middleware/upload');

router.get('/', getProducts);
router.get('/:id', getProduct);
// Only vendors can create products
router.post('/', protect, authorize('vendor'), isVerifiedVendor, createProduct);

// Both admins and vendors can update products (with different permissions in controller)
router.put('/:id', protect, authorize(['admin', 'vendor']), updateProduct);

// Both admins and vendors can delete products (with different permissions in controller)
router.delete('/:id', protect, authorize(['admin', 'vendor']), deleteProduct);
router.post('/:id/reviews', protect, addReview);

// New route for uploading product images
router.post(
  '/upload-images',
  protect,
  authorize('vendor'),
  isVerifiedVendor,
  uploadProductImages.array('images', 5), // Allow up to 5 images
  uploadImages
);

module.exports = router;