const express = require('express');
const { PaymentTransaction, AccountBalance, Invoice } = require('../models/Payment');
const Container = require('../models/Container');
const Order = require('../models/Order');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/payments/transactions
// @desc    Get all payment transactions with filtering
// @access  Private
router.get('/transactions', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      type, 
      partyType,
      partyId,
      startDate,
      endDate,
      currency 
    } = req.query;

    // Build filter query
    const filter = {};
    if (status) filter.status = status;
    if (type) filter.type = type;
    if (partyType) filter['party.type'] = partyType;
    if (partyId) filter['party.id'] = partyId;
    if (currency) filter.currency = currency;
    
    if (startDate || endDate) {
      filter.paymentDate = {};
      if (startDate) filter.paymentDate.$gte = new Date(startDate);
      if (endDate) filter.paymentDate.$lte = new Date(endDate);
    }

    const transactions = await PaymentTransaction.find(filter)
      .populate('createdBy', 'name email')
      .populate('approvedBy', 'name email')
      .populate('references.containerId', 'clientFacingId realContainerId')
      .populate('references.orderId', 'orderNumber')
      .sort({ paymentDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await PaymentTransaction.countDocuments(filter);

    res.json({
      transactions,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get transactions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/transactions
// @desc    Create new payment transaction
// @access  Private
router.post('/transactions', auth, async (req, res) => {
  try {
    const {
      type,
      paymentMethod,
      amount,
      currency,
      party,
      references,
      description,
      notes,
      bankDetails,
      dueDate
    } = req.body;

    // Validate required fields
    if (!type || !paymentMethod || !amount || !party || !description) {
      return res.status(400).json({ 
        message: 'Missing required fields: type, paymentMethod, amount, party, description' 
      });
    }

    // Create transaction
    const transaction = new PaymentTransaction({
      type,
      paymentMethod,
      amount,
      currency: currency || 'INR',
      party,
      references: references || {},
      description,
      notes,
      bankDetails,
      dueDate,
      createdBy: req.user.id
    });

    await transaction.save();

    // Update account balance
    await updateAccountBalance(party, amount, currency || 'INR', type);

    res.status(201).json({
      message: 'Payment transaction created successfully',
      transaction
    });
  } catch (error) {
    console.error('Create transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/payments/transactions/:id
// @desc    Update payment transaction
// @access  Private
router.put('/transactions/:id', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const transaction = await PaymentTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Store old values for balance adjustment
    const oldAmount = transaction.amount;
    const oldCurrency = transaction.currency;
    const oldType = transaction.type;

    // Update transaction
    Object.assign(transaction, updates);
    transaction.updatedBy = req.user.id;
    await transaction.save();

    // Adjust account balance if amount, currency, or type changed
    if (oldAmount !== transaction.amount || oldCurrency !== transaction.currency || oldType !== transaction.type) {
      // Reverse old transaction effect
      await reverseAccountBalance(transaction.party, oldAmount, oldCurrency, oldType);
      // Apply new transaction effect
      await updateAccountBalance(transaction.party, transaction.amount, transaction.currency, transaction.type);
    }

    res.json({
      message: 'Transaction updated successfully',
      transaction
    });
  } catch (error) {
    console.error('Update transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/payments/transactions/:id
// @desc    Delete payment transaction
// @access  Private (Admin only)
router.delete('/transactions/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const transaction = await PaymentTransaction.findById(id);
    if (!transaction) {
      return res.status(404).json({ message: 'Transaction not found' });
    }

    // Reverse balance effect
    await reverseAccountBalance(transaction.party, transaction.amount, transaction.currency, transaction.type);

    await PaymentTransaction.findByIdAndDelete(id);

    res.json({ message: 'Transaction deleted successfully' });
  } catch (error) {
    console.error('Delete transaction error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/balances
// @desc    Get account balances for all parties
// @access  Private
router.get('/balances', auth, async (req, res) => {
  try {
    const { partyType, search } = req.query;

    const filter = {};
    if (partyType) filter['party.type'] = partyType;
    if (search) {
      filter['party.name'] = { $regex: search, $options: 'i' };
    }

    const balances = await AccountBalance.find(filter).sort({ 'party.name': 1 });

    res.json({ balances });
  } catch (error) {
    console.error('Get balances error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/balances
// @desc    Create or update account balance
// @access  Private
router.post('/balances', auth, async (req, res) => {
  try {
    const { party, initialBalance, currency = 'INR', creditLimit, paymentTerms } = req.body;

    if (!party || !party.id || !party.name || !party.type) {
      return res.status(400).json({ message: 'Invalid party information' });
    }

    let balance = await AccountBalance.findOne({ 'party.id': party.id });

    if (balance) {
      // Update existing balance
      balance.party = party;
      if (creditLimit) balance.creditLimit = creditLimit;
      if (paymentTerms) balance.paymentTerms = paymentTerms;
    } else {
      // Create new balance
      balance = new AccountBalance({
        party,
        creditLimit: creditLimit || { INR: 0, USD: 0 },
        paymentTerms: paymentTerms || 'NET_30'
      });

      // Set initial balance if provided
      if (initialBalance) {
        balance.balances[currency].balance = initialBalance;
        if (initialBalance > 0) {
          balance.balances[currency].credit = initialBalance;
        } else {
          balance.balances[currency].debit = Math.abs(initialBalance);
        }
      }
    }

    await balance.save();

    res.json({
      message: balance.isNew ? 'Account balance created successfully' : 'Account balance updated successfully',
      balance
    });
  } catch (error) {
    console.error('Create/Update balance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/invoices
// @desc    Get all invoices with filtering
// @access  Private
router.get('/invoices', auth, async (req, res) => {
  try {
    const { 
      page = 1, 
      limit = 20, 
      status, 
      partyType,
      partyId,
      overdue,
      startDate,
      endDate 
    } = req.query;

    const filter = {};
    if (status) filter.status = status;
    if (partyType) filter['party.type'] = partyType;
    if (partyId) filter['party.id'] = partyId;
    
    if (startDate || endDate) {
      filter.invoiceDate = {};
      if (startDate) filter.invoiceDate.$gte = new Date(startDate);
      if (endDate) filter.invoiceDate.$lte = new Date(endDate);
    }

    if (overdue === 'true') {
      filter.dueDate = { $lt: new Date() };
      filter.status = { $ne: 'PAID' };
    }

    const invoices = await Invoice.find(filter)
      .populate('createdBy', 'name email')
      .populate('paymentTransactions')
      .sort({ invoiceDate: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await Invoice.countDocuments(filter);

    res.json({
      invoices,
      totalPages: Math.ceil(total / limit),
      currentPage: page,
      total
    });
  } catch (error) {
    console.error('Get invoices error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/payments/invoices
// @desc    Create new invoice
// @access  Private
router.post('/invoices', auth, async (req, res) => {
  try {
    const {
      party,
      items,
      amounts,
      currency,
      dueDate,
      notes
    } = req.body;

    if (!party || !items || !amounts || !dueDate) {
      return res.status(400).json({ 
        message: 'Missing required fields: party, items, amounts, dueDate' 
      });
    }

    const invoice = new Invoice({
      party,
      items,
      amounts,
      currency: currency || 'INR',
      dueDate,
      notes,
      createdBy: req.user.id
    });

    await invoice.save();

    res.status(201).json({
      message: 'Invoice created successfully',
      invoice
    });
  } catch (error) {
    console.error('Create invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/payments/invoices/:id/pay
// @desc    Mark invoice as paid
// @access  Private
router.put('/invoices/:id/pay', auth, async (req, res) => {
  try {
    const { id } = req.params;
    const { amount, paymentMethod, bankDetails, notes } = req.body;

    const invoice = await Invoice.findById(id);
    if (!invoice) {
      return res.status(404).json({ message: 'Invoice not found' });
    }

    // Create payment transaction
    const transaction = new PaymentTransaction({
      type: 'PAYMENT_RECEIVED',
      paymentMethod,
      amount,
      currency: invoice.currency,
      party: invoice.party,
      references: { invoiceId: invoice._id },
      description: `Payment for invoice ${invoice.invoiceNumber}`,
      notes,
      bankDetails,
      status: 'COMPLETED',
      createdBy: req.user.id
    });

    await transaction.save();

    // Update invoice
    invoice.paidAmount = (invoice.paidAmount || 0) + amount;
    invoice.paidDate = new Date();
    invoice.paymentTransactions.push(transaction._id);
    
    if (invoice.paidAmount >= invoice.amounts.totalAmount) {
      invoice.status = 'PAID';
    }

    await invoice.save();

    // Update account balance
    await updateAccountBalance(invoice.party, amount, invoice.currency, 'PAYMENT_RECEIVED');

    res.json({
      message: 'Invoice payment recorded successfully',
      invoice,
      transaction
    });
  } catch (error) {
    console.error('Pay invoice error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/payments/summary
// @desc    Get payment summary statistics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    const dateFilter = {
      paymentDate: {
        $gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      }
    };

    // Get transaction summaries
    const totalReceived = await PaymentTransaction.aggregate([
      { $match: { ...dateFilter, type: 'PAYMENT_RECEIVED', status: 'COMPLETED' } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } }
    ]);

    const totalPaid = await PaymentTransaction.aggregate([
      { $match: { ...dateFilter, type: 'PAYMENT_MADE', status: 'COMPLETED' } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } }
    ]);

    // Get pending transactions
    const pendingReceivables = await PaymentTransaction.aggregate([
      { $match: { type: 'PAYMENT_RECEIVED', status: 'PENDING' } },
      { $group: { _id: '$currency', total: { $sum: '$amount' } } }
    ]);

    // Get overdue invoices
    const overdueInvoices = await Invoice.aggregate([
      { $match: { dueDate: { $lt: new Date() }, status: { $ne: 'PAID' } } },
      { $group: { _id: '$currency', total: { $sum: '$amounts.totalAmount' }, count: { $sum: 1 } } }
    ]);

    // Get account balances summary
    const accountSummary = await AccountBalance.aggregate([
      {
        $group: {
          _id: '$party.type',
          totalINR: { $sum: '$balances.INR.balance' },
          totalUSD: { $sum: '$balances.USD.balance' },
          count: { $sum: 1 }
        }
      }
    ]);

    res.json({
      summary: {
        totalReceived: formatCurrencyTotals(totalReceived),
        totalPaid: formatCurrencyTotals(totalPaid),
        pendingReceivables: formatCurrencyTotals(pendingReceivables),
        overdueInvoices: formatCurrencyTotals(overdueInvoices),
        accountSummary
      }
    });
  } catch (error) {
    console.error('Get payment summary error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// Helper function to update account balance
async function updateAccountBalance(party, amount, currency, transactionType) {
  try {
    let balance = await AccountBalance.findOne({ 'party.id': party.id });
    
    if (!balance) {
      balance = new AccountBalance({ party });
    }

    // Determine if this increases or decreases the balance
    let balanceChange = 0;
    if (['PAYMENT_RECEIVED', 'INVOICE_GENERATED'].includes(transactionType)) {
      balanceChange = amount; // They owe us money
    } else if (['PAYMENT_MADE', 'REFUND'].includes(transactionType)) {
      balanceChange = -amount; // We owe them money or paid them
    }

    balance.balances[currency].balance += balanceChange;
    
    if (balanceChange > 0) {
      balance.balances[currency].credit += amount;
    } else {
      balance.balances[currency].debit += Math.abs(balanceChange);
    }

    balance.lastTransactionDate = new Date();
    await balance.save();
  } catch (error) {
    console.error('Update account balance error:', error);
  }
}

// Helper function to reverse account balance
async function reverseAccountBalance(party, amount, currency, transactionType) {
  try {
    const balance = await AccountBalance.findOne({ 'party.id': party.id });
    if (!balance) return;

    let balanceChange = 0;
    if (['PAYMENT_RECEIVED', 'INVOICE_GENERATED'].includes(transactionType)) {
      balanceChange = -amount;
    } else if (['PAYMENT_MADE', 'REFUND'].includes(transactionType)) {
      balanceChange = amount;
    }

    balance.balances[currency].balance += balanceChange;
    
    if (balanceChange < 0) {
      balance.balances[currency].credit = Math.max(0, balance.balances[currency].credit - amount);
    } else {
      balance.balances[currency].debit = Math.max(0, balance.balances[currency].debit - Math.abs(balanceChange));
    }

    await balance.save();
  } catch (error) {
    console.error('Reverse account balance error:', error);
  }
}

// Helper function to format currency totals
function formatCurrencyTotals(data) {
  const result = { INR: 0, USD: 0 };
  data.forEach(item => {
    if (item._id && result.hasOwnProperty(item._id)) {
      result[item._id] = item.total || 0;
    }
  });
  return result;
}

module.exports = router;