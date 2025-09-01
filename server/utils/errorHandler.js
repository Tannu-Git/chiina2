/**
 * Centralized Error Handling Utility
 * Provides consistent error response format and user-friendly messages
 */

const ErrorTypes = {
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  AUTHENTICATION_ERROR: 'AUTHENTICATION_ERROR', 
  AUTHORIZATION_ERROR: 'AUTHORIZATION_ERROR',
  RESOURCE_NOT_FOUND: 'RESOURCE_NOT_FOUND',
  CAPACITY_ERROR: 'CAPACITY_ERROR',
  ALLOCATION_ERROR: 'ALLOCATION_ERROR',
  BUSINESS_LOGIC_ERROR: 'BUSINESS_LOGIC_ERROR',
  DATABASE_ERROR: 'DATABASE_ERROR',
  NETWORK_ERROR: 'NETWORK_ERROR',
  INTERNAL_SERVER_ERROR: 'INTERNAL_SERVER_ERROR'
};

const ErrorSeverity = {
  LOW: 'low',
  MEDIUM: 'medium', 
  HIGH: 'high',
  CRITICAL: 'critical'
};

class StructuredError extends Error {
  constructor({
    type = ErrorTypes.INTERNAL_SERVER_ERROR,
    message,
    statusCode = 500,
    errorCode = null,
    severity = ErrorSeverity.MEDIUM,
    details = null,
    suggestions = [],
    field = null,
    context = {},
    originalError = null,
    userFriendly = true
  }) {
    super(message);
    
    this.type = type;
    this.statusCode = statusCode;
    this.errorCode = errorCode;
    this.severity = severity;
    this.details = details;
    this.suggestions = suggestions;
    this.field = field;
    this.context = context;
    this.originalError = originalError;
    this.userFriendly = userFriendly;
    this.timestamp = new Date().toISOString();
    
    // Maintain proper stack trace
    Error.captureStackTrace(this, StructuredError);
  }

  toJSON() {
    return {
      success: false,
      error: {
        type: this.type,
        message: this.message,
        errorCode: this.errorCode,
        severity: this.severity,
        statusCode: this.statusCode,
        timestamp: this.timestamp,
        ...(this.details && { details: this.details }),
        ...(this.suggestions.length > 0 && { suggestions: this.suggestions }),
        ...(this.field && { field: this.field }),
        ...(Object.keys(this.context).length > 0 && { context: this.context }),
        ...(this.originalError && { 
          originalError: this.userFriendly ? this.originalError.message : 'Internal error details hidden' 
        })
      }
    };
  }
}

/**
 * Container Allocation Specific Error Factories
 */
const AllocationErrors = {
  // Authentication & Authorization
  authenticationRequired: () => new StructuredError({
    type: ErrorTypes.AUTHENTICATION_ERROR,
    message: 'Authentication required to perform this action',
    statusCode: 401,
    errorCode: 'AUTH_REQUIRED',
    severity: ErrorSeverity.HIGH,
    suggestions: [
      'Please log in to your account',
      'Check if your session has expired',
      'Verify your credentials and try again'
    ]
  }),

  insufficientPermissions: (userRole) => new StructuredError({
    type: ErrorTypes.AUTHORIZATION_ERROR,
    message: 'Insufficient permissions for container allocation',
    statusCode: 403,
    errorCode: 'INSUFFICIENT_PERMISSIONS',
    severity: ErrorSeverity.HIGH,
    details: {
      currentRole: userRole,
      requiredRoles: ['admin', 'staff']
    },
    suggestions: [
      'Contact your administrator to upgrade your permissions',
      'Request admin or staff role access for container management'
    ]
  }),

  // Validation Errors
  invalidOrderSelection: (errors) => new StructuredError({
    type: ErrorTypes.VALIDATION_ERROR,
    message: 'Order selection validation failed',
    statusCode: 400,
    errorCode: 'INVALID_ORDER_SELECTION',
    severity: ErrorSeverity.MEDIUM,
    details: {
      validationErrors: errors,
      errorCount: errors.length
    },
    suggestions: [
      'Ensure all selected orders have completed QC inspection',
      'Verify order quantities and measurements are valid',
      'Refresh the order list and reselect orders'
    ]
  }),

  orderNotFound: (orderIds) => new StructuredError({
    type: ErrorTypes.RESOURCE_NOT_FOUND,
    message: 'Some orders were not found or are not QC ready',
    statusCode: 404,
    errorCode: 'ORDERS_NOT_FOUND',
    severity: ErrorSeverity.HIGH,
    details: {
      notFoundOrders: orderIds,
      orderCount: orderIds.length
    },
    suggestions: [
      'Verify the order IDs are correct',
      'Check if orders have been moved or deleted',
      'Ensure orders have completed QC inspection'
    ]
  }),

  // Capacity Errors
  capacityExceeded: (capacityInfo) => new StructuredError({
    type: ErrorTypes.CAPACITY_ERROR,
    message: `Container capacity exceeded: ${capacityInfo.type}`,
    statusCode: 400,
    errorCode: 'CONTAINER_CAPACITY_EXCEEDED',
    severity: ErrorSeverity.HIGH,
    details: capacityInfo,
    suggestions: [
      'Select a larger container type',
      'Remove some orders to reduce capacity requirements',
      'Split allocation across multiple containers',
      'Verify item measurements are accurate'
    ]
  }),

  // Allocation Errors  
  allocationFailed: (reason, context) => new StructuredError({
    type: ErrorTypes.ALLOCATION_ERROR,
    message: `Container allocation failed: ${reason}`,
    statusCode: 500,
    errorCode: 'ALLOCATION_FAILED',
    severity: ErrorSeverity.CRITICAL,
    context,
    suggestions: [
      'Try the allocation again',
      'Check for concurrent allocation conflicts',
      'Verify all orders are still available for allocation',
      'Contact support if the problem persists'
    ]
  }),

  // Transaction Errors
  transactionFailed: (originalError, context) => new StructuredError({
    type: ErrorTypes.DATABASE_ERROR,
    message: 'Transaction failed and was rolled back',
    statusCode: 500,
    errorCode: 'TRANSACTION_ROLLBACK',
    severity: ErrorSeverity.CRITICAL,
    originalError,
    context,
    suggestions: [
      'Retry the allocation operation',
      'Check database connectivity',
      'Ensure no conflicting operations are in progress',
      'Contact technical support if the issue persists'
    ]
  }),

  // Business Logic Errors
  concurrentAllocation: (orderIds) => new StructuredError({
    type: ErrorTypes.BUSINESS_LOGIC_ERROR,
    message: 'Orders are being allocated by another user',
    statusCode: 409,
    errorCode: 'CONCURRENT_ALLOCATION',
    severity: ErrorSeverity.HIGH,
    details: {
      conflictingOrders: orderIds,
      conflictType: 'concurrent_allocation'
    },
    suggestions: [
      'Wait for the other allocation to complete',
      'Refresh the page and select different orders',
      'Coordinate with other team members to avoid conflicts'
    ]
  })
};

/**
 * Express middleware for handling StructuredError instances
 */
const errorHandler = (error, req, res, next) => {
  // Handle StructuredError instances
  if (error instanceof StructuredError) {
    return res.status(error.statusCode).json(error.toJSON());
  }

  // Handle common MongoDB/Mongoose errors
  if (error.name === 'ValidationError') {
    const validationError = new StructuredError({
      type: ErrorTypes.VALIDATION_ERROR,
      message: 'Data validation failed',
      statusCode: 400,
      errorCode: 'MONGOOSE_VALIDATION_ERROR',
      severity: ErrorSeverity.MEDIUM,
      details: {
        validationErrors: Object.values(error.errors).map(err => ({
          field: err.path,
          message: err.message,
          value: err.value
        }))
      },
      originalError: error
    });
    return res.status(400).json(validationError.toJSON());
  }

  if (error.name === 'CastError') {
    const castError = new StructuredError({
      type: ErrorTypes.VALIDATION_ERROR,
      message: 'Invalid ID format',
      statusCode: 400,
      errorCode: 'INVALID_ID_FORMAT',
      severity: ErrorSeverity.LOW,
      field: error.path,
      details: {
        providedValue: error.value,
        expectedType: error.kind
      },
      originalError: error
    });
    return res.status(400).json(castError.toJSON());
  }

  if (error.code === 11000) {
    const duplicateError = new StructuredError({
      type: ErrorTypes.VALIDATION_ERROR,
      message: 'Duplicate entry detected',
      statusCode: 400,
      errorCode: 'DUPLICATE_ENTRY',
      severity: ErrorSeverity.MEDIUM,
      details: {
        duplicateKey: error.keyValue
      },
      suggestions: [
        'Use a unique value for this field',
        'Check if the record already exists'
      ],
      originalError: error
    });
    return res.status(400).json(duplicateError.toJSON());
  }

  // Handle generic errors
  console.error('Unhandled error:', error);
  
  const genericError = new StructuredError({
    type: ErrorTypes.INTERNAL_SERVER_ERROR,
    message: 'An unexpected error occurred',
    statusCode: 500,
    errorCode: 'INTERNAL_ERROR',
    severity: ErrorSeverity.CRITICAL,
    suggestions: [
      'Try the operation again',
      'Contact support if the problem persists'
    ],
    originalError: error,
    userFriendly: false
  });
  
  res.status(500).json(genericError.toJSON());
};

/**
 * Utility functions for creating common error responses
 */
const createErrorResponse = (error, additionalContext = {}) => {
  if (error instanceof StructuredError) {
    const errorResponse = error.toJSON();
    if (Object.keys(additionalContext).length > 0) {
      errorResponse.error.context = { ...errorResponse.error.context, ...additionalContext };
    }
    return errorResponse;
  }
  
  return new StructuredError({
    message: error.message || 'Unknown error',
    originalError: error,
    context: additionalContext
  }).toJSON();
};

module.exports = {
  StructuredError,
  ErrorTypes,
  ErrorSeverity,
  AllocationErrors,
  errorHandler,
  createErrorResponse
};