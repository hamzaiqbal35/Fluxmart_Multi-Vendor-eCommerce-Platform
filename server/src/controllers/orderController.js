const Order = require('../models/Order');
const Product = require('../models/Product');
const User = require('../models/User');
const Cart = require('../models/Cart');
const { sendOrderConfirmationEmail, sendOrderStatusUpdateEmail } = require('../services/emailService');

// @desc    Create new order
// @route   POST /api/orders
// @access  Private
const createOrder = async (req, res) => {
  try {
    const { shippingAddress, paymentMethod } = req.body;

    const cart = await Cart.findOne({ user: req.user._id })
      .populate('items.product');

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: 'Cart is empty' });
    }

    // Group items by vendor
    const itemsByVendor = {};
    let itemsPrice = 0;

    for (const item of cart.items) {
      const product = await Product.findById(item.product._id);
      
      if (product.stock < item.quantity) {
        return res.status(400).json({ 
          message: `Insufficient stock for ${product.name}` 
        });
      }

      const vendorId = product.vendor.toString();
      if (!itemsByVendor[vendorId]) {
        itemsByVendor[vendorId] = [];
      }

      itemsByVendor[vendorId].push({
        product: product._id,
        name: product.name,
        image: product.images[0] || '',
        price: product.price,
        quantity: item.quantity,
        vendor: vendorId
      });

      itemsPrice += product.price * item.quantity;
    }

    // Create orders for each vendor
    const orders = [];
    for (const vendorId in itemsByVendor) {
      const orderItems = itemsByVendor[vendorId];
      const orderItemsPrice = orderItems.reduce((sum, item) => sum + (item.price * item.quantity), 0);
      const shippingPrice = 10; // Fixed shipping price
      const taxPrice = orderItemsPrice * 0.1; // 10% tax
      const totalPrice = orderItemsPrice + shippingPrice + taxPrice;

      const order = await Order.create({
        user: req.user._id,
        orderItems,
        shippingAddress,
        paymentMethod,
        itemsPrice: orderItemsPrice,
        shippingPrice,
        taxPrice,
        totalPrice,
        status: 'pending'
      });

      // Update product stock
      for (const item of orderItems) {
        await Product.findByIdAndUpdate(item.product, {
          $inc: { stock: -item.quantity }
        });
      }

      orders.push(order);
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    // Send confirmation email
    try {
      await sendOrderConfirmationEmail(req.user.email, orders);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.status(201).json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get user orders
// @route   GET /api/orders
// @access  Private
const getMyOrders = async (req, res) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .populate('orderItems.product', 'name images')
      .populate('orderItems.vendor', 'name vendorInfo.businessName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order items (before shipping)
// @route   PUT /api/orders/:id
// @access  Private
const updateOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { orderItems } = req.body;
    const userId = req.user._id;

    // Find order
    const order = await Order.findById(id).populate('orderItems.product').populate('orderItems.vendor');
    
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    // Check if order can be edited
    if (order.status !== 'pending') {
      return res.status(400).json({ message: 'Can only edit pending orders' });
    }

    if (order.isPaid) {
      return res.status(400).json({ message: 'Cannot edit paid orders' });
    }

    if (order.isShipped) {
      return res.status(400).json({ message: 'Cannot edit shipped orders' });
    }

    // Validate order items
    if (!orderItems || orderItems.length === 0) {
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    let itemsPrice = 0;
    const updatedOrderItems = [];

    for (const item of orderItems) {
      const product = await Product.findById(item.product);

      if (!product) {
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      // Check stock
      if (item.quantity > product.stock) {
        return res.status(400).json({
          message: `Not enough stock for ${product.name}. Available: ${product.stock}`
        });
      }

      if (item.quantity < 1) {
        return res.status(400).json({ message: 'Item quantity must be at least 1' });
      }

      updatedOrderItems.push({
        name: product.name,
        quantity: item.quantity,
        image: product.image || product.images?.[0] || '',
        price: product.price,
        product: product._id,
        vendor: product.vendor
      });

      itemsPrice += product.price * item.quantity;
    }

    // Calculate new totals
    const taxPrice = itemsPrice * 0.1; // 10% tax
    const shippingPrice = order.shippingPrice; // Keep same shipping
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    // Update order
    order.orderItems = updatedOrderItems;
    order.itemsPrice = itemsPrice;
    order.taxPrice = taxPrice;
    order.totalPrice = totalPrice;

    await order.save();

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Cancel order (before shipping)
// @route   PUT /api/orders/:id/cancel
// @access  Private
const cancelOrder = async (req, res) => {
  try {
    const { id } = req.params;
    const { reason } = req.body;
    const userId = req.user._id;

    // Find order
    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership
    if (order.user.toString() !== userId.toString()) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Check if order can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel ${order.status} orders. Only pending or processing orders can be cancelled.`
      });
    }

    if (order.isShipped) {
      return res.status(400).json({ message: 'Cannot cancel shipped orders' });
    }

    // Restore product stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // Update order
    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    // Process refund if already paid
    if (order.isPaid) {
      order.isRefunded = true;
      order.refundedAt = new Date();
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully. Refund will be processed within 5-7 business days.',
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order
// @route   GET /api/orders/:id
// @access  Private
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images stock')
      .populate('orderItems.vendor', 'name email vendorInfo.businessName');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if user is authorized
    if (order.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        !order.orderItems.some(item => item.vendor._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized to view this order' });
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Update order status
// @route   PUT /api/orders/:id/status
// @access  Private/Vendor/Admin
const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('user', 'email name');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check authorization
    const isVendor = order.orderItems.some(
      item => item.vendor.toString() === req.user._id.toString()
    );

    if (!isVendor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    
    if (status === 'delivered') {
      order.isDelivered = true;
      order.deliveredAt = new Date();
    }

    await order.save();

    // Send status update email
    try {
      await sendOrderStatusUpdateEmail(order.user.email, order);
    } catch (emailError) {
      console.error('Email sending failed:', emailError);
    }

    res.json({
      success: true,
      order
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get all orders (Admin/Vendor)
// @route   GET /api/orders/all
// @access  Private/Admin/Vendor
const getAllOrders = async (req, res) => {
  try {
    let query = {};

    // If vendor, only show their orders
    if (req.user.role === 'vendor') {
      query = { 'orderItems.vendor': req.user._id };
    }

    const orders = await Order.find(query)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images')
      .populate('orderItems.vendor', 'name vendorInfo.businessName')
      .sort({ createdAt: -1 });

    res.json({
      success: true,
      orders
    });
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

module.exports = {
  createOrder,
  getMyOrders,
  getOrder,
  updateOrder,
  cancelOrder,
  updateOrderStatus,
  getAllOrders
};
