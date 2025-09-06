const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const userSchema = new mongoose.Schema({
  name: {
    type: String,
    required: [true, 'Name is required'],
    trim: true,
    maxlength: [50, 'Name cannot exceed 50 characters']
  },
  email: {
    type: String,
    required: false, // Made optional
    unique: true,
    sparse: true, // Only enforce uniqueness when not null
    lowercase: true,
    trim: true,
    match: [/^\w+([.-]?\w+)*@\w+([.-]?\w+)*(\.\w{2,3})+$/, 'Please enter a valid email'],
    // Allow empty string to avoid unique constraint issues
    default: ''
  },
  password: {
    type: String,
    required: false, // Made optional
    validate: {
      validator: function(value) {
        // Only validate length if password is provided and not empty
        // Skip validation for already hashed passwords (they start with $2a$ or $2b$)
        if (!value || value.startsWith('$2a$') || value.startsWith('$2b$')) {
          return true;
        }
        return value.length >= 6;
      },
      message: 'Password must be at least 6 characters'
    },
    select: false,
    default: undefined // Don't set default to avoid validation issues
  },
  role: {
    type: String,
    enum: ['admin', 'staff', 'client'],
    default: 'client'
  },
  clientId: {
    type: String,
    unique: true,
    sparse: true // Only unique if not null
  },
  company: {
    type: String,
    trim: true
  },
  phone: {
    type: String,
    trim: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    country: String,
    zipCode: String
  },
  isActive: {
    type: Boolean,
    default: true
  },
  lastLogin: {
    type: Date
  },
  permissions: [{
    type: String,
    enum: [
      'view_all_orders',
      'edit_financials', 
      'view_profits',
      'create_users',
      'edit_orders',
      'view_container_ids',
      'initiate_loopbacks',
      'view_all_clients'
    ]
  }],
  // Auto-registration metadata
  registrationSource: {
    type: String,
    enum: ['manual', 'order_creation', 'import'],
    default: 'manual'
  },
  registrationOrderData: {
    firstOrderDate: Date,
    registeredBy: String
  },
  createdBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User'
  }
}, {
  timestamps: true
});

// Index for better query performance
userSchema.index({ role: 1 });

// Pre-save middleware to hash password
userSchema.pre('save', async function(next) {
  // Only hash password if it exists and is modified
  if (!this.password || !this.isModified('password')) return next();
  
  try {
    const salt = await bcrypt.genSalt(12);
    this.password = await bcrypt.hash(this.password, salt);
    next();
  } catch (error) {
    next(error);
  }
});

// Method to compare password
userSchema.methods.comparePassword = async function(candidatePassword) {
  // If no password is set, always return false
  if (!this.password) return false;
  return await bcrypt.compare(candidatePassword, this.password);
};

// Method to generate client ID
userSchema.methods.generateClientId = function() {
  if (this.role === 'client' && !this.clientId) {
    // Generate more readable client ID based on name
    const sanitizedName = this.name ? this.name.replace(/[^a-zA-Z0-9]/g, '').toUpperCase() : 'CLIENT';
    const namePrefix = sanitizedName.substring(0, 6) || 'CLIENT';
    const randomSuffix = Math.random().toString(36).substr(2, 3).toUpperCase();
    this.clientId = `CLI-${namePrefix}${randomSuffix}`;
  }
};

// Pre-save middleware to auto-generate clientId for clients
userSchema.pre('save', function(next) {
  if (this.role === 'client' && !this.clientId) {
    this.generateClientId();
  }
  next();
});

// Virtual for full name
userSchema.virtual('fullName').get(function() {
  return this.name;
});

// Transform output
userSchema.set('toJSON', {
  transform: function(doc, ret) {
    delete ret.password;
    delete ret.__v;
    return ret;
  }
});

module.exports = mongoose.model('User', userSchema);
