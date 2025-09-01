const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Container = require('../models/Container');
const ShippingCompany = require('../models/ShippingCompany');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/warehouse/dashboard
// @desc    Get warehouse dashboard data
// @access  Private (Admin/Staff only)
router.get('/dashboard', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Get orders ready for warehouse processing (pending QC)
    // EXCLUDE loop-back orders - they are now quantity allocations within orders
    const pendingQCOrders = await Order.find({
      status: { $in: ['confirmed', 'in_production'] },
      isLoopBack: { $ne: true } // Exclude any remaining old loop-back orders
    }).populate('createdBy', 'name');

    // Get QC completed orders (also exclude loop-backs)
    const completedQCOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready', 'qc_failed'] },
      isLoopBack: { $ne: true } // Exclude any remaining old loop-back orders
    }).populate('createdBy', 'name').populate('qcInspector', 'name');

    // Get containers in planning/loading phase
    const activeContainers = await Container.find({
      status: { $in: ['planning', 'loading'] }
    }).populate('orders.orderId', 'orderNumber clientName');

    // Calculate warehouse metrics
    const metrics = {
      ordersInWarehouse: pendingQCOrders.length,
      completedQC: completedQCOrders.length,
      containersLoading: activeContainers.filter(c => c.status === 'loading').length,
      containersPending: activeContainers.filter(c => c.status === 'planning').length,
      totalCbmUtilization: activeContainers.reduce((sum, c) => sum + c.currentCbm, 0)
    };

    console.log('Warehouse dashboard data:', {
      pendingQC: pendingQCOrders.length,
      completedQC: completedQCOrders.length,
      containers: activeContainers.length
    });

    res.json({
      metrics,
      readyOrders: pendingQCOrders, // Rename for clarity
      completedOrders: completedQCOrders,
      activeContainers
    });
  } catch (error) {
    console.error('Warehouse dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/warehouse/loopback
// @desc    Get orders with loop-back quantities (not separate orders)
// @access  Private (Admin/Staff only)
router.get('/loopback', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { status, reason, search, limit = 50, page = 1 } = req.query;

    // Build filter for orders that have loop-back quantities
    const filter = {
      'items.loopBackQuantity': { $gt: 0 }
    };
    
    if (search) {
      filter.$or = [
        { orderNumber: { $regex: search, $options: 'i' } },
        { clientName: { $regex: search, $options: 'i' } }
      ];
    }

    // Get orders with loop-back quantities
    const skip = (parseInt(page) - 1) * parseInt(limit);
    const orders = await Order.find(filter)
      .populate('createdBy', 'name')
      .sort({ 'items.loopBackUpdatedAt': -1, createdAt: -1 })
      .limit(parseInt(limit))
      .skip(skip)
      .lean();

    // Transform orders to extract loop-back information
    const loopbackData = orders.map(order => {
      const loopBackItems = order.items.filter(item => (item.loopBackQuantity || 0) > 0);
      
      return {
        _id: order._id,
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        clientId: order.clientId,
        status: order.status,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
        loopBackItems: loopBackItems.map(item => ({
          itemCode: item.itemCode,
          description: item.description,
          expectedQuantity: item.quantity,
          qcPassedQuantity: item.qcPassedQuantity || 0,
          loopBackQuantity: item.loopBackQuantity || 0,
          loopBackReason: item.loopBackReason,
          loopBackStatus: item.loopBackStatus,
          loopBackNotes: item.loopBackNotes,
          loopBackCreatedAt: item.loopBackCreatedAt,
          loopBackUpdatedAt: item.loopBackUpdatedAt
        })),
        totalLoopBackQuantity: loopBackItems.reduce((sum, item) => sum + (item.loopBackQuantity || 0), 0),
        totalQcPassedQuantity: order.items.reduce((sum, item) => sum + (item.qcPassedQuantity || 0), 0),
        totalExpectedQuantity: order.items.reduce((sum, item) => sum + (item.quantity || 0), 0)
      };
    });

    // Calculate statistics
    const stats = {
      total: loopbackData.length,
      totalLoopBackQuantity: loopbackData.reduce((sum, order) => sum + order.totalLoopBackQuantity, 0),
      ordersWithLoopBack: loopbackData.length,
      averageLoopBackPerOrder: loopbackData.length > 0 ? 
        Math.round(loopbackData.reduce((sum, order) => sum + order.totalLoopBackQuantity, 0) / loopbackData.length) : 0
    };

    res.json({
      loopbackData,
      stats,
      pagination: {
        page: parseInt(page),
        limit: parseInt(limit),
        total: await Order.countDocuments(filter)
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Get loop-back data error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/warehouse/loopback/:orderId/item/:itemIndex
// @desc    Update loop-back quantities for specific order item
// @access  Private (Admin/Staff only)
router.patch('/loopback/:orderId/item/:itemIndex', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId, itemIndex } = req.params;
    const { qcPassedQuantity, loopBackQuantity, notes } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const itemIdx = parseInt(itemIndex);
    if (itemIdx < 0 || itemIdx >= order.items.length) {
      return res.status(400).json({ message: 'Invalid item index' });
    }

    const item = order.items[itemIdx];
    const expectedQuantity = item.quantity;
    
    // Validate quantities
    const newQcPassed = qcPassedQuantity !== undefined ? qcPassedQuantity : (item.qcPassedQuantity || 0);
    const newLoopBack = loopBackQuantity !== undefined ? loopBackQuantity : (item.loopBackQuantity || 0);
    
    if (newQcPassed < 0 || newLoopBack < 0) {
      return res.status(400).json({ message: 'Quantities cannot be negative' });
    }
    
    if (newQcPassed + newLoopBack > expectedQuantity) {
      return res.status(400).json({ 
        message: 'Total quantities cannot exceed expected quantity',
        details: {
          expectedQuantity,
          qcPassedQuantity: newQcPassed,
          loopBackQuantity: newLoopBack,
          total: newQcPassed + newLoopBack
        }
      });
    }

    // Update item quantities
    item.qcPassedQuantity = newQcPassed;
    item.loopBackQuantity = newLoopBack;
    
    // Update loop-back metadata
    if (newLoopBack > 0) {
      if (!item.loopBackStatus || item.loopBackStatus === 'none') {
        item.loopBackStatus = 'pending';
        item.loopBackReason = 'SHORTAGE';
        item.loopBackCreatedAt = new Date();
      }
      item.loopBackUpdatedAt = new Date();
      if (notes) {
        item.loopBackNotes = notes;
      }
    } else {
      // Clear loop-back data if quantity is 0
      item.loopBackStatus = 'none';
      item.loopBackReason = undefined;
      item.loopBackNotes = undefined;
    }
    
    // Update QC status
    if (newQcPassed === expectedQuantity) {
      item.qcStatus = 'completed';
    } else if (newQcPassed > 0) {
      item.qcStatus = 'partial';
    } else {
      item.qcStatus = 'pending';
    }

    order.updatedBy = req.user.id;
    await order.save();

    console.log('Loop-back quantity updated:', {
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      oldQcPassed: (item.qcPassedQuantity || 0),
      newQcPassed,
      oldLoopBack: (item.loopBackQuantity || 0),
      newLoopBack
    });

    res.json({
      message: 'Loop-back quantities updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        item: {
          itemCode: item.itemCode,
          expectedQuantity: item.quantity,
          qcPassedQuantity: item.qcPassedQuantity,
          loopBackQuantity: item.loopBackQuantity,
          pendingQuantity: Math.max(0, item.quantity - (item.qcPassedQuantity || 0) - (item.loopBackQuantity || 0)),
          loopBackStatus: item.loopBackStatus,
          qcStatus: item.qcStatus
        }
      }
    });
  } catch (error) {
    console.error('Update loop-back quantity error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PATCH /api/warehouse/loopback/:orderId/bulk
// @desc    Bulk update loop-back quantities for multiple items in an order
// @access  Private (Admin/Staff only)
router.patch('/loopback/:orderId/bulk', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { items, notes } = req.body; // items: [{ itemIndex, qcPassedQuantity, loopBackQuantity }]
    
    if (!items || !Array.isArray(items) || items.length === 0) {
      return res.status(400).json({ message: 'Items array is required and must not be empty' });
    }
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    const updates = [];
    
    // Validate and prepare updates
    for (const itemUpdate of items) {
      const { itemIndex, qcPassedQuantity, loopBackQuantity } = itemUpdate;
      
      if (itemIndex < 0 || itemIndex >= order.items.length) {
        return res.status(400).json({ message: `Invalid item index: ${itemIndex}` });
      }
      
      const item = order.items[itemIndex];
      const expectedQuantity = item.quantity;
      
      const newQcPassed = qcPassedQuantity !== undefined ? qcPassedQuantity : (item.qcPassedQuantity || 0);
      const newLoopBack = loopBackQuantity !== undefined ? loopBackQuantity : (item.loopBackQuantity || 0);
      
      if (newQcPassed < 0 || newLoopBack < 0) {
        return res.status(400).json({ 
          message: `Quantities cannot be negative for item ${item.itemCode}` 
        });
      }
      
      if (newQcPassed + newLoopBack > expectedQuantity) {
        return res.status(400).json({ 
          message: `Total quantities exceed expected for item ${item.itemCode}`,
          details: {
            itemCode: item.itemCode,
            expectedQuantity,
            qcPassedQuantity: newQcPassed,
            loopBackQuantity: newLoopBack,
            total: newQcPassed + newLoopBack
          }
        });
      }
      
      updates.push({
        itemIndex,
        itemCode: item.itemCode,
        oldQcPassed: item.qcPassedQuantity || 0,
        oldLoopBack: item.loopBackQuantity || 0,
        newQcPassed,
        newLoopBack
      });
    }

    // Apply updates
    for (const update of updates) {
      const item = order.items[update.itemIndex];
      
      item.qcPassedQuantity = update.newQcPassed;
      item.loopBackQuantity = update.newLoopBack;
      
      // Update loop-back metadata
      if (update.newLoopBack > 0) {
        if (!item.loopBackStatus || item.loopBackStatus === 'none') {
          item.loopBackStatus = 'pending';
          item.loopBackReason = 'SHORTAGE';
          item.loopBackCreatedAt = new Date();
        }
        item.loopBackUpdatedAt = new Date();
        if (notes) {
          item.loopBackNotes = notes;
        }
      } else {
        item.loopBackStatus = 'none';
        item.loopBackReason = undefined;
        item.loopBackNotes = undefined;
      }
      
      // Update QC status
      if (update.newQcPassed === item.quantity) {
        item.qcStatus = 'completed';
      } else if (update.newQcPassed > 0) {
        item.qcStatus = 'partial';
      } else {
        item.qcStatus = 'pending';
      }
    }

    order.updatedBy = req.user.id;
    await order.save();

    console.log('Bulk loop-back quantities updated:', {
      orderNumber: order.orderNumber,
      updatesCount: updates.length,
      updates: updates.map(u => ({
        itemCode: u.itemCode,
        qcPassed: `${u.oldQcPassed} → ${u.newQcPassed}`,
        loopBack: `${u.oldLoopBack} → ${u.newLoopBack}`
      }))
    });

    res.json({
      message: 'Bulk loop-back quantities updated successfully',
      order: {
        _id: order._id,
        orderNumber: order.orderNumber,
        updatedItems: updates.map(update => {
          const item = order.items[update.itemIndex];
          return {
            itemCode: item.itemCode,
            expectedQuantity: item.quantity,
            qcPassedQuantity: item.qcPassedQuantity,
            loopBackQuantity: item.loopBackQuantity,
            pendingQuantity: Math.max(0, item.quantity - (item.qcPassedQuantity || 0) - (item.loopBackQuantity || 0)),
            loopBackStatus: item.loopBackStatus,
            qcStatus: item.qcStatus
          };
        })
      },
      summary: {
        itemsUpdated: updates.length,
        totalQcPassed: order.items.reduce((sum, item) => sum + (item.qcPassedQuantity || 0), 0),
        totalLoopBack: order.items.reduce((sum, item) => sum + (item.loopBackQuantity || 0), 0)
      }
    });
  } catch (error) {
    console.error('Bulk update loop-back quantities error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/warehouse/loopback/:orderId/resolve
// @desc    Resolve loop-back by moving quantity to QC passed
// @access  Private (Admin/Staff only)
router.post('/loopback/:orderId/resolve', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemIndex, resolvedQuantity, notes } = req.body;
    
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ message: 'Order not found' });
    }

    if (itemIndex < 0 || itemIndex >= order.items.length) {
      return res.status(400).json({ message: 'Invalid item index' });
    }

    const item = order.items[itemIndex];
    const currentLoopBack = item.loopBackQuantity || 0;
    
    if (resolvedQuantity <= 0 || resolvedQuantity > currentLoopBack) {
      return res.status(400).json({ 
        message: 'Resolved quantity must be positive and not exceed current loop-back quantity',
        details: {
          currentLoopBack,
          requestedResolve: resolvedQuantity
        }
      });
    }

    // Move quantity from loop-back to QC passed
    item.loopBackQuantity = currentLoopBack - resolvedQuantity;
    item.qcPassedQuantity = (item.qcPassedQuantity || 0) + resolvedQuantity;
    
    // Update status
    if (item.loopBackQuantity === 0) {
      item.loopBackStatus = 'resolved';
      item.loopBackNotes = notes || 'Loop-back fully resolved';
    } else {
      item.loopBackUpdatedAt = new Date();
      if (notes) {
        item.loopBackNotes = notes;
      }
    }
    
    // Update QC status
    if (item.qcPassedQuantity === item.quantity) {
      item.qcStatus = 'completed';
    } else if (item.qcPassedQuantity > 0) {
      item.qcStatus = 'partial';
    }

    order.updatedBy = req.user.id;
    await order.save();

    res.json({
      message: 'Loop-back resolved successfully',
      resolvedQuantity,
      item: {
        itemCode: item.itemCode,
        expectedQuantity: item.quantity,
        qcPassedQuantity: item.qcPassedQuantity,
        loopBackQuantity: item.loopBackQuantity,
        pendingQuantity: Math.max(0, item.quantity - (item.qcPassedQuantity || 0) - (item.loopBackQuantity || 0)),
        loopBackStatus: item.loopBackStatus,
        qcStatus: item.qcStatus
      }
    });
  } catch (error) {
    console.error('Resolve loop-back error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/warehouse/qc-inspection
// @desc    Record QC inspection results with loop-back quantity allocation
// @access  Private (Admin/Staff only)
router.post('/qc-inspection', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderId, inspectorId, items } = req.body;

    // Input validation with detailed error messages
    if (!orderId || !inspectorId || !items || !Array.isArray(items)) {
      return res.status(400).json({ 
        message: 'Missing required fields: orderId, inspectorId, and items array',
        details: {
          orderId: !orderId ? 'Order ID is required' : 'Valid',
          inspectorId: !inspectorId ? 'Inspector ID is required' : 'Valid',
          items: !items ? 'Items array is required' : !Array.isArray(items) ? 'Items must be an array' : 'Valid'
        }
      });
    }

    if (items.length === 0) {
      return res.status(400).json({ 
        message: 'Items array cannot be empty',
        details: 'At least one item must be provided for QC inspection'
      });
    }

    // Validate each item with detailed feedback (including carton-based fields)
    const itemValidationErrors = [];
    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      const errors = [];
      
      // Quantity-based validation (legacy)
      if (typeof item.expectedQuantity !== 'number' || item.expectedQuantity < 0) {
        errors.push('expectedQuantity must be a non-negative number');
      }
      
      if (typeof item.qcPassedQuantity !== 'number' || item.qcPassedQuantity < 0) {
        errors.push('qcPassedQuantity must be a non-negative number');
      }
      
      // Carton-based validation (primary)
      if (item.expectedCartons !== undefined && (typeof item.expectedCartons !== 'number' || item.expectedCartons < 0)) {
        errors.push('expectedCartons must be a non-negative number');
      }
      
      if (item.qcPassedCartons !== undefined && (typeof item.qcPassedCartons !== 'number' || item.qcPassedCartons < 0)) {
        errors.push('qcPassedCartons must be a non-negative number');
      }
      
      if (item.loopBackCartons !== undefined && (typeof item.loopBackCartons !== 'number' || item.loopBackCartons < 0)) {
        errors.push('loopBackCartons must be a non-negative number');
      }
      
      if (!item.itemCode || typeof item.itemCode !== 'string') {
        errors.push('itemCode is required and must be a string');
      }
      
      if (errors.length > 0) {
        itemValidationErrors.push({
          itemIndex: i,
          itemCode: item.itemCode || 'Unknown',
          errors
        });
      }
    }
    
    if (itemValidationErrors.length > 0) {
      return res.status(400).json({ 
        message: 'Item validation failed',
        details: itemValidationErrors
      });
    }
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).json({ 
        message: 'Order not found',
        details: `No order found with ID: ${orderId}`
      });
    }

    // Check if this is a re-inspection
    const isReInspection = order.qcCompletedAt ? true : false;
    
    console.log(`QC inspection for order ${order.orderNumber}:`, {
      isReInspection,
      previousQCDate: order.qcCompletedAt,
      itemsToInspect: items.length
    });

    // Process each item inspection with carton-based loop-back system (PRIMARY)
    for (let i = 0; i < items.length; i++) {
      const inspection = items[i];
      const { expectedQuantity, qcPassedQuantity, loopBackQuantity, expectedCartons, qcPassedCartons, loopBackCartons, notes, defects } = inspection;

      console.log(`Processing item ${i} (CARTON-BASED PRIMARY):`, {
        itemCode: inspection.itemCode,
        // Primary carton-based data
        expectedCartons: expectedCartons || 0,
        qcPassedCartons: qcPassedCartons || 0,
        loopBackCartons: loopBackCartons || 0,
        // Legacy quantity-based data
        expectedQuantity,
        qcPassedQuantity: qcPassedQuantity || 0,
        loopBackQuantity: loopBackQuantity || 0
      });
      
      // Update order item with new carton-based and quantity-based loop-back quantities
      if (order.items[i]) {
        // CARTON-BASED QC TRACKING (PRIMARY)
        const existingQcPassedCtn = order.items[i].qcPassedCartons || 0;
        const existingQcStatusCtn = order.items[i].qcStatus;
        const isExistingCartonDataPreserved = existingQcPassedCtn > 0 && existingQcStatusCtn && existingQcStatusCtn !== 'pending';
        
        // QUANTITY-BASED QC TRACKING (LEGACY)
        const existingQcPassed = order.items[i].qcPassedQuantity || 0;
        const existingQcStatus = order.items[i].qcStatus;
        const isExistingDataPreserved = existingQcPassed > 0 && existingQcStatus && existingQcStatus !== 'pending';
        
        console.log(`Item ${i} QC update check:`, {
          // Carton-based tracking
          existingQcPassedCtn,
          newQcPassedCtn: qcPassedCartons || 0,
          expectedCartons: expectedCartons || order.items[i].cartons || 0,
          isExistingCartonDataPreserved,
          // Quantity-based tracking
          existingQcPassed,
          newQcPassed: qcPassedQuantity || 0,
          expectedQuantity,
          isExistingDataPreserved
        });
        
        // Update CARTON-BASED QC data (PRIMARY)
        const itemExpectedCartons = expectedCartons || order.items[i].cartons || 0;
        if (!isExistingCartonDataPreserved || (qcPassedCartons !== undefined && qcPassedCartons !== existingQcPassedCtn)) {
          order.items[i].qcPassedCartons = qcPassedCartons || 0;
          console.log(`Updated QC passed cartons for item ${i}: ${existingQcPassedCtn} → ${qcPassedCartons || 0}`);
        } else {
          console.log(`Preserving existing QC passed cartons for item ${i}: ${existingQcPassedCtn}`);
        }
        
        // Calculate carton-based loop-back quantity (shortage)
        const calculatedLoopBackCtn = Math.max(0, itemExpectedCartons - (order.items[i].qcPassedCartons || 0));
        order.items[i].loopBackCartons = loopBackCartons !== undefined ? loopBackCartons : calculatedLoopBackCtn;
        
        // Update QUANTITY-BASED QC data (LEGACY COMPATIBILITY)
        if (!isExistingDataPreserved || (qcPassedQuantity !== undefined && qcPassedQuantity !== existingQcPassed)) {
          order.items[i].qcPassedQuantity = qcPassedQuantity || 0;
          console.log(`Updated QC passed quantity for item ${i}: ${existingQcPassed} → ${qcPassedQuantity || 0}`);
        } else {
          console.log(`Preserving existing QC passed quantity for item ${i}: ${existingQcPassed}`);
        }
        
        // Calculate quantity-based loop-back quantity (shortage)
        const calculatedLoopBack = Math.max(0, expectedQuantity - (order.items[i].qcPassedQuantity || 0));
        order.items[i].loopBackQuantity = loopBackQuantity !== undefined ? loopBackQuantity : calculatedLoopBack;
        
        // Set loop-back metadata if there's a shortage (prioritize carton-based)
        const hasCartonLoopBack = (order.items[i].loopBackCartons || 0) > 0;
        const hasQuantityLoopBack = (order.items[i].loopBackQuantity || 0) > 0;
        
        if (hasCartonLoopBack || hasQuantityLoopBack) {
          order.items[i].loopBackStatus = 'pending';
          order.items[i].loopBackReason = 'SHORTAGE';
          const cartonShortage = order.items[i].loopBackCartons || 0;
          const quantityShortage = order.items[i].loopBackQuantity || 0;
          order.items[i].loopBackNotes = notes || `Shortage: ${cartonShortage} cartons, ${quantityShortage} units missing`;
          if (!order.items[i].loopBackCreatedAt) {
            order.items[i].loopBackCreatedAt = new Date();
          }
          order.items[i].loopBackUpdatedAt = new Date();
        } else {
          // Clear loop-back data if no shortage
          order.items[i].loopBackStatus = 'none';
          order.items[i].loopBackReason = undefined;
          order.items[i].loopBackNotes = undefined;
        }
        
        // Set QC metadata using carton-based calculation as primary, quantity as fallback
        const finalQcPassedCtn = order.items[i].qcPassedCartons || 0;
        const finalQcPassed = order.items[i].qcPassedQuantity || 0;
        const cartonCompletionPercentage = itemExpectedCartons > 0 ? (finalQcPassedCtn / itemExpectedCartons) * 100 : 0;
        const quantityCompletionPercentage = expectedQuantity > 0 ? (finalQcPassed / expectedQuantity) * 100 : 0;
        
        // Use carton-based percentage as primary, fall back to quantity-based
        const primaryCompletionPercentage = itemExpectedCartons > 0 ? cartonCompletionPercentage : quantityCompletionPercentage;
        
        if (primaryCompletionPercentage >= 100) {
          order.items[i].qcStatus = 'completed';
        } else if (finalQcPassedCtn > 0 || finalQcPassed > 0) {
          order.items[i].qcStatus = 'partial';
        } else {
          order.items[i].qcStatus = 'pending';
        }
        
        console.log(`Item ${i} QC status update:`, {
          finalQcPassedCtn,
          itemExpectedCartons,
          cartonCompletionPercentage: cartonCompletionPercentage.toFixed(1) + '%',
          finalQcPassed,
          expectedQuantity,
          quantityCompletionPercentage: quantityCompletionPercentage.toFixed(1) + '%',
          primaryCompletionPercentage: primaryCompletionPercentage.toFixed(1) + '%',
          qcStatus: order.items[i].qcStatus
        });
        
        order.items[i].qcNotes = notes;
        
        // Handle defects for damaged items
        if (defects && Array.isArray(defects)) {
          order.items[i].qcDefects = defects;
        }
      }
    }

    // Update order status based on overall QC results using carton-based data as primary
    const allItemsCompleted = order.items.every(item => {
      const qcPassedCtn = item.qcPassedCartons || 0;
      const expectedCtn = item.cartons || 0;
      const qcPassed = item.qcPassedQuantity || 0;
      const expected = item.quantity || 0;
      
      // Use carton-based completion as primary, fall back to quantity-based
      if (expectedCtn > 0) {
        return qcPassedCtn >= expectedCtn;
      } else {
        return expected > 0 && qcPassed >= expected;
      }
    });
    
    const hasLoopBack = order.items.some(item => (item.loopBackCartons || 0) > 0 || (item.loopBackQuantity || 0) > 0);
    
    if (allItemsCompleted && !hasLoopBack) {
      order.status = 'ready';
    } else if (hasLoopBack || items.some(item => (item.qcPassedQuantity || 0) > 0)) {
      order.status = 'partial_ready';
    } else {
      order.status = 'qc_failed';
    }

    order.updatedBy = req.user.id;
    order.qcCompletedAt = new Date();
    order.qcInspector = inspectorId;
    
    // Add audit trail for re-inspection
    if (isReInspection) {
      order.qcReInspectionCount = (order.qcReInspectionCount || 0) + 1;
      order.qcReInspectionHistory = order.qcReInspectionHistory || [];
      order.qcReInspectionHistory.push({
        date: new Date(),
        inspector: inspectorId,
        reason: 'Manual re-inspection',
        previousStatus: order.status
      });
    }
    
    await order.save();

    console.log('QC inspection completed with new loop-back system:', {
      orderId: order._id,
      orderNumber: order.orderNumber,
      newStatus: order.status,
      isReInspection,
      totalLoopBackItems: items.filter(item => (item.loopBackQuantity || 0) > 0).length
    });

    res.json({
      message: isReInspection ? 'QC re-inspection recorded successfully' : 'QC inspection recorded successfully',
      order,
      isReInspection,
      summary: {
        totalItems: order.items.length,
        // Carton-based summary (primary)
        qcPassedItemsCartons: order.items.filter(item => (item.qcPassedCartons || 0) > 0).length,
        loopBackItemsCartons: order.items.filter(item => (item.loopBackCartons || 0) > 0).length,
        completedItemsCartons: order.items.filter(item => {
          const qcPassedCtn = item.qcPassedCartons || 0;
          const expectedCtn = item.cartons || 0;
          return expectedCtn > 0 && qcPassedCtn >= expectedCtn;
        }).length,
        // Quantity-based summary (legacy)
        qcPassedItems: order.items.filter(item => (item.qcPassedQuantity || 0) > 0).length,
        loopBackItems: order.items.filter(item => (item.loopBackQuantity || 0) > 0).length,
        completedItems: order.items.filter(item => {
          const qcPassed = item.qcPassedQuantity || 0;
          const expected = item.quantity || 0;
          return expected > 0 && qcPassed >= expected;
        }).length
      }
    });
  } catch (error) {
    console.error('QC inspection error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
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

// @route   GET /api/warehouse/qc-ready-orders
// @desc    Get orders that have completed QC and are ready for container allocation
// @access  Private (Admin/Staff only)
router.get('/qc-ready-orders', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { clientId, minQty = 0, includePartial = true } = req.query;
    
    // Build filter for QC-completed orders
    const filter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    if (clientId) {
      filter.clientId = clientId;
    }
    
    const orders = await Order.find(filter)
      .populate('createdBy', 'name')
      .populate('qcInspector', 'name')
      .sort({ qcCompletedAt: -1, createdAt: -1 })
      .lean();
    
    // Process orders to show available quantities for allocation
    const allocatableOrders = orders.map(order => {
      const allocatableItems = order.items.filter(item => {
        const qcPassedQty = item.qcPassedQuantity || 0;
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedQty = item.allocatedQuantity || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        
        const availableQty = qcPassedQty - allocatedQty;
        const availableCtn = qcPassedCtn - allocatedCtn;
        
        return (availableQty > minQty || availableCtn > 0) && 
               (item.qcStatus === 'completed' || (includePartial === 'true' && item.qcStatus === 'partial'));
      }).map(item => {
        const qcPassedQty = item.qcPassedQuantity || 0;
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedQty = item.allocatedQuantity || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        
        return {
          ...item,
          availableQuantity: qcPassedQty - allocatedQty,
          availableCartons: qcPassedCtn - allocatedCtn,
          totalAvailableCbm: (qcPassedCtn - allocatedCtn) * (item.unitCbm || 0),
          totalAvailableWeight: (qcPassedQty - allocatedQty) * (item.unitWeight || 0),
          allocationStatus: {
            canAllocate: (qcPassedQty - allocatedQty) > 0 || (qcPassedCtn - allocatedCtn) > 0,
            isPartiallyAllocated: allocatedQty > 0 || allocatedCtn > 0,
            percentageAvailable: qcPassedQty > 0 ? ((qcPassedQty - allocatedQty) / qcPassedQty * 100).toFixed(1) : 0
          }
        };
      });
      
      if (allocatableItems.length === 0) {
        return null; // Skip orders with no allocatable items
      }
      
      // Calculate order-level totals for available items
      const orderTotals = {
        totalAvailableCbm: allocatableItems.reduce((sum, item) => sum + item.totalAvailableCbm, 0),
        totalAvailableWeight: allocatableItems.reduce((sum, item) => sum + item.totalAvailableWeight, 0),
        totalAvailableCartons: allocatableItems.reduce((sum, item) => sum + item.availableCartons, 0),
        totalCarryingCharges: allocatableItems.reduce((sum, item) => {
          const carryingCharge = item.carryingCharge || {};
          let chargeAmount = 0;
          
          switch (carryingCharge.basis) {
            case 'carton':
              chargeAmount = item.availableCartons * (carryingCharge.rate || 0);
              break;
            case 'cbm':
              chargeAmount = item.totalAvailableCbm * (carryingCharge.rate || 0);
              break;
            case 'weight':
              chargeAmount = item.totalAvailableWeight * (carryingCharge.rate || 0);
              break;
            default:
              chargeAmount = carryingCharge.amount || 0;
          }
          
          return sum + chargeAmount;
        }, 0)
      };
      
      return {
        ...order,
        items: allocatableItems,
        allocationSummary: {
          totalItems: allocatableItems.length,
          canFullyAllocate: allocatableItems.every(item => item.allocationStatus.percentageAvailable === '100.0'),
          partialAllocationRequired: allocatableItems.some(item => parseFloat(item.allocationStatus.percentageAvailable) < 100),
          ...orderTotals
        }
      };
    }).filter(order => order !== null);
    
    // Calculate summary statistics
    const summary = {
      totalOrders: allocatableOrders.length,
      totalCbm: allocatableOrders.reduce((sum, order) => sum + order.allocationSummary.totalAvailableCbm, 0),
      totalWeight: allocatableOrders.reduce((sum, order) => sum + order.allocationSummary.totalAvailableWeight, 0),
      totalCartons: allocatableOrders.reduce((sum, order) => sum + order.allocationSummary.totalAvailableCartons, 0),
      totalCarryingCharges: allocatableOrders.reduce((sum, order) => sum + order.allocationSummary.totalCarryingCharges, 0),
      clientBreakdown: {}
    };
    
    // Group by client for summary
    allocatableOrders.forEach(order => {
      if (!summary.clientBreakdown[order.clientId]) {
        summary.clientBreakdown[order.clientId] = {
          clientName: order.clientName,
          orders: 0,
          totalCbm: 0,
          totalWeight: 0,
          totalCartons: 0,
          totalCarryingCharges: 0
        };
      }
      
      const client = summary.clientBreakdown[order.clientId];
      client.orders++;
      client.totalCbm += order.allocationSummary.totalAvailableCbm;
      client.totalWeight += order.allocationSummary.totalAvailableWeight;
      client.totalCartons += order.allocationSummary.totalAvailableCartons;
      client.totalCarryingCharges += order.allocationSummary.totalCarryingCharges;
    });
    
    console.log('QC ready orders fetched:', {
      totalOrders: summary.totalOrders,
      totalCbm: summary.totalCbm.toFixed(2),
      clientCount: Object.keys(summary.clientBreakdown).length
    });
    
    res.json({
      orders: allocatableOrders,
      summary,
      filters: { clientId, minQty, includePartial },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('QC ready orders fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/warehouse/allocation-wizard
// @desc    Multi-step container allocation wizard
// @access  Private (Admin/Staff only)
router.post('/allocation-wizard', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { step, data } = req.body;
    
    switch (step) {
      case 'validate-selection':
        return await validateOrderSelection(req, res, data);
      case 'optimize-containers':
        return await optimizeContainerAllocation(req, res, data);
      case 'preview-allocation':
        return await previewAllocation(req, res, data);
      case 'confirm-allocation':
        return await confirmAllocation(req, res, data);
      default:
        return res.status(400).json({ 
          message: 'Invalid step',
          validSteps: ['validate-selection', 'optimize-containers', 'preview-allocation', 'confirm-allocation']
        });
    }
  } catch (error) {
    console.error('Allocation wizard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// Helper function: Validate order selection
async function validateOrderSelection(req, res, data) {
  const { selectedOrders } = data; // [{ orderId, items: [{ itemIndex, allocateQuantity, allocateCartons }] }]
  
  if (!selectedOrders || !Array.isArray(selectedOrders)) {
    return res.status(400).json({ message: 'Selected orders array is required' });
  }
  
  const validationResults = [];
  let totalCbm = 0;
  let totalWeight = 0;
  let totalCartons = 0;
  let totalCarryingCharges = 0;
  
  for (const selection of selectedOrders) {
    const order = await Order.findById(selection.orderId).lean();
    if (!order) {
      return res.status(404).json({ message: `Order not found: ${selection.orderId}` });
    }
    
    const itemValidations = [];
    
    for (const itemSelection of selection.items) {
      const item = order.items[itemSelection.itemIndex];
      if (!item) {
        return res.status(400).json({ 
          message: `Item not found at index ${itemSelection.itemIndex} in order ${order.orderNumber}` 
        });
      }
      
      const availableQty = (item.qcPassedQuantity || 0) - (item.allocatedQuantity || 0);
      const availableCtn = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
      
      const requestedQty = itemSelection.allocateQuantity || 0;
      const requestedCtn = itemSelection.allocateCartons || 0;
      
      if (requestedQty > availableQty || requestedCtn > availableCtn) {
        return res.status(400).json({
          message: 'Requested allocation exceeds available quantity',
          orderNumber: order.orderNumber,
          itemCode: item.itemCode,
          available: { quantity: availableQty, cartons: availableCtn },
          requested: { quantity: requestedQty, cartons: requestedCtn }
        });
      }
      
      const itemCbm = requestedCtn * (item.unitCbm || 0);
      const itemWeight = requestedQty * (item.unitWeight || 0);
      
      // Calculate carrying charges for allocated quantity
      let itemCarryingCharges = 0;
      const carryingCharge = item.carryingCharge || {};
      switch (carryingCharge.basis) {
        case 'carton':
          itemCarryingCharges = requestedCtn * (carryingCharge.rate || 0);
          break;
        case 'cbm':
          itemCarryingCharges = itemCbm * (carryingCharge.rate || 0);
          break;
        case 'weight':
          itemCarryingCharges = itemWeight * (carryingCharge.rate || 0);
          break;
        default:
          itemCarryingCharges = (carryingCharge.amount || 0) * (requestedQty / item.quantity);
      }
      
      totalCbm += itemCbm;
      totalWeight += itemWeight;
      totalCartons += requestedCtn;
      totalCarryingCharges += itemCarryingCharges;
      
      itemValidations.push({
        itemIndex: itemSelection.itemIndex,
        itemCode: item.itemCode,
        description: item.description,
        allocation: {
          quantity: requestedQty,
          cartons: requestedCtn,
          cbm: itemCbm,
          weight: itemWeight,
          carryingCharges: itemCarryingCharges,
          paymentType: item.paymentType
        },
        validation: {
          isValid: true,
          availableAfterAllocation: {
            quantity: availableQty - requestedQty,
            cartons: availableCtn - requestedCtn
          }
        }
      });
    }
    
    validationResults.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      items: itemValidations,
      orderTotals: {
        cbm: itemValidations.reduce((sum, item) => sum + item.allocation.cbm, 0),
        weight: itemValidations.reduce((sum, item) => sum + item.allocation.weight, 0),
        cartons: itemValidations.reduce((sum, item) => sum + item.allocation.cartons, 0),
        carryingCharges: itemValidations.reduce((sum, item) => sum + item.allocation.carryingCharges, 0)
      }
    });
  }
  
  res.json({
    status: 'validated',
    validationResults,
    allocationTotals: {
      totalCbm,
      totalWeight,
      totalCartons,
      totalCarryingCharges
    },
    recommendations: {
      suggestedContainerType: totalCbm <= 33 ? '20ft' : totalCbm <= 67 ? '40ft' : '40ft_hc',
      utilizationWarnings: totalCbm > 76 ? ['Allocation exceeds 40ft HC container capacity'] : []
    }
  });
}

// Helper function: Optimize container allocation
async function optimizeContainerAllocation(req, res, data) {
  const { allocationTotals, selectedContainers } = data;
  // selectedContainers: [{ type, count }] or existing container IDs
  
  const containerCapacities = {
    '20ft': { maxCbm: 33, maxWeight: 28000 },
    '40ft': { maxCbm: 67, maxWeight: 30000 },
    '40ft_hc': { maxCbm: 76, maxWeight: 30000 },
    '45ft': { maxCbm: 86, maxWeight: 30000 }
  };
  
  const optimizationResults = [];
  
  if (selectedContainers && selectedContainers.length > 0) {
    // User provided container preferences
    let remainingCbm = allocationTotals.totalCbm;
    let remainingWeight = allocationTotals.totalWeight;
    
    for (const containerSpec of selectedContainers) {
      if (containerSpec.existingId) {
        // Use existing container
        const container = await Container.findById(containerSpec.existingId);
        if (container) {
          const availableCbm = container.maxCbm - container.currentCbm;
          const availableWeight = container.maxWeight - container.currentWeight;
          
          const allocatedCbm = Math.min(remainingCbm, availableCbm);
          const allocatedWeight = Math.min(remainingWeight, availableWeight);
          
          optimizationResults.push({
            type: 'existing',
            containerId: container._id,
            realContainerId: container.realContainerId,
            clientFacingId: container.clientFacingId,
            capacity: { maxCbm: container.maxCbm, maxWeight: container.maxWeight },
            current: { cbm: container.currentCbm, weight: container.currentWeight },
            allocated: { cbm: allocatedCbm, weight: allocatedWeight },
            utilization: {
              cbm: ((container.currentCbm + allocatedCbm) / container.maxCbm * 100).toFixed(1),
              weight: ((container.currentWeight + allocatedWeight) / container.maxWeight * 100).toFixed(1)
            }
          });
          
          remainingCbm -= allocatedCbm;
          remainingWeight -= allocatedWeight;
        }
      } else {
        // Create new container
        const capacity = containerCapacities[containerSpec.type];
        const allocatedCbm = Math.min(remainingCbm, capacity.maxCbm);
        const allocatedWeight = Math.min(remainingWeight, capacity.maxWeight);
        
        optimizationResults.push({
          type: 'new',
          containerType: containerSpec.type,
          capacity,
          allocated: { cbm: allocatedCbm, weight: allocatedWeight },
          utilization: {
            cbm: (allocatedCbm / capacity.maxCbm * 100).toFixed(1),
            weight: (allocatedWeight / capacity.maxWeight * 100).toFixed(1)
          }
        });
        
        remainingCbm -= allocatedCbm;
        remainingWeight -= allocatedWeight;
      }
      
      if (remainingCbm <= 0 && remainingWeight <= 0) break;
    }
  } else {
    // Auto-optimize container selection
    const totalCbm = allocationTotals.totalCbm;
    const totalWeight = allocationTotals.totalWeight;
    
    // Find most efficient container combination
    const options = [
      { type: '20ft', count: Math.ceil(totalCbm / 33) },
      { type: '40ft', count: Math.ceil(totalCbm / 67) },
      { type: '40ft_hc', count: Math.ceil(totalCbm / 76) }
    ];
    
    // Choose option with best utilization
    const bestOption = options.reduce((best, current) => {
      const currentCapacity = containerCapacities[current.type];
      const currentUtilization = totalCbm / (currentCapacity.maxCbm * current.count) * 100;
      const bestCapacity = containerCapacities[best.type];
      const bestUtilization = totalCbm / (bestCapacity.maxCbm * best.count) * 100;
      
      return currentUtilization > bestUtilization ? current : best;
    });
    
    optimizationResults.push({
      type: 'optimized',
      recommendation: bestOption,
      utilization: {
        cbm: (totalCbm / (containerCapacities[bestOption.type].maxCbm * bestOption.count) * 100).toFixed(1),
        efficiency: 'optimal'
      }
    });
  }
  
  res.json({
    status: 'optimized',
    optimizationResults,
    summary: {
      totalContainersNeeded: optimizationResults.length,
      averageUtilization: optimizationResults.reduce((sum, result) => 
        sum + parseFloat(result.utilization?.cbm || 0), 0) / optimizationResults.length
    }
  });
}

// Helper function: Preview allocation
async function previewAllocation(req, res, data) {
  const { validationResults, optimizationResults, shippingCompanyId, baseCharges } = data;
  
  // Calculate total costs and profit preview
  const totalCarryingCharges = validationResults.reduce((sum, order) => 
    sum + order.orderTotals.carryingCharges, 0);
  
  const totalBaseCharges = (baseCharges?.gst || 0) + 
                          (baseCharges?.duty || 0) + 
                          (baseCharges?.misc || 0) + 
                          (baseCharges?.extraCharge || 0);
  
  const estimatedProfit = totalCarryingCharges - totalBaseCharges;
  const profitMargin = totalCarryingCharges > 0 ? (estimatedProfit / totalCarryingCharges * 100) : 0;
  
  // Payment type breakdown
  const paymentBreakdown = {
    throughMe: { amount: 0, orders: 0 },
    direct: { amount: 0, orders: 0 }
  };
  
  validationResults.forEach(order => {
    order.items.forEach(item => {
      if (item.allocation.paymentType === 'THROUGH_ME') {
        paymentBreakdown.throughMe.amount += item.allocation.carryingCharges;
        paymentBreakdown.throughMe.orders++;
      } else {
        paymentBreakdown.direct.amount += item.allocation.carryingCharges;
        paymentBreakdown.direct.orders++;
      }
    });
  });
  
  res.json({
    status: 'preview',
    allocationPreview: {
      orders: validationResults.length,
      containers: optimizationResults.length,
      totalItems: validationResults.reduce((sum, order) => sum + order.items.length, 0)
    },
    financialPreview: {
      revenue: {
        totalCarryingCharges,
        paymentBreakdown
      },
      costs: {
        baseCharges: {
          gst: baseCharges?.gst || 0,
          duty: baseCharges?.duty || 0,
          misc: baseCharges?.misc || 0,
          extraCharge: baseCharges?.extraCharge || 0,
          total: totalBaseCharges
        }
      },
      profit: {
        estimated: estimatedProfit,
        margin: profitMargin.toFixed(2) + '%'
      }
    },
    shippingCompanyId,
    warnings: [
      ...(profitMargin < 10 ? ['Low profit margin detected'] : []),
      ...(paymentBreakdown.throughMe.amount > paymentBreakdown.direct.amount ? 
          ['More Through Me payments than Direct payments'] : [])
    ]
  });
}

// Helper function: Confirm allocation
async function confirmAllocation(req, res, data) {
  const { validationResults, optimizationResults, shippingCompanyId, baseCharges } = data;
  
  const session = await mongoose.startSession();
  
  try {
    await session.withTransaction(async () => {
      const createdContainers = [];
      
      // Create or update containers
      for (const optimization of optimizationResults) {
        let container;
        
        if (optimization.type === 'existing') {
          container = await Container.findById(optimization.containerId).session(session);
        } else {
          // Create new container
          const capacity = Container.getCapacityInfo(optimization.containerType);
          container = new Container({
            realContainerId: `CONT-${Date.now()}-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
            type: optimization.containerType,
            maxWeight: capacity.maxWeight,
            maxCbm: capacity.maxCbm,
            status: 'planning',
            charges: [],
            baseCharges: baseCharges || { gst: 0, duty: 0, misc: 0, extraCharge: 0, currency: 'INR' },
            createdBy: req.user.id
          });
        }
        
        // Add shipping company if provided
        if (shippingCompanyId) {
          const shippingCompany = await ShippingCompany.findOne({ companyId: shippingCompanyId });
          if (shippingCompany) {
            container.shippingCompany = {
              id: shippingCompany.companyId,
              name: shippingCompany.companyName,
              contactInfo: shippingCompany.contactInfo,
              rates: shippingCompany.getRateForContainer(container.type)
            };
          }
        }
        
        createdContainers.push(container);
      }
      
      // Allocate orders to containers (simple round-robin for now)
      let containerIndex = 0;
      
      for (const orderValidation of validationResults) {
        const order = await Order.findById(orderValidation.orderId).session(session);
        const container = createdContainers[containerIndex % createdContainers.length];
        
        // Calculate totals for this order allocation
        const orderCbm = orderValidation.orderTotals.cbm;
        const orderWeight = orderValidation.orderTotals.weight;
        const orderCarryingCharges = orderValidation.orderTotals.carryingCharges;
        
        // Determine payment type (from first item, assuming consistent per order)
        const paymentType = orderValidation.items[0]?.allocation.paymentType || 'CLIENT_DIRECT';
        
        // Add order to container
        container.orders.push({
          orderId: order._id,
          clientId: order.clientId,
          clientName: order.clientName,
          cbmShare: orderCbm,
          weightShare: orderWeight,
          cartonShare: orderValidation.orderTotals.cartons,
          partialAllocation: {
            isPartial: orderValidation.items.some(item => 
              item.allocation.quantity < order.items[item.itemIndex].qcPassedQuantity),
            allocatedQuantity: orderValidation.items.reduce((sum, item) => sum + item.allocation.quantity, 0),
            totalQuantity: orderValidation.items.reduce((sum, item) => 
              sum + order.items[item.itemIndex].qcPassedQuantity, 0),
            allocatedCartons: orderValidation.orderTotals.cartons,
            totalCartons: orderValidation.items.reduce((sum, item) => 
              sum + order.items[item.itemIndex].qcPassedCartons, 0)
          },
          paymentType,
          carryingCharges: orderCarryingCharges
        });
        
        // Update container totals
        container.currentCbm += orderCbm;
        container.currentWeight += orderWeight;
        
        // Update order item allocations
        for (const itemValidation of orderValidation.items) {
          const item = order.items[itemValidation.itemIndex];
          item.allocatedQuantity = (item.allocatedQuantity || 0) + itemValidation.allocation.quantity;
          item.allocatedCartons = (item.allocatedCartons || 0) + itemValidation.allocation.cartons;
          item.containerId = container._id;
        }
        
        await order.save({ session });
        containerIndex++;
      }
      
      // Save all containers and calculate financials
      for (const container of createdContainers) {
        container.updatePaymentDistribution();
        container.allocateCharges();
        container.calculateFinancials();
        await container.save({ session });
      }
    });
    
    console.log('Container allocation completed:', {
      containersCreated: optimizationResults.filter(o => o.type === 'new').length,
      containersUpdated: optimizationResults.filter(o => o.type === 'existing').length,
      ordersAllocated: validationResults.length
    });
    
    res.json({
      status: 'confirmed',
      message: 'Container allocation completed successfully',
      result: {
        containersCreated: optimizationResults.filter(o => o.type === 'new').length,
        containersUpdated: optimizationResults.filter(o => o.type === 'existing').length,
        ordersAllocated: validationResults.length,
        totalCbmAllocated: validationResults.reduce((sum, order) => sum + order.orderTotals.cbm, 0),
        totalCarryingCharges: validationResults.reduce((sum, order) => sum + order.orderTotals.carryingCharges, 0)
      }
    });
  } catch (error) {
    await session.abortTransaction();
    throw error;
  } finally {
    await session.endSession();
  }
}

module.exports = router;
