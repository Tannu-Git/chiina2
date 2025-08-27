const express = require('express');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/suppliers/search
// @desc    Search suppliers by name or contact
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ suppliers: [] });
    }

    const searchQuery = q.trim();
    const searchLimit = Math.min(parseInt(limit) || 10, 20);

    // Search suppliers from order items (exclude loop-backs)
    const suppliers = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.supplier.name': { $regex: searchQuery, $options: 'i' } },
            { 'items.supplier.contact': { $regex: searchQuery, $options: 'i' } },
            { 'items.supplier.email': { $regex: searchQuery, $options: 'i' } }
          ],
          'items.supplier.name': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            name: '$items.supplier.name',
            contact: '$items.supplier.contact',
            email: '$items.supplier.email'
          },
          usage: { $sum: 1 },
          lastUsed: { $max: '$createdAt' },
          avgPrice: { $avg: '$items.unitPrice' },
          totalOrders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          name: '$_id.name',
          contact: '$_id.contact',
          email: '$_id.email',
          usage: 1,
          lastUsed: 1,
          avgPrice: 1,
          totalOrders: { $size: '$totalOrders' },
          _id: 0
        }
      },
      { $sort: { usage: -1, lastUsed: -1 } },
      { $limit: searchLimit }
    ]);

    res.json({ suppliers });
  } catch (error) {
    console.error('Supplier search error:', error);
    res.status(500).json({ 
      message: 'Failed to search suppliers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/suppliers/recent
// @desc    Get recent suppliers from orders
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // Get recent suppliers from order items (exclude loop-backs)
    const recentSuppliers = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.supplier.name': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            name: '$items.supplier.name',
            contact: '$items.supplier.contact',
            email: '$items.supplier.email'
          },
          usage: { $sum: 1 },
          lastUsed: { $max: '$createdAt' },
          avgPrice: { $avg: '$items.unitPrice' },
          totalValue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          uniqueOrders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          name: '$_id.name',
          contact: '$_id.contact',
          email: '$_id.email',
          usage: 1,
          lastUsed: 1,
          avgPrice: 1,
          totalValue: 1,
          orderCount: { $size: '$uniqueOrders' },
          _id: 0
        }
      },
      { $sort: { lastUsed: -1, usage: -1 } },
      { $limit: limit }
    ]);

    res.json({ suppliers: recentSuppliers });
  } catch (error) {
    console.error('Recent suppliers error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent suppliers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/suppliers/stats/:supplierName
// @desc    Get supplier statistics
// @access  Private
router.get('/stats/:supplierName', auth, async (req, res) => {
  try {
    const { supplierName } = req.params;

    const stats = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.supplier.name': supplierName
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: '$_id' },
          totalItems: { $sum: 1 },
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          totalValue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          lastOrder: { $max: '$createdAt' },
          firstOrder: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          orderCount: { $size: '$totalOrders' },
          totalItems: 1,
          avgPrice: 1,
          priceRange: { min: '$minPrice', max: '$maxPrice' },
          totalValue: 1,
          lastOrder: 1,
          firstOrder: 1,
          _id: 0
        }
      }
    ]);

    const supplierStats = stats[0] || {
      orderCount: 0,
      totalItems: 0,
      avgPrice: 0,
      priceRange: { min: 0, max: 0 },
      totalValue: 0,
      lastOrder: null,
      firstOrder: null
    };

    res.json({ stats: supplierStats });
  } catch (error) {
    console.error('Supplier stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch supplier statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/suppliers/items/:supplierName
// @desc    Get items supplied by a specific supplier
// @access  Private
router.get('/items/:supplierName', auth, async (req, res) => {
  try {
    const { supplierName } = req.params;
    const { limit = 20 } = req.query;

    const items = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.supplier.name': supplierName
        }
      },
      {
        $group: {
          _id: '$items.itemCode',
          description: { $first: '$items.description' },
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          lastOrdered: { $max: '$createdAt' }
        }
      },
      { $sort: { orderCount: -1, lastOrdered: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({ items });
  } catch (error) {
    console.error('Supplier items error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch supplier items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;
