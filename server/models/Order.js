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
    required: false,
    default: 0,
    min: [0, 'Unit price cannot be negative']
  },
  totalPrice: {
    type: Number,
    required: false,
    default: 0
  },
  unitWeight: {
    type: Number,
    required: false,
    default: 0,
    min: [0, 'Weight cannot be negative']
  },
  unitCbm: {
    type: Number,
    required: false,
    default: 0,
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
  },
  // QC Inspection fields for individual items
  receivedQuantity: {
    type: Number,
    min: [0, 'Received quantity cannot be negative'],
    default: 0
  },
  // NEW: Loop-back quantity tracking within the same order
  qcPassedQuantity: {
    type: Number,
    min: [0, 'QC passed quantity cannot be negative'],
    default: 0
  },
  loopBackQuantity: {
    type: Number,
    min: [0, 'Loop-back quantity cannot be negative'],
    default: 0
  },
  // CARTON-BASED TRACKING: Primary tracking for logistics operations
  qcPassedCartons: {
    type: Number,
    min: [0, 'QC passed cartons cannot be negative'],
    default: 0
  },
  loopBackCartons: {
    type: Number,
    min: [0, 'Loop-back cartons cannot be negative'],
    default: 0
  },
  // CONTAINER ALLOCATION TRACKING
  allocatedQuantity: {
    type: Number,
    min: [0, 'Allocated quantity cannot be negative'],
    default: 0
  },
  allocatedCartons: {
    type: Number,
    min: [0, 'Allocated cartons cannot be negative'],
    default: 0
  },
  containerId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Container'
  },
  // Calculated field: pendingCartons = cartons - (qcPassedCartons + loopBackCartons)
  pendingCartons: {
    type: Number,
    min: [0, 'Pending cartons cannot be negative'],
    default: function() { 
      const qcPassed = this.qcPassedCartons || 0;
      const loopBack = this.loopBackCartons || 0;
      return Math.max(0, this.cartons - qcPassed - loopBack);
    }
  },
  // Calculated field: pendingQuantity = quantity - (qcPassedQuantity + loopBackQuantity)
  pendingQuantity: {
    type: Number,
    min: [0, 'Pending quantity cannot be negative'],
    default: function() { 
      const qcPassed = this.qcPassedQuantity || 0;
      const loopBack = this.loopBackQuantity || 0;
      return Math.max(0, this.quantity - qcPassed - loopBack);
    }
  },
  qcStatus: {
    type: String,
    enum: ['pending', 'partial', 'completed', 'shortage', 'damaged'],
    default: 'pending'
  },
  qcNotes: {
    type: String,
    maxlength: [1000, 'QC notes cannot exceed 1000 characters']
  },
  qcDefects: [{
    type: String,
    maxlength: [500, 'Defect description cannot exceed 500 characters']
  }],
  // Loop-back metadata within the same order
  loopBackReason: {
    type: String,
    enum: ['SHORTAGE', 'DAMAGE', 'QUALITY_ISSUE', 'PARTIAL_ALLOCATION']
  },
  loopBackStatus: {
    type: String,
    enum: ['none', 'pending', 'in_progress', 'resolved', 'cancelled'],
    default: 'none'
  },
  loopBackNotes: {
    type: String,
    maxlength: [1000, 'Loop-back notes cannot exceed 1000 characters']
  },
  loopBackCreatedAt: {
    type: Date
  },
  loopBackUpdatedAt: {
    type: Date
  },
  // Track QC history for this item
  qcHistory: [{
    date: { type: Date, default: Date.now },
    receivedQuantity: Number,
    status: String,
    notes: String,
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    }
  }]
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
    enum: ['draft', 'submitted', 'confirmed', 'in_progress', 'completed', 'cancelled', 'pending', 'ready', 'qc_failed', 'partial_ready', 'qc_partial', 'qc_completed'],
    default: 'draft'
  },
  // QC completion tracking
  qcStatus: {
    type: String,
    enum: ['pending', 'in_progress', 'partial', 'completed', 'failed'],
    default: 'pending'
  },
  // Overall quantity tracking
  totalReceivedQuantity: {
    type: Number,
    default: 0,
    min: [0, 'Total received quantity cannot be negative']
  },
  totalPendingQuantity: {
    type: Number,
    default: function() { 
      return this.items ? this.items.reduce((sum, item) => sum + (item.quantity || 0), 0) : 0;
    },
    min: [0, 'Total pending quantity cannot be negative']
  },
  // CARTON-BASED ORDER TOTALS: Primary tracking for logistics operations
  totalQcPassedCartons: {
    type: Number,
    default: 0,
    min: [0, 'Total QC passed cartons cannot be negative']
  },
  totalLoopBackCartons: {
    type: Number,
    default: 0,
    min: [0, 'Total loop-back cartons cannot be negative']
  },
  totalPendingCartons: {
    type: Number,
    default: 0,
    min: [0, 'Total pending cartons cannot be negative']
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
  // QC Inspection fields
  qcCompletedAt: {
    type: Date
  },
  qcInspector: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  },
  qcNotes: {
    type: String,
    maxlength: [2000, 'QC notes cannot exceed 2000 characters']
  },
  // QC completion percentage
  qcCompletionPercentage: {
    type: Number,
    default: 0,
    min: [0, 'QC completion percentage cannot be negative'],
    max: [100, 'QC completion percentage cannot exceed 100']
  },
  // Re-inspection tracking
  qcReInspectionCount: {
    type: Number,
    default: 0
  },
  qcReInspectionHistory: [{
    date: Date,
    inspector: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User'
    },
    reason: String,
    previousStatus: String
  }],
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

// Pre-save middleware to calculate totals with carton-based tracking as primary
orderSchema.pre('save', function(next) {
  if (this.items && this.items.length > 0) {
    // CARTON-BASED TRACKING: Primary system for logistics operations
    this.items.forEach((item, index) => {
      const expectedCtn = item.cartons || 0;
      const expectedQty = item.quantity || 0;
      
      // Normalize carton-based tracking (PRIMARY)
      const qcPassedCtn = Math.max(0, Math.min(expectedCtn, item.qcPassedCartons || 0));
      const loopBackCtn = Math.max(0, Math.min(expectedCtn - qcPassedCtn, item.loopBackCartons || 0));
      const allocatedCtn = Math.max(0, Math.min(qcPassedCtn, item.allocatedCartons || 0));
      
      // Update normalized values
      item.qcPassedCartons = qcPassedCtn;
      item.loopBackCartons = loopBackCtn;
      item.allocatedCartons = allocatedCtn;
      
      // Calculate derived quantity values for compatibility (SECONDARY)
      if (expectedCtn > 0 && expectedQty > 0) {
        const piecesPerCarton = expectedQty / expectedCtn;
        item.qcPassedQuantity = Math.round(qcPassedCtn * piecesPerCarton);
        item.loopBackQuantity = Math.round(loopBackCtn * piecesPerCarton);
        item.allocatedQuantity = Math.round(allocatedCtn * piecesPerCarton);
      } else {
        // Fallback to direct quantity tracking if no carton data
        item.qcPassedQuantity = Math.max(0, Math.min(expectedQty, item.qcPassedQuantity || 0));
        item.loopBackQuantity = Math.max(0, Math.min(expectedQty - item.qcPassedQuantity, item.loopBackQuantity || 0));
        item.allocatedQuantity = Math.max(0, Math.min(item.qcPassedQuantity, item.allocatedQuantity || 0));
      }
      
      // Calculate pending amounts (carton-based as primary)
      item.pendingCartons = Math.max(0, expectedCtn - qcPassedCtn - loopBackCtn);
      item.pendingQuantity = Math.max(0, expectedQty - (item.qcPassedQuantity || 0) - (item.loopBackQuantity || 0));
      
      // Update receivedQuantity for backward compatibility
      item.receivedQuantity = item.qcPassedQuantity || 0;
      
      // Calculate item financials
      if (!item.totalPrice || item.totalPrice === 0) {
        item.totalPrice = expectedQty * (item.unitPrice || 0);
      }
      
      if (!item.carryingCharge.amount || item.carryingCharge.amount === 0) {
        item.carryingCharge.amount = calculateItemCarryingCharge(
          item.carryingCharge.basis,
          item.carryingCharge.rate || 0,
          item
        );
      }
      
      // Update QC status based on CARTON completion (primary)
      const cartonCompletionRate = expectedCtn > 0 ? (qcPassedCtn / expectedCtn) : 0;
      
      if (cartonCompletionRate === 0 && loopBackCtn === 0) {
        item.qcStatus = 'pending';
      } else if (cartonCompletionRate >= 1.0) {
        item.qcStatus = 'completed';
      } else if (cartonCompletionRate > 0 || loopBackCtn > 0) {
        item.qcStatus = 'partial';
      }
      
      // Update loop-back status
      if (loopBackCtn > 0) {
        if (!item.loopBackStatus || item.loopBackStatus === 'none') {
          item.loopBackStatus = 'pending';
          item.loopBackReason = 'SHORTAGE';
          item.loopBackCreatedAt = new Date();
        }
        item.loopBackUpdatedAt = new Date();
      } else {
        item.loopBackStatus = 'none';
        item.loopBackReason = undefined;
      }
    });
    
    // Calculate order-level totals
    this.totalAmount = this.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
    this.totalCarryingCharges = this.items.reduce((sum, item) => sum + (item.carryingCharge.amount || 0), 0);
    this.totalWeight = this.items.reduce((sum, item) => sum + ((item.unitWeight || 0) * (item.cartons || 0)), 0);
    this.totalCbm = this.items.reduce((sum, item) => sum + ((item.unitCbm || 0) * (item.cartons || 0)), 0);
    this.totalCartons = this.items.reduce((sum, item) => sum + (item.cartons || 0), 0);
    
    // CARTON-BASED ORDER TOTALS (Primary tracking)
    const totalQcPassedCartons = this.items.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0);
    const totalLoopBackCartons = this.items.reduce((sum, item) => sum + (item.loopBackCartons || 0), 0);
    const totalPendingCartons = this.items.reduce((sum, item) => sum + (item.pendingCartons || 0), 0);
    
    this.totalQcPassedCartons = totalQcPassedCartons;
    this.totalLoopBackCartons = totalLoopBackCartons;
    this.totalPendingCartons = totalPendingCartons;
    
    // QUANTITY-BASED ORDER TOTALS (Derived from cartons for compatibility)
    const totalQcPassedQuantity = this.items.reduce((sum, item) => sum + (item.qcPassedQuantity || 0), 0);
    const totalLoopBackQuantity = this.items.reduce((sum, item) => sum + (item.loopBackQuantity || 0), 0);
    
    this.totalReceivedQuantity = totalQcPassedQuantity;
    this.totalPendingQuantity = this.items.reduce((sum, item) => sum + (item.pendingQuantity || 0), 0);
    
    // Calculate QC completion percentage based on CARTON tracking (primary)
    const totalOrderCartons = this.totalCartons;
    const primaryCompletionPercentage = totalOrderCartons > 0 ? 
      Math.round((totalQcPassedCartons / totalOrderCartons) * 100) : 0;
    this.qcCompletionPercentage = primaryCompletionPercentage;
    
    // Update order QC status based on carton-based completion
    const hasAnyLoopBack = totalLoopBackCartons > 0;
    const hasAnyQcPassed = totalQcPassedCartons > 0;
    
    if (!hasAnyQcPassed && !hasAnyLoopBack) {
      this.qcStatus = 'pending';
    } else if (primaryCompletionPercentage >= 100) {
      this.qcStatus = 'completed';
      if (this.status === 'qc_partial') {
        this.status = 'ready';
      }
    } else {
      this.qcStatus = 'partial';
      if (['draft', 'submitted', 'in_progress'].includes(this.status)) {
        this.status = 'partial_ready';
      }
    }
    
    console.log('Order carton-based tracking calculated:', {
      orderNumber: this.orderNumber,
      totalOrderCartons,
      totalQcPassedCartons,
      totalLoopBackCartons,
      totalPendingCartons,
      qcCompletionPercentage: this.qcCompletionPercentage,
      qcStatus: this.qcStatus,
      status: this.status
    });
  } else {
    // Set defaults if no items
    this.totalAmount = 0;
    this.totalCarryingCharges = 0;
    this.totalWeight = 0;
    this.totalCbm = 0;
    this.totalCartons = 0;
    this.totalReceivedQuantity = 0;
    this.totalPendingQuantity = 0;
    this.qcCompletionPercentage = 0;
    this.qcStatus = 'pending';
  }
  next();
});

// Static method to generate order number with collision prevention
orderSchema.statics.generateOrderNumber = async function() {
  const maxRetries = 5;
  let attempt = 0;
  
  while (attempt < maxRetries) {
    try {
      // Find the highest order number by sorting in descending order
      const lastOrder = await this.findOne(
        { orderNumber: { $regex: /^ORD-\d{6}$/ } },
        { orderNumber: 1 }
      ).sort({ orderNumber: -1 }).limit(1);
      
      let nextNumber = 1;
      if (lastOrder && lastOrder.orderNumber) {
        // Extract number from ORD-XXXXXX format
        const lastNumber = parseInt(lastOrder.orderNumber.substring(4));
        nextNumber = lastNumber + 1;
      }
      
      const orderNumber = `ORD-${nextNumber.toString().padStart(6, '0')}`;
      
      // Verify this order number doesn't exist (double-check for race conditions)
      const existingOrder = await this.findOne({ orderNumber });
      if (existingOrder) {
        console.log(`Order number ${orderNumber} already exists, retrying...`);
        attempt++;
        continue;
      }
      
      console.log(`Generated order number: ${orderNumber} (attempt ${attempt + 1})`);
      return orderNumber;
      
    } catch (error) {
      console.error(`Error generating order number (attempt ${attempt + 1}):`, error.message);
      attempt++;
      
      if (attempt >= maxRetries) {
        // Fallback: use timestamp-based generation
        const timestamp = Date.now();
        const fallbackNumber = `ORD-${timestamp.toString().slice(-6)}`;
        console.log(`Using fallback order number: ${fallbackNumber}`);
        return fallbackNumber;
      }
      
      // Wait briefly before retry to reduce collision chance
      await new Promise(resolve => setTimeout(resolve, 100 * attempt));
    }
  }
  
  throw new Error('Failed to generate unique order number after maximum retries');
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
