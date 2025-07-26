const express = require('express');
const Order = require('../models/Order');
const Container = require('../models/Container');
const User = require('../models/User');
const { auth } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/dashboard
// @desc    Get dashboard overview data
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { user } = req;
    
    // Date filters for current month
    const currentDate = new Date();
    const startOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - 1, 1);
    const endOfLastMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 0);

    // Build query based on user role
    let orderQuery = {};
    let containerQuery = {};
    
    if (user.role === 'client') {
      orderQuery.clientId = user.clientId;
      containerQuery['orders.clientId'] = user.clientId;
    }

    // Get current month data
    const currentMonthOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: startOfMonth }
    });

    const currentMonthContainers = await Container.find({
      ...containerQuery,
      createdAt: { $gte: startOfMonth }
    });

    // Get last month data for comparison
    const lastMonthOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    const lastMonthContainers = await Container.find({
      ...containerQuery,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth }
    });

    // Calculate metrics
    const totalOrders = currentMonthOrders.length;
    const lastMonthOrderCount = lastMonthOrders.length;
    const orderGrowth = lastMonthOrderCount > 0 
      ? ((totalOrders - lastMonthOrderCount) / lastMonthOrderCount * 100).toFixed(1)
      : 0;

    const activeContainers = currentMonthContainers.filter(c => 
      ['planning', 'loading', 'in_transit'].includes(c.status)
    ).length;
    const lastMonthActiveContainers = lastMonthContainers.filter(c => 
      ['planning', 'loading', 'in_transit'].includes(c.status)
    ).length;
    const containerGrowth = lastMonthActiveContainers > 0
      ? ((activeContainers - lastMonthActiveContainers) / lastMonthActiveContainers * 100).toFixed(1)
      : 0;

    // Calculate revenue (only for admin/staff)
    let totalRevenue = 0;
    let revenueGrowth = 0;
    let profitMargin = 0;
    
    if (user.role !== 'client') {
      totalRevenue = currentMonthOrders.reduce((sum, order) => sum + (order.totalCarryingCharges || 0), 0);
      const lastMonthRevenue = lastMonthOrders.reduce((sum, order) => sum + (order.totalCarryingCharges || 0), 0);
      revenueGrowth = lastMonthRevenue > 0 
        ? ((totalRevenue - lastMonthRevenue) / lastMonthRevenue * 100).toFixed(1)
        : 0;

      // Calculate profit margin from containers
      const totalCosts = currentMonthContainers.reduce((sum, container) => sum + (container.totalCosts || 0), 0);
      const totalContainerRevenue = currentMonthContainers.reduce((sum, container) => sum + (container.totalRevenue || 0), 0);
      profitMargin = totalContainerRevenue > 0 
        ? (((totalContainerRevenue - totalCosts) / totalContainerRevenue) * 100).toFixed(1)
        : 0;
    }

    // Get recent orders (last 5)
    const recentOrders = await Order.find(orderQuery)
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber clientName status totalAmount createdAt');

    // Get container updates (last 5)
    const containerUpdates = await Container.find(containerQuery)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('clientFacingId status location estimatedArrival');

    // Build metrics response
    const metrics = [
      {
        title: 'Total Orders',
        value: totalOrders.toString(),
        change: `${orderGrowth >= 0 ? '+' : ''}${orderGrowth}% from last month`,
        changeType: orderGrowth >= 0 ? 'positive' : 'negative'
      },
      {
        title: 'Active Containers',
        value: activeContainers.toString(),
        change: `${containerGrowth >= 0 ? '+' : ''}${containerGrowth}% from last month`,
        changeType: containerGrowth >= 0 ? 'positive' : 'negative'
      }
    ];

    // Add revenue metrics for admin/staff
    if (user.role !== 'client') {
      metrics.push(
        {
          title: 'Revenue',
          value: totalRevenue,
          change: `${revenueGrowth >= 0 ? '+' : ''}${revenueGrowth}% from last month`,
          changeType: revenueGrowth >= 0 ? 'positive' : 'negative'
        },
        {
          title: 'Profit Margin',
          value: `${profitMargin}%`,
          change: `${profitMargin >= 15 ? 'Healthy' : 'Needs attention'}`,
          changeType: profitMargin >= 15 ? 'positive' : 'negative'
        }
      );
    }

    res.json({
      metrics,
      recentOrders: recentOrders.map(order => ({
        id: order.orderNumber,
        client: order.clientName,
        status: order.status,
        value: order.totalAmount,
        date: order.createdAt.toISOString().split('T')[0]
      })),
      containerUpdates: containerUpdates.map(container => ({
        id: container.clientFacingId,
        status: container.status,
        location: container.location?.current || 'Unknown',
        eta: container.estimatedArrival?.toISOString().split('T')[0] || 'TBD'
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
