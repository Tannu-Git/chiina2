const express = require('express');
const Order = require('../models/Order');
const Container = require('../models/Container');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/financials
// @desc    Get financial overview data (alias for dashboard)
// @access  Private (Admin only)
router.get('/', auth, authorize('admin'), async (req, res) => {
  try {
    const { period = 'month' } = req.query;

    // Calculate date range based on period
    const now = new Date();
    let startDate, endDate;

    switch (period) {
      case 'week':
        startDate = new Date(now.getFullYear(), now.getMonth(), now.getDate() - 7);
        endDate = now;
        break;
      case 'month':
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
        break;
      case 'quarter':
        const quarter = Math.floor(now.getMonth() / 3);
        startDate = new Date(now.getFullYear(), quarter * 3, 1);
        endDate = now;
        break;
      case 'year':
        startDate = new Date(now.getFullYear(), 0, 1);
        endDate = now;
        break;
      default:
        startDate = new Date(now.getFullYear(), now.getMonth(), 1);
        endDate = now;
    }

    const dateFilter = {
      createdAt: {
        $gte: startDate,
        $lte: endDate
      }
    };

    // Get orders and containers for the period
    const orders = await Order.find(dateFilter);
    const containers = await Container.find(dateFilter);

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + (order.totalCarryingCharges || 0), 0);
    const totalOrderValue = orders.reduce((sum, order) => sum + (order.totalAmount || 0), 0);
    const totalContainerCosts = containers.reduce((sum, container) => sum + (container.totalCosts || 0), 0);
    const totalContainerRevenue = containers.reduce((sum, container) => sum + (container.totalRevenue || 0), 0);
    const grossProfit = totalContainerRevenue - totalContainerCosts;
    const profitMargin = totalContainerRevenue > 0 ? (grossProfit / totalContainerRevenue * 100) : 0;

    // Recent transactions (last 10)
    const recentTransactions = orders
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 10)
      .map(order => ({
        id: order.orderNumber,
        type: 'order',
        description: `Order from ${order.clientName}`,
        amount: order.totalCarryingCharges || 0,
        date: order.createdAt,
        status: order.status
      }));

    // Add container transactions
    const containerTransactions = containers
      .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
      .slice(0, 5)
      .map(container => ({
        id: container.clientFacingId || container.realContainerId,
        type: 'container',
        description: `Container ${container.clientFacingId || container.realContainerId}`,
        amount: container.totalRevenue || 0,
        date: container.createdAt,
        status: container.status
      }));

    const allTransactions = [...recentTransactions, ...containerTransactions]
      .sort((a, b) => new Date(b.date) - new Date(a.date))
      .slice(0, 10);

    res.json({
      metrics: {
        totalRevenue,
        totalOrderValue,
        totalContainerCosts,
        totalContainerRevenue,
        grossProfit,
        profitMargin: Math.round(profitMargin * 100) / 100,
        orderCount: orders.length,
        containerCount: containers.length
      },
      recentTransactions: allTransactions,
      period,
      dateRange: {
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString()
      }
    });
  } catch (error) {
    console.error('Financial overview error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financials/dashboard
// @desc    Get financial dashboard data
// @access  Private (Admin only)
router.get('/dashboard', auth, authorize('admin'), async (req, res) => {
  try {
    const { startDate, endDate } = req.query;

    const dateFilter = {};
    if (startDate && endDate) {
      dateFilter.createdAt = {
        $gte: new Date(startDate),
        $lte: new Date(endDate)
      };
    }

    // Get orders in date range
    const orders = await Order.find(dateFilter);
    const containers = await Container.find(dateFilter);

    // Calculate metrics
    const totalRevenue = orders.reduce((sum, order) => sum + order.totalCarryingCharges, 0);
    const totalOrderValue = orders.reduce((sum, order) => sum + order.totalAmount, 0);
    const totalContainerCosts = containers.reduce((sum, container) => sum + container.totalCosts, 0);
    const totalContainerRevenue = containers.reduce((sum, container) => sum + container.totalRevenue, 0);
    const grossProfit = totalContainerRevenue - totalContainerCosts;
    const profitMargin = totalContainerRevenue > 0 ? (grossProfit / totalContainerRevenue) * 100 : 0;

    // Revenue by month
    const revenueByMonth = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: {
            year: { $year: '$createdAt' },
            month: { $month: '$createdAt' }
          },
          revenue: { $sum: '$totalCarryingCharges' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { '_id.year': 1, '_id.month': 1 } }
    ]);

    // Top clients by revenue
    const topClients = await Order.aggregate([
      { $match: dateFilter },
      {
        $group: {
          _id: '$clientId',
          clientName: { $first: '$clientName' },
          totalRevenue: { $sum: '$totalCarryingCharges' },
          orderCount: { $sum: 1 }
        }
      },
      { $sort: { totalRevenue: -1 } },
      { $limit: 10 }
    ]);

    // Container profitability
    const containerProfitability = containers.map(container => ({
      containerId: container.clientFacingId || container.realContainerId,
      revenue: container.totalRevenue,
      costs: container.totalCosts,
      profit: container.grossProfit,
      margin: container.profitMargin,
      status: container.status
    }));

    res.json({
      metrics: {
        totalRevenue,
        totalOrderValue,
        totalContainerCosts,
        totalContainerRevenue,
        grossProfit,
        profitMargin,
        orderCount: orders.length,
        containerCount: containers.length
      },
      revenueByMonth,
      topClients,
      containerProfitability
    });
  } catch (error) {
    console.error('Financial dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financials/profit-report
// @desc    Get detailed profit report
// @access  Private (Admin only)
router.get('/profit-report', auth, authorize('admin'), async (req, res) => {
  try {
    const { containerId } = req.query;

    let query = {};
    if (containerId) {
      query._id = containerId;
    }

    const containers = await Container.find(query)
      .populate('orders.orderId', 'orderNumber clientName totalCarryingCharges');

    const profitReport = containers.map(container => {
      // Recalculate to ensure accuracy
      container.calculateFinancials();

      return {
        containerId: container.realContainerId,
        clientFacingId: container.clientFacingId,
        status: container.status,
        revenue: {
          carryingCharges: container.totalRevenue,
          breakdown: container.orders.map(order => ({
            orderId: order.orderId?.orderNumber,
            clientName: order.orderId?.clientName,
            allocatedCharges: order.allocatedCharges,
            totalAllocated: order.allocatedCharges?.reduce((sum, charge) => {
              const valueINR = charge.currency === 'USD' ? charge.value * 83 : charge.value;
              return sum + valueINR;
            }, 0) || 0
          }))
        },
        costs: {
          total: container.totalCosts,
          breakdown: container.charges.map(charge => ({
            name: charge.name,
            value: charge.value,
            currency: charge.currency,
            valueINR: charge.currency === 'USD' ? charge.value * 83 : charge.value
          }))
        },
        profit: {
          gross: container.grossProfit,
          margin: container.profitMargin
        }
      };
    });

    res.json(profitReport);
  } catch (error) {
    console.error('Profit report error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/financials/exchange-rate
// @desc    Update exchange rate
// @access  Private (Admin only)
router.post('/exchange-rate', auth, authorize('admin'), async (req, res) => {
  try {
    const { rate } = req.body;

    if (!rate || rate <= 0) {
      return res.status(400).json({ message: 'Invalid exchange rate' });
    }

    // Update all containers with new exchange rate calculations
    const containers = await Container.find({});

    for (const container of containers) {
      container.calculateFinancials();
      await container.save();
    }

    res.json({
      message: 'Exchange rate updated successfully',
      rate,
      containersUpdated: containers.length
    });
  } catch (error) {
    console.error('Exchange rate update error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/financials/charge-allocation/:containerId
// @desc    Get charge allocation details for a container
// @access  Private (Admin only)
router.get('/charge-allocation/:containerId', auth, authorize('admin'), async (req, res) => {
  try {
    const container = await Container.findById(req.params.containerId)
      .populate('orders.orderId', 'orderNumber clientName totalCbm totalWeight');

    if (!container) {
      return res.status(404).json({ message: 'Container not found' });
    }

    // Recalculate allocation
    container.allocateCharges();
    await container.save();

    const allocationDetails = {
      containerId: container.realContainerId,
      clientFacingId: container.clientFacingId,
      totalCharges: container.charges,
      totalCbm: container.orders.reduce((sum, order) => sum + order.cbmShare, 0),
      clientAllocations: container.orders.map(order => ({
        orderId: order.orderId?.orderNumber,
        clientName: order.orderId?.clientName,
        cbmShare: order.cbmShare,
        weightShare: order.weightShare,
        allocationRatio: container.orders.reduce((sum, o) => sum + o.cbmShare, 0) > 0
          ? order.cbmShare / container.orders.reduce((sum, o) => sum + o.cbmShare, 0)
          : 0,
        allocatedCharges: order.allocatedCharges
      }))
    };

    res.json(allocationDetails);
  } catch (error) {
    console.error('Charge allocation error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
