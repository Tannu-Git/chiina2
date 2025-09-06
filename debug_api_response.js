const mongoose = require('mongoose');

async function showAPIResponse() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to MongoDB');
    
    // Simulate the same logic as the payment-collections API endpoint
    const Container = mongoose.connection.collection('containers');
    const PaymentCollection = mongoose.connection.collection('paymentcollections');
    const Order = mongoose.connection.collection('orders');
    
    console.log('\n🔍 API RESPONSE SIMULATION - /api/payment-collections');
    console.log('='.repeat(60));
    
    // Get containers with orders (simplified version)
    const containers = await Container.find({}).toArray();
    const paymentCollections = await PaymentCollection.find({}).toArray();
    
    console.log(`\n📦 Found ${containers.length} containers`);
    console.log(`💰 Found ${paymentCollections.length} payment collections`);
    
    // Show the actual payment collections data structure
    console.log('\n💳 PAYMENT COLLECTIONS DATA:');
    console.log('='.repeat(40));
    
    if (paymentCollections.length > 0) {
      paymentCollections.forEach((payment, index) => {
        console.log(`\n[${index + 1}] Payment Collection:`);
        console.log(`   _id: ${payment._id}`);
        console.log(`   clientId: ${payment.clientId}`);
        console.log(`   clientName: ${payment.clientName}`);
        console.log(`   totalAmount: ₹${payment.totalAmount?.toLocaleString('en-IN') || 0}`);
        console.log(`   receivedAmount: ₹${payment.receivedAmount?.toLocaleString('en-IN') || 0}`);
        console.log(`   pendingAmount: ₹${payment.pendingAmount?.toLocaleString('en-IN') || 0}`);
        console.log(`   status: ${payment.status}`);
        console.log(`   paymentType: ${payment.paymentType}`);
        console.log(`   orderId: ${payment.orderId || 'N/A'}`);
        console.log(`   containerId: ${payment.containerId || 'N/A'}`);
        
        if (payment.paymentHistory && payment.paymentHistory.length > 0) {
          console.log(`   paymentHistory: ${payment.paymentHistory.length} entries`);
          payment.paymentHistory.slice(-3).forEach((history, hIndex) => {
            console.log(`     [${hIndex + 1}] Amount: ₹${history.amount?.toLocaleString('en-IN') || 0}, Date: ${history.receivedDate || 'N/A'}`);
          });
        }
      });
    }
    
    // Simulate the API response structure
    const apiResponse = {
      summary: {
        totalToCollect: paymentCollections.reduce((sum, p) => sum + (p.totalAmount || 0), 0),
        totalReceived: paymentCollections.reduce((sum, p) => sum + (p.receivedAmount || 0), 0),
        totalPending: paymentCollections.reduce((sum, p) => sum + (p.pendingAmount || 0), 0),
        clientCount: new Set(paymentCollections.map(p => p.clientId)).size,
        dataIntegrity: {
          systemHealth: { status: 'CORRUPTED' }, // Based on server logs
          hasNegativeBalances: paymentCollections.some(p => p.pendingAmount < 0),
          hasOrphanedData: true, // Based on server logs
          criticalIssues: 3 // Based on server logs
        }
      },
      clientCollections: [] // This would be grouped by client
    };
    
    // Group by client (simplified)
    const clientGroups = {};
    paymentCollections.forEach(payment => {
      const clientId = payment.clientId;
      if (!clientGroups[clientId]) {
        clientGroups[clientId] = {
          clientId,
          clientName: payment.clientName,
          totalAmount: 0,
          receivedAmount: 0,
          pendingAmount: 0,
          payments: [],
          hasNegativeBalance: false,
          isOrphaned: false
        };
      }
      
      const client = clientGroups[clientId];
      client.totalAmount += payment.totalAmount || 0;
      client.receivedAmount += payment.receivedAmount || 0;
      client.pendingAmount += payment.pendingAmount || 0;
      
      // Server sets this flag for negative balances
      if (payment.pendingAmount < 0) {
        client.hasNegativeBalance = true;
      }
      
      client.payments.push({
        paymentId: payment._id,
        orderNumber: 'ORD-000002', // Example
        containerId: 'CONT-1757192175324', // Example
        totalAmount: payment.totalAmount,
        receivedAmount: payment.receivedAmount,
        pendingAmount: payment.pendingAmount,
        status: payment.status,
        paymentType: payment.paymentType
      });
    });
    
    apiResponse.clientCollections = Object.values(clientGroups);
    
    console.log('\n📊 SIMULATED API RESPONSE STRUCTURE:');
    console.log('='.repeat(50));
    console.log(JSON.stringify(apiResponse, null, 2));
    
    // Focus on the client with credit balance
    const creditClient = apiResponse.clientCollections.find(c => c.pendingAmount < 0);
    if (creditClient) {
      console.log('\n💚 CLIENT WITH CREDIT BALANCE:');
      console.log('='.repeat(35));
      console.log(`Client: ${creditClient.clientName}`);
      console.log(`Pending Amount: ₹${creditClient.pendingAmount.toLocaleString('en-IN')} (NEGATIVE = CREDIT)`);
      console.log(`Total Amount: ₹${creditClient.totalAmount.toLocaleString('en-IN')}`);
      console.log(`Received Amount: ₹${creditClient.receivedAmount.toLocaleString('en-IN')}`);
      console.log(`hasNegativeBalance: ${creditClient.hasNegativeBalance} (FLAG SET BY SERVER)`);
      console.log(`Credit Balance: ₹${Math.abs(creditClient.pendingAmount).toLocaleString('en-IN')} OVERPAID`);
    }
    
    await mongoose.disconnect();
    
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

showAPIResponse();