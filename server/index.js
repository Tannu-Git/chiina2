const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Security and audit imports
const {
  securityHeaders,
  validateRequest,
  sanitizeAndValidateInput,
  sessionSecurity,
  corsOptions
} = require('./middleware/security');
const { auditMiddleware, auditFinancialMiddleware } = require('./middleware/audit');

const app = express();

// Trust proxy for accurate IP addresses
app.set('trust proxy', 1);

// Security headers
app.use(securityHeaders);

// CORS with security options
app.use(cors(corsOptions));

// Body parsing middleware
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Security validation
app.use(validateRequest);
app.use(sanitizeAndValidateInput);

// Rate limiting disabled for development

// Session security
app.use(sessionSecurity);

// Audit middleware for all API requests
app.use('/api', auditMiddleware({ logAllRequests: false }));

// Serve uploaded files with proper CORS headers
const path = require('path');
app.use('/uploads', (req, res, next) => {
  // Set comprehensive CORS headers for static files
  res.header('Access-Control-Allow-Origin', '*');
  res.header('Access-Control-Allow-Methods', 'GET, HEAD, OPTIONS');
  res.header('Access-Control-Allow-Headers', 'Origin, X-Requested-With, Content-Type, Accept, Authorization');
  res.header('Access-Control-Max-Age', '86400'); // 24 hours
  
  // Override restrictive policies for static files
  res.header('Cross-Origin-Resource-Policy', 'cross-origin');
  res.header('Cross-Origin-Embedder-Policy', 'unsafe-none');
  
  // Handle preflight requests
  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }
  
  next();
}, express.static(path.join(__dirname, 'uploads'), {
  // Additional static file options
  setHeaders: (res, path) => {
    // Set cache headers for images
    if (path.endsWith('.png') || path.endsWith('.jpg') || path.endsWith('.jpeg') || path.endsWith('.gif')) {
      res.setHeader('Cache-Control', 'public, max-age=31536000'); // 1 year
    }
    // Ensure CORS headers are set on the file response
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
  }
}));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes without rate limiting
app.use('/api/auth', require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/companies', require('./routes/companies'));
app.use('/api/financials', auditFinancialMiddleware, require('./routes/financials'));
app.use('/api/financials-comprehensive', auditFinancialMiddleware, require('./routes/financials-comprehensive'));
app.use('/api/payment-collections', auditFinancialMiddleware, require('./routes/payment-collections'));
app.use('/api/payments', require('./routes/payments'));
app.use('/api/users', require('./routes/users'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/clients', require('./routes/clients'));
app.use('/api/items', require('./routes/items'));
app.use('/api/upload', require('./routes/upload')); // Upload routes with built-in security
app.use('/api/audit', require('./routes/audit'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
  });
});

// JWT Debug endpoint (only in development)
app.get('/api/debug/jwt', (_req, res) => {
  if (process.env.NODE_ENV !== 'development') {
    return res.status(404).json({ message: 'Not found' });
  }
  
  res.json({
    jwtSecretExists: !!process.env.JWT_SECRET,
    jwtSecretLength: process.env.JWT_SECRET ? process.env.JWT_SECRET.length : 0,
    jwtExpire: process.env.JWT_EXPIRE || 'not set',
    mongoUri: process.env.MONGODB_URI ? 'set' : 'not set',
    nodeEnv: process.env.NODE_ENV || 'not set',
    instructions: {
      clearBrowserStorage: 'Clear localStorage in browser dev tools (F12 > Application > Local Storage > Clear)',
      loginCredentials: {
        admin: 'admin@demo.com / password',
        staff: 'staff@demo.com / password'
      }
    }
  });
});

// Error handling middleware
app.use((err, _req, res, _next) => {
  console.error(err.stack);
  res.status(500).json({
    message: 'Something went wrong!',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

const PORT = process.env.PORT || 5001;

// Only start the server if not in a serverless environment
if (process.env.NODE_ENV !== 'production' || !process.env.VERCEL) {
  app.listen(PORT, () => {
    console.log(`🚀 Server running on port ${PORT}`);
    console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
  });
}

// Export the app for serverless functions
module.exports = app;
