const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema({
  itemCode: {
    type: String,
    required: true,
    trim: true
  },
  description: {
    type: String,
    required: true,
    trim: true
  },
  image: {
    url: String,
    publicId: String
  },
  quantity: {
    type: Number,
    required: true,
    min: [1, 'Quantity must be at least 1']
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
  unitWeight: {
    type: Number,
    required: true,
    min: [0, 'Weight cannot be negative']
  },
  unitCbm: {
    type: Number,
    required: true,
    min: [0, 'CBM cannot be negative']
  },
  cartons: {
    type: Number,
    required: true,
    min: [1, 'Cartons must be at least 1']
  },
  supplier: {
    name: String,
    contact: String,
    email: String
  },
  paymentType: {
    type: String,
    enum: ['CLIENT_DIRECT', 'THROUGH_ME'],
    required: true
  },
  carryingCharge: {
    basis: {
      type: String,
      enum: ['carton', 'cbm', 'weight'],
      required: true
    },
    rate: {
      type: Number,
      required: true,
      min: [0, 'Rate cannot be negative']
    },
    amount: {
      type: Number,
      required: true
    }
  },
  status: {
    type: String,
    enum: ['pending', 'confirmed', 'in_production', 'ready', 'shipped', 'delivered'],
    default: 'pending'
  }
});

const orderSchema = new mongoose.Schema({
  orderNumber: {
    type: String,
    unique: true,
    required: true
  },
  clientId: {
    type: String,
    required: true,
    index: true
  },
  clientName: {
    type: String,
    required: true
  },
  items: [orderItemSchema],
  totalAmount: {
    type: Number,
    required: true,
    min: [0, 'Total amount cannot be negative']
  },
  totalCarryingCharges: {
    type: Number,
    required: true,
    default: 0
  },
  totalWeight: {
    type: Number,
    required: true,
    default: 0
  },
  totalCbm: {
    type: Number,
    required: true,
    default: 0
  },
  totalCartons: {
    type: Number,
    required: true,
    default: 0
  },
  status: {
    type: String,
    enum: ['draft', 'submitted', 'confirmed', 'in_progress', 'completed', 'cancelled'],
    default: 'draft'
  },
  priority: {
    type: String,
    enum: ['low', 'medium', 'high', 'urgent'],
    default: 'medium'
  },
  deadline: {
    type: Date
  },
  notes: {
    type: String,
    maxlength: [1000, 'Notes cannot exceed 1000 characters']
  },
  // Loop-back related fields
  isLoopBack: {
    type: Boolean,
    default: false
  },
  parentOrderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order'
  },
  loopBackReason: {
    type: String,
    enum: ['DAMAGE', 'SHORTAGE', 'QUALITY_ISSUE', 'PARTIAL_ALLOCATION']
  },
  // Container assignment
  containerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Container'
  },
  // Financial tracking
  exchangeRate: {
    type: Number,
    default: 1
  },
  currency: {
    type: String,
    default: 'INR'
  },
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

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ clientId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deadline: 1 });

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    this.totalAmount = this.items.reduce((sum, item) => sum + item.totalPrice, 0);
    this.totalCarryingCharges = this.items.reduce((sum, item) => sum + item.carryingCharge.amount, 0);
    this.totalWeight = this.items.reduce((sum, item) => sum + (item.unitWeight * item.quantity), 0);
    this.totalCbm = this.items.reduce((sum, item) => sum + (item.unitCbm * item.quantity), 0);
    this.totalCartons = this.items.reduce((sum, item) => sum + item.cartons, 0);
  }
  next();
});

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function() {
  const count = await this.countDocuments();
  return `ORD-${(count + 1).toString().padStart(6, '0')}`;
};

module.exports = mongoose.model('Order', orderSchema);
