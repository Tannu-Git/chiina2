const express = require('express');
const mongoose = require('mongoose');
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
        console.log(`🔄 [DELETE CONTAINER] Clearing allocations for ${orderIds.length} orders`);
        
        // Process each order individually with proper error handling
        // Note: Using individual saves instead of transactions for standalone MongoDB
        const clearResults = [];
        
        for (const orderId of orderIds) {
          try {
            const order = await Order.findById(orderId);
            if (order && order.items) {
              // Store original values for rollback if needed
              const originalAllocations = order.items.map(item => ({
                allocatedCartons: item.allocatedCartons || 0,
                allocatedQuantity: item.allocatedQuantity || 0,
                containerId: item.containerId
              }));
              
              // Clear item-level allocations
              order.items.forEach(item => {
                console.log(`🔄 [DELETE CONTAINER] Clearing item ${item.itemCode}: ${item.allocatedCartons} -> 0`);
                item.allocatedCartons = 0;
                item.allocatedQuantity = 0;
                item.containerId = null;
                
                // Set bypass flag to prevent middleware interference
                item._bypassQuantityRecalculation = true;
              });
              
              // Update order status and clear container reference
              order.status = 'ready';
              order.containerId = null;
              order.updatedBy = req.user.id;
              order.updatedAt = new Date();
              
              // Set bypass flag for order-level save
              order._bypassAllocationValidation = true;
              
              // Mark the items array as modified for Mongoose
              order.markModified('items');
              
              await order.save();
              
              // Verify the save was successful
              const verifyOrder = await Order.findById(orderId);
              const totalAllocated = verifyOrder.items.reduce((sum, item) => 
                sum + (item.allocatedCartons || 0), 0);
              
              if (totalAllocated === 0 && !verifyOrder.containerId) {
                console.log(`✅ [DELETE CONTAINER] Successfully cleared order ${order.orderNumber}`);
                clearResults.push({ orderId, orderNumber: order.orderNumber, success: true });
              } else {
                console.error(`❌ [DELETE CONTAINER] Verification failed for order ${order.orderNumber}`);
                clearResults.push({ orderId, orderNumber: order.orderNumber, success: false, 
                  issue: 'Verification failed - allocations not properly cleared' });
              }
              
            } else {
              console.warn(`⚠️ [DELETE CONTAINER] Order ${orderId} not found or has no items`);
              clearResults.push({ orderId, success: false, issue: 'Order not found or has no items' });
            }
          } catch (orderError) {
            console.error(`❌ [DELETE CONTAINER] Failed to clear order ${orderId}:`, orderError.message);
            clearResults.push({ orderId, success: false, error: orderError.message });
          }
        }
        
        // Check if all orders were successfully cleared
        const successfulClears = clearResults.filter(result => result.success);
        const failedClears = clearResults.filter(result => !result.success);
        
        console.log(`📊 [DELETE CONTAINER] Cleanup summary:`, {
          total: clearResults.length,
          successful: successfulClears.length,
          failed: failedClears.length
        });
        
        if (failedClears.length > 0) {
          console.error(`⚠️ [DELETE CONTAINER] Some orders failed to clear:`, failedClears);
          // Continue with container deletion but warn about partial cleanup
        }
        
        // Final verification check
        console.log(`🔍 [DELETE CONTAINER] Final verification check...`);
        const finalVerification = await Order.find({ _id: { $in: orderIds } });
        const stillAllocated = finalVerification.filter(order => {
          const totalAllocated = order.items.reduce((sum, item) => sum + (item.allocatedCartons || 0), 0);
          return totalAllocated > 0 || order.containerId;
        });
        
        if (stillAllocated.length > 0) {
          console.warn(`⚠️ [DELETE CONTAINER] ${stillAllocated.length} orders still have allocations:`, 
            stillAllocated.map(o => o.orderNumber));
        } else {
          console.log(`✅ [DELETE CONTAINER] All allocations successfully cleared`);
        }
      }
    }

    // Delete the container
    await Container.findByIdAndDelete(req.params.id);

    // ENHANCED FIX: Convert received payments to manual records before cleanup
    console.log(`🧹 [DELETE CONTAINER] Converting received payments and cleaning up records...`);
    
    try {
      // Use direct MongoDB collection access (consistent with other APIs)
      const PaymentCollectionModel = mongoose.connection.collection('paymentcollections');
      
      // STEP 1: Find payment records tied to this container
      const containerPayments = await PaymentCollectionModel.find({ containerId: req.params.id }).toArray();
      console.log(`🔍 [DELETE CONTAINER] Found ${containerPayments.length} payment records tied to container`);
      
      let preservedCount = 0;
      let deletedCount = 0;
      let convertedCount = 0;
      
      for (const payment of containerPayments) {
        // CONVERT order-based payments with received amounts to manual records
        if (payment.paymentType !== 'MANUAL' && payment.receivedAmount > 0) {
          console.log(`💰 [DELETE CONTAINER] CONVERTING received payment to manual for ${payment.clientName}: ₹${payment.receivedAmount}`);
          
          // Create new manual payment record for ONLY the received amount
          const manualPayment = {
            clientId: payment.clientId,
            clientName: payment.clientName,
            orderId: null,
            containerId: null,
            totalAmount: 0,
            receivedAmount: payment.receivedAmount,
            paymentType: 'MANUAL',
            description: `Manual payment received (from container ${container.realContainerId})`,
            notes: `Converted from order payment - received amount preserved`,
            status: 'RECEIVED',
            createdBy: payment.createdBy,
            pendingAmount: -payment.receivedAmount, // Negative = credit balance
            paymentHistory: payment.paymentHistory || [],
            createdAt: new Date(),
            updatedAt: new Date(),
            __v: 0
          };
          
          // Insert the new manual payment record
          await PaymentCollectionModel.insertOne(manualPayment);
          convertedCount++;
          console.log(`✅ [DELETE CONTAINER] Created manual payment record for received ₹${payment.receivedAmount}`);
        }
        // PRESERVE existing manual payments (don't touch them)
        else if (payment.paymentType === 'MANUAL') {
          console.log(`💚 [DELETE CONTAINER] SKIPPING existing manual payment for ${payment.clientName}: ₹${payment.receivedAmount}`);
          
          // Remove container reference but keep the manual record
          await PaymentCollectionModel.updateOne(
            { _id: payment._id },
            { $unset: { containerId: '', orderId: '' } }
          );
          
          preservedCount++;
          continue; // Don't delete this one
        }
        
        // DELETE the original payment record (after conversion or if no received amount)
        await PaymentCollectionModel.deleteOne({ _id: payment._id });
        deletedCount++;
        console.log(`🗑️ [DELETE CONTAINER] Deleted original ${payment.paymentType} payment record`);
      }
      
      console.log(`✅ [DELETE CONTAINER] Payment cleanup complete:`);
      console.log(`   - Converted: ${convertedCount} payments to manual records`);
      console.log(`   - Preserved: ${preservedCount} existing manual payments`);
      console.log(`   - Deleted: ${deletedCount} original payment records`);
      
    } catch (paymentError) {
      console.error(`⚠️ [DELETE CONTAINER] Failed to clean payment records:`, paymentError.message);
      // Don't fail the whole operation, just log the error
    }

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
