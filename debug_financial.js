const mongoose = require('mongoose');

async function analyzeFinancialData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms'); // Correct database
    console.log('Connected to MongoDB (logistics-oms)');
    
    console.log('\n=== CURRENT DATABASE STATE (CORRECT DB) ===');
    
    // Check orders
    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
    console.log('\n📋 ORDERS (' + orders.length + ' found):');
    orders.forEach(order => {
      console.log(`- ${order.orderNumber}: Client ${order.clientId}, Amount ₹${order.totalAmount}, Carrying ₹${order.totalCarryingCharges}`);
      if (order.items) {
        order.items.forEach(item => {
          console.log(`  • Item: ${item.description}, Price: ₹${item.totalPrice}, PaymentType: ${item.paymentType}`);
        });
      }
    });
    
    // Check containers
    const containers = await mongoose.connection.db.collection('containers').find({}).toArray();
    console.log('\n📦 CONTAINERS (' + containers.length + ' found):');
    containers.forEach(container => {
      console.log(`- ${container.realContainerId || container.clientFacingId}: ${container.orders?.length || 0} orders`);
      if (container.orders) {
        container.orders.forEach(order => {
          console.log(`  • Client ${order.clientId}: PaymentType ${order.paymentType}, Carrying ₹${order.carryingCharges}`);
        });
      }
    });
    
    // Check payment collections
    const paymentCollections = await mongoose.connection.db.collection('paymentcollections').find({}).toArray();
    console.log('\n💰 PAYMENT COLLECTIONS (' + paymentCollections.length + ' found):');
    paymentCollections.forEach(payment => {
      console.log(`- Client ${payment.clientId}: Total ₹${payment.totalAmount}, Received ₹${payment.receivedAmount}, Pending ₹${payment.pendingAmount}`);
    });
    
    console.log('\n=== FINANCIAL CALCULATION ANALYSIS ===');
    
    // Calculate what the API should return
    let totalClientPayments = 0;
    let totalSupplierPayments = 0;
    let totalReceived = 0;
    
    containers.forEach(container => {
      container.orders.forEach(containerOrder => {
        const order = orders.find(o => o._id.toString() === containerOrder.orderId.toString());
        if (order && containerOrder.paymentType === 'THROUGH_ME') {
          // For THROUGH_ME: client pays product cost + carrying charges
          const productCost = order.items ? order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
          totalClientPayments += productCost + containerOrder.carryingCharges;
          totalSupplierPayments += productCost;
        }
      });
    });
    
    paymentCollections.forEach(payment => {
      totalReceived += payment.receivedAmount;
    });
    
    const netClientPayments = totalClientPayments - totalReceived;
    
    console.log('\n📊 EXPECTED API RESULTS:');
    console.log('- Total Client Payments (gross):', '₹' + totalClientPayments);
    console.log('- Total Received Payments:', '₹' + totalReceived);
    console.log('- Net Client Payments (after received):', '₹' + netClientPayments);
    console.log('- Total Supplier Payments:', '₹' + totalSupplierPayments);
    
    console.log('\n=== ISSUE VERIFICATION ===');
    console.log('✅ Database:', 'logistics-oms (CORRECT)');
    console.log('✅ Orders exist:', orders.length > 0);
    console.log('✅ Containers exist:', containers.length > 0);
    console.log('✅ Payment collections exist:', paymentCollections.length > 0);
    console.log('✅ Received amount found:', '₹' + totalReceived);
    
    if (netClientPayments !== 1008000) {
      console.log('❌ CALCULATION MISMATCH: Expected ₹10,08,000 but calculated ₹' + netClientPayments);
    } else {
      console.log('✅ CALCULATION CORRECT: Matches expected ₹10,08,000');
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

analyzeFinancialData();