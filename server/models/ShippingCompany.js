const mongoose = require('mongoose');

const rateStructureSchema = new mongoose.Schema({
  containerType: {
    type: String,
    enum: ['20ft', '40ft', '40ft_hc', '45ft'],
    required: true
  },
  oceanFreight: {
    type: Number,
    required: true,
    min: [0, 'Ocean freight cannot be negative']
  },
  localCharges: {
    type: Number,
    required: true,
    min: [0, 'Local charges cannot be negative']
  },
  fuelSurcharge: {
    type: Number,
    default: 0,
    min: [0, 'Fuel surcharge cannot be negative']
  },
  currency: {
    type: String,
    enum: ['INR', 'USD'],
    default: 'USD'
  }
});

const shippingCompanySchema = new mongoose.Schema({
  companyId: {
    type: String,
    required: true,
    unique: true,
    trim: true
  },
  companyName: {
    type: String,
    required: true,
    trim: true
  },
  shortName: {
    type: String,
    required: true,
    trim: true
  },
  contactInfo: {
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    address: {
      street: String,
      city: String,
      state: String,
      country: String,
      zipCode: String
    },
    website: String
  },
  rates: [rateStructureSchema],
  chargeStructure: {
    baseCharges: {
      documentationFee: {
        type: Number,
        default: 0
      },
      handlingFee: {
        type: Number,
        default: 0
      },
      securityFee: {
        type: Number,
        default: 0
      }
    },
    additionalServices: {
      tracking: {
        available: {
          type: Boolean,
          default: true
        },
        fee: {
          type: Number,
          default: 0
        }
      },
      insurance: {
        available: {
          type: Boolean,
          default: true
        },
        ratePercentage: {
          type: Number,
          default: 0.5
        }
      },
      expeditedShipping: {
        available: {
          type: Boolean,
          default: false
        },
        surchargePercentage: {
          type: Number,
          default: 25
        }
      }
    }
  },
  serviceAreas: [{
    port: {
      type: String,
      required: true
    },
    country: {
      type: String,
      required: true
    },
    transitDays: {
      type: Number,
      required: true
    }
  }],
  performanceMetrics: {
    onTimeDelivery: {
      type: Number,
      default: 95,
      min: [0, 'On-time delivery cannot be negative'],
      max: [100, 'On-time delivery cannot exceed 100%']
    },
    customerRating: {
      type: Number,
      default: 4.5,
      min: [1, 'Customer rating must be at least 1'],
      max: [5, 'Customer rating cannot exceed 5']
    },
    totalShipments: {
      type: Number,
      default: 0
    }
  },
  isActive: {
    type: Boolean,
    default: true
  },
  contractDetails: {
    contractNumber: String,
    validFrom: Date,
    validTo: Date,
    preferredPartner: {
      type: Boolean,
      default: false
    }
  },
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
shippingCompanySchema.index({ companyId: 1 });
shippingCompanySchema.index({ companyName: 1 });
shippingCompanySchema.index({ isActive: 1 });
shippingCompanySchema.index({ 'contractDetails.preferredPartner': 1 });
shippingCompanySchema.index({ 'performanceMetrics.onTimeDelivery': -1 });

// Methods
shippingCompanySchema.methods.getRateForContainer = function(containerType) {
  const rate = this.rates.find(r => r.containerType === containerType);
  return rate || null;
};

shippingCompanySchema.methods.calculateTotalCost = function(containerType, cargoValue = 0, needsInsurance = false) {
  const rate = this.getRateForContainer(containerType);
  if (!rate) {
    throw new Error(`No rate found for container type: ${containerType}`);
  }
  
  let totalCost = rate.oceanFreight + rate.localCharges + rate.fuelSurcharge;
  
  // Add base charges
  const baseCharges = this.chargeStructure.baseCharges;
  totalCost += baseCharges.documentationFee + baseCharges.handlingFee + baseCharges.securityFee;
  
  // Add insurance if needed
  if (needsInsurance && this.chargeStructure.additionalServices.insurance.available) {
    const insuranceCost = (cargoValue * this.chargeStructure.additionalServices.insurance.ratePercentage) / 100;
    totalCost += insuranceCost;
  }
  
  return {
    subtotal: totalCost,
    currency: rate.currency,
    breakdown: {
      oceanFreight: rate.oceanFreight,
      localCharges: rate.localCharges,
      fuelSurcharge: rate.fuelSurcharge,
      baseCharges: baseCharges.documentationFee + baseCharges.handlingFee + baseCharges.securityFee,
      insurance: needsInsurance ? (cargoValue * this.chargeStructure.additionalServices.insurance.ratePercentage) / 100 : 0
    }
  };
};

// Static methods
shippingCompanySchema.statics.getActiveCompanies = function() {
  return this.find({ isActive: true }).sort({ 'performanceMetrics.onTimeDelivery': -1 });
};

shippingCompanySchema.statics.getPreferredPartners = function() {
  return this.find({ 
    isActive: true, 
    'contractDetails.preferredPartner': true 
  }).sort({ 'performanceMetrics.customerRating': -1 });
};

shippingCompanySchema.statics.compareRates = function(containerType) {
  return this.aggregate([
    { $match: { isActive: true } },
    { $unwind: '$rates' },
    { $match: { 'rates.containerType': containerType } },
    {
      $project: {
        companyName: 1,
        shortName: 1,
        totalCost: {
          $add: [
            '$rates.oceanFreight',
            '$rates.localCharges',
            '$rates.fuelSurcharge'
          ]
        },
        currency: '$rates.currency',
        onTimeDelivery: '$performanceMetrics.onTimeDelivery',
        customerRating: '$performanceMetrics.customerRating'
      }
    },
    { $sort: { totalCost: 1 } }
  ]);
};

module.exports = mongoose.model('ShippingCompany', shippingCompanySchema);