const mongoose = require('mongoose');

const chargeSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  type: {
    type: String,
    enum: ['fixed', 'percentage', 'weight_based', 'cbm_based'],
    required: true
  },
  value: {
    type: Number,
    required: true,
    min: [0, 'Charge value cannot be negative']
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    required: true
  },
  description: String
});

const milestoneSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true
  },
  status: {
    type: String,
    enum: ['pending', 'in_progress', 'completed', 'delayed'],
    default: 'pending'
  },
  expectedDate: Date,
  actualDate: Date,
  notes: String
}, {
  timestamps: true
});

const containerSchema = new mongoose.Schema({
  realContainerId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  clientFacingId: {
    type: String,
    unique: true,
    sparse: true
  },
  billNo: {
    type: String,
    trim: true
  },
  sealNo: {
    type: String,
    trim: true
  },
  type: {
    type: String,
    enum: ['20ft', '40ft', '40ft_hc', '45ft'],
    required: true
  },
  maxWeight: {
    type: Number,
    required: true
  },
  maxCbm: {
    type: Number,
    required: true
  },
  currentWeight: {
    type: Number,
    default: 0
  },
  currentCbm: {
    type: Number,
    default: 0
  },
  status: {
    type: String,
    enum: ['planning', 'loading', 'sealed', 'shipped', 'in_transit', 'arrived', 'cleared', 'delivered'],
    default: 'planning'
  },
  charges: [chargeSchema],
  milestones: [milestoneSchema],
  orders: [{
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    clientId: {
      type: String,
      required: true
    },
    cbmShare: {
      type: Number,
      required: true,
      min: [0, 'CBM share cannot be negative']
    },
    weightShare: {
      type: Number,
      required: true,
      min: [0, 'Weight share cannot be negative']
    },
    allocatedCharges: [chargeSchema]
  }],
  // Financial calculations
  totalRevenue: {
    type: Number,
    default: 0
  },
  totalCosts: {
    type: Number,
    default: 0
  },
  grossProfit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  // Tracking information
  location: {
    current: String,
    coordinates: {
      latitude: Number,
      longitude: Number
    },
    lastUpdated: Date
  },
  estimatedArrival: Date,
  actualArrival: Date,
  // Metadata
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

// Indexes
containerSchema.index({ realContainerId: 1 });
containerSchema.index({ clientFacingId: 1 });
containerSchema.index({ status: 1 });
containerSchema.index({ 'orders.clientId': 1 });

// Pre-save middleware to generate client-facing ID
containerSchema.pre('save', function(next) {
  if (!this.clientFacingId) {
    this.clientFacingId = `SHIP-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
  next();
});

// Method to calculate financial metrics
containerSchema.methods.calculateFinancials = function() {
  // Calculate total revenue from carrying charges
  this.totalRevenue = this.orders.reduce((sum, order) => {
    return sum + (order.allocatedCharges?.reduce((chargeSum, charge) => {
      return chargeSum + (charge.currency === 'USD' ? charge.value * 83 : charge.value); // Convert USD to INR
    }, 0) || 0);
  }, 0);

  // Calculate total costs
  this.totalCosts = this.charges.reduce((sum, charge) => {
    const valueINR = charge.currency === 'USD' ? charge.value * 83 : charge.value;
    return sum + valueINR;
  }, 0);

  // Calculate profit metrics
  this.grossProfit = this.totalRevenue - this.totalCosts;
  this.profitMargin = this.totalRevenue > 0 ? (this.grossProfit / this.totalRevenue) * 100 : 0;
};

// Method to allocate charges to clients
containerSchema.methods.allocateCharges = function() {
  const totalCbm = this.orders.reduce((sum, order) => sum + order.cbmShare, 0);
  
  this.orders.forEach(order => {
    const allocationRatio = totalCbm > 0 ? order.cbmShare / totalCbm : 0;
    order.allocatedCharges = this.charges.map(charge => ({
      name: charge.name,
      type: charge.type,
      value: charge.value * allocationRatio,
      currency: charge.currency,
      description: charge.description
    }));
  });
};

// Static method to get container capacity info
containerSchema.statics.getCapacityInfo = function(type) {
  const capacities = {
    '20ft': { maxWeight: 28000, maxCbm: 33 },
    '40ft': { maxWeight: 30000, maxCbm: 67 },
    '40ft_hc': { maxWeight: 30000, maxCbm: 76 },
    '45ft': { maxWeight: 30000, maxCbm: 86 }
  };
  return capacities[type] || capacities['40ft'];
};

module.exports = mongoose.model('Container', containerSchema);
