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

module.exports = router;
