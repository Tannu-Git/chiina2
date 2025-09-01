#!/usr/bin/env node

/**
 * Simple QC Data Check Script
 */

const mongoose = require('mongoose');
const Order = require('./server/models/Order');

async function quickCheck() {
  try {
    console.log('🔍 Quick QC Data Check...\n');
    
    // Use a shorter timeout
    await mongoose.connect('mongodb://localhost:27017/chinadb', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000,
    });
    
    console.log('✅ Connected to database\n');

    // Quick order count by status
    const statusCounts = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('📊 Order Status Distribution:');
    statusCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count} orders`);
    });
    
    // Check QC status distribution
    const qcStatusCounts = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.qcStatus', count: { $sum: 1 } } }
    ]);
    
    console.log('\n📊 QC Status Distribution:');
    qcStatusCounts.forEach(item => {
      console.log(`   ${item._id || 'null'}: ${item.count} items`);
    });
    
    // Find QC ready orders
    const qcReady = await Order.find({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    }).select('orderNumber clientName status items.qcStatus').limit(5);
    
    console.log(`\n📦 QC Ready Orders: ${qcReady.length}`);
    qcReady.forEach(order => {
      const qcStatuses = order.items.map(item => item.qcStatus).filter(Boolean);
      console.log(`   ${order.orderNumber}: ${order.status} - QC: [${qcStatuses.join(', ')}]`);
    });
    
    // Sample one order to check detailed allocation data
    const sampleOrder = await Order.findOne({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    });
    
    if (sampleOrder) {
      console.log(`\n🔍 Sample Order: ${sampleOrder.orderNumber}`);
      sampleOrder.items.forEach((item, index) => {
        if (index < 2) { // Only show first 2 items
          console.log(`   Item ${index}: ${item.itemCode}`);
          console.log(`     Expected: ${item.quantity || 0} qty, ${item.cartons || 0} cartons`);
          console.log(`     QC Passed: ${item.qcPassedQuantity || 0} qty, ${item.qcPassedCartons || 0} cartons`);
          console.log(`     Allocated: ${item.allocatedQuantity || 0} qty, ${item.allocatedCartons || 0} cartons`);
          
          const availableQty = (item.qcPassedQuantity || 0) - (item.allocatedQuantity || 0);
          const availableCtn = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
          console.log(`     Available: ${availableQty} qty, ${availableCtn} cartons`);
          
          if (availableQty < 0 || availableCtn < 0) {
            console.log('     ⚠️ NEGATIVE AVAILABLE!');
          }
        }
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  }
}

quickCheck();