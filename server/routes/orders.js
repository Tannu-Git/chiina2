const express = require('express');
const { body, validationResult } = require('express-validator');
const Order = require('../models/Order');
const Timeline = require('../models/Timeline');
const { auth, authorize, clientDataFilter, maskFinancialData } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/orders
// @desc    Get all orders (with filtering for clients)
// @access  Private
router.get('/', auth, clientDataFilter, async (req, res) => {
  try {
    const { page = 1, limit = 10, status, clientId, search } = req.query;

    const query = {
      // CRITICAL: Exclude loop-back orders from regular order listings
      isLoopBack: { $ne: true }
    };

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

// @route   GET /api/orders/recent-clients
// @desc    Get recent clients from orders
// @access  Private
router.get('/recent-clients', auth, async (req, res) => {
  try {
    const limit = Math.min(parseInt(req.query.limit) || 10, 20);

    // Get recent clients from orders (exclude loop-backs)
    const recentClients = await Order.aggregate([
      {
        $match: {
          clientName: { $exists: true, $ne: '' },
          isLoopBack: { $ne: true } // Exclude loop-back orders
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

    // Format results
    const clients = recentClients.map(client => ({
      name: client._id,
      company: client._id,
      orderCount: client.orderCount,
      totalValue: client.totalValue,
      lastUsed: client.lastUsed,
      type: 'recent'
    }));

    res.json({ clients });
  } catch (error) {
    console.error('Recent clients error:', error);
    res.status(500).json({ 
      message: 'Failed to fetch recent clients',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    });
  }
});

// @route   GET /api/orders/item-suggestions
// @desc    Get item code suggestions
// @access  Private
router.get('/item-suggestions', auth, async (req, res) => {
  try {
    const { q, limit = 10 } = req.query

    // Validate query parameter
    if (!q || q.trim().length < 1) {
      return res.json({ items: [] })
    }

    const searchQuery = q.trim()
    const searchLimit = Math.min(parseInt(limit) || 10, 50) // Cap at 50

    // First check if we have any regular orders (exclude loop-backs)
    const orderCount = await Order.countDocuments({ isLoopBack: { $ne: true } })

    if (orderCount === 0) {
      // Return mock suggestions if no orders exist
      const mockSuggestions = [
        {
          itemCode: 'ITEM-001',
          description: 'Sample Product 1',
          price: 100,
          lastUsed: new Date(),
          weight: 1.5,
          cbm: 0.1,
          isPopular: false,
          inStock: true
        },
        {
          itemCode: 'ITEM-002',
          description: 'Sample Product 2',
          price: 200,
          lastUsed: new Date(),
          weight: 2.0,
          cbm: 0.15,
          isPopular: false,
          inStock: true
        }
      ].filter(item =>
        item.itemCode.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.description.toLowerCase().includes(searchQuery.toLowerCase())
      )

      return res.json({ items: mockSuggestions })
    }

    const suggestions = await Order.aggregate([
      // Exclude loop-back orders from item suggestions
      { $match: { isLoopBack: { $ne: true } } },
      { $unwind: '$items' },
      {
        $match: {
          $or: [
            { 'items.itemCode': { $regex: searchQuery, $options: 'i' } },
            { 'items.description': { $regex: searchQuery, $options: 'i' } }
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
      { $limit: searchLimit }
    ])

    const items = suggestions.map(item => ({
      itemCode: item._id,
      description: item.description || 'No description',
      price: item.avgPrice || 0,
      lastUsed: item.lastUsed,
      weight: item.avgWeight || 0,
      cbm: item.avgCbm || 0,
      isPopular: item.usage > 5,
      inStock: Math.random() > 0.3 // Simulate stock status
    }))

    res.json({ items })
  } catch (error) {
    console.error('Item suggestions error:', error)
    res.status(500).json({
      message: 'Failed to fetch item suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// Helper function for AI suggestions
const generateAISuggestions = async (query, context) => {
  // Simulate AI-powered suggestions based on query
  const aiSuggestions = [
    {
      itemCode: `AI-${query.toUpperCase().slice(0, 3)}-001`,
      description: `AI suggested: ${query} related product`,
      price: Math.floor(Math.random() * 500) + 50,
      lastUsed: new Date(),
      weight: Math.random() * 5 + 0.5,
      cbm: Math.random() * 0.5 + 0.05,
      isPopular: Math.random() > 0.7,
      inStock: Math.random() > 0.2,
      confidence: 0.8 + Math.random() * 0.2
    },
    {
      itemCode: `AI-${query.toUpperCase().slice(0, 3)}-002`,
      description: `Smart match: ${query} alternative`,
      price: Math.floor(Math.random() * 300) + 30,
      lastUsed: new Date(),
      weight: Math.random() * 3 + 0.3,
      cbm: Math.random() * 0.3 + 0.03,
      isPopular: Math.random() > 0.8,
      inStock: Math.random() > 0.1,
      confidence: 0.7 + Math.random() * 0.2
    }
  ]

  return aiSuggestions
}

// @route   POST /api/orders/ai-suggestions
// @desc    AI-powered item suggestions
// @access  Private
router.post('/ai-suggestions', auth, async (req, res) => {
  try {
    const { query, context } = req.body

    // Validate input
    if (!query || typeof query !== 'string' || query.trim().length < 1) {
      return res.json({ suggestions: [] })
    }

    // Simulate AI-powered suggestions (in real app, integrate with ML service)
    const aiSuggestions = await generateAISuggestions(query.trim(), context)

    res.json({ suggestions: aiSuggestions })
  } catch (error) {
    console.error('AI suggestions error:', error)
    res.status(500).json({
      message: 'Failed to generate AI suggestions',
      error: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
    })
  }
})

// @route   GET /api/orders/:id/timeline
// @desc    Get order timeline
// @access  Private
router.get('/:id/timeline', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check if client can access this order
    if (req.user.role === 'client' && order.clientId !== req.user.clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const timeline = await Timeline.getOrderTimeline(req.params.id, {
      limit: req.query.limit ? parseInt(req.query.limit) : 50,
      visibleOnly: req.user.role === 'client'
    });

    res.json({ timeline });
  } catch (error) {
    console.error('Get timeline error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders/:id/timeline
// @desc    Add timeline entry
// @access  Private (Admin/Staff only)
router.post('/:id/timeline', auth, authorize('admin', 'staff'), [
  body('action').trim().notEmpty().withMessage('Action is required'),
  body('description').trim().notEmpty().withMessage('Description is required')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const { action, description, severity } = req.body;

    const timelineEntry = await Timeline.addEntry(
      req.params.id,
      'CUSTOM_EVENT',
      description,
      req.user,
      {
        severity: severity || 'low',
        metadata: {
          customAction: action,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      }
    );

    if (!timelineEntry) {
      return res.status(500).json({ message: 'Failed to create timeline entry' });
    }

    res.status(201).json({
      message: 'Timeline entry added successfully',
      entry: timelineEntry
    });
  } catch (error) {
    console.error('Add timeline entry error:', error);
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

    res.json({ order: maskedOrder });
  } catch (error) {
    console.error('Get order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/orders
// @desc    Create new order
// @access  Private (Admin/Staff only)
router.post('/', auth, authorize('admin', 'staff'), [
  body('clientName').trim().notEmpty().withMessage('Client name is required'),
  body('items').isArray({ min: 1 }).withMessage('At least one item is required'),
  body('items.*.itemCode').trim().notEmpty().withMessage('Item code is required'),
  body('items.*.description').trim().notEmpty().withMessage('Item description is required'),
  body('items.*.quantity').custom((value) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Quantity must be at least 1');
    }
    return true;
  }),
  body('items.*.unitPrice').optional().custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Unit price must be non-negative');
      }
    }
    return true;
  }),
  body('items.*.unitWeight').optional().custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Unit weight must be non-negative');
      }
    }
    return true;
  }),
  body('items.*.unitCbm').optional().custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Unit CBM must be non-negative');
      }
    }
    return true;
  }),
  body('items.*.cartons').custom((value) => {
    const num = parseInt(value);
    if (isNaN(num) || num < 1) {
      throw new Error('Cartons must be at least 1');
    }
    return true;
  }),
  body('items.*.paymentType').isIn(['CLIENT_DIRECT', 'THROUGH_ME']).withMessage('Invalid payment type'),
  body('items.*.carryingCharge.basis').isIn(['carton', 'weight', 'cbm']).withMessage('Invalid carrying charge basis'),
  body('items.*.carryingCharge.rate').custom((value) => {
    if (value !== undefined && value !== null && value !== '') {
      const num = parseFloat(value);
      if (isNaN(num) || num < 0) {
        throw new Error('Carrying charge rate must be non-negative');
      }
    }
    return true;
  })
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    // Debug logging to see what we receive
    console.log('Order creation request body:', JSON.stringify(req.body, null, 2));

    const { 
      clientId,
      clientName, 
      items, 
      notes, 
      deadline, 
      priority,
      totalAmount,
      totalCarryingCharges,
      totalWeight,
      totalCbm,
      totalCartons,
      status
    } = req.body;

    // For client users, use their clientId; for admin/staff, use provided clientId or generate one
    let resolvedClientId;
    if (req.user.role === 'client') {
      // Client users must use their own clientId
      resolvedClientId = req.user.clientId;
      if (!resolvedClientId) {
        return res.status(400).json({ 
          message: 'Client user account does not have a clientId assigned. Please contact administrator.' 
        });
      }
    } else {
      // Admin/staff users creating orders for clients
      resolvedClientId = clientId || req.user.clientId;
      
      // AUTO-REGISTER CLIENT: If no clientId provided, try to auto-register client
      if (!resolvedClientId && clientName) {
        try {
          // Check if client exists first
          const existingClient = await User.findOne({
            name: clientName.trim(),
            role: 'client'
          });
          
          if (existingClient) {
            resolvedClientId = existingClient.clientId;
            console.log(`Found existing client: ${clientName} (${resolvedClientId})`);
          } else {
            // Auto-register new client
            const autoRegisterResponse = await axios.post('/api/clients/auto-register', {
              clientName: clientName.trim(),
              orderData: {
                firstOrder: true,
                registeredBy: req.user.name || req.user.email,
                registrationDate: new Date()
              }
            }, {
              headers: {
                'Authorization': req.headers.authorization
              }
            });
            
            if (autoRegisterResponse.data.client) {
              resolvedClientId = autoRegisterResponse.data.client.clientId;
              console.log(`Auto-registered new client: ${clientName} (${resolvedClientId})`);
            }
          }
        } catch (autoRegisterError) {
          console.warn('Auto-registration failed, using fallback:', autoRegisterError.message);
          // Fallback: Generate temporary clientId
          const sanitizedName = clientName.replace(/[^a-zA-Z0-9]/g, '').toUpperCase();
          resolvedClientId = `CLI-${sanitizedName.substring(0, 6)}${Math.random().toString(36).substr(2, 3).toUpperCase()}`;
          console.log(`Generated fallback clientId for '${clientName}': ${resolvedClientId}`);
        }
      }
    }
    
    if (!resolvedClientId) {
      return res.status(400).json({ 
        message: 'Client ID is required. Please provide clientId in request body or ensure user has clientId assigned.' 
      });
    }

    // Process items to ensure proper data types and structure
    const processedItems = items.map((item, index) => {
      // Validate required fields
      if (!item.itemCode || typeof item.itemCode !== 'string' || item.itemCode.trim() === '') {
        throw new Error(`Item ${index + 1}: Item code is required and must be a non-empty string`);
      }
      if (!item.description || typeof item.description !== 'string' || item.description.trim() === '') {
        throw new Error(`Item ${index + 1}: Description is required and must be a non-empty string`);
      }
      
      // Validate and convert numeric fields
      const quantity = parseInt(item.quantity);
      const cartons = parseInt(item.cartons);
      const unitPrice = parseFloat(item.unitPrice) || 0;
      const unitWeight = parseFloat(item.unitWeight) || 0;
      const unitCbm = parseFloat(item.unitCbm) || 0;
      
      // Numeric validations
      if (isNaN(quantity) || quantity < 1) {
        throw new Error(`Item ${index + 1}: Quantity must be at least 1`);
      }
      if (isNaN(cartons) || cartons < 1) {
        throw new Error(`Item ${index + 1}: Cartons must be at least 1`);
      }
      if (unitPrice < 0) {
        throw new Error(`Item ${index + 1}: Unit price cannot be negative`);
      }
      if (unitWeight < 0) {
        throw new Error(`Item ${index + 1}: Unit weight cannot be negative`);
      }
      if (unitCbm < 0) {
        throw new Error(`Item ${index + 1}: Unit CBM cannot be negative`);
      }
      
      // Validate payment type
      if (!['CLIENT_DIRECT', 'THROUGH_ME'].includes(item.paymentType)) {
        throw new Error(`Item ${index + 1}: Invalid payment type '${item.paymentType}'. Valid values are: CLIENT_DIRECT, THROUGH_ME`);
      }
      
      // Validate carrying charge basis
      if (!['carton', 'weight', 'cbm'].includes(item.carryingCharge?.basis)) {
        throw new Error(`Item ${index + 1}: Invalid carrying charge basis '${item.carryingCharge?.basis}'. Valid values are: carton, weight, cbm`);
      }
      
      const carryingRate = parseFloat(item.carryingCharge?.rate) || 0;
      if (carryingRate < 0) {
        throw new Error(`Item ${index + 1}: Carrying charge rate cannot be negative`);
      }
      
      // Process supplier field
      let supplierData = null;
      if (item.supplier) {
        if (typeof item.supplier === 'string') {
          supplierData = {
            name: item.supplier,
            contact: '',
            email: ''
          };
        } else if (typeof item.supplier === 'object') {
          supplierData = {
            name: item.supplier.name || '',
            contact: item.supplier.contact || '',
            email: item.supplier.email || ''
          };
        }
      }
      
      // Process image field
      const imageData = item.image ? {
        url: item.image.url,
        publicId: item.image.publicId || ''
      } : null;
      
      return {
        ...item,
        quantity,
        unitPrice,
        unitWeight,
        unitCbm,
        cartons,
        supplier: supplierData,
        image: imageData,
        carryingCharge: {
          ...item.carryingCharge,
          rate: carryingRate
        },
        totalPrice: quantity * unitPrice
      };
    });

    // Generate order number with retry logic
    let orderNumber;
    let order;
    let saveAttempts = 0;
    const maxSaveAttempts = 3;
    
    while (saveAttempts < maxSaveAttempts) {
      try {
        orderNumber = await Order.generateOrderNumber();
        console.log(`Generated order number: ${orderNumber} (attempt ${saveAttempts + 1})`);

        order = new Order({
          orderNumber,
          clientId: resolvedClientId,
          clientName,
          items: processedItems,
          notes,
          deadline,
          priority: priority || 'medium',
          status: status || 'draft',
          // Include calculated totals from frontend
          totalAmount: parseFloat(totalAmount) || 0,
          totalCarryingCharges: parseFloat(totalCarryingCharges) || 0,
          totalWeight: parseFloat(totalWeight) || 0,
          totalCbm: parseFloat(totalCbm) || 0,
          totalCartons: parseInt(totalCartons) || 0,
          createdBy: req.user.id
        });

        await order.save();
        console.log(`Order saved successfully: ${orderNumber}`);
        break; // Success, exit retry loop
        
      } catch (saveError) {
        if (saveError.code === 11000 && saveError.keyValue?.orderNumber) {
          // Duplicate key error on orderNumber, retry with new number
          console.log(`Duplicate order number ${orderNumber}, retrying... (attempt ${saveAttempts + 1})`);
          saveAttempts++;
          if (saveAttempts >= maxSaveAttempts) {
            throw new Error(`Failed to create order after ${maxSaveAttempts} attempts due to order number conflicts`);
          }
          // Brief delay before retry
          await new Promise(resolve => setTimeout(resolve, 50));
        } else {
          // Other error, don't retry
          throw saveError;
        }
      }
    }

    // Add timeline entry for order creation
    await Timeline.addEntry(
      order._id,
      'ORDER_CREATED',
      `Order ${order.orderNumber} created with ${order.items.length} items`,
      req.user,
      {
        severity: 'low',
        metadata: {
          itemCount: order.items.length,
          totalAmount: order.totalAmount,
          ipAddress: req.ip,
          userAgent: req.get('User-Agent')
        }
      }
    );

    res.status(201).json({
      message: 'Order created successfully',
      order
    });
  } catch (error) {
    console.error('Create order error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/orders/:id
// @desc    Update order (partial update)
// @access  Private
router.patch('/:id', auth, async (req, res) => {
  try {
    const order = await Order.findById(req.params.id);

    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    // Check permissions
    if (req.user.role === 'client' && order.clientId !== req.user.clientId) {
      return res.status(403).json({ message: 'Access denied' });
    }

    const originalStatus = order.status;
    const updates = {};

    // Process allowed updates
    const allowedUpdates = [
      'clientName',
      'clientId', 
      'items', 
      'notes', 
      'deadline', 
      'priority', 
      'status',
      'totalAmount',
      'totalCarryingCharges',
      'totalWeight',
      'totalCbm',
      'totalCartons'
    ];
    
    // Valid enum values for validation
    const validStatuses = ['draft', 'submitted', 'confirmed', 'in_progress', 'completed', 'cancelled', 'pending', 'ready', 'qc_failed', 'partial_ready', 'qc_partial', 'qc_completed'];
    const validPriorities = ['low', 'medium', 'high', 'urgent'];
    const validItemStatuses = ['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered'];
    const validPaymentTypes = ['CLIENT_DIRECT', 'THROUGH_ME'];
    const validCarryingBasis = ['carton', 'weight', 'cbm'];
    const validLoopBackReasons = ['DAMAGE', 'SHORTAGE', 'QUALITY_ISSUE', 'PARTIAL_ALLOCATION'];
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        // Validate status enum
        if (field === 'status') {
          if (!validStatuses.includes(req.body[field])) {
            throw new Error(`Invalid status: ${req.body[field]}. Valid values are: ${validStatuses.join(', ')}`);
          }
        }
        
        // Validate priority enum
        if (field === 'priority') {
          if (!validPriorities.includes(req.body[field])) {
            throw new Error(`Invalid priority: ${req.body[field]}. Valid values are: ${validPriorities.join(', ')}`);
          }
        }
        
        // Validate clientName
        if (field === 'clientName') {
          if (!req.body[field] || typeof req.body[field] !== 'string' || req.body[field].trim() === '') {
            throw new Error('Client name is required and must be a non-empty string');
          }
          updates[field] = req.body[field].trim();
        }
        
        // Validate clientId (optional, can be empty for some cases)
        else if (field === 'clientId') {
          if (req.body[field] && typeof req.body[field] !== 'string') {
            throw new Error('Client ID must be a string');
          }
          updates[field] = req.body[field] || '';
        }
        
        // Validate numeric fields (excluding totalCartons which will be auto-calculated)
        else if (['totalAmount', 'totalCarryingCharges', 'totalWeight', 'totalCbm'].includes(field)) {
          const value = parseFloat(req.body[field]);
          if (isNaN(value) || value < 0) {
            throw new Error(`${field} must be a non-negative number`);
          }
          updates[field] = value;
        } else if (field === 'totalCartons') {
          // Skip manual totalCartons override - let the model calculate it from items
          console.log('Skipping manual totalCartons override - will be calculated from items');
        } else if (field === 'items' && Array.isArray(req.body[field])) {
          // Comprehensive items array validation
          if (req.body[field].length === 0) {
            throw new Error('At least one item is required');
          }
          
          // Process items to ensure proper data types and validation
          // CRITICAL: Preserve existing QC and loop-back data when updating items
          updates[field] = req.body[field].map((item, index) => {
            // Validate required fields
            if (!item.itemCode || typeof item.itemCode !== 'string' || item.itemCode.trim() === '') {
              throw new Error(`Item ${index + 1}: Item code is required and must be a non-empty string`);
            }
            if (!item.description || typeof item.description !== 'string' || item.description.trim() === '') {
              throw new Error(`Item ${index + 1}: Description is required and must be a non-empty string`);
            }
            
            // Validate and convert numeric fields
            const quantity = parseInt(item.quantity);
            const cartons = parseInt(item.cartons);
            const unitPrice = parseFloat(item.unitPrice) || 0;
            const unitWeight = parseFloat(item.unitWeight) || 0;
            const unitCbm = parseFloat(item.unitCbm) || 0;
            
            // Numeric validations
            if (isNaN(quantity) || quantity < 1) {
              throw new Error(`Item ${index + 1}: Quantity must be at least 1`);
            }
            if (isNaN(cartons) || cartons < 1) {
              throw new Error(`Item ${index + 1}: Cartons must be at least 1`);
            }
            if (unitPrice < 0) {
              throw new Error(`Item ${index + 1}: Unit price cannot be negative`);
            }
            if (unitWeight < 0) {
              throw new Error(`Item ${index + 1}: Unit weight cannot be negative`);
            }
            if (unitCbm < 0) {
              throw new Error(`Item ${index + 1}: Unit CBM cannot be negative`);
            }
            
            // Validate enum fields
            if (item.paymentType && !validPaymentTypes.includes(item.paymentType)) {
              throw new Error(`Item ${index + 1}: Invalid payment type '${item.paymentType}'. Valid values are: ${validPaymentTypes.join(', ')}`);
            }
            
            if (item.status && !validItemStatuses.includes(item.status)) {
              throw new Error(`Item ${index + 1}: Invalid item status '${item.status}'. Valid values are: ${validItemStatuses.join(', ')}`);
            }
            
            // Validate carrying charge
            if (item.carryingCharge) {
              if (item.carryingCharge.basis && !validCarryingBasis.includes(item.carryingCharge.basis)) {
                throw new Error(`Item ${index + 1}: Invalid carrying charge basis '${item.carryingCharge.basis}'. Valid values are: ${validCarryingBasis.join(', ')}`);
              }
              
              const carryingRate = parseFloat(item.carryingCharge.rate) || 0;
              if (carryingRate < 0) {
                throw new Error(`Item ${index + 1}: Carrying charge rate cannot be negative`);
              }
            }
            
            // Validate supplier object structure
            if (item.supplier && typeof item.supplier === 'object') {
              if (item.supplier.name && typeof item.supplier.name !== 'string') {
                throw new Error(`Item ${index + 1}: Supplier name must be a string`);
              }
              if (item.supplier.email && typeof item.supplier.email !== 'string') {
                throw new Error(`Item ${index + 1}: Supplier email must be a string`);
              }
              if (item.supplier.contact && typeof item.supplier.contact !== 'string') {
                throw new Error(`Item ${index + 1}: Supplier contact must be a string`);
              }
            }
            
            // Validate image object structure
            if (item.image && typeof item.image === 'object') {
              if (item.image.url && typeof item.image.url !== 'string') {
                throw new Error(`Item ${index + 1}: Image URL must be a string`);
              }
            }
            
            // Find existing item by itemCode to preserve QC and loop-back data
            const existingItem = order.items && order.items.find(existing => existing.itemCode === item.itemCode.trim());
            
            const updatedItem = {
              itemCode: item.itemCode.trim(),
              description: item.description.trim(),
              quantity,
              unitPrice,
              unitWeight,
              unitCbm,
              cartons,
              totalPrice: item.totalPrice || quantity * unitPrice,
              paymentType: item.paymentType || 'CLIENT_DIRECT',
              status: item.status || 'pending',
              supplier: item.supplier || null,
              image: item.image || null,
              carryingCharge: {
                basis: item.carryingCharge?.basis || 'carton',
                rate: parseFloat(item.carryingCharge?.rate) || 0,
                amount: parseFloat(item.carryingCharge?.amount) || 0
              }
            };
            
            // PRESERVE QC AND LOOP-BACK DATA: If existing item found, preserve all QC and loop-back fields
            // CRITICAL: Apply proportional scaling when carton quantities change
            if (existingItem) {
              const oldCartons = existingItem.cartons || 0;
              const newCartons = cartons;
              const cartonScalingRatio = oldCartons > 0 ? newCartons / oldCartons : 1;
              
              console.log(`Found existing item ${item.itemCode} with QC data:`, {
                oldCartons,
                newCartons,
                cartonScalingRatio,
                qcPassedQuantity: existingItem.qcPassedQuantity,
                loopBackQuantity: existingItem.loopBackQuantity,
                qcPassedCartons: existingItem.qcPassedCartons,
                loopBackCartons: existingItem.loopBackCartons,
                qcStatus: existingItem.qcStatus
              });
              
              // Apply proportional scaling to CARTON-BASED QC quantities (PRIMARY)
              if (existingItem.qcPassedCartons !== undefined) {
                const scaledQcPassedCtn = Math.round((existingItem.qcPassedCartons || 0) * cartonScalingRatio);
                updatedItem.qcPassedCartons = Math.min(scaledQcPassedCtn, cartons); // Cap at new cartons
                console.log(`Scaling qcPassedCartons: ${existingItem.qcPassedCartons} → ${updatedItem.qcPassedCartons} (ratio: ${cartonScalingRatio})`);
              }
              
              if (existingItem.loopBackCartons !== undefined) {
                const scaledLoopBackCtn = Math.round((existingItem.loopBackCartons || 0) * cartonScalingRatio);
                updatedItem.loopBackCartons = Math.min(scaledLoopBackCtn, cartons); // Cap at new cartons
                console.log(`Scaling loopBackCartons: ${existingItem.loopBackCartons} → ${updatedItem.loopBackCartons} (ratio: ${cartonScalingRatio})`);
              }
              
              // Recalculate pending cartons based on new totals
              const newQcPassedCtn = updatedItem.qcPassedCartons || 0;
              const newLoopBackCtn = updatedItem.loopBackCartons || 0;
              updatedItem.pendingCartons = Math.max(0, cartons - newQcPassedCtn - newLoopBackCtn);
              
              // Apply proportional scaling to QUANTITY-BASED QC quantities (LEGACY COMPATIBILITY)
              if (existingItem.qcPassedQuantity !== undefined) {
                const scaledQcPassed = Math.round((existingItem.qcPassedQuantity || 0) * cartonScalingRatio);
                updatedItem.qcPassedQuantity = Math.min(scaledQcPassed, quantity); // Cap at new quantity
                console.log(`Scaling qcPassedQuantity: ${existingItem.qcPassedQuantity} → ${updatedItem.qcPassedQuantity} (ratio: ${cartonScalingRatio})`);
              }
              
              if (existingItem.loopBackQuantity !== undefined) {
                const scaledLoopBack = Math.round((existingItem.loopBackQuantity || 0) * cartonScalingRatio);
                updatedItem.loopBackQuantity = Math.min(scaledLoopBack, quantity); // Cap at new quantity
                console.log(`Scaling loopBackQuantity: ${existingItem.loopBackQuantity} → ${updatedItem.loopBackQuantity} (ratio: ${cartonScalingRatio})`);
              }
              
              // Recalculate pending quantity based on new totals
              const newQcPassed = updatedItem.qcPassedQuantity || 0;
              const newLoopBack = updatedItem.loopBackQuantity || 0;
              updatedItem.pendingQuantity = Math.max(0, quantity - newQcPassed - newLoopBack);
              
              // Scale receivedQuantity to match carton-based QC data (primary)
              if (existingItem.receivedQuantity !== undefined || updatedItem.qcPassedCartons !== undefined) {
                const piecesPerCarton = quantity > 0 && cartons > 0 ? quantity / cartons : 10; // Calculate pieces per carton
                if (updatedItem.qcPassedCartons !== undefined) {
                  updatedItem.receivedQuantity = updatedItem.qcPassedCartons * piecesPerCarton;
                  console.log(`Calculated receivedQuantity from cartons: ${updatedItem.qcPassedCartons} cartons × ${piecesPerCarton.toFixed(1)} pieces/carton = ${updatedItem.receivedQuantity} pieces`);
                } else {
                  updatedItem.receivedQuantity = updatedItem.qcPassedQuantity || 0;
                }
              }
              
              // Preserve QC status and metadata (non-quantity fields)
              if (existingItem.qcStatus) updatedItem.qcStatus = existingItem.qcStatus;
              if (existingItem.qcNotes) updatedItem.qcNotes = existingItem.qcNotes;
              if (existingItem.qcDefects) updatedItem.qcDefects = existingItem.qcDefects;
              
              // Preserve loop-back metadata (non-quantity fields)
              if (existingItem.loopBackReason) updatedItem.loopBackReason = existingItem.loopBackReason;
              if (existingItem.loopBackStatus) updatedItem.loopBackStatus = existingItem.loopBackStatus;
              if (existingItem.loopBackNotes) updatedItem.loopBackNotes = existingItem.loopBackNotes;
              if (existingItem.loopBackCreatedAt) updatedItem.loopBackCreatedAt = existingItem.loopBackCreatedAt;
              if (existingItem.loopBackUpdatedAt) updatedItem.loopBackUpdatedAt = existingItem.loopBackUpdatedAt;
              
              // Preserve QC history
              if (existingItem.qcHistory) updatedItem.qcHistory = existingItem.qcHistory;
              
              console.log(`Preserved and scaled QC and loop-back data for item ${item.itemCode}:`, {
                // Carton-based tracking (primary)
                qcPassedCartons: updatedItem.qcPassedCartons,
                loopBackCartons: updatedItem.loopBackCartons,
                pendingCartons: updatedItem.pendingCartons,
                // Quantity-based tracking (legacy)
                qcPassedQuantity: updatedItem.qcPassedQuantity,
                loopBackQuantity: updatedItem.loopBackQuantity,
                pendingQuantity: updatedItem.pendingQuantity,
                // Status and metadata
                qcStatus: updatedItem.qcStatus,
                loopBackStatus: updatedItem.loopBackStatus,
                scalingRatio: cartonScalingRatio
              });
            } else {
              console.log(`No existing item found for ${item.itemCode} - new item or itemCode changed`);
            }
            
            return updatedItem;
          });
        } else if (field === 'deadline') {
          if (req.body[field]) {
            const deadline = new Date(req.body[field]);
            if (isNaN(deadline.getTime())) {
              throw new Error('Invalid deadline date format');
            }
            // Check if deadline is not in the past (allow same day)
            const today = new Date();
            today.setHours(0, 0, 0, 0);
            if (deadline < today) {
              throw new Error('Deadline cannot be in the past');
            }
            updates[field] = deadline;
          } else {
            updates[field] = null;
          }
        } else if (field === 'notes') {
          if (req.body[field]) {
            if (typeof req.body[field] !== 'string') {
              throw new Error('Notes must be a string');
            }
            if (req.body[field].length > 1000) {
              throw new Error('Notes cannot exceed 1000 characters');
            }
            updates[field] = req.body[field].trim();
          } else {
            updates[field] = '';
          }
        } else {
          updates[field] = req.body[field];
        }
      }
    });

    // Validate loop-back specific fields if present
    if (req.body.loopBackReason && !validLoopBackReasons.includes(req.body.loopBackReason)) {
      throw new Error(`Invalid loop-back reason: ${req.body.loopBackReason}. Valid values are: ${validLoopBackReasons.join(', ')}`);
    }

    // Apply updates
    Object.assign(order, updates);
    order.updatedBy = req.user.id;
    
    // Save with comprehensive error handling
    await order.save();

    // Create timeline entry for status change
    if (updates.status && updates.status !== originalStatus) {
      try {
        await Timeline.addEntry(
          order._id,
          'STATUS_CHANGED',
          `Order status changed from ${originalStatus} to ${updates.status}`,
          req.user,
          {
            oldValue: originalStatus,
            newValue: updates.status,
            field: 'status',
            severity: 'medium',
            metadata: {
              ipAddress: req.ip,
              userAgent: req.get('User-Agent')
            }
          }
        );
      } catch (timelineError) {
        console.error('Timeline entry creation failed:', timelineError);
        // Timeline failures should not break order updates
      }
    }

    // Create timeline entry for other significant updates
    if (Object.keys(updates).length > 0 && (!updates.status || updates.status === originalStatus)) {
      const changedFields = Object.keys(updates).filter(key => key !== 'status');
      if (changedFields.length > 0) {
        try {
          await Timeline.addEntry(
            order._id,
            changedFields.includes('items') ? 'ITEMS_UPDATED' : 'ORDER_UPDATED',
            `Order updated: ${changedFields.join(', ')} changed`,
            req.user,
            {
              severity: 'low',
              metadata: {
                changedFields,
                ipAddress: req.ip,
                userAgent: req.get('User-Agent'),
                changes: updates
              }
            }
          );
        } catch (timelineError) {
          console.error('Timeline entry creation failed:', timelineError);
          // Timeline failures should not break order updates
        }
      }
    }

    res.json({
      message: 'Order updated successfully',
      order
    });
  } catch (error) {
    console.error('Update order error:', error);
    
    // Handle custom validation errors (thrown by our validation logic)
    if (error.message && typeof error.message === 'string' && !error.name) {
      return res.status(400).json({ 
        message: 'Validation Error',
        details: error.message
      });
    }
    
    // Handle Mongoose validation errors
    if (error.name === 'ValidationError') {
      const validationErrors = Object.keys(error.errors).map(key => ({
        field: key,
        message: error.errors[key].message,
        value: error.errors[key].value,
        kind: error.errors[key].kind
      }));
      
      return res.status(400).json({ 
        message: 'Database Validation Failed', 
        errors: validationErrors,
        details: error.message
      });
    }
    
    // Handle cast errors (invalid ObjectId, number parsing, etc.)
    if (error.name === 'CastError') {
      return res.status(400).json({ 
        message: 'Invalid data format',
        details: `Invalid ${error.kind} for field '${error.path}': ${error.value}`,
        field: error.path,
        value: error.value
      });
    }
    
    // Handle duplicate key errors
    if (error.code === 11000) {
      const field = Object.keys(error.keyPattern)[0];
      return res.status(400).json({ 
        message: 'Duplicate value not allowed',
        details: `A record with this ${field} already exists`,
        field: field
      });
    }
    
    // Handle version conflicts (optimistic locking)
    if (error.name === 'VersionError') {
      return res.status(409).json({ 
        message: 'Conflict: Order was modified by another user',
        details: 'Please refresh and try again'
      });
    }
    
    // Generic server error
    res.status(500).json({ 
      message: 'Internal server error',
      details: process.env.NODE_ENV === 'development' ? error.message : 'An unexpected error occurred'
    });
  }
});

// @route   PUT /api/orders/:id
// @desc    Update order (full update)
// @access  Private (Admin/Staff only)
router.put('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
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
    const allowedUpdates = [
      'items', 
      'notes', 
      'deadline', 
      'priority', 
      'status',
      'totalAmount',
      'totalCarryingCharges',
      'totalWeight',
      'totalCbm',
      'totalCartons',
      'clearItemAllocations' // NEW: Support clearing item-level allocations
    ];
    
    // Handle clearItemAllocations flag for container deletion
    if (req.body.clearItemAllocations === true) {
      console.log(`🧹 [ORDER PATCH] Clearing item allocations for order ${order.orderNumber}`);
      
      // Clear all item-level allocation data with validation bypass
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          const oldAllocatedCartons = item.allocatedCartons || 0;
          const oldAllocatedQuantity = item.allocatedQuantity || 0;
          
          // Force clear allocations (bypass validation)
          item.allocatedCartons = 0;
          item.allocatedQuantity = 0;
          item.containerId = null;
          
          // Mark for validation bypass
          item._bypassAllocationValidation = true;
          
          console.log(`  📦 Cleared item ${index + 1} (${item.itemCode}): ${oldAllocatedCartons} cartons → 0, ${oldAllocatedQuantity} qty → 0`);
        });
        
        // Mark order for validation bypass during save
        order._bypassAllocationValidation = true;
      }
      
      console.log(`✅ [ORDER PATCH] Cleared allocations for ${order.items?.length || 0} items`);
    }
    
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        if (['totalAmount', 'totalCarryingCharges', 'totalWeight', 'totalCbm'].includes(field)) {
          order[field] = parseFloat(req.body[field]) || 0;
        } else if (field === 'totalCartons') {
          // Skip manual totalCartons override - let the model calculate it from items
          console.log('[PUT] Skipping manual totalCartons override - will be calculated from items');
        } else if (field === 'items' && Array.isArray(req.body[field])) {
          // Process items to ensure proper data types
          // CRITICAL: Preserve existing QC and loop-back data when updating items
          order[field] = req.body[field].map((item, index) => {
            // Find existing item by itemCode to preserve QC and loop-back data
            const existingItem = order.items && order.items.find(existing => existing.itemCode === (item.itemCode && item.itemCode.trim ? item.itemCode.trim() : item.itemCode));
            
            const updatedItem = {
              ...item,
              quantity: parseInt(item.quantity) || 1,
              unitPrice: parseFloat(item.unitPrice) || 0,
              unitWeight: parseFloat(item.unitWeight) || 0,
              unitCbm: parseFloat(item.unitCbm) || 0,
              cartons: parseInt(item.cartons) || 1,
              totalPrice: item.totalPrice || (parseInt(item.quantity) || 1) * (parseFloat(item.unitPrice) || 0),
              carryingCharge: {
                basis: item.carryingCharge?.basis || 'carton',
                rate: parseFloat(item.carryingCharge?.rate) || 0,
                amount: parseFloat(item.carryingCharge?.amount) || 0
              }
            };
            
            // PRESERVE QC AND LOOP-BACK DATA: If existing item found, preserve all QC and loop-back fields
            // CRITICAL: Apply proportional scaling when carton quantities change
            if (existingItem) {
              const oldCartons = existingItem.cartons || 0;
              const newCartons = parseInt(item.cartons) || 1;
              const cartonScalingRatio = oldCartons > 0 ? newCartons / oldCartons : 1;
              
              console.log(`[PUT] Found existing item ${item.itemCode} with QC data:`, {
                oldCartons,
                newCartons,
                cartonScalingRatio,
                qcPassedQuantity: existingItem.qcPassedQuantity,
                loopBackQuantity: existingItem.loopBackQuantity,
                qcPassedCartons: existingItem.qcPassedCartons,
                loopBackCartons: existingItem.loopBackCartons,
                qcStatus: existingItem.qcStatus
              });
              
              // Apply proportional scaling to CARTON-BASED QC quantities (PRIMARY)
              if (existingItem.qcPassedCartons !== undefined) {
                const scaledQcPassedCtn = Math.round((existingItem.qcPassedCartons || 0) * cartonScalingRatio);
                updatedItem.qcPassedCartons = Math.min(scaledQcPassedCtn, updatedItem.cartons); // Cap at new cartons
                console.log(`[PUT] Scaling qcPassedCartons: ${existingItem.qcPassedCartons} → ${updatedItem.qcPassedCartons} (ratio: ${cartonScalingRatio})`);
              }
              
              if (existingItem.loopBackCartons !== undefined) {
                const scaledLoopBackCtn = Math.round((existingItem.loopBackCartons || 0) * cartonScalingRatio);
                updatedItem.loopBackCartons = Math.min(scaledLoopBackCtn, updatedItem.cartons); // Cap at new cartons
                console.log(`[PUT] Scaling loopBackCartons: ${existingItem.loopBackCartons} → ${updatedItem.loopBackCartons} (ratio: ${cartonScalingRatio})`);
              }
              
              // Recalculate pending cartons based on new totals
              const newQcPassedCtn = updatedItem.qcPassedCartons || 0;
              const newLoopBackCtn = updatedItem.loopBackCartons || 0;
              updatedItem.pendingCartons = Math.max(0, updatedItem.cartons - newQcPassedCtn - newLoopBackCtn);
              
              // Apply proportional scaling to QUANTITY-BASED QC quantities (LEGACY COMPATIBILITY)
              if (existingItem.qcPassedQuantity !== undefined) {
                const scaledQcPassed = Math.round((existingItem.qcPassedQuantity || 0) * cartonScalingRatio);
                updatedItem.qcPassedQuantity = Math.min(scaledQcPassed, updatedItem.quantity); // Cap at new quantity
                console.log(`[PUT] Scaling qcPassedQuantity: ${existingItem.qcPassedQuantity} → ${updatedItem.qcPassedQuantity} (ratio: ${cartonScalingRatio})`);
              }
              
              if (existingItem.loopBackQuantity !== undefined) {
                const scaledLoopBack = Math.round((existingItem.loopBackQuantity || 0) * cartonScalingRatio);
                updatedItem.loopBackQuantity = Math.min(scaledLoopBack, updatedItem.quantity); // Cap at new quantity
                console.log(`[PUT] Scaling loopBackQuantity: ${existingItem.loopBackQuantity} → ${updatedItem.loopBackQuantity} (ratio: ${cartonScalingRatio})`);
              }
              
              // Recalculate pending quantity based on new totals
              const newQcPassed = updatedItem.qcPassedQuantity || 0;
              const newLoopBack = updatedItem.loopBackQuantity || 0;
              updatedItem.pendingQuantity = Math.max(0, updatedItem.quantity - newQcPassed - newLoopBack);
              
              // Scale receivedQuantity to match carton-based QC data (primary)
              if (existingItem.receivedQuantity !== undefined || updatedItem.qcPassedCartons !== undefined) {
                const piecesPerCarton = updatedItem.quantity > 0 && updatedItem.cartons > 0 ? updatedItem.quantity / updatedItem.cartons : 10;
                if (updatedItem.qcPassedCartons !== undefined) {
                  updatedItem.receivedQuantity = updatedItem.qcPassedCartons * piecesPerCarton;
                  console.log(`[PUT] Calculated receivedQuantity from cartons: ${updatedItem.qcPassedCartons} cartons × ${piecesPerCarton.toFixed(1)} pieces/carton = ${updatedItem.receivedQuantity} pieces`);
                } else {
                  updatedItem.receivedQuantity = updatedItem.qcPassedQuantity || 0;
                }
              }
              
              // Preserve QC status and metadata (non-quantity fields)
              if (existingItem.qcStatus) updatedItem.qcStatus = existingItem.qcStatus;
              if (existingItem.qcNotes) updatedItem.qcNotes = existingItem.qcNotes;
              if (existingItem.qcDefects) updatedItem.qcDefects = existingItem.qcDefects;
              
              // Preserve loop-back metadata (non-quantity fields)
              if (existingItem.loopBackReason) updatedItem.loopBackReason = existingItem.loopBackReason;
              if (existingItem.loopBackStatus) updatedItem.loopBackStatus = existingItem.loopBackStatus;
              if (existingItem.loopBackNotes) updatedItem.loopBackNotes = existingItem.loopBackNotes;
              if (existingItem.loopBackCreatedAt) updatedItem.loopBackCreatedAt = existingItem.loopBackCreatedAt;
              if (existingItem.loopBackUpdatedAt) updatedItem.loopBackUpdatedAt = existingItem.loopBackUpdatedAt;
              
              // Preserve QC history
              if (existingItem.qcHistory) updatedItem.qcHistory = existingItem.qcHistory;
              
              console.log(`[PUT] Preserved and scaled QC and loop-back data for item ${item.itemCode}:`, {
                // Carton-based tracking (primary)
                qcPassedCartons: updatedItem.qcPassedCartons,
                loopBackCartons: updatedItem.loopBackCartons,
                pendingCartons: updatedItem.pendingCartons,
                // Quantity-based tracking (legacy)
                qcPassedQuantity: updatedItem.qcPassedQuantity,
                loopBackQuantity: updatedItem.loopBackQuantity,
                pendingQuantity: updatedItem.pendingQuantity,
                // Status and metadata
                qcStatus: updatedItem.qcStatus,
                loopBackStatus: updatedItem.loopBackStatus,
                scalingRatio: cartonScalingRatio
              });
            } else {
              console.log(`[PUT] No existing item found for ${item.itemCode} - new item or itemCode changed`);
            }
            
            return updatedItem;
          });
        } else {
          order[field] = req.body[field];
        }
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

    // Get historical data for similar items (exclude loop-backs)
    const historicalOrders = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
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
  // Get supplier-specific pricing history (exclude loop-backs)
  try {
    const history = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } }, // Exclude loop-back orders
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



module.exports = router;
