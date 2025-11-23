const mongoose = require('mongoose');
const Category = require('../models/Category');

// @desc    Get all categories
// @route   GET /api/categories
// @access  Public
const getCategories = async (req, res) => {
  try {
    const { search, isActive } = req.query;
    const query = {};

    if (search) {
      query.name = { $regex: search, $options: 'i' };
    }

    // Only apply isActive filter if explicitly set to 'false'
    if (isActive === 'false') {
      query.isActive = false;
    } else if (isActive === 'true') {
      query.isActive = true;
    }
    // If isActive is not provided, get all categories regardless of status

    const categories = await Category.find(query).sort({ name: 1 });
    res.json({
      success: true,
      count: categories.length,
      data: categories,
    });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Get single category
// @route   GET /api/categories/:id
// @access  Public
const getCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with id of ${req.params.id}`,
      });
    }
    res.json({ success: true, data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};

// @desc    Create new category
// @route   POST /api/categories
// @access  Private/Admin
const createCategory = async (req, res) => {
  try {
    // Check if category with same name already exists (case insensitive)
    const existingCategory = await Category.findOne({
      name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
    });

    if (existingCategory) {
      return res.status(400).json({
        success: false,
        message: 'A category with this name already exists',
      });
    }

    const category = await Category.create(req.body);
    res.status(201).json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Update category
// @route   PUT /api/categories/:id
// @access  Private/Admin
const updateCategory = async (req, res) => {
  try {
    // Check if category exists
    let category = await Category.findById(req.params.id);
    if (!category) {
      return res.status(404).json({
        success: false,
        message: `Category not found with id of ${req.params.id}`,
      });
    }

    // Check if another category with the same name already exists (case insensitive)
    if (req.body.name) {
      const existingCategory = await Category.findOne({
        _id: { $ne: req.params.id }, // Exclude current category
        name: { $regex: new RegExp(`^${req.body.name}$`, 'i') },
      });

      if (existingCategory) {
        return res.status(400).json({
          success: false,
          message: 'A category with this name already exists',
        });
      }
    }

    category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });

    res.json({ success: true, data: category });
  } catch (error) {
    res.status(400).json({ success: false, message: error.message });
  }
};

// @desc    Delete category
// @route   DELETE /api/categories/:id
// @access  Private/Admin
const deleteCategory = async (req, res) => {
  try {
    console.log('Attempting to delete category:', req.params.id);
    
    // 1. Find the category
    const category = await Category.findById(req.params.id);

    if (!category) {
      console.log('Category not found:', req.params.id);
      return res.status(404).json({
        success: false,
        message: `Category not found with id of ${req.params.id}`,
      });
    }

    // 2. Check for active products in this category by name (since category is stored as string in Product)
    const productCount = await mongoose.model('Product').countDocuments({
      category: category.name,  // Changed from category._id to category.name
      isActive: true
    });

    console.log(`Found ${productCount} active products in category "${category.name}"`);

    if (productCount > 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot delete category with active products. Please deactivate or move the products first.',
      });
    }

    // 3. If no products, perform hard delete
    console.log('No active products found, proceeding with category deletion');
    await Category.findByIdAndDelete(req.params.id);
    
    console.log('Category deleted successfully:', category.name);
    
    res.json({ 
      success: true, 
      message: 'Category deleted successfully',
      data: { id: category._id }
    });
    
  } catch (error) {
    console.error('Error deleting category:', {
      error: error.message,
      stack: error.stack,
      categoryId: req.params.id
    });
    
    res.status(500).json({ 
      success: false, 
      message: 'Server error while deleting category',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

module.exports = {
  getCategories,
  getCategory,
  createCategory,
  updateCategory,
  deleteCategory,
};