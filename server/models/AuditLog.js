const mongoose = require('mongoose');

const auditLogSchema = new mongoose.Schema({
  timestamp: {
    type: Date,
    default: Date.now,
    required: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'USER_LOGIN',
      'USER_LOGOUT',
      'USER_CREATED',
      'USER_UPDATED',
      'USER_DELETED',
      'ORDER_CREATED',
      'ORDER_UPDATED',
      'ORDER_DELETED',
      'ORDER_STATUS_CHANGED',
      'CONTAINER_CREATED',
      'CONTAINER_UPDATED',
      'CONTAINER_ALLOCATED',
      'QC_INSPECTION',
      'LOOPBACK_CREATED',
      'FINANCIAL_DATA_ACCESSED',
      'PROFIT_REPORT_GENERATED',
      'EXCHANGE_RATE_UPDATED',
      'WAREHOUSE_ALLOCATION',
      'CONTAINER_OPTIMIZATION',
      'PRICE_ESTIMATION',
      'SUPPLIER_MATCHED',
      'DATA_EXPORT',
      'SECURITY_VIOLATION'
    ]
  },
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  userEmail: {
    type: String,
    required: true
  },
  userRole: {
    type: String,
    enum: ['admin', 'staff', 'client'],
    required: true
  },
  resourceType: {
    type: String,
    enum: ['user', 'order', 'container', 'financial', 'warehouse', 'system'],
    required: true
  },
  resourceId: {
    type: String, // Can be ObjectId or custom ID
    required: false
  },
  ipAddress: {
    type: String,
    required: true
  },
  userAgent: {
    type: String,
    required: true
  },
  details: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  oldValues: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  newValues: {
    type: mongoose.Schema.Types.Mixed,
    required: false
  },
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'medium'
  },
  success: {
    type: Boolean,
    default: true
  },
  errorMessage: {
    type: String,
    required: false
  },
  sessionId: {
    type: String,
    required: false
  },
  // For compliance and forensics
  complianceFlags: [{
    type: String,
    enum: ['gdpr', 'sox', 'pci', 'hipaa', 'financial_audit']
  }],
  retentionDate: {
    type: Date,
    default: function() {
      // Default retention: 7 years for financial data, 2 years for others
      const years = this.complianceFlags?.includes('financial_audit') ? 7 : 2;
      return new Date(Date.now() + years * 365 * 24 * 60 * 60 * 1000);
    }
  }
}, {
  timestamps: false, // We use our own timestamp field
  collection: 'audit_logs'
});

// Indexes for performance
auditLogSchema.index({ timestamp: -1 });
auditLogSchema.index({ userId: 1, timestamp: -1 });
auditLogSchema.index({ action: 1, timestamp: -1 });
auditLogSchema.index({ resourceType: 1, resourceId: 1, timestamp: -1 });
auditLogSchema.index({ ipAddress: 1, timestamp: -1 });
auditLogSchema.index({ severity: 1, timestamp: -1 });
auditLogSchema.index({ retentionDate: 1 }); // For automated cleanup

// Static methods for querying
auditLogSchema.statics.getByUser = function(userId, limit = 50) {
  return this.find({ userId })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

auditLogSchema.statics.getByAction = function(action, limit = 100) {
  return this.find({ action })
    .sort({ timestamp: -1 })
    .limit(limit)
    .populate('userId', 'name email');
};

auditLogSchema.statics.getSecurityEvents = function(hours = 24) {
  const since = new Date(Date.now() - hours * 60 * 60 * 1000);
  return this.find({
    timestamp: { $gte: since },
    $or: [
      { severity: { $in: ['high', 'critical'] } },
      { success: false },
      { action: 'SECURITY_VIOLATION' }
    ]
  }).sort({ timestamp: -1 });
};

auditLogSchema.statics.getFinancialAuditTrail = function(startDate, endDate) {
  return this.find({
    timestamp: { $gte: startDate, $lte: endDate },
    $or: [
      { action: { $regex: /FINANCIAL|PROFIT|EXCHANGE/ } },
      { resourceType: 'financial' },
      { complianceFlags: 'financial_audit' }
    ]
  }).sort({ timestamp: -1 });
};

// Instance methods
auditLogSchema.methods.toSafeObject = function() {
  const obj = this.toObject();
  // Remove sensitive details for non-admin users
  if (obj.details && obj.details.password) {
    obj.details = { ...obj.details, password: '[REDACTED]' };
  }
  return obj;
};

module.exports = mongoose.model('AuditLog', auditLogSchema);
