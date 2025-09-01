#!/usr/bin/env node

const mongoose = require('mongoose');
const Order = require('./server/models/Order');

async function diagnoseQCIssue() {
  try {
    console.log('🔍 Diagnosing QC Ready Orders Issue...\n');
    
    await mongoose.connect('mongodb://localhost:27017/chinadb');
    console.log('✅ Connected to database\n');

    // 1. Check total orders
    const totalOrders = await Order.countDocuments();
    console.log(`📊 Total Orders: ${totalOrders}`);

    if (totalOrders === 0) {
      console.log('❌ No orders in database! Need to create test orders first.');
      console.log('💡 Run: node create-test-orders.js');
      process.exit(1);
    }

    // 2. Check order statuses
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📋 Order Status Distribution:');
    statusCounts.forEach(status => {
      console.log(`   ${status._id}: ${status.count}`);
    });

    // 3. Check QC ready orders specifically
    const qcReadyCount = await Order.countDocuments({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    });
    
    console.log(`\n🎯 QC Ready Orders: ${qcReadyCount}`);

    if (qcReadyCount === 0) {
      console.log('❌ No QC ready orders found!');
      console.log('\n💡 Possible solutions:');
      console.log('1. Change existing order status to "ready"');
      console.log('2. Complete QC inspection for orders');
      console.log('3. Create test orders with QC data');
      
      // Check if we have orders in other statuses that could be made ready
      const pendingOrders = await Order.find({ 
        status: { $in: ['confirmed', 'in_production'] } 
      }).limit(3);
      
      if (pendingOrders.length > 0) {
        console.log('\n🔧 Quick Fix: Convert existing orders to QC ready status');
        console.log('Run the following commands:');
        
        pendingOrders.forEach(order => {
          console.log(`   Order ${order.orderNumber}: Currently "${order.status}" → Can be changed to "ready"`);
        });
      }
    } else {
      // 4. Check available cartons for QC ready orders
      const qcReadyOrders = await Order.find({
        status: { $in: ['ready', 'partial_ready'] },
        isLoopBack: { $ne: true }
      }).limit(5);

      console.log('\n🔍 Analyzing QC Ready Orders:');
      let totalAvailableCartons = 0;
      
      qcReadyOrders.forEach((order, index) => {
        console.log(`\n${index + 1}. ${order.orderNumber} (${order.status})`);
        console.log(`   Client: ${order.clientName}`);
        console.log(`   Items: ${order.items.length}`);
        
        order.items.forEach((item, itemIndex) => {
          const qcPassed = item.qcPassedCartons || 0;
          const allocated = item.allocatedCartons || 0;
          const available = qcPassed - allocated;
          totalAvailableCartons += available;
          
          if (itemIndex < 2) { // Show first 2 items only
            console.log(`     Item ${itemIndex}: ${item.itemCode}`);
            console.log(`       Expected: ${item.cartons || 0} cartons`);
            console.log(`       QC Passed: ${qcPassed} cartons`);
            console.log(`       Allocated: ${allocated} cartons`);
            console.log(`       Available: ${available} cartons`);
            console.log(`       QC Status: ${item.qcStatus || 'pending'}`);
          }
        });
      });
      
      console.log(`\n📊 Total Available Cartons: ${totalAvailableCartons}`);
      
      if (totalAvailableCartons === 0) {
        console.log('❌ QC ready orders exist but no cartons available!');
        console.log('💡 Need to fix QC data: set qcPassedCartons for items');
      } else {
        console.log('✅ Orders and cartons are available for allocation');
      }
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  }
}

diagnoseQCIssue();