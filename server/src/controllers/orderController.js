const mongoose = require('mongoose');
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
      const shippingPrice = 10;
      const taxPrice = orderItemsPrice * 0.1;
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

    cart.items = [];
    await cart.save();

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

// @desc    Update order (customer updates items before shipping)
const updateOrder = async (req, res) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const session = isProduction ? await mongoose.startSession() : null;
  
  if (isProduction) {
    session.startTransaction();
  }
  
  try {
    const { id } = req.params;
    const { orderItems } = req.body;
    const userId = req.user._id;

    // Find the order with the current items
    const order = await Order.findById(id)
      .populate('orderItems.product')
      .populate('orderItems.vendor');

    if (!order) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(404).json({ message: 'Order not found' });
    }

    if (order.user.toString() !== userId.toString()) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(403).json({ message: 'Not authorized to update this order' });
    }

    if (order.status !== 'pending') {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ message: 'Can only edit pending orders' });
    }

    if (order.isPaid || order.isShipped) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ message: 'Cannot edit paid or shipped orders' });
    }

    if (!orderItems || orderItems.length === 0) {
      if (isProduction) {
        await session.abortTransaction();
        session.endSession();
      }
      return res.status(400).json({ message: 'Order must contain at least one item' });
    }

    // Create a map of current order items for quick lookup
    const currentItems = new Map();
    order.orderItems.forEach(item => {
      if (item.product && item.product._id) {
        currentItems.set(item.product._id.toString(), {
          quantity: item.quantity,
          product: item.product
        });
      }
    });

    let itemsPrice = 0;
    const updatedOrderItems = [];
    const productUpdates = [];

    // First pass: Calculate stock changes
    for (const item of orderItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        if (isProduction) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(404).json({ message: `Product ${item.product} not found` });
      }

      const currentQty = currentItems.get(item.product)?.quantity || 0;
      const newQty = item.quantity;

      // Calculate the actual change in quantity
      const quantityChange = newQty - currentQty;

      // Verify stock is sufficient for ADDITIONS only
      if (quantityChange > 0 && product.stock < quantityChange) {
        if (isProduction) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(400).json({
          message: `Not enough stock for ${product.name}. Available: ${product.stock}` 
        });
      }

      if (newQty < 1) {
        if (isProduction) {
          await session.abortTransaction();
          session.endSession();
        }
        return res.status(400).json({ message: 'Item quantity must be at least 1' });
      }

      // Store the update - FIXED: No negation needed
      if (quantityChange !== 0) {
        productUpdates.push({
          productId: product._id,
          stockChange: -quantityChange, // Negative of quantity change (adding to order = reducing stock)
          currentQty,
          newQty
        });
      }

      updatedOrderItems.push({
        name: product.name,
        quantity: newQty,
        image: product.image || (product.images && product.images[0]) || '',
        price: product.price,
        product: product._id,
        vendor: product.vendor
      });

      itemsPrice += product.price * newQty;
    }

    // Handle items that were removed from the order (not in new orderItems)
    for (const [productId, itemData] of currentItems.entries()) {
      const stillInOrder = orderItems.some(item => item.product === productId);
      if (!stillInOrder) {
        // Item was removed entirely - restore stock
        productUpdates.push({
          productId: productId,
          stockChange: itemData.quantity, // Return the quantity back to stock
          currentQty: itemData.quantity,
          newQty: 0
        });
      }
    }

    // Second pass: Apply stock updates
    for (const update of productUpdates) {
      const updateQuery = Product.findByIdAndUpdate(
        update.productId,
        { $inc: { stock: update.stockChange } },
        isProduction ? { session } : {}
      );
      await updateQuery;
    }

    // Update order
    const taxPrice = itemsPrice * 0.1;
    const shippingPrice = order.shippingPrice;
    const totalPrice = itemsPrice + taxPrice + shippingPrice;

    order.orderItems = updatedOrderItems;
    order.itemsPrice = itemsPrice;
    order.taxPrice = taxPrice;
    order.totalPrice = totalPrice;

    if (isProduction) {
      await order.save({ session });
      await session.commitTransaction();
      session.endSession();
    } else {
      await order.save();
    }

    res.json({
      success: true,
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    if (isProduction && session) {
      await session.abortTransaction();
      session.endSession();
    }
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

    const order = await Order.findById(id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check ownership or admin status
    const isAdmin = req.user.role === 'admin';
    const isOrderOwner = order.user.toString() === userId.toString();
    
    if (!isOrderOwner && !isAdmin) {
      return res.status(403).json({ message: 'Not authorized to cancel this order' });
    }

    // Only pending or processing can be cancelled
    if (!['pending', 'processing'].includes(order.status)) {
      return res.status(400).json({
        message: `Cannot cancel ${order.status} orders.`
      });
    }

    if (order.isShipped) {
      return res.status(400).json({ message: 'Cannot cancel shipped orders' });
    }

    // Restore stock
    for (const item of order.orderItems) {
      const product = await Product.findById(item.product);
      if (product) {
        product.stock += item.quantity;
        await product.save();
      }
    }

    // MARK ORDER AS CANCELLED
    order.status = 'cancelled';
    order.cancellationReason = reason;
    order.cancelledAt = new Date();

    // RESET ALL STATUS FLAGS TO MAINTAIN CONSISTENCY
    order.isShipped = false;
    order.shippedAt = null;
    order.isDelivered = false;
    order.deliveredAt = null;

    // FORCE UNPAID ON CANCEL
    if (order.isPaid) {
      order.isRefunded = true;
      order.refundedAt = new Date();
    }

    order.isPaid = false;
    order.paidAt = null;

    await order.save();

    res.json({
      success: true,
      message: 'Order cancelled successfully.',
      order
    });

  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Get single order
const getOrder = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('user', 'name email')
      .populate('orderItems.product', 'name images stock')
      .populate('orderItems.vendor', 'name email vendorInfo.businessName');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    if (order.user._id.toString() !== req.user._id.toString() && 
        req.user.role !== 'admin' && 
        !order.orderItems.some(item => item.vendor._id.toString() === req.user._id.toString())) {
      return res.status(403).json({ message: 'Not authorized' });
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
// @access  Private (admin/vendor)
const updateOrderStatus = async (req, res) => {
  try {
    const { status, trackingNumber } = req.body;
    const order = await Order.findById(req.params.id)
      .populate('user', 'email name');

    if (!order) return res.status(404).json({ message: 'Order not found' });

    // Check if order is cancelled
    if (order.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Cannot update status of cancelled orders' 
      });
    }

    const isVendor = order.orderItems.some(
      item => item.vendor.toString() === req.user._id.toString()
    );

    if (!isVendor && req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Not authorized' });
    }

    // Validate status transitions
    const validStatuses = ['pending', 'processing', 'shipped', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      return res.status(400).json({ 
        message: `Invalid status. Must be one of: ${validStatuses.join(', ')}` 
      });
    }

    // Update status
    order.status = status;
    if (trackingNumber) order.trackingNumber = trackingNumber;
    
    // CRITICAL: Synchronize all status-related fields based on the main status
    switch (status) {
      case 'pending':
        order.isShipped = false;
        order.shippedAt = null;
        order.isDelivered = false;
        order.deliveredAt = null;
        break;
        
      case 'processing':
        order.isShipped = false;
        order.shippedAt = null;
        order.isDelivered = false;
        order.deliveredAt = null;
        break;
        
      case 'shipped':
        order.isShipped = true;
        if (!order.shippedAt) order.shippedAt = new Date();
        order.isDelivered = false;
        order.deliveredAt = null;
        break;
        
      case 'delivered':
        order.isShipped = true;
        if (!order.shippedAt) order.shippedAt = new Date();
        order.isDelivered = true;
        if (!order.deliveredAt) order.deliveredAt = new Date();
        break;
        
      case 'cancelled':
        // Restore product stock when order is cancelled
        for (const item of order.orderItems) {
          if (item.product) {
            await Product.findByIdAndUpdate(
              item.product._id,
              { $inc: { stock: item.quantity } }
            );
          }
        }
        order.isShipped = false;
        order.shippedAt = null;
        order.isDelivered = false;
        order.deliveredAt = null;
        order.cancelledAt = new Date();
        break;
    }

    await order.save();

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

// @desc    Get all orders
const getAllOrders = async (req, res) => {
  try {
    let query = {};

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

// @desc    Toggle payment status
// @route   PUT /api/orders/:id/pay
// @access  Private (admin/vendor)
const updateOrderPaymentToggle = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Prevent payment status changes on cancelled orders
    if (order.status === 'cancelled') {
      return res.status(400).json({ 
        message: 'Cannot update payment status of cancelled orders' 
      });
    }

    const isVendor = order.orderItems.some(
      (item) => item.vendor.toString() === req.user._id.toString()
    );

    if (req.user.role !== 'admin' && !isVendor) {
      return res.status(401).json({ message: 'Not authorized to update payment' });
    }

    order.isPaid = !order.isPaid;
    order.paidAt = order.isPaid ? Date.now() : null;

    const updatedOrder = await order.save();
    res.json(updatedOrder);
  } catch (error) {
    res.status(500).json({ message: error.message });
  }
};

// @desc    Fix inconsistent order data (utility function for admins)
// @route   PUT /api/orders/:id/fix-consistency
// @access  Private (admin only)
const fixOrderConsistency = async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (req.user.role !== 'admin') {
      return res.status(403).json({ message: 'Admin access required' });
    }

    // Fix inconsistencies based on the main status field
    const originalStatus = { ...order.toObject() };
    
    switch (order.status) {
      case 'pending':
      case 'processing':
        order.isShipped = false;
        order.shippedAt = null;
        order.isDelivered = false;
        order.deliveredAt = null;
        break;
        
      case 'shipped':
        order.isShipped = true;
        if (!order.shippedAt) order.shippedAt = new Date();
        order.isDelivered = false;
        order.deliveredAt = null;
        break;
        
      case 'delivered':
        order.isShipped = true;
        if (!order.shippedAt) order.shippedAt = new Date();
        order.isDelivered = true;
        if (!order.deliveredAt) order.deliveredAt = new Date();
        break;
        
      case 'cancelled':
        order.isShipped = false;
        order.shippedAt = null;
        order.isDelivered = false;
        order.deliveredAt = null;
        order.isPaid = false;
        order.paidAt = null;
        if (!order.cancelledAt) order.cancelledAt = new Date();
        break;
    }

    await order.save();

    res.json({
      success: true,
      message: 'Order consistency fixed',
      changes: {
        before: originalStatus,
        after: order
      }
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
  getAllOrders,
  updateOrderPaymentToggle,
  fixOrderConsistency
};