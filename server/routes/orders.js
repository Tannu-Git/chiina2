const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const { auth, authorize, clientDataFilter, maskFinancialData } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders (with filtering for clients)
// @access  Private
router.get('/', auth, clientDataFilter, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, clientId, search } = req.query;

    const query = {};

    // Apply client filter if set by middleware
    if (req.query.clientId) {
      query.clientId = req.query.clientId;
    }

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } },
        { 'items.itemCode': { $regex: search, $options: 'i' } }
      ];
    }

    const orders = await Order.find(query)
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Order.countDocuments(query);

    // Mask financial data for non-admin users
    const maskedOrders = maskFinancialData(orders, req.user);

    res.json({
      orders: maskedOrders,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/orders/:id
// @desc    Get order by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id)
      .populate('createdBy', 'name email')
      .populate('containerId');

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if client can access this order
    if (req.user.role === 'client' && order.clientId !== req.user.clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Mask financial data for non-admin users
    const maskedOrder = maskFinancialData(order, req.user);

    res.json(maskedOrder);
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private
router.post('/', auth, [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemCode').trim().notEmpty().withMessage('Item code is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').isInt({ min: 1 }).withMessage('Quantity must be at least 1'),
  body('items.*.unitPrice').isFloat({ min: 0 }).withMessage('Unit price must be non-negative')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { clientName, items, notes, deadline, priority } = req.body;

    // Generate order number
    const orderNumber = await Order.generateOrderNumber();

    // Set client ID based on user role
    let clientId;
    if (req.user.role === 'client') {
      clientId = req.user.clientId;
    } else {
      // For admin/staff, use provided clientId or generate one
      clientId = req.body.clientId || `CLI-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    }

    const order = new Order({
      orderNumber,
      clientId,
      clientName,
      items,
      notes,
      deadline,
      priority: priority || 'medium',
      createdBy: req.user.id
    });

    await order.save();

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order
// @access  Private
router.put('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'client' && order.clientId !== req.user.clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    // Update fields
    const allowedUpdates = ['items', 'notes', 'deadline', 'priority', 'status'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        order[field] = req.body[field];
      }
    });

    order.updatedBy = req.user.id;
    await order.save();

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/orders/:id
// @desc    Delete order
// @access  Private (Admin/Staff only)
router.delete('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    await order.deleteOne();

    res.json({ message: 'Order deleted successfully' });
  } catch (error) {
    console.error('Delete order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/estimate-price
// @desc    AI-powered price estimation
// @access  Private
router.post('/estimate-price', auth, async (req, res) => {
  try {
    const { itemCode, description, quantity, supplier } = req.body

    // Get historical data for similar items
    const historicalOrders = await Order.aggregate([
      {
        $unwind: '$items'
      },
      {
        $match: {
          $or: [
            { 'items.itemCode': { $regex: itemCode, $options: 'i' } },
            { 'items.description': { $regex: description, $options: 'i' } }
          ],
          'items.unitPrice': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          count: { $sum: 1 },
          recentPrices: { $push: '$items.unitPrice' }
        }
      }
    ])

    let estimatedPrice = 0
    let confidence = 0
    let historicalData = null

    if (historicalOrders.length > 0) {
      const data = historicalOrders[0]
      estimatedPrice = data.avgPrice
      confidence = Math.min(90, Math.max(50, data.count * 10)) // 50-90% based on data points
      historicalData = {
        averagePrice: data.avgPrice,
        priceRange: { min: data.minPrice, max: data.maxPrice },
        dataPoints: data.count,
        trend: calculatePriceTrend(data.recentPrices)
      }
    } else {
      // Use AI/ML model for price estimation (simplified)
      estimatedPrice = await estimatePriceWithAI(itemCode, description, quantity, supplier)
      confidence = 60 // Lower confidence for AI estimation
    }

    // Apply quantity-based adjustments
    if (quantity > 100) {
      estimatedPrice *= 0.95 // 5% discount for bulk
    } else if (quantity < 10) {
      estimatedPrice *= 1.1 // 10% premium for small quantities
    }

    // Apply supplier-based adjustments
    if (supplier) {
      const supplierData = await getSupplierPriceHistory(supplier, itemCode)
      if (supplierData) {
        estimatedPrice = (estimatedPrice + supplierData.avgPrice) / 2
        confidence = Math.min(95, confidence + 10)
      }
    }

    res.json({
      estimatedPrice: Math.round(estimatedPrice * 100) / 100,
      confidence,
      historicalData,
      factors: {
        quantityAdjustment: quantity > 100 ? -5 : quantity < 10 ? 10 : 0,
        supplierData: !!supplier,
        historicalDataPoints: historicalData?.dataPoints || 0
      }
    })
  } catch (error) {
    console.error('Price estimation error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   GET /api/orders/item-suggestions
// @desc    Get item code suggestions
// @access  Private
router.get('/item-suggestions', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query

    const suggestions = await Order.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.itemCode': { $regex: q, $options: 'i' } },
            { 'items.description': { $regex: q, $options: 'i' } }
          ]
        }
      },
      {
        $group: {
          _id: '$items.itemCode',
          description: { $first: '$items.description' },
          avgPrice: { $avg: '$items.unitPrice' },
          lastUsed: { $max: '$createdAt' },
          usage: { $sum: 1 },
          avgWeight: { $avg: '$items.unitWeight' },
          avgCbm: { $avg: '$items.unitCbm' }
        }
      },
      { $sort: { usage: -1, lastUsed: -1 } },
      { $limit: parseInt(limit) }
    ])

    const items = suggestions.map(item => ({
      itemCode: item._id,
      description: item.description,
      price: item.avgPrice,
      lastUsed: item.lastUsed,
      weight: item.avgWeight,
      cbm: item.avgCbm,
      isPopular: item.usage > 5,
      inStock: Math.random() > 0.3 // Simulate stock status
    }))

    res.json({ items })
  } catch (error) {
    console.error('Item suggestions error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// @route   POST /api/orders/ai-suggestions
// @desc    AI-powered item suggestions
// @access  Private
router.post('/ai-suggestions', auth, async (req, res) => {
  try {
    const { query, context } = req.body

    // Simulate AI-powered suggestions (in real app, integrate with ML service)
    const aiSuggestions = await generateAISuggestions(query, context)

    res.json({ suggestions: aiSuggestions })
  } catch (error) {
    console.error('AI suggestions error:', error)
    res.status(500).json({ message: 'Server error' })
  }
})

// Helper functions
async function estimatePriceWithAI(itemCode, description, quantity, supplier) {
  // Simplified AI price estimation
  // In real implementation, this would call an ML model

  const basePrice = 10 // Default base price
  const descriptionFactor = description.length / 50 // Longer descriptions might indicate complexity
  const codeFactor = itemCode.length / 10

  return basePrice * (1 + descriptionFactor + codeFactor) * (Math.random() * 0.5 + 0.75)
}

function calculatePriceTrend(prices) {
  if (prices.length < 2) return 'stable'

  const recent = prices.slice(-5)
  const older = prices.slice(-10, -5)

  const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length
  const olderAvg = older.reduce((a, b) => a + b, 0) / older.length

  if (recentAvg > olderAvg * 1.1) return 'increasing'
  if (recentAvg < olderAvg * 0.9) return 'decreasing'
  return 'stable'
}

async function getSupplierPriceHistory(supplier, itemCode) {
  // Get supplier-specific pricing history
  try {
    const history = await Order.aggregate([
      { $unwind: '$items' },
      {
        $match: {
          'items.supplier': supplier,
          'items.itemCode': itemCode,
          'items.unitPrice': { $gt: 0 }
        }
      },
      {
        $group: {
          _id: null,
          avgPrice: { $avg: '$items.unitPrice' },
          count: { $sum: 1 }
        }
      }
    ])

    return history[0] || null
  } catch (error) {
    return null
  }
}

async function generateAISuggestions(query, context) {
  // Simulate AI-powered suggestions
  // In real implementation, integrate with OpenAI, Claude, or custom ML model

  const suggestions = [
    {
      itemCode: `AI-${query.substring(0, 3).toUpperCase()}-001`,
      description: `AI suggested item based on "${query}"`,
      price: Math.random() * 100 + 10,
      confidence: 0.75,
      supplier: 'AI Recommended Supplier',
      leadTime: Math.floor(Math.random() * 30) + 5
    }
  ]

  return suggestions
}

module.exports = router;
