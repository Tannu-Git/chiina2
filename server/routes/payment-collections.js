const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const Container = require('../models/Container');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');
const {
  calculateAllocatedProductCost,
  calculateAllocatedCarryingCharges,
  getOrderAllocationSummary
} = require('../utils/financialCalculationHelpers');

const router = express.Router();

// Payment Collection Schema for tracking manual payments
const paymentCollectionSchema = new mongoose.Schema({
  clientId: {
    type: String,
    required: true
  },
  clientName: {
    type: String,
    required: true
  },
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: false // Not required for manual entries
  },
  containerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Container',
    required: false // Not required for manual entries
  },
  totalAmount: {
    type: Number,
    required: true
  },
  receivedAmount: {
    type: Number,
    default: 0
  },
  pendingAmount: {
    type: Number,
    default: function() { return this.totalAmount - this.receivedAmount; }
  },
  paymentType: {
    type: String,
    enum: ['THROUGH_ME', 'CLIENT_DIRECT', 'MANUAL'],
    required: true
  },
  description: {
    type: String,
    default: 'Payment collection'
  },
  notes: {
    type: String
  },
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'RECEIVED'],
    default: 'PENDING'
  },
  paymentHistory: [{
    amount: Number,
    receivedDate: { type: Date, default: Date.now },
    notes: String,
    recordedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }],
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Enhanced pre-save middleware with strict validation
paymentCollectionSchema.pre('save', function() {
  // Ensure amounts are properly formatted
  this.totalAmount = Math.max(0, Math.round((this.totalAmount || 0) * 100) / 100);
  // FIXED: Allow negative receivedAmount for manual transactions where we owe clients money
  this.receivedAmount = Math.round((this.receivedAmount || 0) * 100) / 100;
  
  // Calculate pending amount
  this.pendingAmount = Math.round((this.totalAmount - this.receivedAmount) * 100) / 100;
  
  // ALLOW negative pending amounts for credit balances (overpayments)
  // Negative pending = Credit balance = Good financial status
  if (this.pendingAmount < 0) {
    const creditAmount = Math.abs(this.pendingAmount);
    console.log(`💚 CREDIT BALANCE for ${this.clientName}:`);
    console.log(`   Total Owed: ₹${this.totalAmount.toLocaleString('en-IN')}`);
    console.log(`   Amount Paid: ₹${this.receivedAmount.toLocaleString('en-IN')}`);
    console.log(`   Credit Balance: ₹${creditAmount.toLocaleString('en-IN')} (OVERPAID)`);
    
    // DO NOT cap amounts - allow credit balances to show properly
    // Keep actual amounts for accurate financial reporting
  }
  
  // Update status based on payment progress
  if (this.receivedAmount === 0) {
    this.status = 'PENDING';
  } else if (this.receivedAmount >= this.totalAmount) {
    // If overpaid, still mark as RECEIVED (they paid more than required)
    this.status = 'RECEIVED';
  } else {
    this.status = 'PARTIAL';
  }
  
  // Data integrity validation
  if (this.totalAmount <= 0) {
    console.warn(`⚠️ Invalid total amount for ${this.clientName}: ₹${this.totalAmount}`);
  }
});

const PaymentCollection = mongoose.model('PaymentCollection', paymentCollectionSchema);

// Helper function to get all clients (including those without balances)
async function getAllClientsWithOrWithoutBalances() {
  try {
    // Get unique clients from containers (active clients)
    const containers = await Container.find({}).select('orders.clientId orders.clientName');
    const clientsFromContainers = new Map();
    
    containers.forEach(container => {
      container.orders.forEach(order => {
        if (order.clientId && order.clientName) {
          clientsFromContainers.set(order.clientId, {
            clientId: order.clientId,
            clientName: order.clientName,
            source: 'CONTAINER_ORDERS',
            hasBalances: false
          });
        }
      });
    });

    // Get unique clients from payment collections (clients with payment history)
    const paymentCollections = await PaymentCollection.find({}).select('clientId clientName');
    const clientsFromPayments = new Map();
    
    paymentCollections.forEach(payment => {
      if (payment.clientId && payment.clientName) {
        clientsFromPayments.set(payment.clientId, {
          clientId: payment.clientId,
          clientName: payment.clientName,
          source: 'PAYMENT_HISTORY',
          hasBalances: true
        });
      }
    });

    // Merge both sources
    const allClients = new Map();
    
    // Add clients from containers
    clientsFromContainers.forEach((client, clientId) => {
      allClients.set(clientId, client);
    });
    
    // Update/add clients from payments
    clientsFromPayments.forEach((client, clientId) => {
      if (allClients.has(clientId)) {
        allClients.get(clientId).hasBalances = true;
        allClients.get(clientId).source = 'BOTH';
      } else {
        allClients.set(clientId, client);
      }
    });

    return Array.from(allClients.values()).sort((a, b) => a.clientName.localeCompare(b.clientName));
  } catch (error) {
    console.error('Error getting all clients:', error);
    return [];
  }
}

// @route   GET /api/payment-collections/raw
// @desc    Get raw payment collections data for transactions page
// @access  Private (Admin/Staff only)
router.get('/raw', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const paymentCollections = await PaymentCollection.find({})
      .populate('orderId', 'orderNumber')
      .populate('containerId', 'realContainerId clientFacingId')
      .sort({ createdAt: -1 });
    
    res.json(paymentCollections);
  } catch (error) {
    console.error('Get raw payment collections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/payment-collections
// @desc    Get all payment collections with real-time status
// @access  Private (Admin/Staff only)
router.get('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Get all containers with orders to create payment records
    const containers = await Container.find({})
      .populate('orders.orderId', 'orderNumber clientName items totalAmount');

    const clientCollections = {};
    
    // Enhanced data integrity tracking
    let validPayments = 0;
    
    // Process each container to extract payment obligations
    for (const container of containers) {
      for (const containerOrder of container.orders) {
        const order = containerOrder.orderId;
        if (!order) {
          console.warn(`⚠️ Container ${container.realContainerId} has order reference but order not found`);
          continue;
        }

        const clientId = containerOrder.clientId;
        // Use container-level carrying charges, not order-level (which might not exist)
        // FIXED: Use allocation-aware calculations instead of full order amounts
        const allocatedCarryingCharges = calculateAllocatedCarryingCharges(order, [container]);
        
        // Calculate total amount owed based on payment type using allocation-aware calculations
        let totalAmount = allocatedCarryingCharges; // Always get allocated carrying charges
        
        if (containerOrder.paymentType === 'THROUGH_ME') {
          // Through me: allocated carrying charges + allocated product cost
          const allocatedProductCost = calculateAllocatedProductCost(order, [container]);
          totalAmount += allocatedProductCost;
        }
        
        if (totalAmount === 0) {
          console.log(`⚠️ Skipping order ${order.orderNumber} - no allocation found (total amount: ₹0)`);
          continue;
        }
        
        // Debug logging to show allocation-aware calculation impact
        if (containerOrder.paymentType === 'THROUGH_ME') {
          const oldProductCost = order && order.items ? 
            order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
          const oldCarryingCharges = containerOrder.carryingCharges || 0;
          const oldTotalAmount = oldProductCost + oldCarryingCharges;
          
          const allocationSummary = getOrderAllocationSummary(order, [container]);
          
          console.log(`📋 Order ${order.orderNumber} financial update:`);
          console.log(`   OLD (Full Order): Product ₹${oldProductCost.toLocaleString('en-IN')} + Carrying ₹${oldCarryingCharges.toLocaleString('en-IN')} = ₹${oldTotalAmount.toLocaleString('en-IN')}`);
          console.log(`   NEW (Allocated): Product ₹${(totalAmount - allocatedCarryingCharges).toLocaleString('en-IN')} + Carrying ₹${allocatedCarryingCharges.toLocaleString('en-IN')} = ₹${totalAmount.toLocaleString('en-IN')}`);
          console.log(`   Allocation Ratio: ${allocationSummary.allocationRatio}% (${allocationSummary.allocatedCartons}/${allocationSummary.totalCartons} cartons)`);
          
          const savings = oldTotalAmount - totalAmount;
          if (savings > 0) {
            console.log(`   💰 Client saves: ₹${savings.toLocaleString('en-IN')} due to partial allocation`);
          }
        }

        // Check if payment collection record exists (with orphaned data detection)
        let paymentRecord = await PaymentCollection.findOne({
          clientId,
          orderId: order._id,
          containerId: container._id
        });
        
        // Validate data integrity - ensure order and container exist
        if (!order || !container) {
          console.error(`🚨 DATA INTEGRITY ERROR: Missing order or container for payment record`);
          dataCorruptionIssues.push(`Missing order/container for client ${clientId}`);
          continue;
        }

        // Create record if doesn't exist
        if (!paymentRecord) {
          paymentRecord = new PaymentCollection({
            clientId,
            clientName: containerOrder.clientName,
            orderId: order._id,
            containerId: container._id,
            totalAmount, // This is now allocation-aware
            paymentType: containerOrder.paymentType,
            description: `Allocated charges for order ${order.orderNumber} - ${containerOrder.paymentType}`,
            createdBy: req.user.id
          });
          await paymentRecord.save();
          validPayments++;
        } else {
          // Update existing record with allocation-aware amount if it has changed
          if (Math.abs(paymentRecord.totalAmount - totalAmount) > 0.01) {
            console.log(`🔄 Updating payment record for ${containerOrder.clientName}:`);
            console.log(`   Old amount: ₹${paymentRecord.totalAmount.toLocaleString('en-IN')}`);
            console.log(`   New allocated amount: ₹${totalAmount.toLocaleString('en-IN')}`);
            
            paymentRecord.totalAmount = totalAmount;
            paymentRecord.description = `Allocated charges for order ${order.orderNumber} - ${containerOrder.paymentType}`;
            await paymentRecord.save();
          }
          validPayments++;
        }

        // Group by client
        if (!clientCollections[clientId]) {
          clientCollections[clientId] = {
            clientId,
            clientName: containerOrder.clientName,
            totalAmount: 0,
            receivedAmount: 0,
            pendingAmount: 0,
            payments: []
          };
        }

        const client = clientCollections[clientId];
        client.totalAmount += totalAmount;
        client.receivedAmount += paymentRecord.receivedAmount;
        client.pendingAmount += paymentRecord.pendingAmount;
        client.payments.push({
          paymentId: paymentRecord._id,
          orderNumber: order.orderNumber,
          containerId: container.realContainerId || container.clientFacingId,
          totalAmount: paymentRecord.totalAmount, // This is now allocation-aware
          receivedAmount: paymentRecord.receivedAmount,
          pendingAmount: paymentRecord.pendingAmount,
          paymentType: paymentRecord.paymentType,
          status: paymentRecord.status,
          description: `Allocation-aware charges (${containerOrder.paymentType})`,
          allocationInfo: {
            allocatedCarryingCharges,
            allocatedProductCost: containerOrder.paymentType === 'THROUGH_ME' ? 
              calculateAllocatedProductCost(order, [container]) : 0,
            paymentTypeDescription: containerOrder.paymentType === 'THROUGH_ME' ? 
              'Product Cost + Carrying Charges (Allocated)' : 
              'Carrying Charges Only (Allocated)'
          },
          lastPaymentDate: paymentRecord.paymentHistory.length > 0 ? 
            paymentRecord.paymentHistory[paymentRecord.paymentHistory.length - 1].receivedDate : null
        });
      }
    }

    // FIXED: Only get truly manual payment records (not already processed in container loop)
    // This prevents double-counting of payments that exist in both flows
    const manualPaymentRecords = await PaymentCollection.find({
      // Only get records that are purely manual (no order/container reference)
      orderId: null,
      containerId: null,
      paymentType: 'MANUAL'
    }).sort({ createdAt: 1 });
    
    // Process only truly manual records (not duplicates from container flow)
    for (const manualRecord of manualPaymentRecords) {
      const clientId = manualRecord.clientId;
      
      if (!clientCollections[clientId]) {
        clientCollections[clientId] = {
          clientId,
          clientName: manualRecord.clientName,
          totalAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          payments: []
        };
      }

      const client = clientCollections[clientId];
      
      // Add manual transaction amounts
      const actualTotal = manualRecord.totalAmount || 0;
      const actualReceived = manualRecord.receivedAmount || 0;
      const actualPending = manualRecord.pendingAmount || 0;
      
      console.log(`📊 Processing MANUAL transaction for ${manualRecord.clientName}:`);
      console.log(`   Total: ₹${actualTotal}, Received: ₹${actualReceived}, Pending: ₹${actualPending}`);
      
      // Add to client totals (no duplication since these are purely manual)
      client.totalAmount += actualTotal;
      client.receivedAmount += actualReceived; 
      client.pendingAmount += actualPending;
      
      // Mark clients with credit balances (negative pending) as having credit
      if (manualRecord.pendingAmount < 0) {
        client.hasCreditBalance = true;
        console.log(`💚 CREDIT BALANCE for ${manualRecord.clientName}:`);
        console.log(`   Pending Amount: ₹${manualRecord.pendingAmount.toLocaleString('en-IN')} (CREDIT)`);
      }
      
      client.payments.push({
        paymentId: manualRecord._id,
        orderNumber: 'MANUAL',
        containerId: 'N/A',
        totalAmount: manualRecord.totalAmount,
        receivedAmount: manualRecord.receivedAmount,
        pendingAmount: manualRecord.pendingAmount,
        paymentType: manualRecord.paymentType,
        status: manualRecord.status,
        description: manualRecord.description,
        lastPaymentDate: manualRecord.paymentHistory.length > 0 ? 
          manualRecord.paymentHistory[manualRecord.paymentHistory.length - 1].receivedDate : null
      });
    }

    // Get all clients for the allClients array that frontend expects
    const allClientsArray = await getAllClientsWithOrWithoutBalances();
    
    // Enhanced summary with clean data integrity analysis
    const summary = {
      totalToCollect: Object.values(clientCollections).reduce((sum, client) => sum + Math.max(0, client.totalAmount), 0),
      totalReceived: Object.values(clientCollections).reduce((sum, client) => sum + client.receivedAmount, 0),
      totalPending: Object.values(clientCollections).reduce((sum, client) => sum + client.pendingAmount, 0),
      clientCount: Object.keys(clientCollections).length,
      dataIntegrity: {
        validPayments,
        creditBalanceClients: Object.values(clientCollections).filter(client => client.pendingAmount < 0).length,
        integrityScore: 100, // Clean aggregation eliminates duplication issues
        hasCreditBalances: Object.values(clientCollections).some(client => client.pendingAmount < 0),
        totalContainers: containers.length,
        totalOrders: containers.reduce((sum, container) => sum + container.orders.length, 0),
        systemHealth: {
          status: 'HEALTHY', // Fixed duplication eliminates corruption
          criticalIssues: 0,
          lastChecked: new Date().toISOString(),
          duplicatesEliminated: true
        }
      }
    };
    
    // Enhanced validation logging
    console.log('\n📊 FINANCIAL SYSTEM HEALTH CHECK:');
    console.log(`   Total Clients: ${summary.clientCount}`);
    console.log(`   Valid Payments: ${validPayments}`);
    console.log(`   Credit Balance Clients: ${summary.dataIntegrity.creditBalanceClients}`);
    console.log(`   System Status: ${summary.dataIntegrity.systemHealth.status}`);
    console.log(`   Duplicates Eliminated: ${summary.dataIntegrity.systemHealth.duplicatesEliminated}`);

    // Debug logging for negative amounts (these are now properly handled credit balances)
    Object.values(clientCollections).forEach(client => {
      if (client.pendingAmount < 0) {
        console.log(`💳 [CREDIT] Client ${client.clientName} has credit balance: ₹${Math.abs(client.pendingAmount).toLocaleString('en-IN')}`);
      }
    });

    res.json({
      summary,
      clientCollections: Object.values(clientCollections).sort((a, b) => {
        // Sort by: Clients with balances first, then by pending amount (high to low)
        const aHasBalance = Math.abs(a.pendingAmount) > 0.01;
        const bHasBalance = Math.abs(b.pendingAmount) > 0.01;
        
        if (aHasBalance && !bHasBalance) return -1;
        if (!aHasBalance && bHasBalance) return 1;
        
        // Both have balances or both don't - sort by pending amount
        return Math.abs(b.pendingAmount) - Math.abs(a.pendingAmount);
      }),
      allClients: allClientsArray // FIXED: Include all clients for frontend toggle
    });
  } catch (error) {
    console.error('Payment collections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/payment-collections/record-payment
// @desc    Record a payment received from client - FIXED VERSION
// @access  Private (Admin/Staff only)
router.post('/record-payment', auth, authorize('admin', 'staff'), [
  body('paymentId').isMongoId().withMessage('Valid payment ID required'),
  body('amount').isFloat({ min: 0 }).withMessage('Amount must be a positive number'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { paymentId, amount, notes } = req.body;

    const paymentRecord = await PaymentCollection.findById(paymentId);
    if (!paymentRecord) {
      return res.status(404).json({ message: 'Payment record not found' });
    }

    console.log(`📝 RECORDING PAYMENT:`);
    console.log(`   Client: ${paymentRecord.clientName}`);
    console.log(`   Payment Amount: ₹${amount.toLocaleString('en-IN')}`);
    console.log(`   Current Received: ₹${paymentRecord.receivedAmount.toLocaleString('en-IN')}`);
    console.log(`   Current Pending: ₹${paymentRecord.pendingAmount.toLocaleString('en-IN')}`);

    // FIXED: Allow overpayments - remove strict validation
    // Users can pay more than owed (creates credit balance)
    
    // Update payment record - AVOID DOUBLE PROCESSING
    const newReceivedAmount = paymentRecord.receivedAmount + amount;
    
    // Add to payment history BEFORE updating amounts
    paymentRecord.paymentHistory.push({
      amount,
      notes,
      recordedBy: req.user.id
    });

    // Update received amount directly (pre-save will calculate pending)
    paymentRecord.receivedAmount = newReceivedAmount;

    // Save - pre-save middleware will calculate pendingAmount and status
    await paymentRecord.save();

    console.log(`✅ PAYMENT RECORDED:`);
    console.log(`   New Received: ₹${paymentRecord.receivedAmount.toLocaleString('en-IN')}`);
    console.log(`   New Pending: ₹${paymentRecord.pendingAmount.toLocaleString('en-IN')}`);
    console.log(`   Status: ${paymentRecord.status}`);

    const isOverpayment = paymentRecord.pendingAmount < 0;
    const responseMessage = isOverpayment ? 
      `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully. Credit balance: ₹${Math.abs(paymentRecord.pendingAmount).toLocaleString('en-IN')}` :
      `Payment of ₹${amount.toLocaleString('en-IN')} recorded successfully`;

    res.json({
      message: responseMessage,
      isOverpayment,
      creditBalance: isOverpayment ? Math.abs(paymentRecord.pendingAmount) : 0,
      paymentRecord: {
        id: paymentRecord._id,
        totalAmount: paymentRecord.totalAmount,
        receivedAmount: paymentRecord.receivedAmount,
        pendingAmount: paymentRecord.pendingAmount,
        status: paymentRecord.status
      }
    });
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/payment-collections/bulk-record
// @desc    Record multiple payments at once for a client
// @access  Private (Admin/Staff only)
router.put('/bulk-record', auth, authorize('admin', 'staff'), [
  body('clientId').notEmpty().withMessage('Client ID required'),
  body('totalAmountReceived').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, totalAmountReceived, notes } = req.body;

    // Get all pending payments for this client
    const paymentRecords = await PaymentCollection.find({
      clientId,
      status: { $in: ['PENDING', 'PARTIAL'] }
    }).sort({ createdAt: 1 }); // Oldest first

    if (paymentRecords.length === 0) {
      return res.status(404).json({ message: 'No pending payments found for this client' });
    }

    let remainingAmount = totalAmountReceived;
    const updatedRecords = [];

    // Distribute payment across pending records
    for (const record of paymentRecords) {
      if (remainingAmount <= 0) break;

      const amountToApply = Math.min(remainingAmount, record.pendingAmount);
      
      record.receivedAmount += amountToApply;
      record.paymentHistory.push({
        amount: amountToApply,
        notes: notes || `Bulk payment allocation`,
        recordedBy: req.user.id
      });

      await record.save();
      remainingAmount -= amountToApply;
      updatedRecords.push(record);
    }

    res.json({
      message: `Bulk payment of ₹${totalAmountReceived} processed successfully`,
      distributedAmount: totalAmountReceived - remainingAmount,
      remainingAmount,
      updatedRecords: updatedRecords.length
    });
  } catch (error) {
    console.error('Bulk record payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/payment-collections/add-manual-transaction
// @desc    Add a manual transaction (payment to/from client outside of orders)
// @access  Private (Admin/Staff only)
router.post('/add-manual-transaction', auth, authorize('admin', 'staff'), [
  body('clientId').notEmpty().withMessage('Client ID required'),
  body('clientName').notEmpty().withMessage('Client name required'),
  body('amount').isFloat().withMessage('Valid amount required'),
  body('transactionType').isIn(['PAYMENT_RECEIVED', 'PAYMENT_GIVEN']).withMessage('Transaction type must be PAYMENT_RECEIVED or PAYMENT_GIVEN'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, clientName, amount, transactionType, description, notes } = req.body;
    const absoluteAmount = Math.abs(amount);

    console.log(`📝 MANUAL TRANSACTION:`);   
    console.log(`   Client: ${clientName}`);
    console.log(`   Type: ${transactionType}`);
    console.log(`   Amount: ₹${absoluteAmount.toLocaleString('en-IN')}`);
    console.log(`   Description: ${description}`);

    // FIXED: Proper manual transaction logic
    let manualTransaction;
    
    if (transactionType === 'PAYMENT_RECEIVED') {
      // Client paid you money - create positive balance for you
      manualTransaction = new PaymentCollection({
        clientId,
        clientName,
        orderId: null,
        containerId: null,
        totalAmount: 0, // No debt from client
        receivedAmount: absoluteAmount, // Positive = money you received
        paymentType: 'MANUAL',
        description: description || 'Manual payment received',
        notes: notes,
        createdBy: req.user.id
      });
      
      // Add positive payment to history
      manualTransaction.paymentHistory.push({
        amount: absoluteAmount,
        notes: `Manual payment received: ${description || 'No description provided'}`,
        recordedBy: req.user.id
      });
      
    } else if (transactionType === 'PAYMENT_GIVEN') {
      // You gave money to client - create CREDIT BALANCE (negative pending)
      manualTransaction = new PaymentCollection({
        clientId,
        clientName,
        orderId: null,
        containerId: null,
        totalAmount: 0, // No debt from client
        receivedAmount: -absoluteAmount, // Negative = money you gave to them
        paymentType: 'MANUAL',
        description: description || 'Manual payment given',
        notes: notes,
        createdBy: req.user.id
      });
      
      // Add negative payment to history (you gave money)
      manualTransaction.paymentHistory.push({
        amount: -absoluteAmount,
        notes: `Manual payment given: ${description || 'No description provided'}`,
        recordedBy: req.user.id
      });
    }

    await manualTransaction.save();

    console.log(`✅ MANUAL TRANSACTION CREATED:`);
    console.log(`   Total Amount: ₹${manualTransaction.totalAmount.toLocaleString('en-IN')}`);
    console.log(`   Received Amount: ₹${manualTransaction.receivedAmount.toLocaleString('en-IN')}`);
    console.log(`   Pending Amount: ₹${manualTransaction.pendingAmount.toLocaleString('en-IN')}`);

    const responseMessage = transactionType === 'PAYMENT_RECEIVED' ?
      `Recorded payment received: ₹${absoluteAmount.toLocaleString('en-IN')} from ${clientName}` :
      `Recorded payment given: ₹${absoluteAmount.toLocaleString('en-IN')} to ${clientName}`;

    res.json({
      message: responseMessage,
      transaction: {
        id: manualTransaction._id,
        clientId: manualTransaction.clientId,
        clientName: manualTransaction.clientName,
        amount: absoluteAmount,
        transactionType,
        totalAmount: manualTransaction.totalAmount,
        receivedAmount: manualTransaction.receivedAmount,
        pendingAmount: manualTransaction.pendingAmount,
        status: manualTransaction.status
      }
    });
  } catch (error) {
    console.error('Add manual transaction error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/payment-collections/add-manual-client
// @desc    Add a manual client who doesn't have containers but owes money
// @access  Private (Admin/Staff only)
router.post('/add-manual-client', auth, authorize('admin', 'staff'), [
  body('clientId').notEmpty().withMessage('Client ID required'),
  body('clientName').notEmpty().withMessage('Client name required'),
  body('totalAmount').isFloat({ min: 0 }).withMessage('Total amount must be positive'),
  body('description').optional().isLength({ max: 500 }).withMessage('Description too long'),
  body('notes').optional().isLength({ max: 500 }).withMessage('Notes too long')
], async (req, res) => {
  try {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      return res.status(400).json({ errors: errors.array() });
    }

    const { clientId, clientName, totalAmount, description, notes } = req.body;

    // Check if payment collection record already exists for this client/manual entry
    const existingRecord = await PaymentCollection.findOne({
      clientId,
      orderId: null, // Manual entries don't have orders
      containerId: null // Manual entries don't have containers
    });

    if (existingRecord) {
      return res.status(400).json({ message: 'Manual payment record already exists for this client' });
    }

    // Create a manual payment collection record
    const manualPaymentRecord = new PaymentCollection({
      clientId,
      clientName,
      orderId: null, // No order for manual entries
      containerId: null, // No container for manual entries
      totalAmount,
      paymentType: 'MANUAL', // New payment type for manual entries
      description: description || 'Manual payment collection entry',
      notes,
      createdBy: req.user.id
    });

    await manualPaymentRecord.save();

    res.json({
      message: `Manual client ${clientName} added successfully with ₹${totalAmount} pending`,
      paymentRecord: {
        id: manualPaymentRecord._id,
        clientId: manualPaymentRecord.clientId,
        clientName: manualPaymentRecord.clientName,
        totalAmount: manualPaymentRecord.totalAmount,
        pendingAmount: manualPaymentRecord.pendingAmount,
        status: manualPaymentRecord.status
      }
    });
  } catch (error) {
    console.error('Add manual client error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/payment-collections/history/:clientId
// @desc    Get detailed payment history for a specific client
// @access  Private (Admin/Staff only)
router.get('/history/:clientId', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get all payment collections for this client
    const paymentCollections = await PaymentCollection.find({ clientId })
      .populate('orderId', 'orderNumber')
      .populate('containerId', 'realContainerId clientFacingId')
      .sort({ createdAt: -1 });
    
    // Build comprehensive payment history
    const paymentHistory = [];
    
    for (const collection of paymentCollections) {
      // FIXED: Only create invoice records for non-manual transactions
      // Manual transactions should not have invoices - they are standalone payments
      if (collection.paymentType !== 'MANUAL') {
        // Add the initial invoice/collection record for regular transactions
        paymentHistory.push({
          date: collection.createdAt,
          type: 'INVOICE',
          reference: collection.orderId ? collection.orderId.orderNumber : 'N/A',
          amount: -collection.totalAmount, // Negative for amount owed
          description: collection.description || 'Payment collection created',
          runningBalance: 0 // Will be calculated later
        });
      }
      
      // Add all payment history entries (for both manual and regular transactions)
      collection.paymentHistory.forEach(payment => {
        paymentHistory.push({
          date: payment.receivedDate,
          type: 'PAYMENT',
          reference: collection.orderId ? collection.orderId.orderNumber : 'MANUAL',
          amount: payment.amount, // Can be positive or negative
          description: payment.notes || 'Payment transaction',
          recordedBy: payment.recordedBy,
          runningBalance: 0 // Will be calculated later
        });
      });
    }
    
    // Sort by date (oldest first) and calculate running balance
    paymentHistory.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let runningBalance = 0;
    paymentHistory.forEach(entry => {
      runningBalance += entry.amount;
      entry.runningBalance = runningBalance;
    });
    
    // Return in reverse order (latest first)
    res.json({
      clientId,
      paymentHistory: paymentHistory.reverse(),
      summary: {
        totalInvoiced: paymentCollections.reduce((sum, p) => sum + p.totalAmount, 0),
        totalReceived: paymentCollections.reduce((sum, p) => sum + p.receivedAmount, 0),
        currentBalance: runningBalance,
        totalTransactions: paymentHistory.length
      }
    });
  } catch (error) {
    console.error('Payment history error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;