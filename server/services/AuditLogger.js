const AuditLog = require('../models/AuditLog');

class AuditLogger {
  /**
   * Log an audit event
   * @param {string} action - The action being performed
   * @param {Object} user - The user performing the action
   * @param {Object} request - Express request object
   * @param {Object} options - Additional options
   */
  static async log(action, user, request, options = {}) {
    try {
      const {
        resourceType = 'system',
        resourceId = null,
        details = {},
        oldValues = null,
        newValues = null,
        severity = 'medium',
        success = true,
        errorMessage = null,
        complianceFlags = []
      } = options;

      const auditEntry = new AuditLog({
        action,
        userId: user.id || user._id,
        userEmail: user.email,
        userRole: user.role,
        resourceType,
        resourceId,
        ipAddress: this.getClientIP(request),
        userAgent: request.headers['user-agent'] || 'Unknown',
        details: this.sanitizeDetails(details),
        oldValues: this.sanitizeDetails(oldValues),
        newValues: this.sanitizeDetails(newValues),
        severity,
        success,
        errorMessage,
        sessionId: request.sessionID || request.headers['x-session-id'],
        complianceFlags
      });

      await auditEntry.save();
      
      // Log critical events to console for immediate attention
      if (severity === 'critical' || !success) {
        console.error(`[AUDIT CRITICAL] ${action} by ${user.email} from ${this.getClientIP(request)}`);
      }

      return auditEntry;
    } catch (error) {
      console.error('Audit logging failed:', error);
      // Don't throw - audit logging failure shouldn't break the main operation
    }
  }

  /**
   * Log user authentication events
   */
  static async logAuth(action, user, request, success = true, errorMessage = null) {
    return this.log(action, user, request, {
      resourceType: 'user',
      resourceId: user.id || user._id,
      severity: success ? 'low' : 'high',
      success,
      errorMessage,
      details: {
        loginAttempt: true,
        timestamp: new Date()
      }
    });
  }

  /**
   * Log data access events
   */
  static async logDataAccess(user, request, resourceType, resourceId, action = 'DATA_ACCESS') {
    return this.log(action, user, request, {
      resourceType,
      resourceId,
      severity: 'low',
      details: {
        endpoint: request.originalUrl,
        method: request.method,
        query: request.query
      }
    });
  }

  /**
   * Log financial operations
   */
  static async logFinancial(action, user, request, details = {}) {
    return this.log(action, user, request, {
      resourceType: 'financial',
      severity: 'high',
      complianceFlags: ['financial_audit', 'sox'],
      details: {
        ...details,
        timestamp: new Date(),
        financialOperation: true
      }
    });
  }

  /**
   * Log warehouse operations
   */
  static async logWarehouse(action, user, request, orderId, details = {}) {
    return this.log(action, user, request, {
      resourceType: 'warehouse',
      resourceId: orderId,
      severity: 'medium',
      details: {
        ...details,
        warehouseOperation: true
      }
    });
  }

  /**
   * Log security violations
   */
  static async logSecurityViolation(user, request, violation, details = {}) {
    return this.log('SECURITY_VIOLATION', user, request, {
      resourceType: 'system',
      severity: 'critical',
      success: false,
      details: {
        violation,
        ...details,
        securityEvent: true
      }
    });
  }

  /**
   * Log order operations with before/after values
   */
  static async logOrderChange(action, user, request, orderId, oldValues, newValues) {
    return this.log(action, user, request, {
      resourceType: 'order',
      resourceId: orderId,
      severity: 'medium',
      oldValues,
      newValues,
      details: {
        orderOperation: true,
        changedFields: this.getChangedFields(oldValues, newValues)
      }
    });
  }

  /**
   * Log container operations
   */
  static async logContainer(action, user, request, containerId, details = {}) {
    return this.log(action, user, request, {
      resourceType: 'container',
      resourceId: containerId,
      severity: 'medium',
      details: {
        ...details,
        containerOperation: true
      }
    });
  }

  /**
   * Get client IP address from request
   */
  static getClientIP(request) {
    return request.ip || 
           request.connection?.remoteAddress || 
           request.socket?.remoteAddress ||
           request.headers['x-forwarded-for']?.split(',')[0] ||
           'unknown';
  }

  /**
   * Sanitize sensitive data from details
   */
  static sanitizeDetails(data) {
    if (!data || typeof data !== 'object') return data;
    
    const sanitized = { ...data };
    const sensitiveFields = ['password', 'token', 'secret', 'key', 'creditCard', 'ssn'];
    
    for (const field of sensitiveFields) {
      if (sanitized[field]) {
        sanitized[field] = '[REDACTED]';
      }
    }
    
    return sanitized;
  }

  /**
   * Get changed fields between old and new values
   */
  static getChangedFields(oldValues, newValues) {
    if (!oldValues || !newValues) return [];
    
    const changes = [];
    const allKeys = new Set([...Object.keys(oldValues), ...Object.keys(newValues)]);
    
    for (const key of allKeys) {
      if (JSON.stringify(oldValues[key]) !== JSON.stringify(newValues[key])) {
        changes.push(key);
      }
    }
    
    return changes;
  }

  /**
   * Get audit trail for a specific resource
   */
  static async getAuditTrail(resourceType, resourceId, limit = 50) {
    return AuditLog.find({ resourceType, resourceId })
      .sort({ timestamp: -1 })
      .limit(limit)
      .populate('userId', 'name email');
  }

  /**
   * Get security dashboard data
   */
  static async getSecurityDashboard(hours = 24) {
    const since = new Date(Date.now() - hours * 60 * 60 * 1000);
    
    const [
      totalEvents,
      securityEvents,
      failedLogins,
      criticalEvents,
      topUsers
    ] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: since } }),
      AuditLog.getSecurityEvents(hours),
      AuditLog.countDocuments({ 
        timestamp: { $gte: since },
        action: 'USER_LOGIN',
        success: false
      }),
      AuditLog.countDocuments({
        timestamp: { $gte: since },
        severity: 'critical'
      }),
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
      ])
    ]);

    return {
      totalEvents,
      securityEvents: securityEvents.length,
      failedLogins,
      criticalEvents,
      topUsers,
      recentSecurityEvents: securityEvents.slice(0, 10)
    };
  }
}

module.exports = AuditLogger;
