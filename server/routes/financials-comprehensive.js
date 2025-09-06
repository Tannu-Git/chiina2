const express = require('express');
const mongoose = require('mongoose');
const { body, validationResult } = require('express-validator');
const { PaymentTransaction, AccountBalance, Invoice } = require('../models/Payment');
const Order = require('../models/Order');
const Container = require('../models/Container');
const ShippingCompany = require('../models/ShippingCompany');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// @route   GET /api/financials/comprehensive-dashboard
// @desc    Get comprehensive financial dashboard with client-wise, supplier-wise, and transport-wise breakdowns
// @access  Private (Admin/Staff only)
router.get('/comprehensive-dashboard', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { period = '30' } = req.query;
    const daysAgo = parseInt(period);
    
    const dateFilter = {
      createdAt: {
        $gte: new Date(Date.now() - daysAgo * 24 * 60 * 60 * 1000)
      }
    };

    // Get all orders and containers with populated data
    const orders = await Order.find({ 
      ...dateFilter, 
      isLoopBack: { $ne: true },
      status: { $ne: 'cancelled' }
    }).populate('containerId', 'realContainerId clientFacingId baseCharges shippingCompany');
    
    const containers = await Container.find(dateFilter)
      .populate('orders.orderId', 'orderNumber items');

    // CLIENT-WISE FINANCIAL BREAKDOWN
    const clientFinancials = {};
    
    orders.forEach(order => {
      const clientId = order.clientId;
      if (!clientFinancials[clientId]) {
        clientFinancials[clientId] = {
          clientId,
          clientName: order.clientName,
          totalOrderValue: 0,
          totalCarryingCharges: 0,
          paymentBreakdown: {
            throughMe: { amount: 0, orders: 0 },
            direct: { amount: 0, orders: 0 }
          },
          gstCharges: 0,
          orders: [],
          containers: new Set()
        };
      }
      
      const client = clientFinancials[clientId];
      client.totalOrderValue += order.totalAmount || 0;
      client.totalCarryingCharges += order.totalCarryingCharges || 0;
      client.orders.push({
        orderNumber: order.orderNumber,
        amount: order.totalAmount || 0,
        carryingCharges: order.totalCarryingCharges || 0,
        status: order.status
      });
      
      if (order.containerId) {
        client.containers.add(order.containerId.realContainerId || order.containerId.clientFacingId);
        // Add GST from container base charges
        const container = order.containerId;
        if (container.baseCharges) {
          client.gstCharges += (container.baseCharges.gst || 0) / container.orders.length; // Proportional GST
        }
      }
    });
    
    // Process containers for payment type breakdown
    containers.forEach(container => {
      container.orders.forEach(containerOrder => {
        const clientId = containerOrder.clientId;
        if (clientFinancials[clientId]) {
          const client = clientFinancials[clientId];
          const carryingCharges = containerOrder.carryingCharges || 0;
          
          // Add container to client's containers (FIXED: Add containers from container orders)
          client.containers.add(container.realContainerId || container.clientFacingId);
          
          if (containerOrder.paymentType === 'THROUGH_ME') {
            // Through Me: Client pays you BOTH product cost AND carrying charges
            const order = orders.find(o => o.clientId === containerOrder.clientId);
            const productCost = order && order.items ? 
              order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
            
            client.paymentBreakdown.throughMe.amount += productCost + carryingCharges; // Total amount from client
            client.paymentBreakdown.throughMe.orders++;
          } else if (containerOrder.paymentType === 'CLIENT_DIRECT') {
            // Direct: Client pays you only carrying charges (product goes directly to supplier)
            client.paymentBreakdown.direct.amount += carryingCharges; // Only carrying charges
            client.paymentBreakdown.direct.orders++;
          }
        }
      });
    });
    
    // Convert containers Set to Array for JSON serialization
    Object.values(clientFinancials).forEach(client => {
      client.containers = Array.from(client.containers);
      // Calculate actual carrying charges only (not including product costs)
      client.totalCarryingCharges = client.orders.reduce((sum, order) => sum + order.carryingCharges, 0);
    });

    // APPLY PAYMENT COLLECTIONS TO INDIVIDUAL CLIENTS (BEFORE SUMMARY CALCULATIONS)
    // Query payment collections directly from MongoDB collection
    const PaymentCollectionModel = mongoose.connection.collection('paymentcollections');
    const paymentCollections = await PaymentCollectionModel.find({}).toArray();
    
    // Apply received payments to individual client records
    paymentCollections.forEach(payment => {
      const client = clientFinancials[payment.clientId];
      if (client) {
        const receivedAmount = payment.receivedAmount || 0;
        
        if (payment.paymentType === 'THROUGH_ME') {
          // FIXED: Allow negative amounts for credit balances and overpayments
          client.paymentBreakdown.throughMe.amount = client.paymentBreakdown.throughMe.amount - receivedAmount;
        } else if (payment.paymentType === 'CLIENT_DIRECT') {
          // For CLIENT_DIRECT, deduct proportionally from throughMe (since most payments are throughMe)
          client.paymentBreakdown.throughMe.amount = client.paymentBreakdown.throughMe.amount - receivedAmount;
        } else {
          // For unspecified payment types, deduct from throughMe as default
          client.paymentBreakdown.throughMe.amount = client.paymentBreakdown.throughMe.amount - receivedAmount;
        }
      }
    });

    // SUPPLIER-WISE FINANCIAL BREAKDOWN
    const supplierFinancials = {};
    
    orders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (item.supplier && item.supplier.name) {
            const supplierId = item.supplier.name;
            if (!supplierFinancials[supplierId]) {
              supplierFinancials[supplierId] = {
                supplierId,
                supplierName: item.supplier.name,
                totalProductValue: 0,
                paymentBreakdown: {
                  throughMe: { amount: 0, orders: 0 },
                  direct: { amount: 0, orders: 0 }
                },
                orders: [],
                contact: item.supplier.contact || item.supplier.email
              };
            }
            
            const supplier = supplierFinancials[supplierId];
            const productValue = (item.totalPrice || 0);
            supplier.totalProductValue += productValue;
            
            supplier.orders.push({
              orderNumber: order.orderNumber,
              productValue,
              paymentType: item.paymentType,
              itemDescription: item.description
            });
            
            if (item.paymentType === 'THROUGH_ME') {
              supplier.paymentBreakdown.throughMe.amount += productValue;
              supplier.paymentBreakdown.throughMe.orders++;
            } else if (item.paymentType === 'CLIENT_DIRECT') {
              supplier.paymentBreakdown.direct.amount += productValue;
              supplier.paymentBreakdown.direct.orders++;
            }
          }
        });
      }
    });

    // TRANSPORT COMPANY-WISE FINANCIAL BREAKDOWN
    const transportFinancials = {};
    
    containers.forEach(container => {
      if (container.shippingCompany && container.shippingCompany.name) {
        const transportId = container.shippingCompany.id || container.shippingCompany.name;
        if (!transportFinancials[transportId]) {
          transportFinancials[transportId] = {
            transportId,
            companyName: container.shippingCompany.name,
            totalShippingCosts: 0,
            totalContainers: 0,
            containers: [],
            contactInfo: container.shippingCompany.contactInfo
          };
        }
        
        const transport = transportFinancials[transportId];
        const shippingCosts = (container.shippingCompany.rates?.oceanFreight || 0) + 
                            (container.shippingCompany.rates?.localCharges || 0);
        
        transport.totalShippingCosts += shippingCosts;
        transport.totalContainers++;
        transport.containers.push({
          containerId: container.realContainerId || container.clientFacingId,
          shippingCosts,
          status: container.status
        });
      }
    });

    // OVERALL GST AND CHARGES BREAKDOWN
    const chargesBreakdown = {
      totalGST: 0,
      totalDuty: 0,
      totalMisc: 0,
      totalExtraCharges: 0,
      containerCount: containers.length
    };
    
    containers.forEach(container => {
      if (container.baseCharges) {
        chargesBreakdown.totalGST += container.baseCharges.gst || 0;
        chargesBreakdown.totalDuty += container.baseCharges.duty || 0;
        chargesBreakdown.totalMisc += container.baseCharges.misc || 0;
        chargesBreakdown.totalExtraCharges += container.baseCharges.extraCharge || 0;
      }
    });

    // PROFIT CALCULATION: ALL carrying charges (both direct and through me) - (GST + Duty + Misc + Extra Charges)
    // You get carrying charges regardless of payment type - direct or through me
    const totalCarryingCharges = Object.values(clientFinancials)
      .reduce((sum, client) => sum + client.totalCarryingCharges, 0); // All carrying charges
    
    const totalCharges = chargesBreakdown.totalGST + chargesBreakdown.totalDuty + 
                        chargesBreakdown.totalMisc + chargesBreakdown.totalExtraCharges;
    
    const totalProfit = totalCarryingCharges - totalCharges;
    const profitMargin = totalCarryingCharges > 0 ? (totalProfit / totalCarryingCharges) * 100 : 0;

    // PAYMENT FLOW SUMMARY - Cash flow through you vs direct supplier payments
    const paymentFlowSummary = {
      throughMe: {
        // For through me: client pays you (product cost + carrying charges), you pay supplier (product cost)
        clientPayments: Object.values(clientFinancials)
          .reduce((sum, client) => sum + client.paymentBreakdown.throughMe.amount, 0), // What you collect from clients
        supplierPayments: Object.values(supplierFinancials)
          .reduce((sum, supplier) => sum + supplier.paymentBreakdown.throughMe.amount, 0), // What you pay to suppliers
        netCashFlow: 0 // Will be calculated below
      },
      direct: {
        // For direct: client pays supplier directly, but still pays you carrying charges separately
        carryingCharges: Object.values(clientFinancials)
          .reduce((sum, client) => sum + client.paymentBreakdown.direct.amount, 0), // Your carrying charges
        supplierPayments: Object.values(supplierFinancials)
          .reduce((sum, supplier) => sum + supplier.paymentBreakdown.direct.amount, 0) // Client pays supplier directly
      }
    };
    
    // Calculate net cash flow for through me transactions
    paymentFlowSummary.throughMe.netCashFlow = 
      paymentFlowSummary.throughMe.clientPayments - paymentFlowSummary.throughMe.supplierPayments;

    // Calculate received amounts by payment type (using already queried payment collections)
    const receivedByPaymentType = { throughMe: 0, direct: 0 };
    
    paymentCollections.forEach(payment => {
      // Categorize received payments by type (if payment type is available)
      if (payment.paymentType === 'THROUGH_ME') {
        receivedByPaymentType.throughMe += payment.receivedAmount;
      } else if (payment.paymentType === 'CLIENT_DIRECT') {
        receivedByPaymentType.direct += payment.receivedAmount;
      } else {
        // For payments without specific type, distribute proportionally
        const totalGross = paymentFlowSummary.throughMe.clientPayments + paymentFlowSummary.direct.carryingCharges;
        if (totalGross > 0) {
          const throughMeRatio = paymentFlowSummary.throughMe.clientPayments / totalGross;
          receivedByPaymentType.throughMe += payment.receivedAmount * throughMeRatio;
          receivedByPaymentType.direct += payment.receivedAmount * (1 - throughMeRatio);
        }
      }
    });
    
    // Update payment flow to show net pending amounts - apply to correct payment types
    paymentFlowSummary.throughMe.clientPayments -= receivedByPaymentType.throughMe;
    paymentFlowSummary.direct.carryingCharges -= receivedByPaymentType.direct;
    
    // FIXED: Allow negative amounts to show overpayments and credit balances
    // Don't cap at 0 - negative values indicate overpayments (credit balances)
    
    // Recalculate net cash flow
    paymentFlowSummary.throughMe.netCashFlow = 
      paymentFlowSummary.throughMe.clientPayments - paymentFlowSummary.throughMe.supplierPayments;

    res.json({
      period: `${period} days`,
      summary: {
        totalCarryingCharges,
        totalCharges,
        totalProfit,
        profitMargin: parseFloat(profitMargin.toFixed(2)),
        totalOrders: orders.length,
        totalContainers: containers.length
      },
      clientFinancials: Object.values(clientFinancials),
      supplierFinancials: Object.values(supplierFinancials),
      transportFinancials: Object.values(transportFinancials),
      chargesBreakdown,
      paymentFlowSummary,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Comprehensive dashboard error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/financials/payment-collections
// @desc    Get detailed payment collections and outstanding amounts
// @access  Private (Admin/Staff only)
router.get('/payment-collections', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Get all containers with orders
    const containers = await Container.find({})
      .populate('orders.orderId', 'orderNumber clientName totalAmount items')
      .sort({ createdAt: -1 });

    const paymentCollections = {
      toCollectFromClients: [],
      toPayToSuppliers: [],
      summary: {
        totalToCollect: 0,
        totalToPay: 0,
        netPosition: 0,
        totalClientsOwing: 0,
        totalSuppliersOwed: 0
      }
    };

    // Process each container for payment collections
    containers.forEach(container => {
      const clientCollections = {};
      const supplierPayments = {};

      container.orders.forEach(containerOrder => {
        const order = containerOrder.orderId;
        if (!order) return;

        const clientId = containerOrder.clientId;
        const carryingCharges = containerOrder.carryingCharges || 0;

        // CLIENT COLLECTIONS (What you need to collect - ALL carrying charges regardless of payment type)
        if (!clientCollections[clientId]) {
          clientCollections[clientId] = {
            clientId,
            clientName: containerOrder.clientName,
            carryingCharges: 0, // Your carrying charges (always collected)
            throughMeAmount: 0,  // Product cost + carrying charges (only for through me)
            directAmount: 0,     // Product cost (for direct payments - client pays supplier)
            totalAmount: 0,
            orders: [],
            containers: []
          };
        }

        const clientCollection = clientCollections[clientId];
        clientCollection.containers.push({
          containerId: container.realContainerId || container.clientFacingId,
          carryingCharges,
          paymentType: containerOrder.paymentType
        });

        if (containerOrder.paymentType === 'THROUGH_ME') {
          // Through me: client pays you everything (product + carrying), you pay supplier product cost
          const productCost = order.items ? order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
          clientCollection.throughMeAmount += productCost + carryingCharges; // Client pays you TOTAL amount
          clientCollection.orders.push({
            orderNumber: order.orderNumber,
            amount: productCost + carryingCharges, // Total amount client owes you
            carryingCharges,
            productCost,
            type: 'THROUGH_ME',
            status: 'PENDING'
          });
        } else {
          // Direct: client pays supplier directly for products, pays you carrying charges separately
          const productCost = order.items ? order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
          clientCollection.directAmount += productCost; // This goes to supplier directly
          clientCollection.carryingCharges += carryingCharges; // You still get carrying charges
          clientCollection.orders.push({
            orderNumber: order.orderNumber,
            amount: carryingCharges, // You only collect carrying charges
            carryingCharges,
            productCost,
            type: 'DIRECT',
            status: 'PENDING'
          });
        }

        clientCollection.totalAmount = clientCollection.throughMeAmount + clientCollection.carryingCharges;

        // SUPPLIER PAYMENTS (What we need to pay for THROUGH_ME orders)
        if (order.items && containerOrder.paymentType === 'THROUGH_ME') {
          order.items.forEach(item => {
            if (item.supplier && item.supplier.name) {
              const supplierId = item.supplier.name;
              if (!supplierPayments[supplierId]) {
                supplierPayments[supplierId] = {
                  supplierId,
                  supplierName: item.supplier.name,
                  totalAmount: 0,
                  orders: [],
                  contact: item.supplier.contact || item.supplier.email
                };
              }

              const productValue = item.totalPrice || 0;
              supplierPayments[supplierId].totalAmount += productValue;
              supplierPayments[supplierId].orders.push({
                orderNumber: order.orderNumber,
                productValue,
                itemDescription: item.description,
                status: 'PENDING'
              });
            }
          });
        }
      });

      // Add to overall collections
      Object.values(clientCollections).forEach(client => {
        const existingClient = paymentCollections.toCollectFromClients
          .find(c => c.clientId === client.clientId);
        
        if (existingClient) {
          existingClient.throughMeAmount += client.throughMeAmount;
          existingClient.directAmount += client.directAmount;
          existingClient.totalAmount += client.totalAmount;
          existingClient.orders.push(...client.orders);
          existingClient.containers.push(...client.containers);
        } else {
          paymentCollections.toCollectFromClients.push(client);
        }
      });

      Object.values(supplierPayments).forEach(supplier => {
        const existingSupplier = paymentCollections.toPayToSuppliers
          .find(s => s.supplierId === supplier.supplierId);
        
        if (existingSupplier) {
          existingSupplier.totalAmount += supplier.totalAmount;
          existingSupplier.orders.push(...supplier.orders);
        } else {
          paymentCollections.toPayToSuppliers.push(supplier);
        }
      });
    });

    // Calculate summary - What you actually collect vs what you pay out
    paymentCollections.summary.totalToCollect = paymentCollections.toCollectFromClients
      .reduce((sum, client) => sum + client.carryingCharges + client.throughMeAmount, 0); // All carrying charges + through me product costs
    
    paymentCollections.summary.totalToPay = paymentCollections.toPayToSuppliers
      .reduce((sum, supplier) => sum + supplier.totalAmount, 0); // Only what you pay to suppliers (through me only)
    
    paymentCollections.summary.netPosition = 
      paymentCollections.summary.totalToCollect - paymentCollections.summary.totalToPay;
    
    paymentCollections.summary.totalClientsOwing = paymentCollections.toCollectFromClients
      .filter(client => (client.carryingCharges + client.throughMeAmount) > 0).length;
    
    paymentCollections.summary.totalSuppliersOwed = paymentCollections.toPayToSuppliers
      .filter(supplier => supplier.totalAmount > 0).length;

    // Sort by total amount owed to you descending
    paymentCollections.toCollectFromClients.sort((a, b) => 
      (b.carryingCharges + b.throughMeAmount) - (a.carryingCharges + a.throughMeAmount));
    paymentCollections.toPayToSuppliers.sort((a, b) => b.totalAmount - a.totalAmount);

    res.json(paymentCollections);
  } catch (error) {
    console.error('Payment collections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/financials-comprehensive/payment-records/:clientId
// @desc    Get detailed payment records for a specific client (like a ledger)
// @access  Private (Admin/Staff only)
router.get('/payment-records/:clientId', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { clientId } = req.params;
    
    console.log(`📋 Fetching payment records for client: ${clientId}`);
    
    // Get all orders for this client with detailed information
    const orders = await Order.find({ 
      clientId,
      isLoopBack: { $ne: true },
      status: { $ne: 'cancelled' }
    }).populate('containerId', 'realContainerId clientFacingId baseCharges shippingCompany').sort({ createdAt: 1 });
    
    // Get payment collections with detailed payment history
    const PaymentCollectionModel = mongoose.connection.collection('paymentcollections');
    const paymentCollections = await PaymentCollectionModel.find({ clientId }).sort({ createdAt: 1 }).toArray();
    
    // Get containers that have this client's orders
    const containers = await Container.find({
      'orders.clientId': clientId
    }).sort({ createdAt: 1 });
    
    const clientName = orders.length > 0 ? orders[0].clientName : 
                      paymentCollections.length > 0 ? paymentCollections[0].clientName : 
                      'Unknown Client';
    
    // Build proper payment records with running balance
    const paymentRecords = [];
    let runningBalance = 0;
    
    // Process orders chronologically
    orders.forEach(order => {
      // Get actual product cost from items or calculate it
      const productCost = order.items ? 
        order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 
        Math.max(0, (order.totalAmount || 0) - (order.totalCarryingCharges || 0));
      
      const carryingCharges = order.totalCarryingCharges || 0;
      const totalOrderAmount = productCost + carryingCharges;
      
      // Add to running balance (debit - money owed to us)
      runningBalance += totalOrderAmount;
      
      paymentRecords.push({
        id: order._id,
        date: order.createdAt,
        type: 'ORDER_INVOICE',
        reference: order.orderNumber,
        description: `Order Invoice - ${order.orderNumber}`,
        particulars: {
          productDescription: order.items?.map(item => item.description).join(', ') || 'Product',
          productCost: productCost,
          carryingCharges: carryingCharges,
          container: order.containerId?.realContainerId || order.containerId?.clientFacingId || 'Not Allocated'
        },
        debit: totalOrderAmount, // Money owed to us
        credit: 0,
        balance: runningBalance,
        status: order.status?.toUpperCase() || 'PENDING',
        paymentType: 'THROUGH_ME',
        notes: `${order.items?.length || 0} items ordered`
      });
    });
    
    // Process payment collections chronologically
    paymentCollections.forEach(paymentCollection => {
      // Process each individual payment in payment history
      if (paymentCollection.paymentHistory && paymentCollection.paymentHistory.length > 0) {
        paymentCollection.paymentHistory.forEach(payment => {
          // Subtract from running balance (credit - money received from client)
          runningBalance -= payment.amount;
          
          paymentRecords.push({
            id: `${paymentCollection._id}-${payment._id}`,
            date: payment.receivedDate,
            type: 'PAYMENT_RECEIVED',
            reference: `Payment #${payment._id?.toString().slice(-6) || 'N/A'}`,
            description: `Payment received from ${clientName}`,
            particulars: {
              paymentMethod: payment.paymentMethod || 'Not specified',
              bankReference: payment.bankReference || 'N/A',
              notes: payment.notes || 'Payment received',
              totalDue: paymentCollection.totalAmount
            },
            debit: 0,
            credit: payment.amount, // Money received from client
            balance: runningBalance,
            status: 'RECEIVED',
            paymentType: paymentCollection.paymentType || 'THROUGH_ME',
            notes: payment.notes || 'Payment received'
          });
        });
      } else {
        // If no detailed payment history, create a single payment record
        if (paymentCollection.receivedAmount > 0) {
          runningBalance -= paymentCollection.receivedAmount;
          
          paymentRecords.push({
            id: paymentCollection._id,
            date: paymentCollection.createdAt,
            type: 'PAYMENT_RECEIVED',
            reference: `Payment #${paymentCollection._id.toString().slice(-6)}`,
            description: `Payment received from ${clientName}`,
            particulars: {
              totalAmount: paymentCollection.totalAmount,
              receivedAmount: paymentCollection.receivedAmount,
              pendingAmount: (paymentCollection.totalAmount || 0) - (paymentCollection.receivedAmount || 0),
              paymentMethod: 'Not specified'
            },
            debit: 0,
            credit: paymentCollection.receivedAmount,
            balance: runningBalance,
            status: paymentCollection.status?.toUpperCase() || 'RECEIVED',
            paymentType: paymentCollection.paymentType || 'THROUGH_ME',
            notes: paymentCollection.description || 'Payment received'
          });
        }
      }
    });
    
    // Sort all records chronologically
    paymentRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Recalculate running balance in chronological order
    let recalculatedBalance = 0;
    paymentRecords.forEach(record => {
      if (record.type === 'ORDER_INVOICE') {
        recalculatedBalance += record.debit;
      } else if (record.type === 'PAYMENT_RECEIVED') {
        recalculatedBalance -= record.credit;
      }
      record.balance = recalculatedBalance;
    });
    
    // Calculate totals
    const totalDebits = paymentRecords.reduce((sum, record) => sum + (record.debit || 0), 0);
    const totalCredits = paymentRecords.reduce((sum, record) => sum + (record.credit || 0), 0);
    const currentBalance = totalDebits - totalCredits;
    
    // Get container information
    const containerInfo = containers.map(container => ({
      containerId: container.realContainerId || container.clientFacingId,
      orders: container.orders?.filter(o => o.clientId === clientId).length || 0,
      shippingCompany: container.shippingCompany?.name || 'Not specified',
      status: 'ALLOCATED',
      totalOrders: container.orders?.length || 0
    }));
    
    const response = {
      clientId,
      clientName,
      accountSummary: {
        totalInvoiced: totalDebits, // Total amount invoiced (orders)
        totalReceived: totalCredits, // Total payments received
        currentBalance: currentBalance, // Outstanding amount
        totalTransactions: paymentRecords.length,
        totalOrders: orders.length,
        totalPaymentCollections: paymentCollections.length
      },
      paymentRecords: paymentRecords,
      containers: containerInfo,
      metadata: {
        generatedAt: new Date().toISOString(),
        period: 'All Time',
        currency: 'INR',
        recordType: 'PAYMENT_LEDGER'
      }
    };
    
    console.log(`✅ Payment records generated for ${clientName}: ${paymentRecords.length} records, Balance: ₹${currentBalance}`);
    res.json(response);
    
  } catch (error) {
    console.error('Payment records error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;