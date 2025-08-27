const mongoose = require('mongoose');

const timelineSchema = new mongoose.Schema({
  orderId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Order',
    required: true,
    index: true
  },
  action: {
    type: String,
    required: true,
    enum: [
      'ORDER_CREATED',
      'ORDER_SUBMITTED', 
      'ORDER_CONFIRMED',
      'STATUS_CHANGED',
      'ITEMS_UPDATED',
      'CONTAINER_ALLOCATED',
      'CONTAINER_UPDATED',
      'NOTES_UPDATED',
      'DEADLINE_UPDATED',
      'PRIORITY_UPDATED',
      'ORDER_CANCELLED',
      'CUSTOM_EVENT'
    ]
  },
  description: {
    type: String,
    required: true
  },
  oldValue: mongoose.Schema.Types.Mixed, // For tracking changes
  newValue: mongoose.Schema.Types.Mixed, // For tracking changes
  metadata: {
    field: String, // Which field was changed
    ipAddress: String,
    userAgent: String,
    changes: mongoose.Schema.Types.Mixed
  },
  performedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  performedByName: String, // Denormalized for performance
  performedByRole: String, // Denormalized for performance
  severity: {
    type: String,
    enum: ['low', 'medium', 'high', 'critical'],
    default: 'low'
  },
  isVisible: {
    type: Boolean,
    default: true // Can be used to hide internal events
  }
}, {
  timestamps: true
});

// Indexes for performance
timelineSchema.index({ orderId: 1, createdAt: -1 });
timelineSchema.index({ performedBy: 1, createdAt: -1 });
timelineSchema.index({ action: 1, createdAt: -1 });

// Static method to add timeline entry
timelineSchema.statics.addEntry = async function(orderId, action, description, performedBy, options = {}) {
  try {
    const entry = new this({
      orderId,
      action,
      description,
      performedBy: performedBy._id || performedBy,
      performedByName: performedBy.name || performedBy.email || 'System',
      performedByRole: performedBy.role || 'system',
      oldValue: options.oldValue,
      newValue: options.newValue,
      metadata: {
        field: options.field,
        ipAddress: options.ipAddress,
        userAgent: options.userAgent,
        changes: options.changes
      },
      severity: options.severity || 'low',
      isVisible: options.isVisible !== false
    });

    await entry.save();
    return entry;
  } catch (error) {
    console.error('Timeline entry creation failed:', error);
    // Don't throw error to prevent main operation failure
    return null;
  }
};

// Static method to get timeline for order
timelineSchema.statics.getOrderTimeline = async function(orderId, options = {}) {
  const query = { orderId };
  
  if (options.visibleOnly !== false) {
    query.isVisible = true;
  }

  return this.find(query)
    .populate('performedBy', 'name email role')
    .sort({ createdAt: -1 })
    .limit(options.limit || 50);
};

// Virtual for formatted display
timelineSchema.virtual('displayText').get(function() {
  return `${this.performedByName} ${this.description}`;
});

// Transform output to include user details
timelineSchema.set('toJSON', {
  virtuals: true,
  transform: function(doc, ret) {
    ret.date = ret.createdAt;
    ret.user = ret.performedByName;
    ret.userRole = ret.performedByRole;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('Timeline', timelineSchema);