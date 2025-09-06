const mongoose = require('mongoose');
const currencyService = require('../services/CurrencyService');

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
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    }
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

// Pre-save middleware with atomic capacity validation
containerSchema.pre('save', function(next) {
  // Skip validation for new documents without orders
  if (this.isNew && (!this.orders || this.orders.length === 0)) {
    return next();
  }
  
  // Calculate totals from orders with validation
  let calculatedCbm = 0;
  let calculatedWeight = 0;
  let calculatedCartons = 0;
  
  if (this.orders && this.orders.length > 0) {
    this.orders.forEach((order, index) => {
      const cbm = order.cbmShare || 0;
      const weight = order.weightShare || 0;
      const cartons = order.cartonShare || 0;
      
      // Validate individual order allocations
      if (cbm < 0 || weight < 0 || cartons < 0) {
        const error = new Error(`Invalid allocation for order ${order.orderId}: CBM=${cbm}, Weight=${weight}, Cartons=${cartons}`);
        error.name = 'AllocationValidationError';
        error.code = 'NEGATIVE_ALLOCATION';
        error.orderIndex = index;
        return next(error);
      }
      
      calculatedCbm += cbm;
      calculatedWeight += weight;
      calculatedCartons += cartons;
    });
  }
  
  // Validate against container capacity BEFORE saving
  if (calculatedCbm > this.maxCbm) {
    const error = new Error(`Container CBM capacity exceeded: ${calculatedCbm.toFixed(2)} > ${this.maxCbm}`);
    error.name = 'CapacityValidationError';
    error.code = 'CBM_CAPACITY_EXCEEDED';
    error.details = {
      calculated: calculatedCbm,
      maximum: this.maxCbm,
      excess: calculatedCbm - this.maxCbm,
      utilizationPercentage: (calculatedCbm / this.maxCbm * 100).toFixed(1)
    };
    return next(error);
  }
  
  if (calculatedWeight > this.maxWeight) {
    const error = new Error(`Container weight capacity exceeded: ${calculatedWeight.toFixed(0)} > ${this.maxWeight}`);
    error.name = 'CapacityValidationError';
    error.code = 'WEIGHT_CAPACITY_EXCEEDED';
    error.details = {
      calculated: calculatedWeight,
      maximum: this.maxWeight,
      excess: calculatedWeight - this.maxWeight,
      utilizationPercentage: (calculatedWeight / this.maxWeight * 100).toFixed(1)
    };
    return next(error);
  }
  
  // Validate against manual current values (if they exist and differ)
  if (this.currentCbm && Math.abs(this.currentCbm - calculatedCbm) > 0.01) {
    console.warn(`Container ${this.realContainerId}: CBM mismatch - Current: ${this.currentCbm}, Calculated: ${calculatedCbm.toFixed(2)}`);
  }
  
  if (this.currentWeight && Math.abs(this.currentWeight - calculatedWeight) > 1) {
    console.warn(`Container ${this.realContainerId}: Weight mismatch - Current: ${this.currentWeight}, Calculated: ${calculatedWeight.toFixed(0)}`);
  }
  
  // Sync current values with calculated totals (orders are authoritative)
  this.currentCbm = parseFloat(calculatedCbm.toFixed(3));
  this.currentWeight = parseFloat(calculatedWeight.toFixed(2));
  
  // Calculate utilization metrics
  const cbmUtilization = (this.currentCbm / this.maxCbm * 100).toFixed(1);
  const weightUtilization = (this.currentWeight / this.maxWeight * 100).toFixed(1);
  
  console.log(`Container ${this.realContainerId} capacity validation:`, {
    cbm: { used: this.currentCbm, max: this.maxCbm, utilization: cbmUtilization + '%' },
    weight: { used: this.currentWeight, max: this.maxWeight, utilization: weightUtilization + '%' },
    orders: this.orders.length,
    cartons: calculatedCartons
  });
  
  next();
});

// Enhanced method to validate if order can be allocated to container with detailed feedback
containerSchema.methods.canAllocateOrder = function(orderCbm, orderWeight, orderCartons, options = {}) {
  const { allowPartialFit = false, strictValidation = true } = options;
  
  const availableCbm = this.maxCbm - this.currentCbm;
  const availableWeight = this.maxWeight - this.currentWeight;
  
  const validation = {
    canAllocate: true,
    errors: [],
    warnings: [],
    capacityInfo: {
      cbm: {
        required: orderCbm,
        available: availableCbm,
        current: this.currentCbm,
        max: this.maxCbm,
        utilizationAfter: ((this.currentCbm + orderCbm) / this.maxCbm * 100).toFixed(1),
        marginAfter: this.maxCbm - (this.currentCbm + orderCbm)
      },
      weight: {
        required: orderWeight,
        available: availableWeight,
        current: this.currentWeight,
        max: this.maxWeight,
        utilizationAfter: ((this.currentWeight + orderWeight) / this.maxWeight * 100).toFixed(1),
        marginAfter: this.maxWeight - (this.currentWeight + orderWeight)
      },
      cartons: {
        adding: orderCartons
      }
    },
    recommendations: []
  };
  
  // Critical validation: Check CBM capacity
  if (orderCbm > availableCbm) {
    validation.canAllocate = false;
    validation.errors.push({
      type: 'CBM_INSUFFICIENT',
      severity: 'error',
      message: `Insufficient CBM capacity. Required: ${orderCbm.toFixed(2)}, Available: ${availableCbm.toFixed(2)}`,
      required: orderCbm,
      available: availableCbm,
      shortage: orderCbm - availableCbm,
      currentUtilization: (this.currentCbm / this.maxCbm * 100).toFixed(1)
    });
    
    if (!allowPartialFit) {
      validation.recommendations.push('Consider using a larger container type');
      validation.recommendations.push('Split the order across multiple containers');
      validation.recommendations.push('Remove some items to reduce CBM requirement');
    }
  }
  
  // Critical validation: Check weight capacity
  if (orderWeight > availableWeight) {
    validation.canAllocate = false;
    validation.errors.push({
      type: 'WEIGHT_INSUFFICIENT',
      severity: 'error',
      message: `Insufficient weight capacity. Required: ${orderWeight.toFixed(0)}kg, Available: ${availableWeight.toFixed(0)}kg`,
      required: orderWeight,
      available: availableWeight,
      shortage: orderWeight - availableWeight,
      currentUtilization: (this.currentWeight / this.maxWeight * 100).toFixed(1)
    });
    
    validation.recommendations.push('Verify item weight measurements are accurate');
    validation.recommendations.push('Consider splitting heavy items across containers');
  }
  
  if (strictValidation) {
    // Validate against existing order allocations for data integrity
    const totalAllocatedCbm = this.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0);
    const totalAllocatedWeight = this.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0);
    
    if (Math.abs(totalAllocatedCbm - this.currentCbm) > 0.01) {
      validation.warnings.push({
        type: 'CBM_ALLOCATION_MISMATCH',
        severity: 'warning',
        message: `CBM allocation mismatch detected. Current: ${this.currentCbm}, Calculated: ${totalAllocatedCbm.toFixed(2)}`,
        dataInconsistency: true
      });
    }
    
    if (Math.abs(totalAllocatedWeight - this.currentWeight) > 1) {
      validation.warnings.push({
        type: 'WEIGHT_ALLOCATION_MISMATCH',
        severity: 'warning',
        message: `Weight allocation mismatch detected. Current: ${this.currentWeight}, Calculated: ${totalAllocatedWeight.toFixed(0)}`,
        dataInconsistency: true
      });
    }
  }
  
  // Add warnings for high utilization
  const cbmUtilizationAfter = (this.currentCbm + orderCbm) / this.maxCbm * 100;
  const weightUtilizationAfter = (this.currentWeight + orderWeight) / this.maxWeight * 100;
  
  if (cbmUtilizationAfter > 95 && validation.canAllocate) {
    validation.warnings.push({
      type: 'HIGH_CBM_UTILIZATION',
      severity: 'warning',
      message: `Very high CBM utilization after allocation: ${cbmUtilizationAfter.toFixed(1)}%`,
      utilization: cbmUtilizationAfter,
      threshold: 95
    });
    validation.recommendations.push('Consider reserving space for measurement variations');
  }
  
  if (weightUtilizationAfter > 95 && validation.canAllocate) {
    validation.warnings.push({
      type: 'HIGH_WEIGHT_UTILIZATION',
      severity: 'warning',
      message: `Very high weight utilization after allocation: ${weightUtilizationAfter.toFixed(1)}%`,
      utilization: weightUtilizationAfter,
      threshold: 95
    });
    validation.recommendations.push('Verify total weight is within container limits');
  }
  
  // Add efficiency recommendations
  if (cbmUtilizationAfter < 50 && validation.canAllocate) {
    validation.recommendations.push('Consider using a smaller container type for better efficiency');
  }
  
  return validation;
};
// Atomic method to safely allocate order to container with capacity validation
containerSchema.methods.allocateOrderSafely = async function(orderAllocation, session = null) {
  const { orderId, clientId, clientName, cbmShare, weightShare, cartonShare, partialAllocation, paymentType, carryingCharges } = orderAllocation;
  
  // Pre-allocation capacity validation
  const capacityValidation = this.canAllocateOrder(cbmShare, weightShare, cartonShare, { strictValidation: true });
  
  if (!capacityValidation.canAllocate) {
    const error = new Error('Cannot allocate order: Capacity validation failed');
    error.name = 'AllocationCapacityError';
    error.code = 'CAPACITY_VALIDATION_FAILED';
    error.validation = capacityValidation;
    error.details = {
      orderId,
      requestedCbm: cbmShare,
      requestedWeight: weightShare,
      availableCbm: capacityValidation.capacityInfo.cbm.available,
      availableWeight: capacityValidation.capacityInfo.weight.available
    };
    throw error;
  }
  
  // Check for duplicate allocation
  const existingAllocation = this.orders.find(order => order.orderId.toString() === orderId.toString());
  if (existingAllocation) {
    const error = new Error('Order already allocated to this container');
    error.name = 'DuplicateAllocationError';
    error.code = 'ORDER_ALREADY_ALLOCATED';
    error.details = {
      orderId,
      containerIdd: this._id,
      existingAllocation
    };
    throw error;
  }
  
  // Create allocation record
  const allocation = {
    orderId,
    clientId,
    clientName,
    cbmShare: parseFloat(cbmShare.toFixed(3)),
    weightShare: parseFloat(weightShare.toFixed(2)),
    cartonShare: cartonShare || 0,
    partialAllocation: partialAllocation || {
      isPartial: false,
      allocatedQuantity: 0,
      totalQuantity: 0,
      allocatedCartons: 0,
      totalCartons: 0
    },
    paymentType: paymentType || 'THROUGH_ME',
    carryingCharges: carryingCharges || 0,
    allocatedAt: new Date()
  };
  
  // Add allocation to container
  this.orders.push(allocation);
  
  // Recalculate and validate capacity (pre-save will handle this, but double-check)
  const newCbmTotal = this.orders.reduce((sum, order) => sum + order.cbmShare, 0);
  const newWeightTotal = this.orders.reduce((sum, order) => sum + order.weightShare, 0);
  
  if (newCbmTotal > this.maxCbm || newWeightTotal > this.maxWeight) {
    // Remove the allocation we just added
    this.orders.pop();
    
    const error = new Error('Allocation would exceed container capacity');
    error.name = 'CapacityExceededError';
    error.code = 'POST_ALLOCATION_CAPACITY_EXCEEDED';
    error.details = {
      orderId,
      newCbmTotal,
      newWeightTotal,
      maxCbm: this.maxCbm,
      maxWeight: this.maxWeight
    };
    throw error;
  }
  
  // Update current totals
  this.currentCbm = parseFloat(newCbmTotal.toFixed(3));
  this.currentWeight = parseFloat(newWeightTotal.toFixed(2));
  
  // Update payment distribution
  this.updatePaymentDistribution();
  
  // Allocate charges proportionally
  this.allocateCharges();
  
  // Calculate financials
  this.calculateFinancials();
  
  // Save with session if provided (for transactions)
  if (session) {
    await this.save({ session });
  } else {
    await this.save();
  }
  
  // Return allocation result
  return {
    success: true,
    allocation,
    containerUtilization: {
      cbm: {
        used: this.currentCbm,
        max: this.maxCbm,
        percentage: (this.currentCbm / this.maxCbm * 100).toFixed(1)
      },
      weight: {
        used: this.currentWeight,
        max: this.maxWeight,
        percentage: (this.currentWeight / this.maxWeight * 100).toFixed(1)
      }
    },
    warnings: capacityValidation.warnings
  };
};

// Method to calculate financial totals and profit with dynamic currency conversion
containerSchema.methods.calculateFinancials = function() {
  // Calculate total carrying charges (revenue)
  this.totalRevenue = this.orders.reduce((sum, order) => {
    const carryingCharges = order.carryingCharges || 0;
    return sum + carryingCharges;
  }, 0);
  
  // Calculate total base charges (GST + Duty + Misc + Extra Charge) with dynamic conversion
  const baseChargesINR = this.baseCharges ? (
    (this.baseCharges.gst || 0) +
    (this.baseCharges.duty || 0) +
    (this.baseCharges.misc || 0) +
    (this.baseCharges.extraCharge || 0)
  ) * (this.baseCharges.currency === 'USD' ? 
       currencyService.getExchangeRate('USD', 'INR') : 1) : 0;
  
  // Calculate other operational costs with dynamic conversion
  const operationalCosts = this.charges.reduce((sum, charge) => {
    const valueINR = charge.currency === 'USD' ? 
      currencyService.convertCurrency(charge.value, 'USD', 'INR') : charge.value;
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
    
    // Allocate base charges proportionally with currency conversion
    if (this.baseCharges) {
      const allocatedBaseCharges = {
        gst: (this.baseCharges.gst || 0) * allocationRatio,
        duty: (this.baseCharges.duty || 0) * allocationRatio,
        misc: (this.baseCharges.misc || 0) * allocationRatio,
        extraCharge: (this.baseCharges.extraCharge || 0) * allocationRatio,
        currency: this.baseCharges.currency
      };
      
      // Add base charges to allocated charges with proper currency handling
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
