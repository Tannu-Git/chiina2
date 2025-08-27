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

module.exports = router;
