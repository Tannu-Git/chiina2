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
    required: false,
    default: 0
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
      required: false,
      default: 0
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
  timestamps: true,
  optimisticConcurrency: true // Enable optimistic locking
});

// Add version field for optimistic locking
orderSchema.add({
  __v: { type: Number, default: 0 }
});

// Indexes for better query performance
orderSchema.index({ orderNumber: 1 });
orderSchema.index({ clientId: 1 });
orderSchema.index({ status: 1 });
orderSchema.index({ createdAt: -1 });
orderSchema.index({ deadline: 1 });

// Helper function to calculate carrying charge
function calculateItemCarryingCharge(basis, rate, item) {
  if (!rate || rate <= 0) return 0;
  
  switch (basis) {
    case 'carton':
      return (item.cartons || 0) * rate;
    case 'weight':
      return (item.unitWeight || 0) * (item.cartons || 0) * rate;
    case 'cbm':
      return (item.unitCbm || 0) * (item.cartons || 0) * rate;
    default:
      return 0;
  }
}

// Pre-save middleware to calculate totals
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // Calculate missing item-level fields first
    this.items.forEach(item => {
      // Calculate totalPrice if not provided
      if (!item.totalPrice || item.totalPrice === 0) {
        item.totalPrice = (item.quantity || 0) * (item.unitPrice || 0);
      }
      
      // Calculate carrying charge amount if not provided
      if (!item.carryingCharge.amount || item.carryingCharge.amount === 0) {
        item.carryingCharge.amount = calculateItemCarryingCharge(
          item.carryingCharge.basis,
          item.carryingCharge.rate || 0,
          item
        );
      }
    });
    
    // Now calculate order totals
    this.totalAmount = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.totalCarryingCharges = this.items.reduce((sum, item) => sum + (item.carryingCharge.amount || 0), 0);
    this.totalWeight = this.items.reduce((sum, item) => sum + ((item.unitWeight || 0) * (item.cartons || 0)), 0);
    this.totalCbm = this.items.reduce((sum, item) => sum + ((item.unitCbm || 0) * (item.cartons || 0)), 0);
    this.totalCartons = this.items.reduce((sum, item) => sum + (item.cartons || 0), 0);
    
    console.log('Order pre-save calculated totals:', {
      totalAmount: this.totalAmount,
      totalCarryingCharges: this.totalCarryingCharges,
      totalWeight: this.totalWeight,
      totalCbm: this.totalCbm,
      totalCartons: this.totalCartons
    });
  } else {
    // Set defaults if no items
    this.totalAmount = 0;
    this.totalCarryingCharges = 0;
    this.totalWeight = 0;
    this.totalCbm = 0;
    this.totalCartons = 0;
  }
  next();
});

// Static method to generate order number
orderSchema.statics.generateOrderNumber = async function() {
  const count = await this.countDocuments();
  return `ORD-${(count + 1).toString().padStart(6, '0')}`;
};

// Optimistic locking methods
orderSchema.methods.updateWithLock = async function(updateData, expectedVersion) {
  if (expectedVersion !== undefined && this.__v !== expectedVersion) {
    const error = new Error('Document has been modified by another user. Please refresh and try again.');
    error.name = 'VersionError';
    error.code = 'OPTIMISTIC_LOCK_ERROR';
    throw error;
  }

  // Increment version
  updateData.__v = this.__v + 1;

  const result = await this.constructor.findOneAndUpdate(
    { _id: this._id, __v: this.__v },
    updateData,
    { new: true, runValidators: true }
  );

  if (!result) {
    const error = new Error('Document has been modified by another user. Please refresh and try again.');
    error.name = 'VersionError';
    error.code = 'OPTIMISTIC_LOCK_ERROR';
    throw error;
  }

  return result;
};

orderSchema.statics.findByIdWithLock = function(id) {
  return this.findById(id).select('+__v');
};

module.exports = mongoose.model('Order', orderSchema);
