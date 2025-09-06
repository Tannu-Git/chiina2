const mongoose = require('mongoose');

async function testClientData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to MongoDB (logistics-oms)');
    
    console.log('\n=== CLIENT-WISE DATA ANALYSIS ===');
    
    // Get orders and containers to analyze client data
    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
    const containers = await mongoose.connection.db.collection('containers').find({}).toArray();
    const paymentCollections = await mongoose.connection.db.collection('paymentcollections').find({}).toArray();
    
    // Build client financials similar to API
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
    });
    
    // Process containers for payment type breakdown
    containers.forEach(container => {
      container.orders.forEach(containerOrder => {
        const clientId = containerOrder.clientId;
        if (clientFinancials[clientId]) {
          const client = clientFinancials[clientId];
          const carryingCharges = containerOrder.carryingCharges || 0;
          
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
    
    console.log('\n📊 CLIENT FINANCIALS:');
    Object.values(clientFinancials).forEach(client => {
      console.log(`\n🏢 Client: ${client.clientName} (${client.clientId})`);
      console.log(`   Total Order Value: ₹${client.totalOrderValue}`);
      console.log(`   Total Carrying Charges: ₹${client.totalCarryingCharges}`);
      console.log(`   Through Me Amount: ₹${client.paymentBreakdown.throughMe.amount} (${client.paymentBreakdown.throughMe.orders} orders)`);
      console.log(`   Direct Amount: ₹${client.paymentBreakdown.direct.amount} (${client.paymentBreakdown.direct.orders} orders)`);
      console.log(`   Total Need to Receive: ₹${client.paymentBreakdown.throughMe.amount + client.paymentBreakdown.direct.amount}`);
      console.log(`   GST Charges: ₹${client.gstCharges}`);
    });
    
    // Check payment collections impact
    console.log('\n💰 PAYMENT COLLECTIONS IMPACT:');
    paymentCollections.forEach(payment => {
      console.log(`   Client ${payment.clientId}: Received ₹${payment.receivedAmount}`);
    });
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

testClientData();