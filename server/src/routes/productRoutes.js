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
const { uploadProductImages } = require('../middleware/upload');

router.get('/', getProducts);
router.get('/:id', getProduct);
router.post('/', protect, authorize('vendor', 'admin'), createProduct);
router.put('/:id', protect, updateProduct);
router.delete('/:id', protect, deleteProduct);
router.post('/:id/reviews', protect, addReview);

// New route for uploading product images
router.post(
  '/upload-images',
  protect,
  authorize('vendor', 'admin'),
  uploadProductImages.array('images', 5), // Allow up to 5 images
  uploadImages
);

module.exports = router;