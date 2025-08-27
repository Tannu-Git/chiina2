const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/clients/search
// @desc    Search clients by name or company
// @access  Private
router.get('/search', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query;

    if (!q || q.trim().length < 1) {
      return res.json({ clients: [] });
    }

    const searchQuery = q.trim();
    const searchLimit = Math.min(parseInt(limit) || 10, 20);

    // Search in registered users first
    const registeredClients = await User.find({
      role: 'client',
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { company: { $regex: searchQuery, $options: 'i' } },
        { email: { $regex: searchQuery, $options: 'i' } }
      ],
      isActive: true
    }).select('name company email phone clientId').limit(searchLimit);

    // Also search in order client names
    const orderClients = await Order.aggregate([
      {
        $match: {
          clientName: { $regex: searchQuery, $options: 'i' }
        }
      },
      {
        $group: {
          _id: '$clientName',
          lastUsed: { $max: '$createdAt' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { orderCount: -1, lastUsed: -1 } },
      { $limit: searchLimit }
    ]);

    // Combine and format results
    const clients = [];

    // Add registered clients
    registeredClients.forEach(client => {
      clients.push({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        clientId: client.clientId, // Include clientId for registered clients
        type: 'registered',
        isVerified: true
      });
    });

    // Add order clients that aren't already in registered clients
    orderClients.forEach(orderClient => {
      const exists = clients.find(c => 
        c.name === orderClient._id || c.company === orderClient._id
      );
      if (!exists) {
        clients.push({
          name: orderClient._id,
          company: orderClient._id,
          type: 'order_history',
          orderCount: orderClient.orderCount,
          lastUsed: orderClient.lastUsed,
          isVerified: false
        });
      }
    });

    // Sort by relevance
    clients.sort((a, b) => {
      if (a.type === 'registered' && b.type !== 'registered') return -1;
      if (b.type === 'registered' && a.type !== 'registered') return 1;
      return (b.orderCount || 0) - (a.orderCount || 0);
    });

    res.json({ clients: clients.slice(0, searchLimit) });
  } catch (error) {
    console.error('Client search error:', error);
    res.status(500).json({ 
      message: 'Failed to search clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/clients/recent
// @desc    Get recent clients from orders
// @access  Private
router.get('/recent', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // Get recent clients from orders
    const recentClients = await Order.aggregate([
      {
        $match: {
          clientName: { $exists: true, $ne: '' }
        }
      },
      {
        $group: {
          _id: '$clientName',
          lastUsed: { $max: '$createdAt' },
          orderCount: { $sum: 1 },
          totalValue: { $sum: '$totalAmount' }
        }
      },
      { $sort: { lastUsed: -1 } },
      { $limit: limit }
    ]);

    // Also get registered client users
    const registeredClients = await User.find({
      role: 'client',
      isActive: true
    }).select('name company email phone clientId').limit(limit);

    // Combine results
    const clients = [];

    // Add registered clients first
    registeredClients.forEach(client => {
      clients.push({
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        clientId: client.clientId, // Include clientId for registered clients
        type: 'registered'
      });
    });

    // Add recent order clients
    recentClients.forEach(orderClient => {
      const exists = clients.find(c => 
        c.name === orderClient._id || c.company === orderClient._id
      );
      if (!exists) {
        clients.push({
          name: orderClient._id,
          company: orderClient._id,
          orderCount: orderClient.orderCount,
          totalValue: orderClient.totalValue,
          lastUsed: orderClient.lastUsed,
          type: 'recent'
        });
      }
    });

    res.json({ clients: clients.slice(0, limit) });
  } catch (error) {
    console.error('Recent clients error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/clients
// @desc    Create a new client (for future use)
// @access  Private (Admin/Staff only)
router.post('/', auth, async (req, res) => {
  try {
    // This could be used to create actual client records
    // For now, clients are created implicitly when orders are created
    res.status(501).json({ message: 'Client creation not implemented yet' });
  } catch (error) {
    console.error('Create client error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;