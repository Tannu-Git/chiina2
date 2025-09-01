const express = require('express');
const mongoose = require('mongoose');
const Order = require('../models/Order');
const Container = require('../models/Container');
const ShippingCompany = require('../models/ShippingCompany');
const { auth, authorize } = require('../middleware/auth');
const currencyService = require('../services/CurrencyService');
const { StructuredError, AllocationErrors } = require('../utils/errorHandler');

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

// @route   GET /api/warehouse/debug-qc
// @desc    Debug endpoint to check QC ready orders issues
// @access  Private (Admin/Staff only)
router.get('/debug-qc', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    console.log('🔍 Debug QC endpoint called');
    
    // Check all orders
    const allOrders = await Order.find({ isLoopBack: { $ne: true } });
    
    // Check orders by status
    const ordersByStatus = {};
    allOrders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });
    
    // Check QC ready filter
    const qcReadyFilter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    };
    
    const qcReadyOrders = await Order.find(qcReadyFilter);
    
    // Check items with QC status
    const ordersWithQCStatus = await Order.find({
      'items.qcStatus': { $in: ['completed', 'partial'] }
    });
    
    const debugInfo = {
      totalOrders: allOrders.length,
      ordersByStatus,
      qcReadyByStatus: qcReadyOrders.length,
      ordersWithQCItems: ordersWithQCStatus.length,
      sampleOrders: allOrders.slice(0, 3).map(order => ({
        id: order._id,
        orderNumber: order.orderNumber,
        status: order.status,
        itemCount: order.items?.length || 0,
        hasQCStatus: order.items?.some(item => item.qcStatus),
        qcStatuses: order.items?.map(item => item.qcStatus).filter(Boolean)
      })),
      recommendations: []
    };
    
    // Add recommendations
    if (qcReadyOrders.length === 0) {
      debugInfo.recommendations.push('No orders have ready/partial_ready status');
      if (ordersByStatus['confirmed'] > 0) {
        debugInfo.recommendations.push('Run QC inspection on confirmed orders first');
      }
    }
    
    if (ordersWithQCStatus.length === 0) {
      debugInfo.recommendations.push('No orders have QC status on items. Items need qcStatus field.');
    }
    
    res.json({
      message: 'QC Debug Information',
      debug: debugInfo,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Debug QC error:', error);
    res.status(500).json({ message: 'Debug error', error: error.message });
  }
});

// @route   GET /api/warehouse/qc-ready-orders
// @desc    Get orders that have completed QC and are ready for container allocation
// @access  Private (Admin/Staff only)
router.get('/qc-ready-orders', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { clientId, minQty = 0, includePartial = true } = req.query;
    
    // Ensure includePartial is boolean
    const includePartialBool = includePartial === true || includePartial === 'true';
    
    console.log('🔍 QC READY ORDERS VALIDATION START');
    console.log('Request params:', { clientId, minQty, includePartial, includePartialBool });
    
    // Step 1: Check all orders first
    const allOrders = await Order.find({ isLoopBack: { $ne: true } })
      .select('orderNumber status qcStatus items.qcStatus items.qcPassedCartons items.allocatedCartons items.cartons')
      .lean();
    
    console.log(`📊 TOTAL ORDERS: ${allOrders.length}`);
    
    // Log order statuses
    const statusBreakdown = {};
    allOrders.forEach(order => {
      statusBreakdown[order.status] = (statusBreakdown[order.status] || 0) + 1;
      console.log(`Order ${order.orderNumber}: status="${order.status}", qcStatus="${order.qcStatus || 'null'}"`);
      
      order.items?.forEach((item, idx) => {
        console.log(`  Item ${idx}: qcStatus="${item.qcStatus || 'null'}", qcPassed=${item.qcPassedCartons || 0}, allocated=${item.allocatedCartons || 0}, total=${item.cartons || 0}`);
      });
    });
    
    console.log('📈 Status breakdown:', statusBreakdown);
    
    // Build filter for QC-completed orders
    const filter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    console.log('🎯 Filter being used:', JSON.stringify(filter, null, 2));
    
    if (clientId) {
      filter.clientId = clientId;
      console.log('🔒 Client filter applied:', clientId);
    }
    
    const orders = await Order.find(filter)
      .populate('createdBy', 'name')
      .populate('qcInspector', 'name')
      .sort({ qcCompletedAt: -1, createdAt: -1 })
      .lean();
      
    console.log(`📋 ORDERS MATCHING FILTER: ${orders.length}`);
    orders.forEach(order => {
      console.log(`  ✅ ${order.orderNumber}: ${order.status}`);
    });
    
    // Process orders to show available quantities for allocation
    const allocatableOrders = orders.map(order => {
      console.log(`\n🔍 PROCESSING ORDER: ${order.orderNumber}`);
      
      const allocatableItems = order.items.filter(item => {
        const qcPassedQty = item.qcPassedQuantity || 0;
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedQty = item.allocatedQuantity || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        
        const availableQty = qcPassedQty - allocatedQty;
        const availableCtn = qcPassedCtn - allocatedCtn;
        
        console.log(`  Item ${item.itemCode || 'Unknown'}:`);
        console.log(`    QC Status: ${item.qcStatus}`);
        console.log(`    QC Passed Qty: ${qcPassedQty}, Allocated Qty: ${allocatedQty}, Available Qty: ${availableQty}`);
        console.log(`    QC Passed Ctn: ${qcPassedCtn}, Allocated Ctn: ${allocatedCtn}, Available Ctn: ${availableCtn}`);
        console.log(`    Min Qty Filter: ${minQty}, Include Partial: ${includePartialBool}`);
        
        const meetsQuantityFilter = (availableQty > minQty || availableCtn > 0);
        const meetsQCFilter = (item.qcStatus === 'completed' || (includePartialBool && item.qcStatus === 'partial'));
        
        console.log(`    Meets Quantity Filter: ${meetsQuantityFilter}`);
        console.log(`    Meets QC Filter: ${meetsQCFilter} (qcStatus: '${item.qcStatus}', includePartial: ${includePartialBool})`);
        
        const includeItem = meetsQuantityFilter && meetsQCFilter;
        console.log(`    ➡️ INCLUDE ITEM: ${includeItem}`);
        
        return includeItem;
      }).map(item => {
        const qcPassedQty = item.qcPassedQuantity || 0;
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedQty = item.allocatedQuantity || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        
        return {
          ...item,
          availableQuantity: Math.max(0, qcPassedQty - allocatedQty),
          availableCartons: Math.max(0, qcPassedCtn - allocatedCtn),
          totalAvailableCbm: Math.max(0, qcPassedCtn - allocatedCtn) * Math.max(0, item.unitCbm || 0),
          totalAvailableWeight: Math.max(0, qcPassedQty - allocatedQty) * Math.max(0, item.unitWeight || 0),
          allocationStatus: {
            canAllocate: (qcPassedQty - allocatedQty) > 0 || (qcPassedCtn - allocatedCtn) > 0,
            isPartiallyAllocated: allocatedQty > 0 || allocatedCtn > 0,
            percentageAvailable: qcPassedQty > 0 ? ((Math.max(0, qcPassedQty - allocatedQty)) / qcPassedQty * 100).toFixed(1) : 0,
            hasNegativeQuantity: (qcPassedQty - allocatedQty) < 0,
            hasNegativeCartons: (qcPassedCtn - allocatedCtn) < 0,
            dataIntegrityWarning: (qcPassedQty - allocatedQty) < 0 || (qcPassedCtn - allocatedCtn) < 0,
            // Debug info
            debug: {
              unitCbm: item.unitCbm,
              unitWeight: item.unitWeight,
              cbmCalculation: `${Math.max(0, qcPassedCtn - allocatedCtn)} cartons × ${item.unitCbm || 0} CBM = ${Math.max(0, qcPassedCtn - allocatedCtn) * Math.max(0, item.unitCbm || 0)} CBM`
            }
          }
        };
      });
      
      if (allocatableItems.length === 0) {
        console.log(`❌ ORDER ${order.orderNumber} EXCLUDED: No allocatable items found`);
        return null; // Skip orders with no allocatable items
      }
      
      console.log(`✅ ORDER ${order.orderNumber} INCLUDED: ${allocatableItems.length} allocatable items`);
      
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
    
    console.log('\n🎆 QC READY ORDERS VALIDATION COMPLETE');
    console.log(`Final Results: ${allocatableOrders.length} orders available for allocation`);
    console.log('QC ready orders fetched:', {
      totalOrders: summary.totalOrders,
      totalCbm: summary.totalCbm.toFixed(2),
      clientCount: Object.keys(summary.clientBreakdown).length,
      totalAvailableCartons: summary.totalCartons
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

// @route   GET /api/warehouse/debug-qc-validation
// @desc    Debug QC validation logic without auth (development only)
// @access  Public (for debugging)
router.get('/debug-qc-validation', async (req, res) => {
  try {
    console.log('🛮 [DEBUG] QC Validation Test Endpoint Called');
    
    const { includePartial = true } = req.query;
    const includePartialBool = includePartial === true || includePartial === 'true';
    
    // Test the QC logic with sample data matching your real data
    const testItems = [
      { itemCode: 'sadasd', qcStatus: 'partial', qcPassedCartons: 42, allocatedCartons: 0 },
      { itemCode: 'dfsadasasda', qcStatus: 'partial', qcPassedCartons: 200, allocatedCartons: 0 },
      { itemCode: 'completed-item', qcStatus: 'completed', qcPassedCartons: 50, allocatedCartons: 0 }
    ];
    
    console.log(`Testing with includePartial: ${includePartial} (type: ${typeof includePartial}) -> ${includePartialBool}`);
    
    const results = testItems.map((item, index) => {
      const availableCtn = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
      const meetsQuantityFilter = availableCtn > 0;
      const meetsQCFilter = (item.qcStatus === 'completed' || (includePartialBool && item.qcStatus === 'partial'));
      const includeItem = meetsQuantityFilter && meetsQCFilter;
      
      console.log(`Test Item ${index} (${item.itemCode}): qcStatus='${item.qcStatus}', available=${availableCtn}, meetsQC=${meetsQCFilter}, include=${includeItem}`);
      
      return {
        itemCode: item.itemCode,
        qcStatus: item.qcStatus,
        availableCartons: availableCtn,
        meetsQuantityFilter,
        meetsQCFilter,
        includeItem
      };
    });
    
    res.json({
      message: 'QC Validation Logic Test',
      includePartialParam: includePartial,
      includePartialBool,
      testResults: results,
      summary: {
        totalItems: results.length,
        includedItems: results.filter(r => r.includeItem).length,
        partialItemsIncluded: results.filter(r => r.qcStatus === 'partial' && r.includeItem).length
      }
    });
    
  } catch (error) {
    console.error('Debug validation error:', error);
    res.status(500).json({ error: error.message });
  }
});

// @route   POST /api/warehouse/simple-allocation
// @desc    Simplified container allocation with enhanced validation
// @access  Private (Admin/Staff only)
router.post('/simple-allocation', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { orderIds, containerType } = req.body;
    
    // Enhanced input validation
    const validationErrors = [];
    
    if (!orderIds || !Array.isArray(orderIds) || orderIds.length === 0) {
      validationErrors.push({
        field: 'orderIds',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Order IDs are required',
        details: 'Please select at least one QC-ready order for allocation'
      });
    }
    
    if (!containerType) {
      validationErrors.push({
        field: 'containerType',
        code: 'REQUIRED_FIELD_MISSING',
        message: 'Container type is required',
        details: 'Please select a valid container type (20ft, 40ft, 40ft_hc)'
      });
    }
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Validation failed',
        errors: validationErrors,
        errorCount: validationErrors.length
      });
    }
    
    // Validate container type
    const containerCapacities = {
      '20ft': { maxCbm: 33, maxWeight: 28000 },
      '40ft': { maxCbm: 67, maxWeight: 30000 },
      '40ft_hc': { maxCbm: 76, maxWeight: 30000 }
    };
    
    const capacity = containerCapacities[containerType];
    if (!capacity) {
      return res.status(400).json({ 
        success: false,
        message: 'Invalid container type',
        details: `Container type '${containerType}' is not supported. Valid types: ${Object.keys(containerCapacities).join(', ')}`,
        supportedTypes: Object.keys(containerCapacities)
      });
    }
    
    // Get and validate orders
    const orders = await Order.find({ 
      _id: { $in: orderIds },
      status: { $in: ['ready', 'partial_ready'] }
    });
    
    // Check for missing or invalid orders
    const foundOrderIds = orders.map(o => o._id.toString());
    const missingOrderIds = orderIds.filter(id => !foundOrderIds.includes(id));
    
    if (missingOrderIds.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Some orders are not found or not QC ready',
        details: `${missingOrderIds.length} orders are missing or have invalid status`,
        missingOrders: missingOrderIds,
        foundOrders: foundOrderIds.length,
        expectedOrders: orderIds.length
      });
    }
    
    if (orders.length !== orderIds.length) {
      const invalidOrders = orders.filter(order => !['ready', 'partial_ready'].includes(order.status));
      return res.status(400).json({ 
        success: false,
        message: 'Some orders are not QC ready',
        details: `${invalidOrders.length} orders have invalid status for allocation`,
        invalidOrders: invalidOrders.map(o => ({
          orderId: o._id,
          orderNumber: o.orderNumber,
          currentStatus: o.status,
          requiredStatus: 'ready or partial_ready'
        })),
        suggestion: 'Complete QC inspection for these orders before allocation'
      });
    }
    
    // Calculate totals with enhanced validation
    const orderTotals = orders.reduce((acc, order) => {
      const orderCbm = order.totalCbm || 0;
      const orderWeight = order.totalWeight || 0;
      const orderCartons = order.totalCartons || 0;
      const orderCarrying = order.totalCarryingCharges || 0;
      
      // Validate individual order data integrity
      if (orderCbm < 0 || orderWeight < 0 || orderCartons < 0) {
        validationErrors.push({
          field: `order_${order._id}`,
          code: 'INVALID_ORDER_DATA',
          message: `Order ${order.orderNumber} has invalid measurements`,
          details: `CBM: ${orderCbm}, Weight: ${orderWeight}, Cartons: ${orderCartons}`,
          orderId: order._id,
          orderNumber: order.orderNumber
        });
      }
      
      acc.totalCbm += orderCbm;
      acc.totalWeight += orderWeight;
      acc.totalCartons += orderCartons;
      acc.totalCarryingCharges += orderCarrying;
      return acc;
    }, { totalCbm: 0, totalWeight: 0, totalCartons: 0, totalCarryingCharges: 0 });
    
    if (validationErrors.length > 0) {
      return res.status(400).json({ 
        success: false,
        message: 'Order data validation failed',
        errors: validationErrors
      });
    }
    
    // Enhanced capacity validation with detailed breakdown
    const capacityValidation = {
      cbm: {
        used: orderTotals.totalCbm,
        capacity: capacity.maxCbm,
        utilization: (orderTotals.totalCbm / capacity.maxCbm * 100),
        isValid: orderTotals.totalCbm <= capacity.maxCbm,
        margin: capacity.maxCbm - orderTotals.totalCbm
      },
      weight: {
        used: orderTotals.totalWeight,
        capacity: capacity.maxWeight,
        utilization: (orderTotals.totalWeight / capacity.maxWeight * 100),
        isValid: orderTotals.totalWeight <= capacity.maxWeight,
        margin: capacity.maxWeight - orderTotals.totalWeight
      }
    };
    
    // Check CBM capacity
    if (!capacityValidation.cbm.isValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Orders exceed container CBM capacity',
        errorCode: 'CBM_CAPACITY_EXCEEDED',
        details: {
          required: orderTotals.totalCbm.toFixed(2),
          available: capacity.maxCbm,
          shortage: (orderTotals.totalCbm - capacity.maxCbm).toFixed(2),
          utilizationPercentage: capacityValidation.cbm.utilization.toFixed(1)
        },
        validation: capacityValidation,
        suggestions: [
          capacity.maxCbm < 67 ? 'Try a 40ft container for more CBM capacity' : null,
          capacity.maxCbm < 76 ? 'Try a 40ft High Cube container for maximum CBM capacity' : null,
          'Remove some orders to fit within container limits',
          'Split allocation across multiple containers'
        ].filter(Boolean)
      });
    }
    
    // Check weight capacity
    if (!capacityValidation.weight.isValid) {
      return res.status(400).json({ 
        success: false,
        message: 'Orders exceed container weight capacity',
        errorCode: 'WEIGHT_CAPACITY_EXCEEDED',
        details: {
          required: orderTotals.totalWeight.toFixed(0),
          available: capacity.maxWeight,
          shortage: (orderTotals.totalWeight - capacity.maxWeight).toFixed(0),
          utilizationPercentage: capacityValidation.weight.utilization.toFixed(1)
        },
        validation: capacityValidation,
        suggestions: [
          'Remove heavy items to reduce weight',
          'Split allocation across multiple containers',
          'Verify item weight measurements are accurate'
        ]
      });
    }
    
    // Create container and update orders (non-transaction for MongoDB standalone compatibility)
    console.log('🏗️ [SIMPLE ALLOCATION] Starting non-transaction allocation...');
    
    let container;
    let allocationResult;
    
    try {
      // Create container (non-transaction)
      container = new Container({
        realContainerId: `CONT-${Date.now()}`,
        type: containerType,
        maxWeight: capacity.maxWeight,
        maxCbm: capacity.maxCbm,
        currentWeight: orderTotals.totalWeight,
        currentCbm: orderTotals.totalCbm,
        status: 'planning',
        orders: orders.map(order => ({
          orderId: order._id,
          clientId: order.clientId,
          clientName: order.clientName,
          cbmShare: order.totalCbm || 0,
          weightShare: order.totalWeight || 0,
          cartonShare: order.totalCartons || 0,
          paymentType: order.items[0]?.paymentType || 'THROUGH_ME'
        })),
        createdBy: req.user.id
      });
      
      // Save container
      await container.save();
      console.log('✅ [SIMPLE ALLOCATION] Container created:', container.realContainerId);
      
      // Update order statuses (non-transaction)
      console.log('📝 [SIMPLE ALLOCATION] Updating order statuses...');
      const orderUpdateResult = await Order.updateMany(
        { _id: { $in: orderIds } },
        { 
          status: 'allocated',
          containerId: container._id,
          updatedBy: req.user.id,
          updatedAt: new Date()
        }
      );
      
      // Verify all orders were updated
      if (orderUpdateResult.modifiedCount !== orders.length) {
        console.warn(`Expected to update ${orders.length} orders, but updated ${orderUpdateResult.modifiedCount}`);
      } else {
        console.log(`✅ [SIMPLE ALLOCATION] Updated ${orderUpdateResult.modifiedCount} orders`);
      }
      
      // Update individual items' allocation status
      console.log('📝 [SIMPLE ALLOCATION] Updating item allocations...');
      for (const order of orders) {
        try {
          const itemUpdates = order.items.map((item, index) => ({
            updateOne: {
              filter: { 
                _id: order._id,
                [`items.${index}.itemCode`]: item.itemCode
              },
              update: {
                [`items.${index}.allocatedCartons`]: item.qcPassedCartons || 0,
                [`items.${index}.allocatedQuantity`]: item.qcPassedQuantity || 0,
                [`items.${index}.containerId`]: container._id
              }
            }
          }));
          
          if (itemUpdates.length > 0) {
            const bulkResult = await Order.bulkWrite(itemUpdates);
            console.log(`✅ [SIMPLE ALLOCATION] Updated ${bulkResult.modifiedCount} items for order ${order.orderNumber}`);
          }
        } catch (itemUpdateError) {
          console.error(`❌ [SIMPLE ALLOCATION] Failed to update items for order ${order.orderNumber}:`, itemUpdateError.message);
          // Continue with other orders
        }
      }
      
      allocationResult = {
        success: true,
        nonTransactionCompleted: true
      };
      
      console.log('🎉 [SIMPLE ALLOCATION] Non-transaction allocation completed successfully:', {
        containerId: container._id,
        realContainerId: container.realContainerId,
        ordersUpdated: orderUpdateResult.modifiedCount,
        cbmUtilization: capacityValidation.cbm.utilization.toFixed(1) + '%',
        weightUtilization: capacityValidation.weight.utilization.toFixed(1) + '%'
      });
      
    } catch (error) {
      console.error('❌ [SIMPLE ALLOCATION] Non-transaction allocation failed:', error);
      
      allocationResult = {
        success: false,
        error: error.message,
        nonTransactionFailed: true
      };
      
      // Re-throw error to be handled by outer catch
      throw error;
    }
    
    res.json({
      success: true,
      message: 'Container allocation completed successfully',
      container: {
        id: container._id,
        realContainerId: container.realContainerId,
        clientFacingId: container.clientFacingId,
        type: container.type,
        utilization: {
          cbm: capacityValidation.cbm.utilization.toFixed(1),
          weight: capacityValidation.weight.utilization.toFixed(1)
        },
        capacity: {
          maxCbm: capacity.maxCbm,
          maxWeight: capacity.maxWeight,
          usedCbm: orderTotals.totalCbm.toFixed(2),
          usedWeight: orderTotals.totalWeight.toFixed(0)
        }
      },
      allocation: {
        ordersAllocated: orders.length,
        totalCbm: orderTotals.totalCbm.toFixed(2),
        totalWeight: orderTotals.totalWeight.toFixed(0),
        totalCartons: orderTotals.totalCartons,
        totalCarryingCharges: orderTotals.totalCarryingCharges.toFixed(2)
      },
      validation: capacityValidation
    });
  } catch (error) {
    console.error('Simple allocation error:', error);
    
    // Handle specific error types with structured responses
    if (error.name === 'CapacityValidationError') {
      throw AllocationErrors.capacityExceeded({
        type: error.code === 'CBM_CAPACITY_EXCEEDED' ? 'CBM' : 'Weight',
        ...error.details
      });
    }
    
    if (error.name === 'ValidationError') {
      throw AllocationErrors.invalidOrderSelection([
        { message: error.message, details: error.errors }
      ]);
    }
    
    // Handle transaction/database errors
    if (error.message.includes('Transaction') || error.message.includes('session')) {
      throw AllocationErrors.transactionFailed(error, {
        operation: 'simple-container-allocation',
        orderIds,
        containerType,
        timestamp: new Date().toISOString()
      });
    }
    
    // Generic allocation failure
    throw AllocationErrors.allocationFailed(error.message, {
      operation: 'simple-allocation',
      orderIds,
      containerType,
      errorType: error.name || 'UnknownError'
    });
  }
});

// @route   POST /api/warehouse/allocation-wizard
// @desc    Multi-step container allocation wizard (DEPRECATED - use simple-allocation)
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

// OPTIMIZED Helper function: Validate order selection with pagination support
async function validateOrderSelection(req, res, data) {
  const { selectedOrders, batchSize = 10, enablePagination = false } = data;
  
  // Input validation
  const inputValidation = validateSelectionInput(selectedOrders);
  if (!inputValidation.isValid) {
    return res.status(400).json(inputValidation.error);
  }
  
  try {
    // Process orders in batches for better performance
    const validationResults = [];
    const validationErrors = [];
    let totalStats = { totalCbm: 0, totalWeight: 0, totalCartons: 0, totalCarryingCharges: 0 };
    
    const batchProcessor = enablePagination ? 
      processBatchesPaginated : processBatchesSimple;
      
    const result = await batchProcessor(
      selectedOrders, 
      batchSize, 
      validationResults, 
      validationErrors, 
      totalStats
    );
    
    if (!result.success) {
      return res.status(400).json({
        message: 'Order selection validation failed',
        validationErrors: result.errors,
        summary: generateErrorSummary(result.errors)
      });
    }
    
    return res.json({
      status: 'validated',
      validationResults: result.validationResults,
      allocationTotals: formatTotals(result.totalStats),
      recommendations: generateRecommendations(result.totalStats, result.validationResults),
      summary: generateSummary(result.validationResults, selectedOrders.length),
      performance: result.performance
    });
    
  } catch (error) {
    console.error('Order validation error:', error);
    return res.status(500).json({
      message: 'Server error during validation',
      error: error.message
    });
  }
}
  
// Input validation helper
function validateSelectionInput(selectedOrders) {
  if (!selectedOrders || !Array.isArray(selectedOrders)) {
    return {
      isValid: false,
      error: {
        message: 'Selected orders array is required',
        details: 'Please provide an array of selected orders with allocation data'
      }
    };
  }
  
  if (selectedOrders.length === 0) {
    return {
      isValid: false,
      error: {
        message: 'No orders selected for allocation',
        details: 'Please select at least one order before proceeding'
      }
    };
  }
  
  return { isValid: true };
}

// Simple batch processing (existing behavior)
async function processBatchesSimple(selectedOrders, batchSize, validationResults, validationErrors, totalStats) {
  const startTime = Date.now();
  
  // Pre-fetch all orders in one query for better performance
  const orderIds = selectedOrders.map(s => s.orderId);
  const orders = await Order.find({ _id: { $in: orderIds } }).lean();
  const orderMap = new Map(orders.map(order => [order._id.toString(), order]));
  
  for (const selection of selectedOrders) {
    const order = orderMap.get(selection.orderId);
    
    if (!order) {
      validationErrors.push({
        orderId: selection.orderId,
        error: 'Order not found',
        details: `Order with ID ${selection.orderId} does not exist`
      });
      continue;
    }
    
    const orderResult = await validateSingleOrder(order, selection);
    
    if (orderResult.errors.length > 0) {
      validationErrors.push(...orderResult.errors);
    }
    
    if (orderResult.validation) {
      validationResults.push(orderResult.validation);
      updateTotalStats(totalStats, orderResult.stats);
    }
  }
  
  return {
    success: validationErrors.length === 0,
    validationResults,
    errors: validationErrors,
    totalStats,
    performance: {
      processingTime: Date.now() - startTime,
      ordersProcessed: selectedOrders.length,
      batchProcessing: false
    }
  };
}

// Update total statistics
function updateTotalStats(totalStats, stats) {
  totalStats.totalCbm += stats.totalCbm;
  totalStats.totalWeight += stats.totalWeight;
  totalStats.totalCartons += stats.totalCartons;
  totalStats.totalCarryingCharges += stats.totalCarryingCharges;
}
// Validate single order (extracted logic)
async function validateSingleOrder(order, selection) {
  const errors = [];
  
  // Order status validation
  if (!['ready', 'partial_ready'].includes(order.status)) {
    errors.push({
      orderId: selection.orderId,
      orderNumber: order.orderNumber,
      error: 'Order not QC ready',
      details: `Order status is '${order.status}', expected 'ready' or 'partial_ready'`
    });
    return { errors, validation: null, stats: null };
  }
  
  // Items validation
  if (!selection.items || !Array.isArray(selection.items) || selection.items.length === 0) {
    errors.push({
      orderId: selection.orderId,
      orderNumber: order.orderNumber,
      error: 'No items selected',
      details: 'Please select at least one item for allocation'
    });
    return { errors, validation: null, stats: null };
  }
  
  const itemValidations = [];
  const stats = { totalCbm: 0, totalWeight: 0, totalCartons: 0, totalCarryingCharges: 0 };
  
  for (const itemSelection of selection.items) {
    const itemResult = validateSingleItem(order, itemSelection, errors);
    
    if (itemResult.validation) {
      itemValidations.push(itemResult.validation);
      updateTotalStats(stats, itemResult.stats);
    }
  }
  
  if (itemValidations.length === 0) {
    return { errors, validation: null, stats: null };
  }
  
  return {
    errors,
    validation: {
      orderId: order._id,
      orderNumber: order.orderNumber,
      clientId: order.clientId,
      clientName: order.clientName,
      items: itemValidations,
      orderTotals: {
        cbm: parseFloat(stats.totalCbm.toFixed(3)),
        weight: parseFloat(stats.totalWeight.toFixed(2)),
        cartons: stats.totalCartons,
        carryingCharges: parseFloat(stats.totalCarryingCharges.toFixed(2))
      }
    },
    stats
  };
}
// Validate single item with enhanced error reporting and carton-based tracking
function validateSingleItem(order, itemSelection, errors) {
  const { itemIndex, allocateQuantity, allocateCartons } = itemSelection;
  
  // Item index validation
  if (itemIndex < 0 || itemIndex >= order.items.length) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      error: 'Invalid item index',
      errorCode: 'INVALID_ITEM_INDEX',
      details: `Item index ${itemIndex} is out of range (0-${order.items.length - 1})`,
      severity: 'error'
    });
    return { validation: null, stats: null };
  }
  
  const item = order.items[itemIndex];
  
  // QC status validation with clear messaging
  if (!item.qcStatus || !['completed', 'partial'].includes(item.qcStatus)) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'Item not QC ready',
      errorCode: 'ITEM_NOT_QC_READY',
      details: `Item QC status is '${item.qcStatus || 'none'}', expected 'completed' or 'partial'`,
      severity: 'error',
      suggestion: 'Complete QC inspection for this item before allocation'
    });
    return { validation: null, stats: null };
  }
  
  // Calculate available quantities using carton-based tracking as primary
  const qcPassedCtn = Math.max(0, item.qcPassedCartons || 0);
  const qcPassedQty = Math.max(0, item.qcPassedQuantity || 0);
  const allocatedCtn = Math.max(0, item.allocatedCartons || 0);
  const allocatedQty = Math.max(0, item.allocatedQuantity || 0);
  
  const availableCartons = qcPassedCtn - allocatedCtn;
  const availableQuantity = qcPassedQty - allocatedQty;
  
  // Input validation with enhanced error details
  const requestedCtn = Math.max(0, parseInt(allocateCartons) || 0);
  const requestedQty = Math.max(0, parseInt(allocateQuantity) || 0);
  
  // Data integrity checks
  if (availableCartons < 0 || availableQuantity < 0) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'Data integrity issue',
      errorCode: 'NEGATIVE_AVAILABLE_QUANTITY',
      details: `Negative available quantities detected. Available cartons: ${availableCartons}, Available quantity: ${availableQuantity}`,
      severity: 'critical',
      suggestion: 'Contact system administrator to resolve data inconsistency'
    });
    return { validation: null, stats: null };
  }
  
  // Zero allocation validation
  if (requestedCtn === 0 && requestedQty === 0) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'No allocation requested',
      errorCode: 'ZERO_ALLOCATION',
      details: 'Both carton and quantity allocations are zero',
      severity: 'warning',
      suggestion: 'Specify allocation amounts for cartons or quantities'
    });
    return { validation: null, stats: null };
  }
  
  // Over-allocation validation with detailed breakdown
  const cartonOverAllocation = requestedCtn > availableCartons;
  const quantityOverAllocation = requestedQty > availableQuantity;
  
  if (cartonOverAllocation) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'Carton allocation exceeds available',
      errorCode: 'CARTON_OVER_ALLOCATION',
      details: `Requested: ${requestedCtn} cartons, Available: ${availableCartons} cartons`,
      severity: 'error',
      breakdown: {
        qcPassed: qcPassedCtn,
        alreadyAllocated: allocatedCtn,
        available: availableCartons,
        requested: requestedCtn,
        excess: requestedCtn - availableCartons
      },
      suggestion: `Reduce allocation to ${availableCartons} cartons or less`
    });
  }
  
  if (quantityOverAllocation) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'Quantity allocation exceeds available',
      errorCode: 'QUANTITY_OVER_ALLOCATION',
      details: `Requested: ${requestedQty} units, Available: ${availableQuantity} units`,
      severity: 'error',
      breakdown: {
        qcPassed: qcPassedQty,
        alreadyAllocated: allocatedQty,
        available: availableQuantity,
        requested: requestedQty,
        excess: requestedQty - availableQuantity
      },
      suggestion: `Reduce allocation to ${availableQuantity} units or less`
    });
  }
  
  if (cartonOverAllocation || quantityOverAllocation) {
    return { validation: null, stats: null };
  }
  
  // Measurement validation
  const unitCbm = parseFloat(item.unitCbm) || 0;
  const unitWeight = parseFloat(item.unitWeight) || 0;
  
  if (unitCbm === 0 || unitWeight === 0) {
    errors.push({
      orderId: order._id,
      orderNumber: order.orderNumber,
      itemCode: item.itemCode,
      error: 'Missing unit measurements',
      errorCode: 'MISSING_UNIT_MEASUREMENTS',
      details: `Unit CBM: ${unitCbm}, Unit Weight: ${unitWeight}`,
      severity: 'error',
      suggestion: 'Update item master data with unit CBM and weight measurements'
    });
    return { validation: null, stats: null };
  }
  
  // Calculate allocation values using carton-based as primary
  const itemCbm = requestedCtn * unitCbm;
  const itemWeight = requestedQty * unitWeight;
  const itemCarryingCharges = calculateCarryingCharges(item, requestedQty, requestedCtn, itemCbm, itemWeight);
  
  return {
    validation: {
      itemIndex,
      itemCode: item.itemCode,
      description: item.description,
      allocation: {
        quantity: requestedQty,
        cartons: requestedCtn,
        cbm: parseFloat(itemCbm.toFixed(3)),
        weight: parseFloat(itemWeight.toFixed(2)),
        carryingCharges: parseFloat(itemCarryingCharges.toFixed(2)),
        paymentType: item.paymentType
      },
      availability: {
        availableQuantity,
        availableCartons,
        qcPassedQuantity: qcPassedQty,
        qcPassedCartons: qcPassedCtn,
        allocatedQuantity: allocatedQty,
        allocatedCartons: allocatedCtn
      },
      validation: {
        isValid: true,
        availableAfterAllocation: {
          quantity: availableQuantity - requestedQty,
          cartons: availableCartons - requestedCtn
        },
        utilizationRate: {
          cartons: availableCartons > 0 ? (requestedCtn / availableCartons * 100).toFixed(1) : 0,
          quantity: availableQuantity > 0 ? (requestedQty / availableQuantity * 100).toFixed(1) : 0
        }
      }
    },
    stats: {
      totalCbm: itemCbm,
      totalWeight: itemWeight,
      totalCartons: requestedCtn,
      totalCarryingCharges: itemCarryingCharges
    }
  };
}
// Helper function to calculate carrying charges
function calculateCarryingCharges(item, requestedQty, requestedCtn, itemCbm, itemWeight) {
  const carryingCharge = item.carryingCharge || {};
  
  switch (carryingCharge.basis) {
    case 'carton':
      return requestedCtn * (carryingCharge.rate || 0);
    case 'cbm':
      return itemCbm * (carryingCharge.rate || 0);
    case 'weight':
      return itemWeight * (carryingCharge.rate || 0);
    default:
      return (carryingCharge.amount || 0) * (requestedQty / (item.quantity || 1));
  }
}

// Generate error summary
function generateErrorSummary(errors) {
  return {
    totalErrors: errors.length,
    errorTypes: [...new Set(errors.map(e => e.error))],
    affectedOrders: [...new Set(errors.map(e => e.orderNumber).filter(Boolean))]
  };
}

// Format totals
function formatTotals(totalStats) {
  return {
    totalCbm: parseFloat(totalStats.totalCbm.toFixed(3)),
    totalWeight: parseFloat(totalStats.totalWeight.toFixed(2)),
    totalCartons: totalStats.totalCartons,
    totalCarryingCharges: parseFloat(totalStats.totalCarryingCharges.toFixed(2))
  };
}

// Generate recommendations
function generateRecommendations(totalStats, validationResults) {
  const totalCbm = totalStats.totalCbm;
  return {
    suggestedContainerType: totalCbm <= 33 ? '20ft' : totalCbm <= 67 ? '40ft' : '40ft_hc',
    utilizationWarnings: totalCbm > 76 ? ['Allocation exceeds 40ft HC container capacity'] : [],
    efficiency: {
      averageUtilization: validationResults.length > 0 ? 
        (totalCbm / validationResults.length).toFixed(2) + ' CBM per order' : '0',
      containerEfficiency: totalCbm > 0 ? 
        `${((totalCbm / (totalCbm <= 33 ? 33 : totalCbm <= 67 ? 67 : 76)) * 100).toFixed(1)}% container utilization` : '0%'
    }
  };
}

// Generate summary
function generateSummary(validationResults, totalOrdersRequested) {
  return {
    ordersValidated: validationResults.length,
    itemsAllocated: validationResults.reduce((sum, order) => sum + order.items.length, 0),
    totalOrdersRequested
  };
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

// Helper function: Confirm allocation without transactions (MongoDB standalone compatibility)
async function confirmAllocation(req, res, data) {
  const { validationResults, optimizationResults, shippingCompanyId, baseCharges } = data;
  
  console.log('🏗️ [CONFIRM ALLOCATION] Starting non-transaction allocation process...');
  
  let transactionResult = {
    success: false,
    containersCreated: 0,
    containersUpdated: 0,
    ordersAllocated: 0,
    totalCbmAllocated: 0,
    totalCarryingCharges: 0,
    containers: [],
    errors: []
  };
  
  try {
    const createdContainers = [];
    
    // Create or update containers (non-transaction)
    for (const optimization of optimizationResults) {
      let container;
      
      if (optimization.type === 'existing') {
        // Update existing container
        container = await Container.findById(optimization.containerId);
        if (!container) {
          throw new Error(`Existing container ${optimization.containerId} not found`);
        }
        transactionResult.containersUpdated++;
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
        transactionResult.containersCreated++;
      }
      
      // Add shipping company if provided
      if (shippingCompanyId) {
        try {
          const shippingCompany = await ShippingCompany.findOne({ companyId: shippingCompanyId });
          if (shippingCompany) {
            container.shippingCompany = {
              id: shippingCompany.companyId,
              name: shippingCompany.companyName,
              contactInfo: shippingCompany.contactInfo,
              rates: shippingCompany.getRateForContainer(container.type)
            };
          }
        } catch (shippingError) {
          console.warn('Warning: Failed to load shipping company:', shippingError.message);
        }
      }
      
      createdContainers.push(container);
    }
    
    // Allocate orders to containers using round-robin with enhanced validation
    let containerIndex = 0;
    const orderAllocationResults = [];
    
    for (const orderValidation of validationResults) {
      try {
        const order = await Order.findById(orderValidation.orderId);
        if (!order) {
          throw new Error(`Order ${orderValidation.orderId} not found`);
        }
        
        const container = createdContainers[containerIndex % createdContainers.length];
        
        // Calculate totals for this order allocation
        const orderCbm = orderValidation.orderTotals.cbm;
        const orderWeight = orderValidation.orderTotals.weight;
        const orderCarryingCharges = orderValidation.orderTotals.carryingCharges;
        
        // Validate container capacity BEFORE allocation with enhanced checking
        const capacityValidation = container.canAllocateOrder(orderCbm, orderWeight, orderValidation.orderTotals.cartons, {
          strictValidation: true,
          allowPartialFit: false
        });
        
        if (!capacityValidation.canAllocate) {
          const errorMsg = `Container capacity validation failed for ${container.realContainerId}: ${capacityValidation.errors.map(e => e.message).join(', ')}`;
          console.error(errorMsg);
          transactionResult.errors.push({
            type: 'CAPACITY_VALIDATION_FAILED',
            containerId: container.realContainerId,
            orderId: order._id,
            orderNumber: order.orderNumber,
            message: errorMsg,
            validation: capacityValidation
          });
          throw new Error(errorMsg);
        }
        
        // Log capacity warnings if any
        if (capacityValidation.warnings.length > 0) {
          console.warn(`Container allocation warnings for ${container.realContainerId}:`, 
            capacityValidation.warnings.map(w => w.message));
        }
        
        // Determine payment type (from first item, assuming consistent per order)
        const paymentType = orderValidation.items[0]?.allocation.paymentType || 'CLIENT_DIRECT';
        
        // Create order allocation record
        const orderAllocation = {
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
        };
        
        // Use atomic allocation method (without session)
        try {
          const allocationResult = await container.allocateOrderSafely(orderAllocation);
          orderAllocationResults.push({
            orderId: order._id,
            containerResult: allocationResult,
            success: true
          });
        } catch (allocationError) {
          console.error(`Failed to allocate order ${order.orderNumber}:`, allocationError);
          transactionResult.errors.push({
            type: 'ALLOCATION_FAILED',
            orderId: order._id,
            orderNumber: order.orderNumber,
            message: allocationError.message,
            details: allocationError.details
          });
          // Continue with other orders instead of throwing
          continue;
        }
        
        // Update order item allocations
        for (const itemValidation of orderValidation.items) {
          const item = order.items[itemValidation.itemIndex];
          item.allocatedQuantity = (item.allocatedQuantity || 0) + itemValidation.allocation.quantity;
          item.allocatedCartons = (item.allocatedCartons || 0) + itemValidation.allocation.cartons;
          item.containerId = container._id;
        }
        
        // Update order status
        order.status = 'allocated';
        order.containerId = container._id;
        order.updatedBy = req.user.id;
        
        await order.save();
        
        transactionResult.ordersAllocated++;
        transactionResult.totalCbmAllocated += orderCbm;
        transactionResult.totalCarryingCharges += orderCarryingCharges;
        
        containerIndex++;
      } catch (orderError) {
        console.error(`Failed to process order ${orderValidation.orderId}:`, orderError.message);
        transactionResult.errors.push({
          type: 'ORDER_PROCESSING_FAILED',
          orderId: orderValidation.orderId,
          message: orderError.message
        });
        // Continue with other orders
        continue;
      }
    }
    
    // Save all containers with recalculated financials
    for (const container of createdContainers) {
      try {
        // Financial calculations are already done in allocateOrderSafely
        await container.save();
        
        transactionResult.containers.push({
          id: container._id,
          realContainerId: container.realContainerId,
          type: container.type,
          utilization: {
            cbm: (container.currentCbm / container.maxCbm * 100).toFixed(1),
            weight: (container.currentWeight / container.maxWeight * 100).toFixed(1)
          },
          orders: container.orders.length
        });
      } catch (containerSaveError) {
        console.error(`Failed to save container ${container.realContainerId}:`, containerSaveError.message);
        transactionResult.errors.push({
          type: 'CONTAINER_SAVE_FAILED',
          containerId: container.realContainerId,
          message: containerSaveError.message
        });
      }
    }
    
    transactionResult.success = transactionResult.ordersAllocated > 0;
    
    console.log('✅ [CONFIRM ALLOCATION] Non-transaction allocation completed:', {
      containersCreated: transactionResult.containersCreated,
      containersUpdated: transactionResult.containersUpdated,
      ordersAllocated: transactionResult.ordersAllocated,
      errors: transactionResult.errors.length
    });
    
  } catch (error) {
    console.error('❌ [CONFIRM ALLOCATION] Non-transaction allocation failed:', error);
    transactionResult.success = false;
    transactionResult.error = error.message;
    
    throw error;
  }
  
  if (transactionResult.success) {
    res.json({
      status: 'confirmed',
      message: 'Container allocation completed successfully',
      result: {
        containersCreated: transactionResult.containersCreated,
        containersUpdated: transactionResult.containersUpdated,
        ordersAllocated: transactionResult.ordersAllocated,
        totalCbmAllocated: transactionResult.totalCbmAllocated.toFixed(2),
        totalCarryingCharges: transactionResult.totalCarryingCharges.toFixed(2),
        containers: transactionResult.containers,
        errors: transactionResult.errors
      },
      allocation: {
        success: true,
        mode: 'non-transaction',
        compatibility: 'MongoDB standalone'
      }
    });
  } else {
    // Return partial success if some operations completed
    res.status(500).json({
      status: 'partial',
      message: 'Container allocation partially completed with errors',
      result: transactionResult
    });
  }
}

// @route   POST /api/warehouse/cleanup-containers
// @desc    Remove all existing containers and reset order statuses
// @access  Private (Admin only)
router.post('/cleanup-containers', auth, authorize('admin'), async (req, res) => {
  try {
    console.log('🗑️ Container cleanup requested by:', req.user.name);
    
    // Find all existing containers
    const existingContainers = await Container.find({});
    console.log(`📦 Found ${existingContainers.length} containers to remove`);
    
    const containerSummary = existingContainers.map(container => ({
      id: container.realContainerId || container.clientFacingId || container._id,
      type: container.type,
      status: container.status,
      orders: container.orders?.length || 0
    }));
    
    if (existingContainers.length > 0) {
      // Remove all containers
      const deleteResult = await Container.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} containers`);
      
      // Reset orders that were allocated to containers
      const orderUpdateResult = await Order.updateMany(
        { containerId: { $exists: true } },
        { 
          $unset: { containerId: 1 },
          $set: { 
            status: 'ready',
            updatedBy: req.user.id,
            updatedAt: new Date()
          }
        }
      );
      console.log(`✅ Reset ${orderUpdateResult.modifiedCount} orders to ready status`);
      
      res.json({
        success: true,
        message: 'All containers removed successfully',
        summary: {
          containersRemoved: deleteResult.deletedCount,
          ordersReset: orderUpdateResult.modifiedCount,
          removedContainers: containerSummary
        },
        timestamp: new Date().toISOString()
      });
    } else {
      res.json({
        success: true,
        message: 'No containers found to remove',
        summary: {
          containersRemoved: 0,
          ordersReset: 0,
          removedContainers: []
        },
        timestamp: new Date().toISOString()
      });
    }
    
  } catch (error) {
    console.error('Container cleanup error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Container cleanup failed', 
      error: error.message 
    });
  }
});

// @route   GET /api/warehouse/currency-rates
// @desc    Get current exchange rates for financial calculations
// @access  Private (Admin/Staff only)
router.get('/currency-rates', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const rates = currencyService.getAllRates();
    
    res.json({
      success: true,
      rates: {
        USD_TO_INR: rates.USD_TO_INR,
        INR_TO_USD: rates.INR_TO_USD,
        lastUpdated: rates.lastUpdated,
        nextUpdate: rates.nextUpdate
      },
      message: 'Current exchange rates retrieved successfully'
    });
  } catch (error) {
    console.error('Currency rates fetch error:', error);
    res.status(500).json({ 
      success: false,
      message: 'Failed to fetch currency rates', 
      error: error.message 
    });
  }
});

// @route   POST /api/warehouse/new-container-allocation
// @desc    New simplified container allocation system
// @access  Private (Admin/Staff only)
router.post('/new-container-allocation', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    console.log('📦 [NEW ALLOCATION] Received request:', JSON.stringify(req.body, null, 2));
    
    const { containerType, containerSpecs, allocations, financials } = req.body;

    // Validate input
    if (!containerType || !allocations || allocations.length === 0) {
      return res.status(400).json({ 
        message: 'Container type and allocations are required',
        error: { type: 'VALIDATION_ERROR' }
      });
    }

    if (!financials?.shippingCompany) {
      return res.status(400).json({ 
        message: 'Shipping company selection is required',
        error: { type: 'VALIDATION_ERROR' }
      });
    }

    // Get container capacity info - handle custom containers
    let capacityInfo;
    let actualContainerType = containerType;
    
    if (containerType === 'custom' && containerSpecs) {
      console.log('📏 [NEW ALLOCATION] Using custom container specs:', containerSpecs);
      capacityInfo = {
        maxCbm: parseFloat(containerSpecs.cbm) || 67,
        maxWeight: parseFloat(containerSpecs.weight) || 30000
      };
      
      // Map custom container to closest standard type for database storage
      const cbm = capacityInfo.maxCbm;
      if (cbm <= 33) {
        actualContainerType = '20ft';
      } else if (cbm <= 67) {
        actualContainerType = '40ft';
      } else if (cbm <= 76) {
        actualContainerType = '40ft_hc';
      } else {
        actualContainerType = '45ft';
      }
      
      console.log(`📦 [NEW ALLOCATION] Mapped custom container (${cbm} CBM) to type: ${actualContainerType}`);
    } else {
      capacityInfo = Container.getCapacityInfo(containerType);
    }
    
    console.log('🏗️ [NEW ALLOCATION] Container capacity:', capacityInfo);
    
    // Calculate totals from allocations
    let totalCbm = 0;
    let totalWeight = 0;
    let totalCarryingCharges = 0;
    const orderAllocations = [];

    // Validate each allocation and calculate totals
    console.log(`🔍 [NEW ALLOCATION] Processing ${allocations.length} allocations...`);
    
    for (const allocation of allocations) {
      const { orderId, itemId, allocatedCartons, cbmShare, weightShare, carryingCharges } = allocation;
      
      console.log(`Processing allocation:`, {
        orderId: orderId.substring(0, 8) + '...',
        itemId: itemId.substring(0, 8) + '...',
        allocatedCartons,
        cbmShare,
        weightShare
      });
      
      // Verify order and item exist
      const order = await Order.findById(orderId);
      if (!order) {
        console.log(`❌ [NEW ALLOCATION] Order not found: ${orderId}`);
        return res.status(404).json({ 
          message: `Order ${orderId} not found`,
          error: { type: 'ORDER_NOT_FOUND' }
        });
      }

      const item = order.items.find(i => i._id.toString() === itemId);
      if (!item) {
        console.log(`❌ [NEW ALLOCATION] Item not found: ${itemId} in order ${order.orderNumber}`);
        return res.status(404).json({ 
          message: `Item ${itemId} not found in order ${order.orderNumber}`,
          error: { type: 'ITEM_NOT_FOUND' }
        });
      }

      // Validate allocation doesn't exceed available cartons
      const qcPassed = item.qcPassedCartons || 0;
      const alreadyAllocated = item.allocatedCartons || 0;
      const maxAvailable = qcPassed - alreadyAllocated;
      
      console.log(`Item ${item.itemCode} availability:`, {
        qcPassedCartons: qcPassed,
        allocatedCartons: alreadyAllocated,
        maxAvailable,
        requestedAllocation: allocatedCartons
      });
      
      if (allocatedCartons > maxAvailable) {
        console.log(`❌ [NEW ALLOCATION] Allocation exceeds available: ${allocatedCartons} > ${maxAvailable}`);
        return res.status(400).json({ 
          message: `Cannot allocate ${allocatedCartons} cartons. Maximum available: ${maxAvailable}`,
          error: { 
            type: 'CAPACITY_ERROR',
            details: {
              itemCode: item.itemCode,
              orderNumber: order.orderNumber,
              requested: allocatedCartons,
              available: maxAvailable
            }
          }
        });
      }

      totalCbm += parseFloat(cbmShare) || 0;
      totalWeight += parseFloat(weightShare) || 0;
      totalCarryingCharges += parseFloat(carryingCharges) || 0;

      orderAllocations.push({
        orderId: order._id,
        clientId: order.clientId,
        clientName: order.clientName,
        cbmShare: parseFloat(cbmShare) || 0,
        weightShare: parseFloat(weightShare) || 0,
        cartonShare: parseInt(allocatedCartons) || 0,
        paymentType: order.paymentType || 'CLIENT_DIRECT',
        carryingCharges: parseFloat(carryingCharges) || 0,
        partialAllocation: {
          isPartial: allocatedCartons < (item.cartons || 0),
          allocatedQuantity: (parseInt(allocatedCartons) || 0) * (parseInt(item.quantity) || 0) / (parseInt(item.cartons) || 1),
          totalQuantity: parseInt(item.quantity) || 0,
          allocatedCartons: parseInt(allocatedCartons) || 0,
          totalCartons: parseInt(item.cartons) || 0
        },
        itemAllocations: [{
          itemId: item._id,
          itemCode: item.itemCode,
          allocatedCartons: parseInt(allocatedCartons) || 0,
          cbmShare: parseFloat(cbmShare) || 0,
          weightShare: parseFloat(weightShare) || 0,
          carryingCharges: parseFloat(carryingCharges) || 0
        }]
      });
    }

    // Validate container capacity
    if (totalCbm > capacityInfo.maxCbm) {
      return res.status(400).json({ 
        message: `Total CBM ${totalCbm.toFixed(2)} exceeds container capacity ${capacityInfo.maxCbm}`,
        error: { 
          type: 'CAPACITY_ERROR',
          details: {
            totalCbm,
            maxCbm: capacityInfo.maxCbm,
            excess: totalCbm - capacityInfo.maxCbm
          }
        }
      });
    }

    if (totalWeight > capacityInfo.maxWeight) {
      return res.status(400).json({ 
        message: `Total weight ${totalWeight.toFixed(0)}kg exceeds container capacity ${capacityInfo.maxWeight}kg`,
        error: { 
          type: 'CAPACITY_ERROR',
          details: {
            totalWeight,
            maxWeight: capacityInfo.maxWeight,
            excess: totalWeight - capacityInfo.maxWeight
          }
        }
      });
    }

    // Create container without transactions (MongoDB standalone compatibility)
    console.log('🏗️ [NEW ALLOCATION] Starting container creation (non-transaction mode)...');
    
    let container;
    
    try {
      // Create container data
      const containerData = {
        realContainerId: `CONT-${Date.now()}`,
        type: actualContainerType, // Use mapped type instead of 'custom'
        maxWeight: parseFloat(capacityInfo.maxWeight) || 30000,
        maxCbm: parseFloat(capacityInfo.maxCbm) || 67,
        currentWeight: parseFloat(totalWeight) || 0,
        currentCbm: parseFloat(totalCbm) || 0,
        status: 'planning',
        orders: orderAllocations,
        shippingCompany: {
          id: financials.shippingCompany,
          name: getShippingCompanyName(financials.shippingCompany)
        },
        baseCharges: {
          gst: parseFloat(financials.baseCharges?.gst) || 0,
          duty: parseFloat(financials.baseCharges?.duty) || 0,
          misc: parseFloat(financials.baseCharges?.misc) || 0,
          extraCharge: parseFloat(financials.baseCharges?.extraCharge) || 0,
          currency: 'INR'
        },
        createdBy: req.user.id
      };
      
      console.log('🏗️ [NEW ALLOCATION] Container data to save:', {
        type: containerData.type,
        maxCbm: containerData.maxCbm,
        maxWeight: containerData.maxWeight,
        currentCbm: containerData.currentCbm,
        currentWeight: containerData.currentWeight,
        ordersCount: containerData.orders.length
      });

      // Create and save container
      container = new Container(containerData);
      
      // Calculate financials
      container.calculateFinancials();
      
      await container.save();
      console.log('✅ [NEW ALLOCATION] Container created successfully:', container.realContainerId);

      // Update order items with allocation data (non-transaction)
      console.log('📝 [NEW ALLOCATION] Updating order allocations...');
      for (const allocation of allocations) {
        const { orderId, itemId, allocatedCartons } = allocation;
        
        try {
          const updateResult = await Order.updateOne(
            { _id: orderId, 'items._id': itemId },
            { 
              $inc: { 'items.$.allocatedCartons': allocatedCartons },
              $set: { 'items.$.lastAllocatedAt': new Date() }
            }
          );
          
          console.log(`✅ [NEW ALLOCATION] Updated order ${orderId}, item ${itemId}: +${allocatedCartons} cartons`);
        } catch (updateError) {
          console.error(`❌ [NEW ALLOCATION] Failed to update order ${orderId}:`, updateError.message);
          // Continue with other updates even if one fails
        }
      }

      console.log(`🎉 [NEW ALLOCATION] Container allocation completed: ${container.realContainerId}`, {
        totalCbm: totalCbm.toFixed(2),
        totalWeight: totalWeight.toFixed(0),
        utilization: {
          cbm: ((totalCbm / capacityInfo.maxCbm) * 100).toFixed(1) + '%',
          weight: ((totalWeight / capacityInfo.maxWeight) * 100).toFixed(1) + '%'
        },
        itemsAllocated: allocations.length,
        profit: container.grossProfit
      });

    } catch (error) {
      console.error('❌ [NEW ALLOCATION] Container creation failed:', error);
      
      // If container was created but updates failed, we still return success
      // since the container exists and can be manually corrected
      if (container && container._id) {
        console.log('⚠️ [NEW ALLOCATION] Container created but some updates failed. Container ID:', container.realContainerId);
      } else {
        throw error;
      }
    }

    res.json({
      success: true,
      message: 'Container allocation completed successfully',
      container: {
        id: container._id,
        realContainerId: container.realContainerId,
        type: container.type,
        utilization: {
          cbm: ((totalCbm / capacityInfo.maxCbm) * 100).toFixed(1),
          weight: ((totalWeight / capacityInfo.maxWeight) * 100).toFixed(1)
        },
        financials: {
          totalRevenue: container.totalRevenue,
          totalCosts: container.totalCosts,
          grossProfit: container.grossProfit,
          profitMargin: container.profitMargin
        }
      },
      allocatedItems: allocations.length,
      totalCartons: allocations.reduce((sum, a) => sum + a.allocatedCartons, 0)
    });

  } catch (error) {
    console.error('New container allocation error:', error);
    res.status(500).json({ 
      message: 'Server error during allocation',
      error: { type: 'SERVER_ERROR' }
    });
  }
});

// Helper function to get shipping company name
function getShippingCompanyName(companyId) {
  const companies = {
    'maersk': 'Maersk Line',
    'msc': 'Mediterranean Shipping Company',
    'cosco': 'COSCO Shipping'
  };
  return companies[companyId] || companyId;
}

module.exports = router;
