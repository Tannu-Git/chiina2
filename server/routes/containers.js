const express = require('express');
const Container = require('../models/Container');
const { auth, authorize, maskContainerIds, maskFinancialData } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/containers
// @desc    Get all containers
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, status } = req.query;

    const query = {};
    if (status) {
      query.status = status;
    }

    // Filter by client for client users
    if (req.user.role === 'client') {
      query['orders.clientId'] = req.user.clientId;
    }

    const containers = await Container.find(query)
      .populate('orders.orderId', 'orderNumber clientName')
      .populate('createdBy', 'name email')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Container.countDocuments(query);

    // Mask container IDs and financial data for clients
    let maskedContainers = maskContainerIds(containers, req.user);
    maskedContainers = maskFinancialData(maskedContainers, req.user);

    res.json({
      containers: maskedContainers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get containers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/containers/:id
// @desc    Get container by ID
// @access  Private
router.get('/:id', auth, async (req, res) => {
  try {
    const container = await Container.findById(req.params.id)
      .populate('orders.orderId', 'orderNumber clientName items')
      .populate('createdBy', 'name email');

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    // Check if client can access this container
    if (req.user.role === 'client') {
      const hasAccess = container.orders.some(order => order.clientId === req.user.clientId);
      if (!hasAccess) {
        return res.status(403).json({ message: 'Access denied' });
      }
    }

    // Mask container IDs and financial data for clients
    let maskedContainer = maskContainerIds(container, req.user);
    maskedContainer = maskFinancialData(maskedContainer, req.user);

    res.json(maskedContainer);
  } catch (error) {
    console.error('Get container error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/containers
// @desc    Create new container
// @access  Private (Admin/Staff only)
router.post('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { realContainerId, type, billNo, sealNo, charges } = req.body;

    // Get capacity info based on container type
    const capacityInfo = Container.getCapacityInfo(type);

    const container = new Container({
      realContainerId,
      type,
      billNo,
      sealNo,
      maxWeight: capacityInfo.maxWeight,
      maxCbm: capacityInfo.maxCbm,
      charges: charges || [],
      createdBy: req.user.id
    });

    await container.save();

    res.status(201).json({
      message: 'Container created successfully',
      container
    });
  } catch (error) {
    console.error('Create container error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/containers/:id
// @desc    Update container
// @access  Private (Admin/Staff only)
router.put('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'billNo', 'sealNo', 'charges', 'milestones', 'location', 'estimatedArrival'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        container[field] = req.body[field];
      }
    });

    // Recalculate financials if charges were updated
    if (req.body.charges) {
      container.allocateCharges();
      container.calculateFinancials();
    }

    container.updatedBy = req.user.id;
    await container.save();

    res.json({
      message: 'Container updated successfully',
      container
    });
  } catch (error) {
    console.error('Update container error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/containers/:id
// @desc    Update container status or other fields
// @access  Private (Admin/Staff only)
router.patch('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    // Update allowed fields
    const allowedUpdates = ['status', 'location', 'estimatedDeparture', 'estimatedArrival', 'billNo', 'sealNo'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        container[field] = req.body[field];
      }
    });

    container.updatedBy = req.user.id;
    await container.save();

    res.json({
      message: 'Container updated successfully',
      container
    });
  } catch (error) {
    console.error('Update container error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/containers/:id/allocate
// @desc    Allocate orders to container
// @access  Private (Admin/Staff only)
router.post('/:id/allocate', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.id);
    const { orderAllocations } = req.body; // Array of { orderId, cbmShare, weightShare }

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    // Update container orders
    container.orders = orderAllocations;

    // Calculate current utilization
    container.currentCbm = orderAllocations.reduce((sum, order) => sum + order.cbmShare, 0);
    container.currentWeight = orderAllocations.reduce((sum, order) => sum + order.weightShare, 0);

    // Allocate charges and calculate financials
    container.allocateCharges();
    container.calculateFinancials();

    container.updatedBy = req.user.id;
    await container.save();

    res.json({
      message: 'Orders allocated successfully',
      container
    });
  } catch (error) {
    console.error('Allocate orders error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
