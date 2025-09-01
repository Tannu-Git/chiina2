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

// Base charges schema for container financial management
const baseChargesSchema = new mongoose.Schema({
  gst: {
    type: Number,
    default: 0,
    min: [0, 'GST cannot be negative']
  },
  duty: {
    type: Number,
    default: 0,
    min: [0, 'Duty cannot be negative']
  },
  misc: {
    type: Number,
    default: 0,
    min: [0, 'Misc charges cannot be negative']
  },
  extraCharge: {
    type: Number,
    default: 0,
    min: [0, 'Extra charge cannot be negative']
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'INR'
  }
});

// Shipping company schema
const shippingCompanySchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  name: {
    type: String,
    required: true
  },
  contactInfo: {
    email: String,
    phone: String,
    address: String
  },
  rates: {
    oceanFreight: Number,
    localCharges: Number,
    currency: {
      type: String,
      enum: ['INR', 'USD'],
      default: 'USD'
    }
  }
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
    clientName: {
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
    cartonShare: {
      type: Number,
      default: 0,
      min: [0, 'Carton share cannot be negative']
    },
    partialAllocation: {
      isPartial: {
        type: Boolean,
        default: false
      },
      allocatedQuantity: {
        type: Number,
        default: 0
      },
      totalQuantity: {
        type: Number,
        default: 0
      },
      allocatedCartons: {
        type: Number,
        default: 0
      },
      totalCartons: {
        type: Number,
        default: 0
      }
    },
    paymentType: {
      type: String,
      enum: ['CLIENT_DIRECT', 'THROUGH_ME'],
      required: true
    },
    carryingCharges: {
      type: Number,
      default: 0
    },
    allocatedCharges: [chargeSchema],
    allocatedAt: {
      type: Date,
      default: Date.now
    }
  }],
  // Enhanced financial tracking
  shippingCompany: shippingCompanySchema,
  baseCharges: baseChargesSchema,
  paymentDistribution: {
    throughMe: {
      amount: {
        type: Number,
        default: 0
      },
      orders: [{
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order'
        },
        amount: Number
      }]
    },
    direct: {
      amount: {
        type: Number,
        default: 0
      },
      orders: [{
        orderId: {
          type: mongoose.Schema.Types.ObjectId,
          ref: 'Order'
        },
        amount: Number
      }]
    }
  },
  // Enhanced financial calculations
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
  netProfit: {
    type: Number,
    default: 0
  },
  profitMargin: {
    type: Number,
    default: 0
  },
  baseChargesTotal: {
    type: Number,
    default: 0
  },
  operationalCostsTotal: {
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

// Enhanced indexes for financial queries
containerSchema.index({ realContainerId: 1 });
containerSchema.index({ clientFacingId: 1 });
containerSchema.index({ status: 1 });
containerSchema.index({ 'orders.clientId': 1 });
containerSchema.index({ 'orders.paymentType': 1 });
containerSchema.index({ 'shippingCompany.id': 1 });
containerSchema.index({ grossProfit: -1 }); // For profit analysis
containerSchema.index({ profitMargin: -1 }); // For margin analysis
containerSchema.index({ createdAt: -1 }); // For date-based queries

// Pre-save middleware to generate client-facing ID
containerSchema.pre('save', function(next) {
  if (!this.clientFacingId) {
    this.clientFacingId = `SHIP-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
  }
  next();
});

// Enhanced method to calculate financial metrics with new profit calculation logic
containerSchema.methods.calculateFinancials = function() {
  const USD_TO_INR_RATE = 83; // Should be configurable/dynamic
  
  // Calculate total carrying charges (revenue)
  this.totalRevenue = this.orders.reduce((sum, order) => {
    const carryingCharges = order.carryingCharges || 0;
    return sum + carryingCharges;
  }, 0);
  
  // Calculate total base charges (GST + Duty + Misc + Extra Charge)
  const baseChargesINR = this.baseCharges ? (
    (this.baseCharges.gst || 0) +
    (this.baseCharges.duty || 0) +
    (this.baseCharges.misc || 0) +
    (this.baseCharges.extraCharge || 0)
  ) * (this.baseCharges.currency === 'USD' ? USD_TO_INR_RATE : 1) : 0;
  
  // Calculate other operational costs
  const operationalCosts = this.charges.reduce((sum, charge) => {
    const valueINR = charge.currency === 'USD' ? charge.value * USD_TO_INR_RATE : charge.value;
    return sum + valueINR;
  }, 0);
  
  // Total costs = Base charges + Operational costs
  this.totalCosts = baseChargesINR + operationalCosts;
  
  // NEW PROFIT CALCULATION: Carrying Charges Total - Base Charges
  // This follows the user's requirement: "profit is carrying total - these 4 (GST, Duty, Misc, Extra)"
  this.grossProfit = this.totalRevenue - baseChargesINR;
  this.profitMargin = this.totalRevenue > 0 ? (this.grossProfit / this.totalRevenue) * 100 : 0;
  
  // Additional metrics for detailed analysis
  this.baseChargesTotal = baseChargesINR;
  this.operationalCostsTotal = operationalCosts;
  this.netProfit = this.totalRevenue - this.totalCosts; // Different from gross profit
};

// Enhanced method to allocate charges to clients with base charges distribution
containerSchema.methods.allocateCharges = function() {
  const totalCbm = this.orders.reduce((sum, order) => sum + order.cbmShare, 0);
  
  this.orders.forEach(order => {
    const allocationRatio = totalCbm > 0 ? order.cbmShare / totalCbm : 0;
    
    // Allocate operational charges
    order.allocatedCharges = this.charges.map(charge => ({
      name: charge.name,
      type: charge.type,
      value: charge.value * allocationRatio,
      currency: charge.currency,
      description: charge.description
    }));
    
    // Allocate base charges proportionally
    if (this.baseCharges) {
      const allocatedBaseCharges = {
        gst: (this.baseCharges.gst || 0) * allocationRatio,
        duty: (this.baseCharges.duty || 0) * allocationRatio,
        misc: (this.baseCharges.misc || 0) * allocationRatio,
        extraCharge: (this.baseCharges.extraCharge || 0) * allocationRatio,
        currency: this.baseCharges.currency
      };
      
      // Add base charges to allocated charges
      order.allocatedCharges.push(
        { name: 'GST', type: 'fixed', value: allocatedBaseCharges.gst, currency: allocatedBaseCharges.currency, description: 'GST charges' },
        { name: 'Duty', type: 'fixed', value: allocatedBaseCharges.duty, currency: allocatedBaseCharges.currency, description: 'Duty charges' },
        { name: 'Miscellaneous', type: 'fixed', value: allocatedBaseCharges.misc, currency: allocatedBaseCharges.currency, description: 'Miscellaneous charges' },
        { name: 'Extra Charge', type: 'fixed', value: allocatedBaseCharges.extraCharge, currency: allocatedBaseCharges.currency, description: 'Extra charges' }
      );
    }
  });
};

// Method to update payment distribution based on order payment types
containerSchema.methods.updatePaymentDistribution = function() {
  this.paymentDistribution = {
    throughMe: { amount: 0, orders: [] },
    direct: { amount: 0, orders: [] }
  };
  
  this.orders.forEach(order => {
    const orderAmount = order.carryingCharges || 0;
    
    if (order.paymentType === 'THROUGH_ME') {
      this.paymentDistribution.throughMe.amount += orderAmount;
      this.paymentDistribution.throughMe.orders.push({
        orderId: order.orderId,
        amount: orderAmount
      });
    } else if (order.paymentType === 'CLIENT_DIRECT') {
      this.paymentDistribution.direct.amount += orderAmount;
      this.paymentDistribution.direct.orders.push({
        orderId: order.orderId,
        amount: orderAmount
      });
    }
  });
};

// Method to get profit breakdown
containerSchema.methods.getProfitBreakdown = function() {
  this.calculateFinancials();
  
  return {
    revenue: {
      totalCarryingCharges: this.totalRevenue,
      throughMe: this.paymentDistribution?.throughMe?.amount || 0,
      direct: this.paymentDistribution?.direct?.amount || 0
    },
    costs: {
      baseCharges: {
        gst: this.baseCharges?.gst || 0,
        duty: this.baseCharges?.duty || 0,
        misc: this.baseCharges?.misc || 0,
        extraCharge: this.baseCharges?.extraCharge || 0,
        total: this.baseChargesTotal || 0
      },
      operationalCosts: this.operationalCostsTotal || 0,
      totalCosts: this.totalCosts
    },
    profit: {
      gross: this.grossProfit, // Carrying charges - Base charges
      net: this.netProfit, // Carrying charges - All costs
      margin: this.profitMargin
    }
  };
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
