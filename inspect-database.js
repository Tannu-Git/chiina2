#!/usr/bin/env node
/**
 * Simple Database Inspection Script
 * 
 * This script checks the current state of the database
 * and identifies any cleanup needs.
 */

const mongoose = require('mongoose');

// MongoDB connection
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms-new');
    console.log('✅ Connected to MongoDB: logistics-oms-new');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    process.exit(1);
  }
};

const inspectDatabase = async () => {
  console.log('\n🔍 DATABASE INSPECTION REPORT\n');
  
  try {
    const db = mongoose.connection.db;
    
    // Get collection statistics
    const collections = await db.listCollections().toArray();
    console.log('📋 Available Collections:');
    collections.forEach(col => {
      console.log(`   - ${col.name}`);
    });
    
    // Check key collections
    const orders = await db.collection('orders').countDocuments();
    const containers = await db.collection('containers').countDocuments();
    const paymentCollections = await db.collection('paymentcollections').countDocuments();
    const users = await db.collection('users').countDocuments();
    
    console.log(`\n📊 Collection Counts:`);
    console.log(`   Orders: ${orders}`);
    console.log(`   Containers: ${containers}`);
    console.log(`   Payment Collections: ${paymentCollections}`);
    console.log(`   Users: ${users}`);
    
    // Initialize counters
    let orphanedByOrder = 0;
    let orphanedByContainer = 0;
    let orphanedAllocations = 0;
    
    // Check for potential orphaned records
    console.log(`\n🔍 Checking for Orphaned Records...`);
    
    // Check payment collections without valid references
    if (paymentCollections > 0) {
      const payments = await db.collection('paymentcollections').find({}).toArray();
      
      for (const payment of payments) {
        if (payment.orderId) {
          const orderExists = await db.collection('orders').findOne({ _id: payment.orderId });
          if (!orderExists) {
            orphanedByOrder++;
          }
        }
        
        if (payment.containerId) {
          const containerExists = await db.collection('containers').findOne({ _id: payment.containerId });
          if (!containerExists) {
            orphanedByContainer++;
          }
        }
      }
      
      console.log(`   Payments orphaned by deleted orders: ${orphanedByOrder}`);
      console.log(`   Payments orphaned by deleted containers: ${orphanedByContainer}`);
      
      if (orphanedByOrder > 0 || orphanedByContainer > 0) {
        console.log(`\n⚠️  CLEANUP NEEDED: Found ${orphanedByOrder + orphanedByContainer} orphaned payment records`);
      } else {
        console.log(`\n✅ No orphaned payment records found`);
      }
    }
    
    // Check for orders with allocations but no container
    if (orders > 0) {
      const ordersWithAllocations = await db.collection('orders').find({
        'items.allocatedCartons': { $gt: 0 }
      }).toArray();
      
      for (const order of ordersWithAllocations) {
        if (!order.containerId) {
          orphanedAllocations++;
        }
      }
      
      console.log(`   Orders with allocations but no container: ${orphanedAllocations}`);
      
      if (orphanedAllocations > 0) {
        console.log(`\n⚠️  ALLOCATION ISSUE: Found ${orphanedAllocations} orders with orphaned allocations`);
      }
    }
    
    return {
      collections: collections.length,
      orders,
      containers,
      paymentCollections,
      orphanedByOrder,
      orphanedByContainer,
      orphanedAllocations,
      needsCleanup: (orphanedByOrder > 0 || orphanedByContainer > 0 || orphanedAllocations > 0)
    };
    
  } catch (error) {
    console.error('❌ Database inspection failed:', error.message);
    return null;
  }
};

// Main function
const main = async () => {
  await connectDB();
  
  const result = await inspectDatabase();
  
  if (result && result.needsCleanup) {
    console.log(`\n🛠️  CLEANUP RECOMMENDATION: Database cleanup is recommended`);
    console.log(`   Run cleanup operations to remove orphaned records and fix allocations`);
  } else if (result) {
    console.log(`\n✅ DATABASE HEALTH: Database appears to be in good condition`);
  }
  
  await mongoose.connection.close();
  console.log('\n💾 Database connection closed.');
};

if (require.main === module) {
  main().catch(console.error);
}

module.exports = { inspectDatabase };