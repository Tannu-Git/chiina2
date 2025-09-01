const mongoose = require('mongoose');

// Payment Transaction Schema for comprehensive financial tracking
const paymentTransactionSchema = new mongoose.Schema({
  transactionId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  type: {
    type: String,
    enum: ['PAYMENT_RECEIVED', 'PAYMENT_MADE', 'INVOICE_GENERATED', 'REFUND', 'ADJUSTMENT'],
    required: true
  },
  paymentMethod: {
    type: String,
    enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CREDIT_CARD', 'RTGS', 'NEFT'],
    required: true
  },
  amount: {
    type: Number,
    required: true,
    min: [0, 'Amount cannot be negative']
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  // Party information (client, supplier, or company)
  party: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['CLIENT', 'SUPPLIER', 'COMPANY', 'INTERNAL'],
      required: true
    },
    contactInfo: {
      email: String,
      phone: String,
      address: String
    }
  },
  // Reference to related entities
  references: {
    containerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Container'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    },
    invoiceId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Invoice'
    }
  },
  status: {
    type: String,
    enum: ['PENDING', 'COMPLETED', 'FAILED', 'CANCELLED', 'REFUNDED'],
    default: 'PENDING'
  },
  paymentDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date
  },
  description: {
    type: String,
    required: true,
    maxlength: [500, 'Description cannot exceed 500 characters']
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Bank/Payment details
  bankDetails: {
    accountNumber: String,
    bankName: String,
    ifscCode: String,
    upiId: String,
    transactionReference: String
  },
  // Approval workflow
  approvalStatus: {
    type: String,
    enum: ['PENDING', 'APPROVED', 'REJECTED'],
    default: 'PENDING'
  },
  approvedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  approvedAt: {
    type: Date
  },
  // Created by user
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  updatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Account Balance Schema for tracking party balances
const accountBalanceSchema = new mongoose.Schema({
  party: {
    id: {
      type: String,
      required: true,
      unique: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['CLIENT', 'SUPPLIER', 'COMPANY'],
      required: true
    }
  },
  balances: {
    INR: {
      credit: { type: Number, default: 0 },  // Amount they owe us
      debit: { type: Number, default: 0 },   // Amount we owe them
      balance: { type: Number, default: 0 }  // Net balance (positive = they owe us)
    },
    USD: {
      credit: { type: Number, default: 0 },
      debit: { type: Number, default: 0 },
      balance: { type: Number, default: 0 }
    }
  },
  lastTransactionDate: {
    type: Date,
    default: Date.now
  },
  creditLimit: {
    INR: { type: Number, default: 0 },
    USD: { type: Number, default: 0 }
  },
  paymentTerms: {
    type: String,
    enum: ['IMMEDIATE', 'NET_15', 'NET_30', 'NET_45', 'NET_60', 'CUSTOM'],
    default: 'NET_30'
  },
  customTerms: {
    type: String,
    maxlength: [200, 'Custom terms cannot exceed 200 characters']
  }
}, {
  timestamps: true
});

// Invoice Schema for invoice management
const invoiceSchema = new mongoose.Schema({
  invoiceNumber: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  party: {
    id: {
      type: String,
      required: true
    },
    name: {
      type: String,
      required: true
    },
    type: {
      type: String,
      enum: ['CLIENT', 'SUPPLIER'],
      required: true
    },
    address: String,
    contactInfo: {
      email: String,
      phone: String
    }
  },
  items: [{
    description: {
      type: String,
      required: true
    },
    quantity: {
      type: Number,
      required: true,
      min: [0, 'Quantity cannot be negative']
    },
    unitPrice: {
      type: Number,
      required: true,
      min: [0, 'Unit price cannot be negative']
    },
    totalPrice: {
      type: Number,
      required: true
    },
    containerId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Container'
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order'
    }
  }],
  amounts: {
    subtotal: {
      type: Number,
      required: true,
      min: [0, 'Subtotal cannot be negative']
    },
    taxAmount: {
      type: Number,
      default: 0
    },
    discountAmount: {
      type: Number,
      default: 0
    },
    totalAmount: {
      type: Number,
      required: true
    }
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  },
  status: {
    type: String,
    enum: ['DRAFT', 'SENT', 'PAID', 'OVERDUE', 'CANCELLED'],
    default: 'DRAFT'
  },
  invoiceDate: {
    type: Date,
    default: Date.now
  },
  dueDate: {
    type: Date,
    required: true
  },
  paidAmount: {
    type: Number,
    default: 0
  },
  paidDate: {
    type: Date
  },
  paymentTransactions: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'PaymentTransaction'
  }],
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  }
}, {
  timestamps: true
});

// Indexes for better query performance
paymentTransactionSchema.index({ transactionId: 1 });
paymentTransactionSchema.index({ 'party.id': 1 });
paymentTransactionSchema.index({ 'party.type': 1 });
paymentTransactionSchema.index({ status: 1 });
paymentTransactionSchema.index({ paymentDate: -1 });
paymentTransactionSchema.index({ type: 1 });

accountBalanceSchema.index({ 'party.id': 1 });
accountBalanceSchema.index({ 'party.type': 1 });

invoiceSchema.index({ invoiceNumber: 1 });
invoiceSchema.index({ 'party.id': 1 });
invoiceSchema.index({ status: 1 });
invoiceSchema.index({ dueDate: 1 });

// Methods for account balance calculations
accountBalanceSchema.methods.updateBalance = async function(amount, currency, type) {
  if (type === 'CREDIT') {
    this.balances[currency].credit += amount;
    this.balances[currency].balance += amount;
  } else if (type === 'DEBIT') {
    this.balances[currency].debit += amount;
    this.balances[currency].balance -= amount;
  }
  this.lastTransactionDate = new Date();
  return this.save();
};

// Virtual for overdue status
invoiceSchema.virtual('isOverdue').get(function() {
  return this.status !== 'PAID' && this.dueDate < new Date();
});

// Generate unique transaction ID
paymentTransactionSchema.pre('save', function(next) {
  if (!this.transactionId) {
    const timestamp = Date.now().toString();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    this.transactionId = `TXN${timestamp.slice(-6)}${random}`;
  }
  next();
});

// Generate unique invoice number
invoiceSchema.pre('save', function(next) {
  if (!this.invoiceNumber) {
    const year = new Date().getFullYear().toString().slice(-2);
    const month = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const random = Math.random().toString(36).substring(2, 6).toUpperCase();
    this.invoiceNumber = `INV${year}${month}${random}`;
  }
  next();
});

const PaymentTransaction = mongoose.model('PaymentTransaction', paymentTransactionSchema);
const AccountBalance = mongoose.model('AccountBalance', accountBalanceSchema);
const Invoice = mongoose.model('Invoice', invoiceSchema);

module.exports = {
  PaymentTransaction,
  AccountBalance,
  Invoice
};