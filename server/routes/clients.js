const express = require('express');
const Order = require('../models/Order');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

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
    const limit = Math.min(parseInt(req.query.limit) || 50, 100); // Increased default limit

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

    // Get ALL registered client users (not limited)
    const registeredClients = await User.find({
      role: 'client',
      isActive: true
    }).select('_id name company email phone clientId role createdAt').sort({ createdAt: -1 });

    console.log('📊 [API] Fetched registered clients:', registeredClients.length);
    console.log('📊 [API] Sample registered clients:', registeredClients.slice(0, 3).map(c => ({
      name: c.name,
      clientId: c.clientId,
      createdAt: c.createdAt
    })));
    
    // Combine results
    const clients = [];

    // Add registered clients first with complete data
    registeredClients.forEach(client => {
      clients.push({
        _id: client._id,
        name: client.name,
        company: client.company,
        email: client.email,
        phone: client.phone,
        clientId: client.clientId,
        role: client.role,
        type: 'registered',
        isRegistered: true,
        createdAt: client.createdAt
      });
    });

    // Add recent order clients that don't exist as registered
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
          type: 'recent',
          isRegistered: false
        });
      }
    });

    console.log('📊 [API] Total clients returned:', clients.length);
    res.json({ clients });
  } catch (error) {
    console.error('Recent clients error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/clients
// @desc    Create a new client record
// @access  Private (Admin/Staff only)
router.post('/', auth, async (req, res) => {
  try {
    const { name, company, email, phone, clientId } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Client name is required' });
    }

    const trimmedName = name.trim();
    const trimmedEmail = email ? email.trim() : '';
    const trimmedPhone = phone ? phone.trim() : '';
    const trimmedCompany = company ? company.trim() : trimmedName;

    // Check if client already exists (case-insensitive name check)
    const existingClient = await User.findOne({
      $or: [
        { name: { $regex: `^${trimmedName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' }, role: 'client' },
        { clientId: clientId },
        ...(trimmedEmail ? [{ email: trimmedEmail, role: 'client' }] : [])
      ]
    });

    if (existingClient) {
      return res.status(400).json({ 
        message: 'Client already exists',
        client: {
          name: existingClient.name,
          clientId: existingClient.clientId,
          company: existingClient.company
        }
      });
    }

    // Create new client user with proper defaults
    const newClientData = {
      name: trimmedName,
      company: trimmedCompany,
      email: trimmedEmail, // Will be empty string if not provided
      phone: trimmedPhone,
      password: '', // Empty password for manual client creation
      role: 'client',
      isActive: true,
      createdBy: req.user.id,
      registrationSource: 'manual'
    };

    // Add clientId if provided, otherwise let model generate it
    if (clientId && clientId.trim()) {
      newClientData.clientId = clientId.trim();
    }

    const newClient = new User(newClientData);
    
    // Ensure clientId is generated if not provided
    if (!newClient.clientId) {
      newClient.generateClientId();
    }

    await newClient.save();

    res.status(201).json({
      message: 'Client created successfully',
      client: {
        _id: newClient._id,
        name: newClient.name,
        company: newClient.company,
        email: newClient.email,
        phone: newClient.phone,
        clientId: newClient.clientId,
        role: newClient.role,
        isActive: newClient.isActive,
        createdAt: newClient.createdAt
      }
    });
  } catch (error) {
    console.error('Create client error:', error);
    
    // Handle MongoDB duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern || {})[0];
      return res.status(400).json({ 
        message: `Client with this ${field} already exists`,
        error: 'DUPLICATE_CLIENT'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   POST /api/clients/test-connection
// @desc    Test endpoint for debugging
// @access  Private
router.post('/test-connection', auth, async (req, res) => {
  console.log('🧪 [TEST] Test endpoint called by user:', req.user?.name || req.user?.id);
  console.log('🧪 [TEST] Request body:', req.body);
  
  res.json({
    message: 'Test endpoint working',
    user: {
      id: req.user?.id,
      name: req.user?.name,
      role: req.user?.role
    },
    timestamp: new Date()
  });
});

// @route   POST /api/clients/auto-register
// @desc    Auto-register client from order creation
// @access  Private
router.post('/auto-register', auth, async (req, res) => {
  try {
    console.log('🔄 [AUTO-REGISTER] Route called by user:', req.user?.name || req.user?.id);
    console.log('🔄 [AUTO-REGISTER] Request body:', req.body);
    
    const { clientName, clientId, orderData } = req.body;

    if (!clientName || !clientName.trim()) {
      console.log('❌ [AUTO-REGISTER] Client name validation failed');
      return res.status(400).json({ message: 'Client name is required' });
    }

    const trimmedClientName = clientName.trim();
    
    // Check if client already exists by name OR clientId
    console.log('🔍 [AUTO-REGISTER] Checking for existing client:', trimmedClientName);
    const existingClient = await User.findOne({
      $and: [
        { role: 'client' }, // Ensure we only find clients
        {
          $or: [
            { name: { $regex: `^${trimmedClientName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, $options: 'i' } },
            ...(clientId && clientId.trim() ? [{ clientId: clientId.trim() }] : [])
          ]
        }
      ]
    })
    
    console.log('🔎 [AUTO-REGISTER] Existing client found:', existingClient ? `${existingClient.name} (${existingClient.role})` : 'None');

    if (existingClient) {
      console.log('ℹ️ [AUTO-REGISTER] Client already exists:', existingClient.name, 'ID:', existingClient.clientId);
      return res.json({
        message: 'Client already exists',
        success: true,
        client: {
          _id: existingClient._id,
          name: existingClient.name,
          company: existingClient.company || existingClient.name,
          clientId: existingClient.clientId,
          email: existingClient.email || '',
          phone: existingClient.phone || ''
        },
        isNew: false
      });
    }

    // Create new client record with proper validation
    const newClientData = {
      name: trimmedClientName,
      company: trimmedClientName, // Use client name as company name initially
      // Don't set password field at all for auto-registered clients to avoid validation
      role: 'client',
      isActive: true,
      createdBy: req.user.id,
      // Add metadata about auto-registration
      registrationSource: 'order_creation',
      registrationOrderData: orderData ? {
        firstOrderDate: new Date(),
        registeredBy: req.user.name || req.user.email
      } : undefined
    }
    
    // Only set email if it would be a valid value
    if (trimmedClientName.includes('@')) {
      newClientData.email = ''
    };
    
    // Add clientId if provided, otherwise let the model generate it
    if (clientId && clientId.trim()) {
      newClientData.clientId = clientId.trim();
      console.log('Using provided clientId:', clientId);
    }

    const newClient = new User(newClientData);
    
    // Generate clientId if not provided (will be done in pre-save hook)
    if (!newClient.clientId) {
      newClient.generateClientId();
      console.log('Generated clientId:', newClient.clientId);
    }

    await newClient.save();
    console.log('✅ [AUTO-REGISTER] Client saved successfully with ID:', newClient.clientId);
    
    // Verify the client was actually saved by querying it back
    const savedClient = await User.findById(newClient._id).select('name clientId role isActive createdAt email phone company');
    console.log('✅ [AUTO-REGISTER] Verification - Client found in database:', {
      id: savedClient._id,
      name: savedClient.name,
      clientId: savedClient.clientId,
      role: savedClient.role
    });

    console.log(`✅ [AUTO-REGISTER] Auto-registered new client: ${trimmedClientName} (${newClient.clientId})`);

    res.status(201).json({
      message: 'Client auto-registered successfully',
      success: true,
      client: {
        _id: newClient._id,
        name: newClient.name,
        company: newClient.company,
        clientId: newClient.clientId,
        email: newClient.email || '',
        phone: newClient.phone || ''
      },
      isNew: true
    });
  } catch (error) {
    console.error('❌ [AUTO-REGISTER] Auto-register client error:', error);
    
    // Handle specific MongoDB errors
    if (error.code === 11000) {
      // Duplicate key error - client might already exist
      const field = Object.keys(error.keyPattern || {})[0];
      console.error('❌ [AUTO-REGISTER] Duplicate key error on field:', field);
      
      // Try to find the existing client
      try {
        const existingClient = await User.findOne({
          [field]: error.keyValue[field],
          role: 'client'
        });
        
        if (existingClient) {
          return res.json({
            message: 'Client already exists',
            success: true,
            client: {
              _id: existingClient._id,
              name: existingClient.name,
              company: existingClient.company || existingClient.name,
              clientId: existingClient.clientId,
              email: existingClient.email || '',
              phone: existingClient.phone || ''
            },
            isNew: false
          });
        }
      } catch (findError) {
        console.error('❌ [AUTO-REGISTER] Error finding existing client:', findError);
      }
      
      return res.status(400).json({ 
        message: `Client with this ${field} already exists`,
        error: 'DUPLICATE_CLIENT'
      });
    }
    
    res.status(500).json({ 
      message: 'Server error during client registration',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/clients/:clientId
// @desc    Get client details with order history
// @access  Private
router.get('/:clientId', auth, async (req, res) => {
  try {
    const { clientId } = req.params;

    // Find client in User table
    const client = await User.findOne({ 
      clientId: clientId, 
      role: 'client' 
    }).select('-password');

    if (!client) {
      return res.status(404).json({ message: 'Client not found' });
    }

    // Get client's order history
    const orders = await Order.find({ clientId: clientId })
      .populate('createdBy', 'name')
      .sort({ createdAt: -1 })
      .limit(50);

    // Calculate client statistics
    const stats = {
      totalOrders: orders.length,
      totalValue: orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0),
      totalCarryingCharges: orders.reduce((sum, order) => sum + (order.totalCarryingCharges || 0), 0),
      ordersByStatus: orders.reduce((acc, order) => {
        acc[order.status] = (acc[order.status] || 0) + 1;
        return acc;
      }, {}),
      firstOrderDate: orders.length > 0 ? orders[orders.length - 1].createdAt : null,
      lastOrderDate: orders.length > 0 ? orders[0].createdAt : null
    };

    res.json({
      client: {
        ...client.toObject(),
        stats,
        recentOrders: orders.slice(0, 10) // Last 10 orders
      }
    });
  } catch (error) {
    console.error('Get client details error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;