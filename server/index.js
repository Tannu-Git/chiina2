const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
require('dotenv').config();

// Security and audit imports
const {
  generalLimiter,
  authLimiter,
  financialLimiter,
  adminLimiter,
  securityHeaders,
  validateRequest,
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

// General rate limiting
app.use('/api', generalLimiter);

// Session security
app.use(sessionSecurity);

// Audit middleware for all API requests
app.use('/api', auditMiddleware({ logAllRequests: false }));

// Serve uploaded files
app.use('/uploads', express.static('uploads'));

// MongoDB connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms')
  .then(() => console.log('✅ Connected to MongoDB'))
  .catch(err => console.error('❌ MongoDB connection error:', err));

// Routes with specific security middleware
app.use('/api/auth', authLimiter, require('./routes/auth'));
app.use('/api/orders', require('./routes/orders'));
app.use('/api/warehouse', require('./routes/warehouse'));
app.use('/api/containers', require('./routes/containers'));
app.use('/api/financials', financialLimiter, auditFinancialMiddleware, require('./routes/financials'));
app.use('/api/users', adminLimiter, require('./routes/users'));
app.use('/api/suppliers', require('./routes/suppliers'));
app.use('/api/upload', require('./routes/upload'));
app.use('/api/audit', adminLimiter, require('./routes/audit'));
app.use('/api/dashboard', require('./routes/dashboard'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV
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

const PORT = process.env.PORT || 5002;
app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`📊 Environment: ${process.env.NODE_ENV || 'development'}`);
});
