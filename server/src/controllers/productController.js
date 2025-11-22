const Product = require('../models/Product');

// @desc    Get all products
// @route   GET /api/products
// @access  Public
const getProducts = async (req, res) => {
  try {
    const { category, search, vendor, page = 1, limit = 12 } = req.query;
    const query = { isActive: true };

    if (category) query.category = category;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } }
      ];
    }
    if (vendor) query.vendor = vendor;

    const products = await Product.find(query)
      .populate('vendor', 'name email vendorInfo.businessName')
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .sort({ createdAt: -1 });

    const total = await Product.countDocuments(query);

    res.json({
      success: true,
      products,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single product
// @route   GET /api/products/:id
// @access  Public
const getProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id)
      .populate('vendor', 'name email vendorInfo.businessName vendorInfo.businessDescription')
      .populate('reviews.user', 'name avatar');

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Create product
// @route   POST /api/products
// @access  Private/Vendor
const createProduct = async (req, res) => {
  try {
    const product = await Product.create({
      ...req.body,
      vendor: req.user._id
    });

    const populatedProduct = await Product.findById(product._id)
      .populate('vendor', 'name email vendorInfo.businessName');

    res.status(201).json({
      success: true,
      product: populatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update product
// @route   PUT /api/products/:id
// @access  Private/Vendor
const updateProduct = async (req, res) => {
  try {
    let product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // If user is admin, only allow updating isActive status
    if (req.user.role === 'admin') {
      if (Object.keys(req.body).length > 1 || req.body.isActive === undefined) {
        return res.status(403).json({ 
          success: false,
          message: 'Admins can only update the isActive status of products' 
        });
      }
      
      // Update only the isActive status
      const updatedProduct = await Product.findByIdAndUpdate(
        req.params.id,
        { isActive: req.body.isActive },
        { new: true, runValidators: true }
      ).populate('vendor', 'name email vendorInfo.businessName');
      
      return res.json({
        success: true,
        product: updatedProduct
      });
    }
    
    // For vendors, check ownership and allow full update
    if (product.vendor.toString() !== req.user._id.toString()) {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to update this product' 
      });
    }

    product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true
    }).populate('vendor', 'name email vendorInfo.businessName');

    res.json({
      success: true,
      product
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Delete product
// @route   DELETE /api/products/:id
// @access  Private/Vendor
const deleteProduct = async (req, res) => {
  try {
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user is either the product owner or an admin
    if (product.vendor.toString() !== req.user._id.toString() && req.user.role !== 'admin') {
      return res.status(403).json({ 
        success: false,
        message: 'Not authorized to delete this product' 
      });
    }

    await product.deleteOne();

    res.json({
      success: true,
      message: 'Product deleted'
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Add product review
// @route   POST /api/products/:id/reviews
// @access  Private
const addReview = async (req, res) => {
  try {
    const { rating, comment } = req.body;
    const product = await Product.findById(req.params.id);

    if (!product) {
      return res.status(404).json({ message: 'Product not found' });
    }

    // Check if user already reviewed
    const alreadyReviewed = product.reviews.find(
      review => review.user.toString() === req.user._id.toString()
    );

    if (alreadyReviewed) {
      return res.status(400).json({ message: 'Product already reviewed' });
    }

    product.reviews.push({
      user: req.user._id,
      rating,
      comment
    });

    await product.save();

    const updatedProduct = await Product.findById(req.params.id)
      .populate('reviews.user', 'name avatar');

    res.status(201).json({
      success: true,
      product: updatedProduct
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Upload product images
// @route   POST /api/products/upload-images
// @access  Private/Vendor
const uploadImages = async (req, res) => {
  try {
    if (!req.files || req.files.length === 0) {
      return res.status(400).json({ message: 'Please upload at least one image' });
    }

    // Generate URLs for uploaded images
    const imageUrls = req.files.map(file => `/uploads/products/${file.filename}`);

    res.json({
      success: true,
      images: imageUrls
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  getProducts,
  getProduct,
  createProduct,
  updateProduct,
  deleteProduct,
  addReview,
  uploadImages
};