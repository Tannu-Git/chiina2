// Test script to check payment records after container deletion
const mongoose = require('mongoose');
const Container = require('./server/models/Container');

async function checkPaymentCleanupOnDeletion() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms-new');
    
    console.log('🔍 ANALYZING CONTAINER DELETION PAYMENT CLEANUP');
    console.log('='.repeat(55));
    
    // Check if any containers exist
    const containers = await Container.find({});
    console.log(`\n📦 Active Containers: ${containers.length}`);
    
    if (containers.length > 0) {
      const container = containers[0];
      console.log(`\nAnalyzing Container: ${container.realContainerId || container.clientFacingId}`);
      console.log(`- Orders in container: ${container.orders?.length || 0}`);
      console.log(`- Total revenue: ₹${container.totalRevenue || 0}`);
      
      // Check for payment collections referencing this container
      const paymentCollections = await mongoose.connection.db
        .collection('paymentcollections')
        .find({ containerId: container._id })
        .toArray();
      
      console.log(`- Payment collections referencing this container: ${paymentCollections.length}`);
      
      if (paymentCollections.length > 0) {
        console.log('\n💰 PAYMENT COLLECTION DETAILS:');
        paymentCollections.forEach((payment, index) => {
          console.log(`  ${index + 1}. Client: ${payment.clientName}`);
          console.log(`     Total Amount: ₹${payment.totalAmount}`);
          console.log(`     Received: ₹${payment.receivedAmount || 0}`);
          console.log(`     Status: ${payment.status}`);
        });
      }
    }
    
    // Check for orphaned payment collections (referencing deleted containers)
    const paymentCollections = await mongoose.connection.db
      .collection('paymentcollections')
      .find({ containerId: { $ne: null } })
      .toArray();
    
    console.log(`\n🔍 ORPHANED PAYMENT ANALYSIS:`);
    console.log(`Total payment collections with container references: ${paymentCollections.length}`);
    
    let orphanedCount = 0;
    for (const payment of paymentCollections) {
      const containerExists = await Container.findById(payment.containerId);
      if (!containerExists) {
        orphanedCount++;
        console.log(`  ORPHANED: Payment ${payment._id} references deleted container ${payment.containerId}`);
      }
    }
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`- Payment collections with container refs: ${paymentCollections.length}`);
    console.log(`- Orphaned payment records: ${orphanedCount}`);
    
    if (orphanedCount > 0) {
      console.log(`\n❌ ISSUE CONFIRMED: Container deletion does NOT clean payment records`);
      console.log(`   ${orphanedCount} payment collections reference deleted containers`);
    } else {
      console.log(`\n✅ No orphaned payment records found`);
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

checkPaymentCleanupOnDeletion();