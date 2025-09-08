// Vercel serverless function handler
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
} = require('../server/middleware/security');
const { auditMiddleware, auditFinancialMiddleware } = require('../server/middleware/audit');

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

// Session security
app.use(sessionSecurity);

// Audit middleware for all API requests
app.use('/api', auditMiddleware({ logAllRequests: false }));

// MongoDB connection with caching for serverless
let cachedDb = null;

async function connectToDatabase() {
  if (cachedDb) {
    return cachedDb;
  }

  try {
    const db = await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms', {
      bufferCommands: false,
      maxPoolSize: 1
    });
    cachedDb = db;
    console.log('✅ Connected to MongoDB');
    return db;
  } catch (err) {
    console.error('❌ MongoDB connection error:', err);
    throw err;
  }
}

// Connect to database on startup
connectToDatabase();

// Routes
app.use('/api/auth', require('../server/routes/auth'));
app.use('/api/orders', require('../server/routes/orders'));
app.use('/api/warehouse', require('../server/routes/warehouse'));
app.use('/api/containers', require('../server/routes/containers'));
app.use('/api/companies', require('../server/routes/companies'));
app.use('/api/financials', auditFinancialMiddleware, require('../server/routes/financials'));
app.use('/api/financials-comprehensive', auditFinancialMiddleware, require('../server/routes/financials-comprehensive'));
app.use('/api/payment-collections', auditFinancialMiddleware, require('../server/routes/payment-collections'));
app.use('/api/payments', require('../server/routes/payments'));
app.use('/api/users', require('../server/routes/users'));
app.use('/api/suppliers', require('../server/routes/suppliers'));
app.use('/api/clients', require('../server/routes/clients'));
app.use('/api/items', require('../server/routes/items'));
app.use('/api/upload', require('../server/routes/upload'));
app.use('/api/audit', require('../server/routes/audit'));
app.use('/api/dashboard', require('../server/routes/dashboard'));

// Health check
app.get('/api/health', (_req, res) => {
  res.json({
    status: 'OK',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV,
    serverless: true
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

// Export the Express app as a serverless function for Vercel
module.exports = app;