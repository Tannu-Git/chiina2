const mongoose = require('mongoose');

async function analyzeClientData() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to MongoDB (logistics-oms)');
    
    console.log('\n=== CLIENT ANALYSIS ===');
    
    // Check orders for client information
    const orders = await mongoose.connection.db.collection('orders').find({}).toArray();
    console.log(`\n📋 ALL ORDERS (${orders.length} found):`);
    
    orders.forEach((order, index) => {
      console.log(`\n[${index + 1}] Order: ${order.orderNumber}`);
      console.log(`   Client ID: ${order.clientId}`);
      console.log(`   Client Name: ${order.clientName}`);
      console.log(`   Total Amount: ₹${order.totalAmount}`);
      console.log(`   Carrying Charges: ₹${order.totalCarryingCharges}`);
      console.log(`   Payment Type: ${order.paymentType}`);
      console.log(`   Container Allocated: ${order.containerAllocated ? 'Yes' : 'No'}`);
    });
    
    // Check payment collections
    const paymentCollections = await mongoose.connection.db.collection('paymentcollections').find({}).toArray();
    console.log(`\n💰 ALL PAYMENT COLLECTIONS (${paymentCollections.length} found):`);
    
    paymentCollections.forEach((payment, index) => {
      console.log(`\n[${index + 1}] Payment Collection:`);
      console.log(`   Client ID: ${payment.clientId}`);
      console.log(`   Client Name: ${payment.clientName}`);
      console.log(`   Total Amount: ₹${payment.totalAmount}`);
      console.log(`   Received: ₹${payment.receivedAmount || 0}`);
      console.log(`   Pending: ₹${(payment.totalAmount || 0) - (payment.receivedAmount || 0)}`);
    });
    
    // Check containers
    const containers = await mongoose.connection.db.collection('containers').find({}).toArray();
    console.log(`\n📦 ALL CONTAINERS (${containers.length} found):`);
    
    containers.forEach((container, index) => {
      console.log(`\n[${index + 1}] Container: ${container.realContainerId || container.clientFacingId}`);
      console.log(`   Orders: ${container.orders?.length || 0}`);
      
      if (container.orders && container.orders.length > 0) {
        container.orders.forEach((order, oIndex) => {
          console.log(`     [${oIndex + 1}] Client: ${order.clientId} (${order.clientName || 'Unknown'})`);
          console.log(`         Order: ${order.orderNumber}`);
          console.log(`         Amount: ₹${order.totalAmount || 'N/A'}`);
          console.log(`         Carrying: ₹${order.carryingCharges || 'N/A'}`);
          console.log(`         Payment Type: ${order.paymentType || 'N/A'}`);
        });
      }
    });
    
    // Check users/clients table
    const users = await mongoose.connection.db.collection('users').find({ role: 'client' }).toArray();
    console.log(`\n👥 CLIENT USERS (${users.length} found):`);
    
    users.forEach((user, index) => {
      console.log(`\n[${index + 1}] User:`);
      console.log(`   Name: ${user.name}`);
      console.log(`   Client ID: ${user.clientId}`);
      console.log(`   Email: ${user.email}`);
      console.log(`   Role: ${user.role}`);
    });
    
  } catch (error) {
    console.error('❌ Error analyzing client data:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the analysis
analyzeClientData();