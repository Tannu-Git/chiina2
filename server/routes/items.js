const express = require('express');
const Order = require('../models/Order');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/items/search
// @desc    Search items by code or description
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ items: [] });
    }

    const searchQuery = q.trim();
    const searchLimit = Math.min(parseInt(limit) || 10, 20);

    // Search items from order items (exclude loop-backs)
    const items = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.itemCode': { $regex: searchQuery, $options: 'i' } },
            { 'items.description': { $regex: searchQuery, $options: 'i' } }
          ],
          'items.itemCode': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            itemCode: '$items.itemCode',
            description: '$items.description'
          },
          usage: { $sum: 1 },
          lastUsed: { $max: '$createdAt' },
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          avgWeight: { $avg: '$items.unitWeight' },
          avgCbm: { $avg: '$items.unitCbm' },
          totalQuantity: { $sum: '$items.quantity' },
          totalOrders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          itemCode: '$_id.itemCode',
          description: '$_id.description',
          usage: 1,
          lastUsed: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          priceRange: { 
            min: { $round: ['$minPrice', 2] }, 
            max: { $round: ['$maxPrice', 2] } 
          },
          unitWeight: { $round: ['$avgWeight', 3] },
          unitCbm: { $round: ['$avgCbm', 4] },
          totalQuantity: 1,
          orderCount: { $size: '$totalOrders' },
          _id: 0
        }
      },
      { $sort: { usage: -1, lastUsed: -1 } },
      { $limit: searchLimit }
    ]);

    res.json({ items });
  } catch (error) {
    console.error('Item search error:', error);
    res.status(500).json({ 
      message: 'Failed to search items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/items/recent
// @desc    Get recent items from orders
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // Get recent items from order items (exclude loop-backs)
    const recentItems = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.itemCode': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: {
            itemCode: '$items.itemCode',
            description: '$items.description'
          },
          usage: { $sum: 1 },
          lastUsed: { $max: '$createdAt' },
          avgPrice: { $avg: '$items.unitPrice' },
          avgWeight: { $avg: '$items.unitWeight' },
          avgCbm: { $avg: '$items.unitCbm' },
          totalValue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          uniqueOrders: { $addToSet: '$_id' }
        }
      },
      {
        $project: {
          itemCode: '$_id.itemCode',
          description: '$_id.description',
          usage: 1,
          lastUsed: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          unitWeight: { $round: ['$avgWeight', 3] },
          unitCbm: { $round: ['$avgCbm', 4] },
          totalValue: { $round: ['$totalValue', 2] },
          orderCount: { $size: '$uniqueOrders' },
          _id: 0
        }
      },
      { $sort: { lastUsed: -1, usage: -1 } },
      { $limit: limit }
    ]);

    res.json({ items: recentItems });
  } catch (error) {
    console.error('Recent items error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent items',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/items/stats/:itemCode
// @desc    Get item statistics
// @access  Private
router.get('/stats/:itemCode', auth, async (req, res) => {
  try {
    const { itemCode } = req.params;

    const stats = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.itemCode': itemCode
        }
      },
      {
        $group: {
          _id: null,
          totalOrders: { $addToSet: '$_id' },
          totalQuantity: { $sum: '$items.quantity' },
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          avgWeight: { $avg: '$items.unitWeight' },
          avgCbm: { $avg: '$items.unitCbm' },
          totalValue: { $sum: { $multiply: ['$items.quantity', '$items.unitPrice'] } },
          lastOrder: { $max: '$createdAt' },
          firstOrder: { $min: '$createdAt' }
        }
      },
      {
        $project: {
          orderCount: { $size: '$totalOrders' },
          totalQuantity: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          priceRange: { 
            min: { $round: ['$minPrice', 2] }, 
            max: { $round: ['$maxPrice', 2] } 
          },
          unitWeight: { $round: ['$avgWeight', 3] },
          unitCbm: { $round: ['$avgCbm', 4] },
          totalValue: { $round: ['$totalValue', 2] },
          lastOrder: 1,
          firstOrder: 1,
          _id: 0
        }
      }
    ]);

    const itemStats = stats[0] || {
      orderCount: 0,
      totalQuantity: 0,
      avgPrice: 0,
      priceRange: { min: 0, max: 0 },
      unitWeight: 0,
      unitCbm: 0,
      totalValue: 0,
      lastOrder: null,
      firstOrder: null
    };

    res.json({ stats: itemStats });
  } catch (error) {
    console.error('Item stats error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch item statistics',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/items/suppliers/:itemCode
// @desc    Get suppliers for a specific item
// @access  Private
router.get('/suppliers/:itemCode', auth, async (req, res) => {
  try {
    const { itemCode } = req.params;
    const { limit = 10 } = req.query;

    const suppliers = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
      { $unwind: '$items' },
      {
        $match: {
          'items.itemCode': itemCode,
          'items.supplier.name': { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$items.supplier.name',
          contact: { $first: '$items.supplier.contact' },
          email: { $first: '$items.supplier.email' },
          avgPrice: { $avg: '$items.unitPrice' },
          minPrice: { $min: '$items.unitPrice' },
          maxPrice: { $max: '$items.unitPrice' },
          totalQuantity: { $sum: '$items.quantity' },
          orderCount: { $sum: 1 },
          lastSupplied: { $max: '$createdAt' }
        }
      },
      {
        $project: {
          name: '$_id',
          contact: 1,
          email: 1,
          avgPrice: { $round: ['$avgPrice', 2] },
          priceRange: { 
            min: { $round: ['$minPrice', 2] }, 
            max: { $round: ['$maxPrice', 2] } 
          },
          totalQuantity: 1,
          orderCount: 1,
          lastSupplied: 1,
          _id: 0
        }
      },
      { $sort: { orderCount: -1, lastSupplied: -1 } },
      { $limit: parseInt(limit) }
    ]);

    res.json({ suppliers });
  } catch (error) {
    console.error('Item suppliers error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch item suppliers',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

module.exports = router;