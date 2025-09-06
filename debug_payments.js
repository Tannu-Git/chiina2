const mongoose = require('mongoose');

async function analyzePaymentData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to MongoDB (logistics-oms)');
    
    console.log('\n=== EXACT PAYMENT COLLECTIONS DATA ===');
    
    // Check all payment collections
    const paymentCollections = await mongoose.connection.db.collection('paymentcollections').find({}).toArray();
    console.log(`\n💰 PAYMENT COLLECTIONS (${paymentCollections.length} found):`);
    
    if (paymentCollections.length === 0) {
      console.log('   📝 No payment collections found in database');
    } else {
      paymentCollections.forEach((payment, index) => {
        console.log(`\n[${index + 1}] Payment ID: ${payment._id}`);
        console.log(`   Client ID: ${payment.clientId}`);
        console.log(`   Client Name: ${payment.clientName}`);
        console.log(`   Total Amount: ₹${payment.totalAmount}`);
        console.log(`   Received Amount: ₹${payment.receivedAmount || 0}`);
        console.log(`   Pending Amount: ₹${payment.pendingAmount || payment.totalAmount - (payment.receivedAmount || 0)}`);
        console.log(`   Payment Type: ${payment.paymentType}`);
        console.log(`   Status: ${payment.status}`);
        console.log(`   Order ID: ${payment.orderId || 'N/A'}`);
        console.log(`   Container ID: ${payment.containerId || 'N/A'}`);
        console.log(`   Description: ${payment.description || 'N/A'}`);
        console.log(`   Notes: ${payment.notes || 'N/A'}`);
        console.log(`   Created: ${payment.createdAt}`);
        if (payment.paymentHistory && payment.paymentHistory.length > 0) {
          console.log(`   Payment History:`);
          payment.paymentHistory.forEach((history, hIndex) => {
            console.log(`     [${hIndex + 1}] Amount: ₹${history.amount}, Date: ${history.receivedDate}, Notes: ${history.notes || 'N/A'}`);
          });
        }
      });
    }
    
    // Check specifically for CLI-APPLEFCG
    console.log('\n=== CLI-APPLEFCG SPECIFIC DATA ===');
    const applefcgPayments = paymentCollections.filter(p => p.clientId === 'CLI-APPLEFCG');
    console.log(`\n🍎 CLI-APPLEFCG PAYMENTS (${applefcgPayments.length} found):`);
    
    if (applefcgPayments.length === 0) {
      console.log('   📝 No payment collections found for CLI-APPLEFCG');
    } else {
      applefcgPayments.forEach((payment, index) => {
        console.log(`\n[${index + 1}] CLI-APPLEFCG Payment:`);
        console.log(`   Total Amount: ₹${payment.totalAmount}`);
        console.log(`   Received Amount: ₹${payment.receivedAmount || 0}`);
        console.log(`   Pending Amount: ₹${payment.pendingAmount || payment.totalAmount - (payment.receivedAmount || 0)}`);
        console.log(`   Payment Type: ${payment.paymentType}`);
        console.log(`   Status: ${payment.status}`);
      });
      
      const totalCLIAPPLEFCG = applefcgPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const receivedCLIAPPLEFCG = applefcgPayments.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
      const pendingCLIAPPLEFCG = totalCLIAPPLEFCG - receivedCLIAPPLEFCG;
      
      console.log(`\n📊 CLI-APPLEFCG Summary:`);
      console.log(`   Total Amounts: ₹${totalCLIAPPLEFCG}`);
      console.log(`   Total Received: ₹${receivedCLIAPPLEFCG}`);
      console.log(`   Total Pending: ₹${pendingCLIAPPLEFCG}`);
    }
    
    // Check orders for CLI-APPLEFCG
    console.log('\n=== CLI-APPLEFCG ORDERS ===');
    const orders = await mongoose.connection.db.collection('orders').find({ clientId: 'CLI-APPLEFCG' }).toArray();
    console.log(`\n📋 CLI-APPLEFCG ORDERS (${orders.length} found):`);
    
    if (orders.length === 0) {
      console.log('   📝 No orders found for CLI-APPLEFCG');
    } else {
      orders.forEach((order, index) => {
        console.log(`\n[${index + 1}] Order: ${order.orderNumber}`);
        console.log(`   Total Amount: ₹${order.totalAmount}`);
        console.log(`   Total Carrying Charges: ₹${order.totalCarryingCharges}`);
        console.log(`   Payment Type: ${order.paymentType}`);
        console.log(`   Status: ${order.status}`);
        console.log(`   Container Allocated: ${order.containerAllocated ? 'Yes' : 'No'}`);
        if (order.items && order.items.length > 0) {
          console.log(`   Items:`);
          order.items.forEach((item, iIndex) => {
            console.log(`     [${iIndex + 1}] ${item.description}: ₹${item.totalPrice}, PaymentType: ${item.paymentType}`);
          });
        }
      });
      
      const totalOrderAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalCarryingCharges = orders.reduce((sum, o) => sum + (o.totalCarryingCharges || 0), 0);
      
      console.log(`\n📊 CLI-APPLEFCG Order Summary:`);
      console.log(`   Total Order Amount: ₹${totalOrderAmount}`);
      console.log(`   Total Carrying Charges: ₹${totalCarryingCharges}`);
    }
    
    // Check containers for CLI-APPLEFCG orders
    console.log('\n=== CLI-APPLEFCG CONTAINERS ===');
    const containers = await mongoose.connection.db.collection('containers').find({}).toArray();
    const applefcgContainers = containers.filter(c => 
      c.orders && c.orders.some(o => o.clientId === 'CLI-APPLEFCG')
    );
    
    console.log(`\n📦 CONTAINERS WITH CLI-APPLEFCG ORDERS (${applefcgContainers.length} found):`);
    
    if (applefcgContainers.length === 0) {
      console.log('   📝 No containers found with CLI-APPLEFCG orders');
    } else {
      applefcgContainers.forEach((container, index) => {
        console.log(`\n[${index + 1}] Container: ${container.realContainerId || container.clientFacingId}`);
        console.log(`   Total Orders: ${container.orders?.length || 0}`);
        
        const applefcgOrdersInContainer = container.orders?.filter(o => o.clientId === 'CLI-APPLEFCG') || [];
        console.log(`   CLI-APPLEFCG Orders: ${applefcgOrdersInContainer.length}`);
        
        applefcgOrdersInContainer.forEach((order, oIndex) => {
          console.log(`     [${oIndex + 1}] Order ${order.orderNumber}: ₹${order.totalAmount}, Carrying: ₹${order.carryingCharges}, PaymentType: ${order.paymentType}`);
        });
      });
    }
    
    // Summary of all findings
    console.log('\n=== FINAL SUMMARY ===');
    console.log(`📋 Total Orders for CLI-APPLEFCG: ${orders.length}`);
    console.log(`💰 Total Payment Collections for CLI-APPLEFCG: ${applefcgPayments.length}`);
    console.log(`📦 Total Containers with CLI-APPLEFCG orders: ${applefcgContainers.length}`);
    
    // Calculate expected vs actual
    if (orders.length > 0 && applefcgPayments.length > 0) {
      const totalOrderAmount = orders.reduce((sum, o) => sum + (o.totalAmount || 0), 0);
      const totalPaymentAmount = applefcgPayments.reduce((sum, p) => sum + (p.totalAmount || 0), 0);
      const totalReceived = applefcgPayments.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
      
      console.log(`\n🔍 ANALYSIS:`);
      console.log(`   Order Total: ₹${totalOrderAmount}`);
      console.log(`   Payment Collection Total: ₹${totalPaymentAmount}`);
      console.log(`   Amount Received: ₹${totalReceived}`);
      console.log(`   Outstanding (Payment Collection - Received): ₹${totalPaymentAmount - totalReceived}`);
    }
    
  } catch (error) {
    console.error('❌ Error analyzing payment data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the analysis
analyzePaymentData();