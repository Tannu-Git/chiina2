const jwt = require('jsonwebtoken');
const User = require('../models/User');

// Verify JWT token
const auth = async (req, res, next) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};

// Check if user has specific role
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this resource` 
      });
    }

    next();
  };
};

// Check if user has specific permission
const checkPermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    // Admin has all permissions
    if (req.user.role === 'admin') {
      return next();
    }

    if (!req.user.permissions || !req.user.permissions.includes(permission)) {
      return res.status(403).json({ 
        message: `Permission ${permission} required` 
      });
    }

    next();
  };
};

// Data isolation middleware for clients
const clientDataFilter = (req, res, next) => {
  if (req.user.role === 'client') {
    req.query.clientId = req.user.clientId;
  }
  next();
};

// Mask financial data for non-admin users
const maskFinancialData = (data, user) => {
  if (user.role === 'admin') {
    return data;
  }

  const sensitiveFields = ['unitCost', 'profitMargin', 'supplierPrice', 'totalCosts', 'grossProfit'];
  
  if (Array.isArray(data)) {
    return data.map(item => {
      const masked = { ...item };
      if (typeof masked.toObject === 'function') {
        masked = masked.toObject();
      }
      
      sensitiveFields.forEach(field => {
        delete masked[field];
      });
      
      return masked;
    });
  } else {
    const masked = { ...data };
    if (typeof masked.toObject === 'function') {
      masked = masked.toObject();
    }
    
    sensitiveFields.forEach(field => {
      delete masked[field];
    });
    
    return masked;
  }
};

// Mask container IDs for clients
const maskContainerIds = (data, user) => {
  if (user.role !== 'client') {
    return data;
  }

  if (Array.isArray(data)) {
    return data.map(item => ({
      ...item,
      realContainerId: undefined,
      containerId: item.clientFacingId || item.containerId
    }));
  } else {
    return {
      ...data,
      realContainerId: undefined,
      containerId: data.clientFacingId || data.containerId
    };
  }
};

module.exports = {
  auth,
  authorize,
  checkPermission,
  clientDataFilter,
  maskFinancialData,
  maskContainerIds
};
