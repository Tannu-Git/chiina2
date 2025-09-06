const express = require('express');
const Container = require('../models/Container');
const Order = require('../models/Order');
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

    console.log(`📝 [UPDATE CONTAINER] Updating container: ${container.realContainerId}`);
    console.log(`📦 [UPDATE CONTAINER] Request data:`, req.body);

    // Update allowed fields
    const allowedUpdates = ['realContainerId', 'status', 'billNo', 'sealNo', 'charges', 'milestones', 'location', 'estimatedArrival', 'notes', 'orders', 'type', 'maxCbm', 'maxWeight'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        container[field] = req.body[field];
      }
    });

    // If orders were updated, recalculate container utilization
    if (req.body.orders) {
      console.log(`📊 [UPDATE CONTAINER] Updating ${req.body.orders.length} order allocations`);
      
      // Calculate current utilization
      container.currentCbm = req.body.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0);
      container.currentWeight = req.body.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0);
      container.currentCartons = req.body.orders.reduce((sum, order) => sum + (order.cartonShare || 0), 0);
      
      console.log(`📊 [UPDATE CONTAINER] New utilization - CBM: ${container.currentCbm}/${container.maxCbm}, Weight: ${container.currentWeight}/${container.maxWeight}`);
      
      // Validate capacity
      if (container.currentCbm > container.maxCbm) {
        return res.status(400).json({ 
          message: `CBM allocation (${container.currentCbm}) exceeds container capacity (${container.maxCbm})` 
        });
      }
      
      if (container.currentWeight > container.maxWeight) {
        return res.status(400).json({ 
          message: `Weight allocation (${container.currentWeight}kg) exceeds container capacity (${container.maxWeight}kg)` 
        });
      }
    }

    // Recalculate financials if charges or orders were updated
    if (req.body.charges || req.body.orders) {
      if (container.allocateCharges) {
        container.allocateCharges();
      }
      if (container.calculateFinancials) {
        container.calculateFinancials();
      }
    }

    container.updatedBy = req.user.id;
    await container.save();

    console.log(`✅ [UPDATE CONTAINER] Container updated successfully`);

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

// @route   DELETE /api/containers/:id
// @desc    Delete container and reset associated orders
// @access  Private (Admin/Staff only)
router.delete('/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.id)
      .populate('orders.orderId', 'orderNumber');

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    console.log(`🗑️ [DELETE CONTAINER] Deleting container: ${container.realContainerId}`);
    console.log(`📦 [DELETE CONTAINER] Container has ${container.orders?.length || 0} allocated orders`);

    // Reset all allocated orders to ready status and clear ALL allocation data
    if (container.orders && container.orders.length > 0) {
      const orderIds = container.orders.map(order => order.orderId).filter(Boolean);
      
      if (orderIds.length > 0) {
        // COMPREHENSIVE CLEANUP: Clear both order-level and item-level allocation data
        const updateResult = await Order.updateMany(
          { _id: { $in: orderIds } },
          { 
            $unset: { containerId: 1 },
            $set: { 
              status: 'ready',
              updatedBy: req.user.id,
              updatedAt: new Date()
            }
          }
        );
        
        // CRITICAL FIX: Use proper MongoDB syntax for clearing item allocations
        for (const orderId of orderIds) {
          try {
            await Order.updateOne(
              { _id: orderId },
              {
                $set: {
                  'items.$[].allocatedCartons': 0,
                  'items.$[].allocatedQuantity': 0,
                  'items.$[].containerId': null
                }
              }
            );
            console.log(`✅ [DELETE CONTAINER] Cleared item allocations for order ${orderId}`);
          } catch (itemError) {
            console.warn(`⚠️ [DELETE CONTAINER] Failed to clear item allocations for order ${orderId}:`, itemError.message);
            
            // Fallback: Manual item clearing
            try {
              const order = await Order.findById(orderId);
              if (order && order.items) {
                order.items.forEach(item => {
                  item.allocatedCartons = 0;
                  item.allocatedQuantity = 0;
                  item.containerId = null;
                });
                await order.save();
                console.log(`✅ [DELETE CONTAINER] Fallback clearing successful for order ${orderId}`);
              }
            } catch (fallbackError) {
              console.error(`❌ [DELETE CONTAINER] Fallback clearing failed for order ${orderId}:`, fallbackError.message);
            }
          }
        }
      }
    }

    // Delete the container
    await Container.findByIdAndDelete(req.params.id);

    console.log(`✅ [DELETE CONTAINER] Container ${container.realContainerId} deleted successfully`);

    res.json({
      message: 'Container deleted successfully',
      ordersReset: container.orders?.length || 0
    });
  } catch (error) {
    console.error('Delete container error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
