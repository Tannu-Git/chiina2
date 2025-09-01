const express = require('express');
const { body, validationResult } = require('express-validator');
const User = require('../models/User');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/users
// @desc    Get all users with enhanced data
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { page = 1, limit = 50, role, search } = req.query;
    
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
        // Get orders count and total spent for clients
        if (user.role === 'client' && user.clientId) {
          const orders = await Order.find({ clientId: user.clientId })
            .select('createdAt items.totalPrice')
            .sort({ createdAt: -1 })
            .limit(1)
            .lean();
          
          computedFields.ordersCount = await Order.countDocuments({ clientId: user.clientId });
          
          // Calculate total spent from all orders
          const allOrders = await Order.find({ clientId: user.clientId })
            .select('items.totalPrice')
            .lean();
          
          computedFields.totalSpent = allOrders.reduce((total, order) => {
            const orderTotal = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
            return total + orderTotal;
          }, 0);
          
          if (orders.length > 0) {
            computedFields.lastOrderDate = orders[0].createdAt;
          }

          // Get container count
          computedFields.containerCount = await Container.countDocuments({ 
            'orders.clientId': user.clientId 
          });

          // Get account balance
          const accountBalance = await AccountBalance.findOne({ 'party.id': user.clientId });
          if (accountBalance) {
            computedFields.accountBalance = {
              INR: accountBalance.balances.INR.balance || 0,
              USD: accountBalance.balances.USD.balance || 0
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
    res.status(500).json({ message: 'Server error' });
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
  body('email').isEmail().normalizeEmail().withMessage('Please enter a valid email'),
  body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
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

    const { name, email, password, role, company, phone, permissions } = req.body;

    // Check if user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: 'User already exists with this email' });
    }

    // Create user
    const user = new User({
      name,
      email,
      password,
      role,
      company,
      phone,
      permissions: permissions || []
    });

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

module.exports = router;
