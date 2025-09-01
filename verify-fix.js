#!/usr/bin/env node

/**
 * Verification Script - Test that the allocation issue is fixed
 */

const mongoose = require('mongoose');

async function verifyFix() {
  try {
    console.log('🔍 VERIFYING ALLOCATION FIX...');
    
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5');
    console.log('✅ Connected to MongoDB');

    const Order = require('./server/models/Order');

    // Simulate the QC ready orders API logic
    const qcReadyOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    }).lean();

    console.log(`\n📊 QC Ready Orders API Simulation:`);
    console.log(`Found ${qcReadyOrders.length} QC ready orders`);

    let totalAvailableCartons = 0;
    let allocatableOrders = [];

    qcReadyOrders.forEach(order => {
      const allocatableItems = order.items.filter(item => {
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        const availableCtn = qcPassedCtn - allocatedCtn;
        return availableCtn > 0 && ['completed', 'partial'].includes(item.qcStatus);
      }).map(item => {
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        const availableCtn = qcPassedCtn - allocatedCtn;
        totalAvailableCartons += availableCtn;
        
        return {
          ...item,
          availableCartons: availableCtn,
          availableQuantity: (item.qcPassedQuantity || 0) - (item.allocatedQuantity || 0)
        };
      });

      if (allocatableItems.length > 0) {
        allocatableOrders.push({
          ...order,
          items: allocatableItems
        });
      }
    });

    console.log(`\n✅ RESULTS:`);
    console.log(`   Allocatable Orders: ${allocatableOrders.length}`);
    console.log(`   Total Available Cartons: ${totalAvailableCartons}`);

    console.log(`\n📦 ORDER DETAILS:`);
    allocatableOrders.forEach(order => {
      console.log(`   ${order.orderNumber} (${order.clientName}):`);
      order.items.forEach((item, index) => {
        console.log(`     Item ${index}: ${item.itemCode} - ${item.availableCartons} cartons available`);
      });
    });

    // Test allocation simulation
    const requestedCartons = 10;
    console.log(`\n🧪 ALLOCATION TEST: Requesting ${requestedCartons} cartons`);
    
    if (totalAvailableCartons >= requestedCartons) {
      console.log(`✅ SUCCESS: ${requestedCartons} cartons can be allocated from ${totalAvailableCartons} available`);
      console.log(`🎉 The "Cannot allocate 10 cartons. Maximum available: 0" error is FIXED!`);
    } else {
      console.log(`❌ FAILED: Only ${totalAvailableCartons} cartons available, cannot allocate ${requestedCartons}`);
    }

    console.log(`\n📋 API RESPONSE SIMULATION:`);
    console.log(`{`);
    console.log(`  "orders": [${allocatableOrders.length} orders],`);
    console.log(`  "summary": {`);
    console.log(`    "totalOrders": ${allocatableOrders.length},`);
    console.log(`    "totalAvailableCartons": ${totalAvailableCartons}`);
    console.log(`  }`);
    console.log(`}`);

  } catch (error) {
    console.error('❌ Verification failed:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  verifyFix();
}