const express = require('express');
const Order = require('../models/Order');
const Container = require('../models/Container');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/warehouse/dashboard
// @desc    Get warehouse dashboard data
// @access  Private (Admin/Staff only)
router.get('/dashboard', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Get orders ready for warehouse processing
    const readyOrders = await Order.find({
      status: { $in: ['confirmed', 'in_production', 'ready'] }
    }).populate('createdBy', 'name');

    // Get containers in planning/loading phase
    const activeContainers = await Container.find({
      status: { $in: ['planning', 'loading'] }
    }).populate('orders.orderId', 'orderNumber clientName');

    // Calculate warehouse metrics
    const metrics = {
      ordersInWarehouse: readyOrders.length,
      containersLoading: activeContainers.filter(c => c.status === 'loading').length,
      containersPending: activeContainers.filter(c => c.status === 'planning').length,
      totalCbmUtilization: activeContainers.reduce((sum, c) => sum + c.currentCbm, 0)
    };

    res.json({
      metrics,
      readyOrders,
      activeContainers
    });
  } catch (error) {
    console.error('Warehouse dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/loopback
// @desc    Create loop-back order for shortages/damages
// @access  Private (Admin/Staff only)
router.post('/loopback', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { originalOrderId, items, reason, priority } = req.body;

    const originalOrder = await Order.findById(originalOrderId);
    if (!originalOrder) {
      return res.status(404).json({ message: 'Original order not found' });
    }

    // Generate new order number for loop-back
    const orderNumber = await Order.generateOrderNumber();

    const loopBackOrder = new Order({
      orderNumber,
      clientId: originalOrder.clientId,
      clientName: originalOrder.clientName,
      items,
      isLoopBack: true,
      parentOrderId: originalOrderId,
      loopBackReason: reason,
      priority: priority || (reason === 'DAMAGE' ? 'high' : 'medium'),
      deadline: reason === 'DAMAGE' ? new Date(Date.now() + 7*24*60*60*1000) : undefined,
      createdBy: req.user.id
    });

    await loopBackOrder.save();

    res.status(201).json({
      message: 'Loop-back order created successfully',
      order: loopBackOrder
    });
  } catch (error) {
    console.error('Create loop-back error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/qc-inspection
// @desc    Record QC inspection results
// @access  Private (Admin/Staff only)
router.post('/qc-inspection', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId, itemInspections } = req.body;
    // itemInspections: [{ itemIndex, status, notes, defectQty }]

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const loopBackOrders = [];

    // Process each item inspection
    for (const inspection of itemInspections) {
      const { itemIndex, status, notes, defectQty } = inspection;

      if (status === 'FAILED' && defectQty > 0) {
        // Create loop-back order for defective items
        const defectiveItem = {
          ...order.items[itemIndex],
          quantity: defectQty,
          notes: `QC Failed: ${notes}`
        };

        const loopBackOrder = await this.createLoopBackOrder(
          order,
          [defectiveItem],
          'QUALITY_ISSUE',
          req.user.id
        );

        loopBackOrders.push(loopBackOrder);
      }
    }

    // Update order status
    order.status = 'ready';
    order.updatedBy = req.user.id;
    await order.save();

    res.json({
      message: 'QC inspection recorded successfully',
      order,
      loopBackOrders
    });
  } catch (error) {
    console.error('QC inspection error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/container-allocation
// @desc    Optimize container allocation
// @access  Private (Admin/Staff only)
router.post('/container-allocation', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderIds, containerIds } = req.body;

    const orders = await Order.find({ _id: { $in: orderIds } });
    const containers = await Container.find({ _id: { $in: containerIds } });

    // Simple allocation algorithm (can be enhanced)
    const allocationPlan = [];
    let remainingOrders = [...orders];

    containers.forEach(container => {
      const containerLoad = {
        containerId: container._id,
        containerType: container.type,
        maxCbm: container.maxCbm,
        allocatedOrders: []
      };

      let remainingCapacity = container.maxCbm;

      // Allocate complete orders first
      remainingOrders = remainingOrders.filter(order => {
        const orderCbm = order.totalCbm;

        if (orderCbm <= remainingCapacity) {
          containerLoad.allocatedOrders.push({
            orderId: order._id,
            orderNumber: order.orderNumber,
            clientName: order.clientName,
            cbmShare: orderCbm,
            weightShare: order.totalWeight
          });
          remainingCapacity -= orderCbm;
          return false; // Remove from remaining
        }
        return true;
      });

      allocationPlan.push(containerLoad);
    });

    res.json({
      allocationPlan,
      unallocatedOrders: remainingOrders.map(o => ({
        orderId: o._id,
        orderNumber: o.orderNumber,
        totalCbm: o.totalCbm,
        reason: 'Insufficient container capacity'
      }))
    });
  } catch (error) {
    console.error('Container allocation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/warehouse/allocate-container
// @desc    Allocate order to container
// @access  Private (Admin/Staff only)
router.post('/allocate-container', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId, containerId, allocatedCbm, allocatedWeight, allocatedCartons } = req.body;

    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    let container;
    if (containerId === 'auto') {
      // Find best fit container
      const availableContainers = await Container.find({
        status: { $in: ['planning', 'loading'] },
        $expr: { $lt: ['$currentCbm', '$maxCbm'] }
      });

      container = availableContainers.find(c =>
        (c.maxCbm - c.currentCbm) >= allocatedCbm &&
        (c.maxWeight - c.currentWeight) >= allocatedWeight
      );

      if (!container) {
        return res.status(400).json({ message: 'No suitable container available' });
      }
    } else {
      container = await Container.findById(containerId);
      if (!container) {
        return res.status(404).json({ message: 'Container not found' });
      }
    }

    // Add order to container
    container.orders.push({
      orderId: order._id,
      allocatedCbm,
      allocatedWeight,
      allocatedCartons,
      allocatedAt: new Date()
    });

    // Update container metrics
    container.currentCbm += allocatedCbm;
    container.currentWeight += allocatedWeight;
    container.currentCartons += allocatedCartons;

    // Update order status
    order.status = 'allocated';
    order.containerId = container._id;

    await Promise.all([container.save(), order.save()]);

    res.json({
      message: 'Order allocated to container successfully',
      container: {
        id: container._id,
        clientFacingId: container.clientFacingId,
        currentCbm: container.currentCbm,
        maxCbm: container.maxCbm
      }
    });
  } catch (error) {
    console.error('Container allocation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
