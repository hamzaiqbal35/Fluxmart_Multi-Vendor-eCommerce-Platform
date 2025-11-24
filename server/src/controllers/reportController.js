const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const User = require('../models/User');
const { format, subDays, startOfDay, endOfDay } = require('date-fns');
const { Parser } = require('json2csv');

// Get sales report with date range
const getSalesReport = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    // Input validation
    if (!startDate || !endDate) {
      return res.status(400).json({ message: 'Start date and end date are required' });
    }

    // Parse dates and set time to start/end of day in UTC
    const start = new Date(startDate);
    start.setUTCHours(0, 0, 0, 0);
    
    const end = new Date(endDate);
    end.setUTCHours(23, 59, 59, 999);

    // Log the filter for debugging
    const filter = {
      status: { $ne: 'cancelled' },
      createdAt: {
        $gte: start,
        $lte: end
      }
    };

    // Get all orders in the date range with populated product and user details
    const orders = await Order.find(filter)
      .populate({
        path: 'orderItems.product',
        select: 'category',
        model: 'Product'
      })
      .populate('user', 'name email');

    // Calculate totals
    const totalSales = orders.reduce((sum, order) => sum + order.totalPrice, 0);
    const totalOrders = orders.length;
    const avgOrderValue = totalOrders > 0 ? totalSales / totalOrders : 0;

    // Get top category
    const categorySales = {};
    orders.forEach((order) => {
      order.orderItems?.forEach((item) => {
        // Get category from populated product or fallback to item.category
        const categoryName = item.product?.category?.name || 
                           item.product?.category || 
                           item.category || 
                           'Uncategorized';
                           
        categorySales[categoryName] = (categorySales[categoryName] || 0) + (item.price * item.quantity);
      });
    });

    // Find top selling category
    let topCategory = 'N/A';
    let maxSales = 0;
    for (const [category, sales] of Object.entries(categorySales)) {
      if (sales > maxSales) {
        maxSales = sales;
        topCategory = category;
      }
    }

    // Prepare sales data for the chart
    const salesByDate = {};
    orders.forEach(order => {
      const date = new Date(order.createdAt).toISOString().split('T')[0];
      if (!salesByDate[date]) {
        salesByDate[date] = 0;
      }
      salesByDate[date] += order.totalPrice;
    });

    const salesTrend = Object.entries(salesByDate).map(([date, sales]) => ({
      date,
      sales: parseFloat(sales.toFixed(2))
    }));

    // Sort by date
    salesTrend.sort((a, b) => new Date(a.date) - new Date(b.date));

    // Get recent orders (5 most recent)
    const recentOrders = [...orders]
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(order => ({
        _id: order._id,
        orderNumber: order.orderNumber,
        totalPrice: order.totalPrice,
        status: order.status,
        createdAt: order.createdAt,
        user: order.user,
        orderItems: order.orderItems.map(item => ({
          name: item.name,
          quantity: item.quantity,
          price: item.price,
          image: item.image
        }))
      }));

    res.json({
      totalSales: parseFloat(totalSales.toFixed(2)),
      totalOrders,
      avgOrderValue: parseFloat(avgOrderValue.toFixed(2)),
      topSellingCategory: topCategory,
      salesTrend,
      recentOrders
    });
  } catch (error) {
    res.status(500).json({ message: 'Error generating sales report', error: error.message });
  }
};

// Get top performing products based on actual order data
const getTopProducts = async (req, res) => {
  try {
    const { limit = 5, startDate, endDate } = req.query;
    
    // Create date filter if dates are provided
    const dateFilter = {};
    if (startDate && endDate) {
      const start = new Date(startDate);
      const end = new Date(endDate);
      start.setUTCHours(0, 0, 0, 0);
      end.setUTCHours(23, 59, 59, 999);
      
      dateFilter.createdAt = {
        $gte: start,
        $lte: end
      };
    }

    // Get top selling products based on order items
    const topProducts = await Order.aggregate([
      // Match orders in the date range and not cancelled
      {
        $match: {
          status: { $ne: 'cancelled' },
          ...dateFilter
        }
      },
      // Unwind the order items array
      { $unwind: '$orderItems' },
      // Group by product and calculate total quantity and sales
      {
        $group: {
          _id: '$orderItems.product',
          name: { $first: '$orderItems.name' },
          totalQuantity: { $sum: '$orderItems.quantity' },
          totalSales: { 
            $sum: { 
              $multiply: ['$orderItems.price', '$orderItems.quantity'] 
            } 
          },
          price: { $first: '$orderItems.price' }
        }
      },
      // Sort by total quantity sold (descending)
      { $sort: { totalQuantity: -1 } },
      // Limit the number of results
      { $limit: parseInt(limit) },
      // Lookup product details
      {
        $lookup: {
          from: 'products',
          localField: '_id',
          foreignField: '_id',
          as: 'product'
        }
      },
      { $unwind: '$product' },
      // Project the final fields
      {
        $project: {
          _id: 1,
          name: 1,
          price: 1,
          quantitySold: '$totalQuantity',
          totalSales: 1,
          image: { $arrayElemAt: ['$product.images', 0] },
          category: '$product.category'
        }
      }
    ]);

    res.json({
      success: true,
      data: topProducts
    });
  } catch (error) {
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching top products',
      error: error.message 
    });
  }
};

// Get top categories with actual sales data from orders
const getTopCategories = async (req, res) => {
  try {
    const { startDate, endDate } = req.query;
    
    // Default to last 30 days if no date range provided
    const start = startDate ? new Date(startDate) : subDays(new Date(), 30);
    const end = endDate ? new Date(endDate) : new Date();
    
    // Set time to start/end of day
    start.setUTCHours(0, 0, 0, 0);
    end.setUTCHours(23, 59, 59, 999);
    
    // Get all orders with order items and product details
    const categories = await Order.aggregate([
      // Match non-cancelled orders and apply date filter
      {
        $match: {
          status: { $ne: 'cancelled' },
          createdAt: {
            $gte: start,
            $lte: end
          }
        }
      },
      // Unwind the order items array
      { $unwind: '$orderItems' },
      // Lookup product details including category
      {
        $lookup: {
          from: 'products',
          localField: 'orderItems.product',
          foreignField: '_id',
          as: 'productDetails'
        }
      },
      { $unwind: '$productDetails' },
      // Lookup category details
      {
        $lookup: {
          from: 'categories',
          localField: 'productDetails.category',
          foreignField: '_id',
          as: 'categoryDetails'
        }
      },
      { $unwind: '$categoryDetails' },
      // Calculate the actual price (use salePrice if available, otherwise use regular price)
      {
        $addFields: {
          'orderItems.finalPrice': {
            $cond: {
              if: { $gt: ['$orderItems.salePrice', 0] },
              then: '$orderItems.salePrice',
              else: '$orderItems.price'
            }
          }
        }
      },
      // Group by category and calculate totals
      {
        $group: {
          _id: '$categoryDetails._id',
          name: { $first: '$categoryDetails.name' },
          totalSales: {
            $sum: { 
              $multiply: [
                '$orderItems.finalPrice', 
                '$orderItems.quantity'
              ] 
            }
          },
          orderCount: { $sum: 1 },
          productCount: { $addToSet: '$productDetails._id' }
        }
      },
      // Calculate product count
      {
        $addFields: {
          productCount: { $size: '$productCount' }
        }
      },
      // Sort by total sales in descending order
      { $sort: { totalSales: -1 } },
      // Limit to top 10 categories
      { $limit: 10 },
      // Add a final projection to ensure consistent data structure
      {
        $project: {
          _id: 1,
          name: 1,
          totalSales: { $round: ['$totalSales', 2] }, // Round to 2 decimal places
          orderCount: 1,
          productCount: 1
        }
      }
    ]);

    // If no categories found, try to get all categories to show in the chart with zero sales
    if (categories.length === 0) {
      const allCategories = await Category.find({}).select('name');
      return res.json({
        success: true,
        data: allCategories.map(cat => ({
          _id: cat._id,
          name: cat.name,
          totalSales: 0,
          orderCount: 0,
          productCount: 0
        }))
      });
    }

    res.json({
      success: true,
      data: categories
    });
  } catch (error) {
    console.error('Error in getTopCategories:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Error fetching top categories',
      error: error.message 
    });
  }
};

// Export report to CSV
const exportReport = async (req, res) => {
  try {
    const { type, startDate, endDate } = req.query;
    
    let data = [];
    let fields = [];
    let filename = '';

    if (type === 'sales') {
      // Parse dates and set time to start/end of day in UTC
      const start = startDate ? new Date(startDate) : subDays(new Date(), 30); // Default to last 30 days if no date range provided
      start.setUTCHours(0, 0, 0, 0);
      
      const end = endDate ? new Date(endDate) : new Date();
      end.setUTCHours(23, 59, 59, 999);

      const filter = {
        status: { $ne: 'cancelled' },
        createdAt: {
          $gte: start,
          $lte: end
        }
      };

      // Fetch all orders with user and order items populated
      const orders = await Order.find(filter)
        .populate('user', 'name email')
        .populate('orderItems.product', 'name')
        .sort({ createdAt: -1 })
        .lean();

      // Transform orders into CSV rows
      data = orders.flatMap(order => {
        // Format shipping address, handling undefined values
        const formatAddress = (address) => {
          if (!address) return 'N/A';
          const parts = [
            address.address,
            address.city,
            address.postalCode,
            address.country
          ].filter(Boolean); // Remove any undefined/null values
          return parts.length > 0 ? parts.join(', ') : 'N/A';
        };

        // Format products list
        const formatProducts = (items) => {
          if (!items || !items.length) return 'N/A';
          return items.map(item => {
            const name = item.product?.name || item.name || 'Unknown Product';
            const qty = item.quantity || 0;
            return `${name} (Qty: ${qty})`;
          }).join('; ');
        };

        const baseData = {
          'Order ID': order.orderNumber || order._id.toString(),
          'Date': format(new Date(order.createdAt), 'yyyy-MM-dd HH:mm'),
          'Customer': order.user?.name || 'Guest',
          'Email': order.user?.email || 'N/A',
          'Status': order.status,
          'Payment Method': order.paymentMethod || 'N/A',
          'Products': formatProducts(order.orderItems),
          'Subtotal': order.itemsPrice?.toFixed(2) || '0.00',
          'Shipping': order.shippingPrice?.toFixed(2) || '0.00',
          'Tax': order.taxPrice?.toFixed(2) || '0.00',
          'Total': order.totalPrice?.toFixed(2) || '0.00',
          'Items Count': order.orderItems?.length || 0,
          'Shipping Address': formatAddress(order.shippingAddress)
        };

        // If you want to include individual items in the export, uncomment this block
        // return order.orderItems?.map((item, index) => ({
        //   ...baseData,
        //   'Item': index + 1,
        //   'Product Name': item.name || 'N/A',
        //   'Quantity': item.quantity || 0,
        //   'Unit Price': item.price?.toFixed(2) || '0.00',
        //   'Item Total': ((item.price || 0) * (item.quantity || 0)).toFixed(2)
        // })) || [baseData];
        
        return [baseData];
      }).flat();

      fields = [
        'Order ID', 'Date', 'Customer', 'Email', 'Status', 'Payment Method', 'Products',
        'Subtotal', 'Shipping', 'Tax', 'Total', 'Items Count', 'Shipping Address'
      ];
      
      const dateRange = `${format(start, 'yyyy-MM-dd')}_to_${format(end, 'yyyy-MM-dd')}`;
      filename = `sales-report_${dateRange}_exported_${format(new Date(), 'yyyy-MM-dd_HH-mm-ss')}.csv`;
    }

    if (data.length === 0) {
      return res.status(400).json({ success: false, message: 'No data to export' });
    }

    const json2csv = new Parser({ fields });
    const csv = json2csv.parse(data);

    res.header('Content-Type', 'text/csv');
    res.attachment(filename);
    return res.send(csv);

  } catch (error) {
    res.status(500).json({ success: false, message: 'Error exporting report' });
  }
};

module.exports = {
  getSalesReport,
  getTopProducts,
  getTopCategories,
  exportReport
};