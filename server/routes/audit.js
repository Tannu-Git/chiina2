const express = require('express');
const AuditLog = require('../models/AuditLog');
const AuditLogger = require('../services/AuditLogger');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/audit/logs
// @desc    Get audit logs (Admin only)
// @access  Private (Admin only)
router.get('/logs', auth, authorize('admin'), async (req, res) => {
  try {
    const {
      page = 1,
      limit = 50,
      action,
      userId,
      resourceType,
      severity,
      startDate,
      endDate,
      search
    } = req.query;

    const query = {};

    // Apply filters
    if (action) query.action = action;
    if (userId) query.userId = userId;
    if (resourceType) query.resourceType = resourceType;
    if (severity) query.severity = severity;

    // Date range filter
    if (startDate || endDate) {
      query.timestamp = {};
      if (startDate) query.timestamp.$gte = new Date(startDate);
      if (endDate) query.timestamp.$lte = new Date(endDate);
    }

    // Search filter
    if (search) {
      query.$or = [
        { action: { $regex: search, $options: 'i' } },
        { userEmail: { $regex: search, $options: 'i' } },
        { 'details.endpoint': { $regex: search, $options: 'i' } }
      ];
    }

    const logs = await AuditLog.find(query)
      .populate('userId', 'name email')
      .sort({ timestamp: -1 })
      .limit(limit * 1)
      .skip((page - 1) * limit);

    const total = await AuditLog.countDocuments(query);

    // Log this audit access
    await AuditLogger.logDataAccess(
      req.user,
      req,
      'audit',
      null,
      'AUDIT_LOGS_ACCESSED'
    );

    res.json({
      logs,
      pagination: {
        current: parseInt(page),
        pages: Math.ceil(total / limit),
        total
      }
    });
  } catch (error) {
    console.error('Get audit logs error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/security-dashboard
// @desc    Get security dashboard data
// @access  Private (Admin only)
router.get('/security-dashboard', auth, authorize('admin'), async (req, res) => {
  try {
    const { hours = 24 } = req.query;
    
    const dashboardData = await AuditLogger.getSecurityDashboard(parseInt(hours));

    // Log security dashboard access
    await AuditLogger.logDataAccess(
      req.user,
      req,
      'audit',
      null,
      'SECURITY_DASHBOARD_ACCESSED'
    );

    res.json(dashboardData);
  } catch (error) {
    console.error('Security dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/user/:userId
// @desc    Get audit trail for specific user
// @access  Private (Admin only)
router.get('/user/:userId', auth, authorize('admin'), async (req, res) => {
  try {
    const { userId } = req.params;
    const { limit = 50 } = req.query;

    const logs = await AuditLogger.getAuditTrail('user', userId, parseInt(limit));

    // Log user audit trail access
    await AuditLogger.logDataAccess(
      req.user,
      req,
      'audit',
      userId,
      'USER_AUDIT_TRAIL_ACCESSED'
    );

    res.json({ logs });
  } catch (error) {
    console.error('User audit trail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/resource/:type/:id
// @desc    Get audit trail for specific resource
// @access  Private (Admin only)
router.get('/resource/:type/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { type, id } = req.params;
    const { limit = 50 } = req.query;

    const logs = await AuditLogger.getAuditTrail(type, id, parseInt(limit));

    // Log resource audit trail access
    await AuditLogger.logDataAccess(
      req.user,
      req,
      'audit',
      id,
      'RESOURCE_AUDIT_TRAIL_ACCESSED'
    );

    res.json({ logs });
  } catch (error) {
    console.error('Resource audit trail error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/financial-report
// @desc    Get financial audit report
// @access  Private (Admin only)
router.get('/financial-report', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    if (!startDate || !endDate) {
      return res.status(400).json({
        message: 'Start date and end date are required'
      });
    }

    const logs = await AuditLog.getFinancialAuditTrail(
      new Date(startDate),
      new Date(endDate)
    );

    // Log financial audit report generation
    await AuditLogger.logFinancial(
      'FINANCIAL_AUDIT_REPORT_GENERATED',
      req.user,
      req,
      {
        startDate,
        endDate,
        recordCount: logs.length
      }
    );

    res.json({
      logs,
      period: { startDate, endDate },
      recordCount: logs.length
    });
  } catch (error) {
    console.error('Financial audit report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/actions
// @desc    Get available audit actions for filtering
// @access  Private (Admin only)
router.get('/actions', auth, authorize('admin'), async (req, res) => {
  try {
    const actions = await AuditLog.distinct('action');
    res.json({ actions: actions.sort() });
  } catch (error) {
    console.error('Get audit actions error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/audit/stats
// @desc    Get audit statistics
// @access  Private (Admin only)
router.get('/stats', auth, authorize('admin'), async (req, res) => {
  try {
    const { days = 30 } = req.query;
    const since = new Date(Date.now() - days * 24 * 60 * 60 * 1000);

    const [
      totalLogs,
      actionStats,
      severityStats,
      userStats,
      dailyStats
    ] = await Promise.all([
      AuditLog.countDocuments({ timestamp: { $gte: since } }),
      
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$action', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 }
      ]),
      
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$severity', count: { $sum: 1 } } }
      ]),
      
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        { $group: { _id: '$userId', count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 10 },
        { $lookup: { from: 'users', localField: '_id', foreignField: '_id', as: 'user' } }
      ]),
      
      AuditLog.aggregate([
        { $match: { timestamp: { $gte: since } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$timestamp' } },
            count: { $sum: 1 }
          }
        },
        { $sort: { _id: 1 } }
      ])
    ]);

    res.json({
      totalLogs,
      actionStats,
      severityStats,
      userStats,
      dailyStats,
      period: { days, since }
    });
  } catch (error) {
    console.error('Audit stats error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/audit/cleanup
// @desc    Clean up old audit logs based on retention policy
// @access  Private (Admin only)
router.delete('/cleanup', auth, authorize('admin'), async (req, res) => {
  try {
    const now = new Date();
    const result = await AuditLog.deleteMany({
      retentionDate: { $lt: now }
    });

    // Log the cleanup operation
    await AuditLogger.log(
      'AUDIT_CLEANUP_PERFORMED',
      req.user,
      req,
      {
        resourceType: 'audit',
        severity: 'medium',
        details: {
          deletedCount: result.deletedCount,
          cleanupDate: now
        }
      }
    );

    res.json({
      message: 'Audit log cleanup completed',
      deletedCount: result.deletedCount
    });
  } catch (error) {
    console.error('Audit cleanup error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
