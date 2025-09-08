#!/usr/bin/env node
/**
 * PAYMENT CLEANUP VERIFICATION SCRIPT
 * 
 * This script verifies that both order and container deletions
 * properly clean up their related payment collection records.
 */

const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms-new', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const verifyPaymentCleanup = async () => {
  console.log('\n🧪 PAYMENT CLEANUP VERIFICATION TEST\n');
  
  try {
    // Check for orphaned payment records
    const paymentCollections = await mongoose.connection.db
      .collection('paymentcollections')
      .find({})
      .toArray();
    
    console.log(`📊 Total payment collection records: ${paymentCollections.length}`);
    
    let orphanedByOrder = 0;
    let orphanedByContainer = 0;
    let validPayments = 0;
    
    // Verify each payment record
    for (const payment of paymentCollections) {
      let isOrphaned = false;
      
      // Check if referenced order exists
      if (payment.orderId) {
        const orderExists = await Order.findById(payment.orderId);
        if (!orderExists) {
          orphanedByOrder++;
          isOrphaned = true;
          console.log(`❌ ORPHANED BY ORDER: Payment ${payment._id} references deleted order ${payment.orderId}`);
        }
      }
      
      // Check if referenced container exists
      if (payment.containerId) {
        const containerExists = await Container.findById(payment.containerId);
        if (!containerExists) {
          orphanedByContainer++;
          if (!isOrphaned) { // Don't double count
            isOrphaned = true;
          }
          console.log(`❌ ORPHANED BY CONTAINER: Payment ${payment._id} references deleted container ${payment.containerId}`);
        }
      }
      
      if (!isOrphaned) {
        validPayments++;
      }
    }
    
    console.log(`\n📋 PAYMENT CLEANUP SUMMARY:`);
    console.log(`   Total payments: ${paymentCollections.length}`);
    console.log(`   Valid payments: ${validPayments}`);
    console.log(`   Orphaned by deleted orders: ${orphanedByOrder}`);
    console.log(`   Orphaned by deleted containers: ${orphanedByContainer}`);
    
    // Overall assessment
    const totalOrphaned = orphanedByOrder + orphanedByContainer;
    if (totalOrphaned === 0) {
      console.log(`\n✅ EXCELLENT: No orphaned payment records found!`);
      console.log(`   Both order and container deletions properly clean up payments.`);
    } else {
      console.log(`\n⚠️  ISSUES FOUND: ${totalOrphaned} orphaned payment records detected.`);
      console.log(`   This indicates incomplete cleanup during deletion operations.`);
    }
    
    return {
      totalPayments: paymentCollections.length,
      validPayments,
      orphanedByOrder,
      orphanedByContainer,
      isCleanupWorking: totalOrphaned === 0
    };
    
  } catch (error) {
    console.error('❌ Verification failed:', error.message);
    return null;
  }
};

// Run the verification
const main = async () => {
  await connectDB();
  
  const result = await verifyPaymentCleanup();
  
  if (result) {
    console.log(`\n🔍 CLEANUP EFFECTIVENESS: ${result.isCleanupWorking ? 'WORKING' : 'NEEDS IMPROVEMENT'}`);
  }
  
  await mongoose.connection.close();
  console.log('\n💾 Database connection closed.');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { verifyPaymentCleanup };