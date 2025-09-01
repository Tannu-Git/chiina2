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

    // Get current month data (exclude loop-backs)
    const currentMonthOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: startOfMonth },
      isLoopBack: { $ne: true }
    });

    const currentMonthContainers = await Container.find({
      ...containerQuery,
      createdAt: { $gte: startOfMonth }
    });

    // Get last month data for comparison (exclude loop-backs)
    const lastMonthOrders = await Order.find({
      ...orderQuery,
      createdAt: { $gte: startOfLastMonth, $lte: endOfLastMonth },
      isLoopBack: { $ne: true }
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

    // Get recent orders (last 5, exclude loop-backs)
    const recentOrders = await Order.find({ ...orderQuery, isLoopBack: { $ne: true } })
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber clientName status totalAmount createdAt');

    // Get container updates (last 5)
    const containerUpdates = await Container.find(containerQuery)
      .sort({ updatedAt: -1 })
      .limit(5)
      .select('clientFacingId realContainerId status location estimatedArrival type');

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
        id: container.clientFacingId || container.realContainerId || `CONT-${container._id.toString().slice(-6).toUpperCase()}`,
        realId: container.realContainerId,
        clientId: container.clientFacingId,
        status: container.status || 'unknown',
        location: container.location?.current || 'Location pending',
        eta: container.estimatedArrival?.toISOString().split('T')[0] || null,
        type: container.type || 'unknown'
      }))
    });
  } catch (error) {
    console.error('Dashboard error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/dashboard/shipments
// @desc    Get real-time shipment data for dashboard
// @access  Private
router.get('/shipments', auth, async (req, res) => {
  try {
    const { user } = req;
    const { client, supplier } = req.query;
    
    // Build query based on user role
    let orderQuery = { isLoopBack: { $ne: true } };
    
    if (user.role === 'client') {
      orderQuery.clientId = user.clientId;
    }
    
    // Apply filters if provided
    if (client && client !== 'All') {
      orderQuery.clientName = client;
    }
    
    // Get orders with populated items
    const orders = await Order.find(orderQuery)
      .populate('containerId', 'clientFacingId status')
      .select('orderNumber clientName items totalAmount totalWeight totalCbm createdAt');
    
    // Transform orders into shipment data format similar to sample data
    const shipmentData = [];
    
    orders.forEach(order => {
      order.items.forEach(item => {
        // Apply supplier filter if specified
        if (supplier && supplier !== 'All' && item.supplier?.name !== supplier) {
          return;
        }
        
        const shipmentItem = {
          "ITEM NO.": item.itemCode,
          "DESCRIPTION": item.description,
          "PRICE": item.unitPrice || 0,
          "QTY": item.quantity,
          "CTNS": item.cartons,
          "T.QTY": item.quantity * item.cartons,
          "AMOUNT": item.totalPrice || (item.unitPrice * item.quantity),
          "CBM": item.unitCbm || 0,
          "T.CBM": (item.unitCbm || 0) * item.cartons,
          "WT": item.unitWeight || 0,
          "T.WT": (item.unitWeight || 0) * item.cartons,
          "SUPPLIER": item.supplier?.name || 'Unknown',
          "CLIENT": order.clientName,
          "CARRYING": item.carryingCharge?.amount || 0,
          "ORDER_NUMBER": order.orderNumber,
          "CONTAINER_ID": order.containerId?.clientFacingId || 'Unassigned',
          "STATUS": item.status || 'pending',
          "CREATED_AT": order.createdAt
        };
        
        shipmentData.push(shipmentItem);
      });
    });
    
    // Get unique clients and suppliers for filters
    const clients = [...new Set(shipmentData.map(item => item.CLIENT).filter(Boolean))].sort();
    const suppliers = [...new Set(shipmentData.map(item => item.SUPPLIER).filter(Boolean))].sort();
    
    res.json({
      shipmentData,
      filters: {
        clients,
        suppliers
      }
    });
  } catch (error) {
    console.error('Shipment data error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
