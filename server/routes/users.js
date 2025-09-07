const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with enhanced data
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 20, role, search } = req.query;
    
    const query = {};
    
    if (role) {
      query.role = role;
    }
    
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { company: { $regex: search, $options: 'i' } },
        { clientId: { $regex: search, $options: 'i' } }
      ];
    }

    const users = await User.find(query)
      .select('-password')
      .sort({ createdAt: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit)
      .lean();

    // Import required models for enhanced data
    const Order = require('../models/Order');
    const Container = require('../models/Container');
    const { PaymentTransaction, AccountBalance } = require('../models/Payment');
    const { calculateAllocatedCarryingCharges, calculateAllocatedProductCost } = require('../utils/financialCalculationHelpers');

    // Enhance users with computed fields
    const enhancedUsers = await Promise.all(users.map(async (user) => {
      const computedFields = {
        status: user.isActive ? 'active' : 'inactive',
        ordersCount: 0,
        totalSpent: 0,
        containerCount: 0,
        lastOrderDate: null,
        accountBalance: { INR: 0, USD: 0 },
        paymentHistory: []
      };

      try {
        console.log(`[USER STATS] Computing stats for user: ${user.name} (Role: ${user.role}, ClientId: ${user.clientId})`);
        
        // Get orders count and financial data for clients
        if (user.role === 'client' && user.clientId) {
          // Get all orders for this client
          const orders = await Order.find({ 
            $or: [
              { clientId: user.clientId },
              { clientName: user.name } // Fallback to name matching
            ]
          })
            .select('createdAt items orderNumber paymentType totalCarryingCharges')
            .sort({ createdAt: -1 })
            .lean();
          
          console.log(`[USER STATS] Found ${orders.length} orders for client ${user.clientId}`);
          
          computedFields.ordersCount = orders.length;
          
          if (orders.length > 0) {
            computedFields.lastOrderDate = orders[0].createdAt;
          }

          // Calculate allocation-aware total spent
          let totalAllocatedAmount = 0;
          
          console.log(`\n🔍 [USER STATS] Starting calculation for client: ${user.name} (${user.clientId})`);
          console.log(`📋 [USER STATS] Found ${orders.length} orders for this client`);
          
          for (const order of orders) {
            try {
              console.log(`\n📦 [USER STATS] Processing Order: ${order.orderNumber}`);
              
              // FIXED: Get ALL containers (not just order-specific) to match comprehensive dashboard logic
              const allContainers = await Container.find({}).lean();
              console.log(`🗂️ [USER STATS] Total containers in system: ${allContainers.length}`);
              
              // Filter containers that have this client's orders
              const clientContainers = allContainers.filter(container => 
                container.orders.some(containerOrder => containerOrder.clientId === user.clientId)
              );
              console.log(`📋 [USER STATS] Client containers found: ${clientContainers.length}`);
              
              if (clientContainers.length > 0) {
                console.log(`💰 [USER STATS] Using comprehensive dashboard logic with ALL containers...`);
                
                // Debug: Show raw order data
                console.log(`📋 [USER STATS] Raw Order Data:`);
                console.log(`   Order ID: ${order._id}`);
                console.log(`   Order Number: ${order.orderNumber}`);
                console.log(`   Total Carrying Charges: ₹${order.totalCarryingCharges || 0}`);
                console.log(`   Items Count: ${order.items?.length || 0}`);
                
                if (order.items && order.items.length > 0) {
                  order.items.forEach((item, index) => {
                    console.log(`   Item ${index + 1}:`);
                    console.log(`     Description: ${item.description || 'N/A'}`);
                    console.log(`     Total Price: ₹${item.totalPrice || 0}`);
                    console.log(`     Cartons: ${item.cartons || 0}`);
                    // console.log(`     Allocated Cartons: ${item.allocatedCartons || 0}`);
                    console.log(`     Payment Type: ${item.paymentType || 'N/A'}`);
                    console.log(`     Carrying Charge Amount: ₹${item.carryingCharge?.amount || 0}`);
                  });
                }
                
                // Debug: Show relevant containers
                console.log(`🗂️ [USER STATS] Relevant Container Data:`);
                clientContainers.forEach((container, index) => {
                  console.log(`   Container ${index + 1}: ${container.realContainerId || container.clientFacingId}`);
                  const clientOrders = container.orders.filter(co => co.clientId === user.clientId);
                  console.log(`     Client Orders in this container: ${clientOrders.length}`);
                  clientOrders.forEach(co => {
                    console.log(`       Order: ${co.orderId} - Carrying Charges: ₹${co.carryingCharges || 0} - Payment: ${co.paymentType}`);
                  });
                });
                
                // Use allocation-aware calculations with ALL containers (matching comprehensive dashboard)
                const allocatedCarryingCharges = calculateAllocatedCarryingCharges(order, allContainers);
                console.log(`🚛 [USER STATS] Allocated carrying charges: ₹${allocatedCarryingCharges}`);
                
                let allocatedAmount = allocatedCarryingCharges;
                
                // Add product cost for THROUGH_ME orders
                const paymentType = order.items[0]?.paymentType || 'THROUGH_ME';
                console.log(`💳 [USER STATS] Payment type: ${paymentType}`);
                
                if (paymentType === 'THROUGH_ME') {
                  const allocatedProductCost = calculateAllocatedProductCost(order, allContainers);
                  console.log(`📦 [USER STATS] Allocated product cost: ₹${allocatedProductCost}`);
                  
                  // Debug: Show product cost calculation breakdown
                  console.log(`🔍 [USER STATS] Product Cost Calculation Breakdown:`);
                  if (order.items) {
                    order.items.forEach((item, index) => {
                      const totalPrice = item.totalPrice || 0;
                      const totalCartons = item.cartons || 0;
                      const allocatedCartons = item.allocatedCartons || 0;
                      const allocationRatio = totalCartons > 0 ? allocatedCartons / totalCartons : 0;
                      const itemAllocatedCost = totalPrice * allocationRatio;
                      console.log(`     Item ${index + 1}: ₹${totalPrice} × (${allocatedCartons}/${totalCartons}) = ₹${itemAllocatedCost}`);
                    });
                  }
                  
                  allocatedAmount += allocatedProductCost;
                }
                
                console.log(`💯 [USER STATS] Total allocated amount for order: ₹${allocatedAmount}`);
                totalAllocatedAmount += allocatedAmount;
                console.log(`📊 [USER STATS] Running total: ₹${totalAllocatedAmount}`);
                
                console.log(`✅ [USER STATS] Order ${order.orderNumber}: Allocated amount = ₹${allocatedAmount} (using comprehensive logic)`);
              } else {
                // No containers allocated yet - count as 0 (allocation-aware)
                console.log(`⚠️ [USER STATS] Order ${order.orderNumber}: No containers allocated, amount = ₹0`);
              }
            } catch (orderError) {
              console.error(`❌ [USER STATS] Error calculating for order ${order._id}:`, orderError);
            }
          }
          
          computedFields.totalSpent = totalAllocatedAmount;
          console.log(`\n🏆 [USER STATS] FINAL RESULT for ${user.name} (${user.clientId}):`); 
          console.log(`   💰 Total Allocated Amount: ₹${totalAllocatedAmount}`);
          console.log(`   📊 This should match comprehensive dashboard API`);
          console.log(`   🔍 Total allocated spending for ${user.clientId}: ₹${totalAllocatedAmount}\n`);

          // Get container count (containers where this client has orders)
          computedFields.containerCount = await Container.countDocuments({ 
            'orders.clientId': user.clientId 
          });
          
          console.log(`[USER STATS] Container count for ${user.clientId}: ${computedFields.containerCount}`);

          // Get account balance using the same approach as comprehensive financial API
          try {
            // FIXED: Use direct MongoDB collection query instead of non-existent model
            const PaymentCollectionModel = mongoose.connection.collection('paymentcollections');
            const paymentCollections = await PaymentCollectionModel.find({ clientId: user.clientId }).toArray();
            
            console.log(`💰 [USER STATS] Found ${paymentCollections.length} payment collections for ${user.clientId}`);
            
            if (paymentCollections.length > 0) {
              // Calculate total received amount from all payment collections
              const totalReceived = paymentCollections.reduce((sum, payment) => {
                const receivedAmount = payment.receivedAmount || 0;
                console.log(`   Payment ID: ${payment._id}, Received: ₹${receivedAmount}, Type: ${payment.paymentType || 'N/A'}`);
                return sum + receivedAmount;
              }, 0);
              
              console.log(`💰 [USER STATS] Total received payments: ₹${totalReceived}`);
              console.log(`💰 [USER STATS] Total allocated amount before payments: ₹${totalAllocatedAmount}`);
              
              // Calculate net balance (what client still owes)
              const netBalance = totalAllocatedAmount - totalReceived;
              console.log(`💰 [USER STATS] Net balance after payments: ₹${netBalance}`);
              
              computedFields.accountBalance = {
                INR: netBalance,
                USD: 0
              };
              
              // Also update totalSpent to reflect net amount (like comprehensive API)
              computedFields.totalSpent = netBalance;
              
              console.log(`💰 [USER STATS] Updated account balance for ${user.clientId}: ₹${netBalance}`);
            } else {
              console.log(`💰 [USER STATS] No payment collections found for ${user.clientId}`);
              computedFields.accountBalance = {
                INR: totalAllocatedAmount, // Full amount owed if no payments
                USD: 0
              };
            }
          } catch (balanceError) {
            console.warn(`[USER STATS] Could not fetch account balance for ${user.clientId}:`, balanceError.message);
            // Fallback to basic balance calculation using existing transactions
            computedFields.accountBalance = {
              INR: totalAllocatedAmount, // Full amount owed if payment query fails
              USD: 0
            };
          }

          // Get recent payment history
          computedFields.paymentHistory = await PaymentTransaction.find({ 
            'party.id': user.clientId 
          })
            .select('type amount currency status paymentDate description')
            .sort({ paymentDate: -1 })
            .limit(5)
            .lean();
        }
        
        console.log(`[USER STATS] Final stats for ${user.name}:`, {
          ordersCount: computedFields.ordersCount,
          totalSpent: computedFields.totalSpent,
          containerCount: computedFields.containerCount,
          balance: computedFields.accountBalance.INR
        });
        
      } catch (computeError) {
        console.error(`Error computing fields for user ${user._id}:`, computeError);
      }

      return {
        ...user,
        ...computedFields
      };
    }));

    const total = await User.countDocuments(query);

    res.json({
      users: enhancedUsers,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get users error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/users/:id
// @desc    Get user by ID
// @access  Private (Admin only)
router.get('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id).select('-password');

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    res.json(user);
  } catch (error) {
    console.error('Get user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users
// @desc    Create new user
// @access  Private (Admin only)
router.post('/', auth, authorize('admin'), [
  body('name').trim().isLength({ min: 2 }).withMessage('Name must be at least 2 characters'),
  body('email').optional({ nullable: true, checkFalsy: true }).isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').optional({ nullable: true, checkFalsy: true }).isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  body('role').isIn(['admin', 'staff', 'client']).withMessage('Invalid role')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: errors.array() 
      });
    }

    const { name, email, password, role, company, phone, permissions, address } = req.body;

    // Check if user already exists (only if email is provided)
    if (email) {
      const existingUser = await User.findOne({ email });
      if (existingUser) {
        return res.status(400).json({ message: 'User already exists with this email' });
      }
    }

    // Create user object with required field
    const userData = {
      name,
      role,
      company,
      phone,
      permissions: permissions || [],
      address
    };

    // Add optional fields if provided
    if (email) userData.email = email;
    if (password) userData.password = password;

    // Create user
    const user = new User(userData);

    // Generate client ID if role is client
    if (user.role === 'client') {
      user.generateClientId();
    }

    await user.save();

    res.status(201).json({
      message: 'User created successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        company: user.company,
        phone: user.phone,
        address: user.address,
        permissions: user.permissions
      }
    });
  } catch (error) {
    console.error('Create user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id
// @desc    Update user with comprehensive fields
// @access  Private (Admin only)
router.put('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update allowed fields including address
    const allowedUpdates = ['name', 'email', 'role', 'company', 'phone', 'permissions', 'isActive', 'address'];
    allowedUpdates.forEach(field => {
      if (req.body[field] !== undefined) {
        user[field] = req.body[field];
      }
    });

    // Generate client ID if role changed to client
    if (req.body.role === 'client' && !user.clientId) {
      user.generateClientId();
    }

    await user.save();

    res.json({
      message: 'User updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        clientId: user.clientId,
        company: user.company,
        phone: user.phone,
        address: user.address,
        permissions: user.permissions,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/users/:id
// @desc    Delete user
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deleting themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot delete your own account' });
    }

    await user.deleteOne();

    res.json({ message: 'User deleted successfully' });
  } catch (error) {
    console.error('Delete user error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/users/:id
// @desc    Update user status
// @access  Private (Admin only)
router.patch('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const { status } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot modify your own account status' });
    }

    // Map status to isActive
    if (status === 'active') {
      user.isActive = true;
    } else if (status === 'inactive') {
      user.isActive = false;
    }

    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        status: user.isActive ? 'active' : 'inactive',
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Update user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/users/:id/toggle-status
// @desc    Toggle user active status
// @access  Private (Admin only)
router.put('/:id/toggle-status', auth, authorize('admin'), async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Prevent admin from deactivating themselves
    if (user._id.toString() === req.user.id) {
      return res.status(400).json({ message: 'Cannot deactivate your own account' });
    }

    user.isActive = !user.isActive;
    await user.save();

    res.json({
      message: `User ${user.isActive ? 'activated' : 'deactivated'} successfully`,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        isActive: user.isActive
      }
    });
  } catch (error) {
    console.error('Toggle user status error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PATCH /api/users/:id/password
// @desc    Update user password (Admin only)
// @access  Private (Admin only)
router.patch('/:id/password', auth, authorize('admin'), [
  body('newPassword').isLength({ min: 6 }).withMessage('New password must be at least 6 characters')
], async (req, res) => {
  try {
    // Validate ObjectId format
    if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
      return res.status(400).json({ message: 'Invalid user ID format' });
    }

    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({
        message: 'Validation failed',
        errors: errors.array()
      });
    }

    const { newPassword } = req.body;
    const user = await User.findById(req.params.id);

    if (!user) {
      return res.status(404).json({ message: 'User not found' });
    }

    // Update password - the pre-save middleware will hash it
    user.password = newPassword;
    await user.save();

    res.json({
      message: 'Password updated successfully',
      user: {
        id: user._id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    console.error('Update password error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/users/bulk-actions
// @desc    Perform bulk actions on multiple users
// @access  Private (Admin only)
router.post('/bulk-actions', auth, authorize('admin'), async (req, res) => {
  try {
    const { action, userIds } = req.body;

    if (!action || !userIds || !Array.isArray(userIds)) {
      return res.status(400).json({ message: 'Action and userIds array required' });
    }

    // Validate ObjectIds
    const invalidIds = userIds.filter(id => !mongoose.Types.ObjectId.isValid(id));
    if (invalidIds.length > 0) {
      return res.status(400).json({ 
        message: 'Invalid user IDs provided',
        invalidIds 
      });
    }

    // Prevent admin from targeting themselves
    if (userIds.includes(req.user.id)) {
      return res.status(400).json({ message: 'Cannot perform bulk actions on your own account' });
    }

    let result = {};

    switch (action) {
      case 'delete':
        result = await User.deleteMany({ _id: { $in: userIds } });
        break;
      
      case 'activate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: true } }
        );
        break;
      
      case 'deactivate':
        result = await User.updateMany(
          { _id: { $in: userIds } },
          { $set: { isActive: false } }
        );
        break;
      
      default:
        return res.status(400).json({ message: 'Invalid action' });
    }

    res.json({
      message: `Bulk ${action} completed successfully`,
      affected: result.modifiedCount || result.deletedCount || 0,
      requested: userIds.length
    });
  } catch (error) {
    console.error('Bulk action error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
