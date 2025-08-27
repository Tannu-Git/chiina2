const rateLimit = require('express-rate-limit');
const helmet = require('helmet');
const AuditLogger = require('../services/AuditLogger');

/**
 * Rate limiting configurations
 */
const createRateLimiter = (windowMs, max, message, skipSuccessfulRequests = false) => {
  return rateLimit({
    windowMs,
    max,
    message: { error: message },
    standardHeaders: true,
    legacyHeaders: false,
    skipSuccessfulRequests,
    handler: async (req, res) => {
      // Log rate limit violations
      if (req.user) {
        await AuditLogger.logSecurityViolation(
          req.user,
          req,
          'RATE_LIMIT_EXCEEDED',
          {
            limit: max,
            windowMs,
            endpoint: req.originalUrl
          }
        );
      }

      res.status(429).json({
        error: message,
        retryAfter: Math.round(windowMs / 1000)
      });
    }
  });
};

// General API rate limiting
const generalLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  100, // limit each IP to 100 requests per windowMs
  'Too many requests from this IP, please try again later.'
);

// Strict rate limiting for authentication endpoints
const authLimiter = createRateLimiter(
  15 * 60 * 1000, // 15 minutes
  5, // limit each IP to 5 requests per windowMs
  'Too many authentication attempts, please try again later.',
  true // skip successful requests
);

// Financial data access limiting
const financialLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  10, // limit each IP to 10 requests per minute
  'Too many financial data requests, please slow down.'
);

// Admin operations limiting
const adminLimiter = createRateLimiter(
  60 * 1000, // 1 minute
  20, // limit each IP to 20 requests per minute
  'Too many admin operations, please slow down.'
);

/**
 * IP Whitelisting middleware
 */
const ipWhitelist = (allowedIPs = []) => {
  return (req, res, next) => {
    if (allowedIPs.length === 0) {
      return next(); // No whitelist configured
    }

    const clientIP = req.ip || req.connection.remoteAddress;
    const isAllowed = allowedIPs.some(ip => {
      if (ip.includes('/')) {
        // Proper CIDR validation implementation
        return isIPInCIDR(clientIP, ip);
      }
      return clientIP === ip;
    });

    if (!isAllowed) {
      // Log unauthorized IP access attempt
      if (req.user) {
        AuditLogger.logSecurityViolation(
          req.user,
          req,
          'UNAUTHORIZED_IP_ACCESS',
          { clientIP, allowedIPs }
        );
      }

      return res.status(403).json({
        error: 'Access denied from this IP address'
      });
    }

    next();
  };
};

/**
 * Admin IP whitelist (for production)
 */
const adminIPWhitelist = ipWhitelist([
  '127.0.0.1',
  '::1',
  // Add your admin IPs here
  // '192.168.1.100',
  // '10.0.0.0/8'
]);

/**
 * Security headers middleware
 */
const securityHeaders = helmet({
  contentSecurityPolicy: {
    directives: {
      defaultSrc: ["'self'"],
      styleSrc: ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
      fontSrc: ["'self'", "https://fonts.gstatic.com"],
      imgSrc: ["'self'", "data:", "https:", "http://localhost:*"], // Allow localhost images
      scriptSrc: ["'self'"],
      connectSrc: ["'self'", "http://localhost:*"], // Allow localhost connections
      frameSrc: ["'none'"],
      objectSrc: ["'none'"],
      upgradeInsecureRequests: [],
    },
  },
  crossOriginResourcePolicy: { policy: "cross-origin" }, // Allow cross-origin resource sharing
  hsts: {
    maxAge: 31536000,
    includeSubDomains: true,
    preload: true
  }
});

/**
 * Request validation middleware
 */
const validateRequest = (req, res, next) => {
  // Skip validation for file upload routes
  if (req.originalUrl.includes('/api/upload') || req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  // Check for suspicious patterns
  const suspiciousPatterns = [
    /(<script|javascript:|vbscript:|onload=|onerror=)/i,
    /(union.*select|drop.*table|insert.*into)/i,
    /(\.\.\/|\.\.\\)/,
    /(\x00|\x08|\x09|\x0a|\x0d)/
  ];

  const checkValue = (value) => {
    if (typeof value === 'string') {
      return suspiciousPatterns.some(pattern => pattern.test(value));
    }
    if (typeof value === 'object' && value !== null) {
      return Object.values(value).some(checkValue);
    }
    return false;
  };

  // Check URL, query params, and body (safely)
  const urlCheck = checkValue(req.originalUrl);
  const queryCheck = req.query ? checkValue(JSON.stringify(req.query)) : false;
  
  let bodyCheck = false;
  if (req.body) {
    try {
      bodyCheck = checkValue(JSON.stringify(req.body));
    } catch (error) {
      // If JSON.stringify fails (e.g., circular reference, binary data), skip body check
      console.warn('Body validation skipped due to serialization error:', error.message);
    }
  }

  const suspicious = urlCheck || queryCheck || bodyCheck;

  if (suspicious) {
    // Log security violation
    if (req.user) {
      AuditLogger.logSecurityViolation(
        req.user,
        req,
        'SUSPICIOUS_REQUEST_PATTERN',
        {
          url: req.originalUrl,
          query: req.query,
          body: req.body
        }
      );
    }

    return res.status(400).json({
      error: 'Invalid request format'
    });
  }

  next();
};

/**
 * Enhanced input sanitization and validation
 */
const sanitizeAndValidateInput = (req, res, next) => {
  // Skip validation for file upload routes
  if (req.originalUrl.includes('/api/upload') || req.headers['content-type']?.includes('multipart/form-data')) {
    return next();
  }

  // Validate array inputs to prevent server crashes
  if (req.body) {
    const validateArrayFields = (obj, path = '') => {
      for (const [key, value] of Object.entries(obj)) {
        const currentPath = path ? `${path}.${key}` : key;
        
        if (Array.isArray(value)) {
          // Validate array size to prevent DoS
          if (value.length > 1000) {
            return res.status(400).json({
              error: `Array field '${currentPath}' exceeds maximum size of 1000 items`
            });
          }
          
          // Validate each array item
          value.forEach((item, index) => {
            if (typeof item === 'object' && item !== null) {
              validateArrayFields(item, `${currentPath}[${index}]`);
            }
          });
        } else if (typeof value === 'object' && value !== null) {
          validateArrayFields(value, currentPath);
        } else if (typeof value === 'string') {
          // Validate string length to prevent DoS
          if (value.length > 10000) {
            return res.status(400).json({
              error: `String field '${currentPath}' exceeds maximum length of 10000 characters`
            });
          }
          
          // Sanitize dangerous HTML/Script content
          if (/<script|javascript:|vbscript:|onload=|onerror=/i.test(value)) {
            return res.status(400).json({
              error: `Field '${currentPath}' contains potentially dangerous content`
            });
          }
        } else if (typeof value === 'number') {
          // Validate number range to prevent overflow
          if (!Number.isFinite(value) || Math.abs(value) > Number.MAX_SAFE_INTEGER) {
            return res.status(400).json({
              error: `Numeric field '${currentPath}' is out of safe range`
            });
          }
        }
      }
    };
    
    try {
      validateArrayFields(req.body);
    } catch (error) {
      console.warn('Input validation skipped due to error:', error.message);
      return res.status(400).json({
        error: 'Invalid request data structure'
      });
    }
  }
  
  next();
};

/**
 * Session security middleware
 */
const sessionSecurity = (req, res, next) => {
  if (req.user) {
    // Check for session hijacking indicators
    const userAgent = req.headers['user-agent'];
    const storedUserAgent = req.user.lastUserAgent;

    if (storedUserAgent && userAgent !== storedUserAgent) {
      // Log potential session hijacking
      AuditLogger.logSecurityViolation(
        req.user,
        req,
        'POTENTIAL_SESSION_HIJACKING',
        {
          currentUserAgent: userAgent,
          storedUserAgent: storedUserAgent
        }
      );

      return res.status(401).json({
        error: 'Session security violation detected'
      });
    }

    // Update last seen
    req.user.lastSeen = new Date();
    req.user.lastUserAgent = userAgent;
  }

  next();
};

/**
 * File upload security
 */
const fileUploadSecurity = (req, res, next) => {
  if (req.files || req.file) {
    const allowedTypes = [
      'image/jpeg',
      'image/png',
      'image/gif',
      'application/pdf',
      'text/csv',
      'application/vnd.ms-excel',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    ];

    const files = req.files ? Object.values(req.files).flat() : [req.file];

    for (const file of files) {
      if (file && !allowedTypes.includes(file.mimetype)) {
        return res.status(400).json({
          error: 'File type not allowed'
        });
      }

      // Check file size (10MB limit)
      if (file && file.size > 10 * 1024 * 1024) {
        return res.status(400).json({
          error: 'File size too large'
        });
      }
    }
  }

  next();
};

/**
 * CORS configuration for production
 */
const corsOptions = {
  origin: function (origin, callback) {
    const allowedOrigins = [
      'http://localhost:3000',
      'http://localhost:3001', 
      'http://localhost:3002',
      'http://localhost:5173',
      'http://localhost:5001', // Allow server origin for static files
      // Add your production domains here
    ];

    // Allow requests with no origin (like mobile apps or curl requests)
    // and allow all localhost origins for development
    if (!origin || allowedOrigins.includes(origin) || 
        (origin && origin.startsWith('http://localhost:'))) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

module.exports = {
  generalLimiter,
  authLimiter,
  financialLimiter,
  adminLimiter,
  ipWhitelist,
  adminIPWhitelist,
  securityHeaders,
  validateRequest,
  sanitizeAndValidateInput,
  sessionSecurity,
  fileUploadSecurity,
  corsOptions
};
