#!/usr/bin/env node

/**
 * Database Inspection Script
 * Check what orders exist and their carton availability status
 */

const mongoose = require('mongoose');

async function inspectOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false, collection: 'orders' }));

    console.log('\n📊 DATABASE INSPECTION');
    console.log('=' .repeat(50));

    // 1. Count total orders
    const totalOrders = await Order.countDocuments();
    console.log(`Total orders in database: ${totalOrders}`);

    if (totalOrders === 0) {
      console.log('❌ No orders found in database!');
      console.log('💡 You need to create some orders first before testing allocation.');
      return;
    }

    // 2. Check order statuses
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);

    console.log('\nOrder Status Distribution:');
    statusCounts.forEach(status => {
      console.log(`  ${status._id || 'undefined'}: ${status.count}`);
    });

    // 3. Find recent orders
    const recentOrders = await Order.find()
      .sort({ createdAt: -1 })
      .limit(5)
      .select('orderNumber status qcStatus items.itemCode items.cartons items.qcPassedCartons items.allocatedCartons items.qcStatus createdAt');

    console.log('\n📋 RECENT ORDERS (Last 5):');
    if (recentOrders.length === 0) {
      console.log('No orders found');
      return;
    }

    recentOrders.forEach((order, index) => {
      console.log(`\n${index + 1}. ${order.orderNumber} (${order.status})`);
      console.log(`   Created: ${order.createdAt?.toLocaleDateString()}`);
      console.log(`   Order QC Status: ${order.qcStatus || 'pending'}`);
      console.log(`   Items: ${order.items?.length || 0}`);

      if (order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          const expectedCtn = item.cartons || 0;
          const qcPassedCtn = item.qcPassedCartons || 0;
          const allocatedCtn = item.allocatedCartons || 0;
          const availableCtn = qcPassedCtn - allocatedCtn;

          console.log(`     Item ${itemIndex}: ${item.itemCode}`);
          console.log(`       Expected: ${expectedCtn} cartons`);
          console.log(`       QC Passed: ${qcPassedCtn} cartons`);
          console.log(`       Allocated: ${allocatedCtn} cartons`);
          console.log(`       Available: ${availableCtn} cartons`);
          console.log(`       Item QC Status: ${item.qcStatus || 'pending'}`);

          if (availableCtn <= 0 && expectedCtn > 0) {
            console.log(`       🚨 THIS IS WHY YOU GET "Maximum available: 0"`);
          }
        });
      }
    });

    // 4. Check QC ready orders specifically
    const qcReadyOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] }
    }).select('orderNumber items.itemCode items.cartons items.qcPassedCartons items.allocatedCartons');

    console.log(`\n🔍 QC READY ORDERS: ${qcReadyOrders.length}`);
    if (qcReadyOrders.length === 0) {
      console.log('❌ No QC ready orders found!');
      console.log('💡 Orders need to go through QC inspection first.');
      console.log('💡 Or change existing order status to "ready" or "partial_ready".');
    } else {
      qcReadyOrders.forEach(order => {
        console.log(`\n✅ ${order.orderNumber}`);
        order.items?.forEach((item, index) => {
          const availableCtn = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
          console.log(`  Item ${index}: Available ${availableCtn} cartons`);
        });
      });
    }

    // 5. Provide fix suggestions based on findings
    console.log('\n💡 DIAGNOSIS & SOLUTIONS:');
    
    if (qcReadyOrders.length === 0) {
      console.log('🎯 ISSUE: No QC ready orders');
      console.log('   SOLUTION 1: Create orders and complete QC inspection');
      console.log('   SOLUTION 2: Update existing order status to "ready"');
    } else {
      let hasZeroCartonIssues = false;
      qcReadyOrders.forEach(order => {
        order.items?.forEach(item => {
          if ((item.qcPassedCartons || 0) === 0 && (item.cartons || 0) > 0) {
            hasZeroCartonIssues = true;
          }
        });
      });

      if (hasZeroCartonIssues) {
        console.log('🎯 ISSUE: QC ready orders have qcPassedCartons = 0');
        console.log('   SOLUTION: Run QC inspection or manually set qcPassedCartons');
      } else {
        console.log('✅ Orders look correct - allocation should work');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  inspectOrders();
}