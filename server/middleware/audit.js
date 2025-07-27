const AuditLogger = require('../services/AuditLogger');

/**
 * Middleware to automatically audit API requests
 */
const auditMiddleware = (options = {}) => {
  const {
    skipRoutes = ['/api/health', '/api/auth/verify'],
    skipMethods = ['GET'],
    logAllRequests = false
  } = options;

  return async (req, res, next) => {
    // Skip certain routes
    if (skipRoutes.some(route => req.path.startsWith(route))) {
      return next();
    }

    // Skip certain methods unless logAllRequests is true
    if (!logAllRequests && skipMethods.includes(req.method)) {
      return next();
    }

    // Only audit authenticated requests
    if (!req.user) {
      return next();
    }

    // Store original res.json to capture response
    const originalJson = res.json;
    let responseData = null;
    let statusCode = null;

    res.json = function(data) {
      responseData = data;
      statusCode = res.statusCode;
      return originalJson.call(this, data);
    };

    // Store original res.status to capture status changes
    const originalStatus = res.status;
    res.status = function(code) {
      statusCode = code;
      return originalStatus.call(this, code);
    };

    // Continue with the request
    next();

    // Log after response is sent
    res.on('finish', async () => {
      try {
        const action = determineAction(req);
        const resourceInfo = extractResourceInfo(req);
        const success = statusCode < 400;

        await AuditLogger.log(action, req.user, req, {
          resourceType: resourceInfo.type,
          resourceId: resourceInfo.id,
          severity: determineSeverity(req, statusCode),
          success,
          errorMessage: success ? null : responseData?.message,
          details: {
            endpoint: req.originalUrl,
            method: req.method,
            statusCode,
            requestBody: sanitizeRequestBody(req.body),
            responseSize: JSON.stringify(responseData || {}).length
          }
        });
      } catch (error) {
        console.error('Audit middleware error:', error);
      }
    });
  };
};

/**
 * Determine audit action based on request
 */
function determineAction(req) {
  const { method, path } = req;
  
  // Authentication routes
  if (path.includes('/auth/login')) return 'USER_LOGIN';
  if (path.includes('/auth/logout')) return 'USER_LOGOUT';
  if (path.includes('/auth/register')) return 'USER_CREATED';
  
  // Order routes
  if (path.includes('/orders')) {
    if (method === 'POST') return 'ORDER_CREATED';
    if (method === 'PUT' || method === 'PATCH') return 'ORDER_UPDATED';
    if (method === 'DELETE') return 'ORDER_DELETED';
    return 'ORDER_ACCESSED';
  }
  
  // Container routes
  if (path.includes('/containers')) {
    if (method === 'POST') return 'CONTAINER_CREATED';
    if (method === 'PUT' || method === 'PATCH') return 'CONTAINER_UPDATED';
    if (method === 'DELETE') return 'CONTAINER_DELETED';
    return 'CONTAINER_ACCESSED';
  }
  
  // Warehouse routes
  if (path.includes('/warehouse/qc-inspection')) return 'QC_INSPECTION';
  if (path.includes('/warehouse/loopback')) return 'LOOPBACK_CREATED';
  if (path.includes('/warehouse/allocate')) return 'WAREHOUSE_ALLOCATION';
  if (path.includes('/warehouse')) return 'WAREHOUSE_ACCESSED';
  
  // Financial routes
  if (path.includes('/financials')) {
    if (path.includes('/profit-report')) return 'PROFIT_REPORT_GENERATED';
    if (path.includes('/exchange-rate')) return 'EXCHANGE_RATE_UPDATED';
    return 'FINANCIAL_DATA_ACCESSED';
  }
  
  // User management routes
  if (path.includes('/users')) {
    if (method === 'POST') return 'USER_CREATED';
    if (method === 'PUT' || method === 'PATCH') return 'USER_UPDATED';
    if (method === 'DELETE') return 'USER_DELETED';
    return 'USER_ACCESSED';
  }
  
  // Default action
  return `${method}_REQUEST`;
}

/**
 * Extract resource information from request
 */
function extractResourceInfo(req) {
  const { path } = req;
  
  if (path.includes('/orders')) {
    const orderId = req.params.id || req.body.orderId;
    return { type: 'order', id: orderId };
  }
  
  if (path.includes('/containers')) {
    const containerId = req.params.id || req.body.containerId;
    return { type: 'container', id: containerId };
  }
  
  if (path.includes('/users')) {
    const userId = req.params.id || req.body.userId;
    return { type: 'user', id: userId };
  }
  
  if (path.includes('/warehouse')) {
    return { type: 'warehouse', id: req.body.orderId || req.params.id };
  }
  
  if (path.includes('/financials')) {
    return { type: 'financial', id: req.params.id || req.query.containerId };
  }
  
  return { type: 'system', id: null };
}

/**
 * Determine severity based on request and response
 */
function determineSeverity(req, statusCode) {
  // Critical for security violations
  if (statusCode === 401 || statusCode === 403) return 'critical';
  
  // High for financial operations
  if (req.path.includes('/financials')) return 'high';
  
  // High for user management
  if (req.path.includes('/users') && req.method !== 'GET') return 'high';
  
  // High for errors
  if (statusCode >= 500) return 'high';
  
  // Medium for warehouse operations
  if (req.path.includes('/warehouse')) return 'medium';
  
  // Medium for order/container modifications
  if ((req.path.includes('/orders') || req.path.includes('/containers')) && 
      req.method !== 'GET') return 'medium';
  
  // Low for everything else
  return 'low';
}

/**
 * Sanitize request body for logging
 */
function sanitizeRequestBody(body) {
  if (!body || typeof body !== 'object') return body;
  
  const sanitized = { ...body };
  const sensitiveFields = ['password', 'token', 'secret', 'creditCard', 'ssn'];
  
  for (const field of sensitiveFields) {
    if (sanitized[field]) {
      sanitized[field] = '[REDACTED]';
    }
  }
  
  // Limit size to prevent huge logs
  const bodyString = JSON.stringify(sanitized);
  if (bodyString.length > 1000) {
    return { ...sanitized, _truncated: true, _originalSize: bodyString.length };
  }
  
  return sanitized;
}

/**
 * Middleware specifically for financial operations
 */
const auditFinancialMiddleware = async (req, res, next) => {
  if (!req.user) return next();
  
  const originalJson = res.json;
  res.json = function(data) {
    // Log financial data access
    AuditLogger.logFinancial(
      determineAction(req),
      req.user,
      req,
      {
        endpoint: req.originalUrl,
        dataAccessed: Object.keys(data || {}),
        complianceRequired: true
      }
    );
    return originalJson.call(this, data);
  };
  
  next();
};

/**
 * Middleware for warehouse operations
 */
const auditWarehouseMiddleware = async (req, res, next) => {
  if (!req.user) return next();
  
  const originalJson = res.json;
  res.json = function(data) {
    const orderId = req.body.orderId || req.params.id;
    AuditLogger.logWarehouse(
      determineAction(req),
      req.user,
      req,
      orderId,
      {
        operation: req.path.split('/').pop(),
        details: req.body
      }
    );
    return originalJson.call(this, data);
  };
  
  next();
};

module.exports = {
  auditMiddleware,
  auditFinancialMiddleware,
  auditWarehouseMiddleware
};
