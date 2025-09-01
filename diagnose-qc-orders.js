#!/usr/bin/env node

/**
 * QC Orders Diagnostic Script
 * 
 * This script diagnoses why QC ready orders are not showing up
 * and provides solutions to fix the issue.
 */

const mongoose = require('mongoose');

// Connect to database
async function connectToDatabase() {
  try {
    const mongoUri = 'mongodb://localhost:27017/china-trade';
    await mongoose.connect(mongoUri);
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error);
    process.exit(1);
  }
}

// Simple Order schema for diagnosis
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  status: String,
  isLoopBack: Boolean,
  items: [{
    qcStatus: String,
    qcPassedCartons: Number,
    allocatedCartons: Number,
    cartons: Number,
    quantity: Number
  }]
});

const Order = mongoose.model('Order', orderSchema);

async function diagnoseQCOrders() {
  console.log('🔍 QC Ready Orders Diagnostic Report');
  console.log('=' .repeat(50));
  
  try {
    // 1. Check total orders count
    const totalOrders = await Order.countDocuments({ isLoopBack: { $ne: true } });
    console.log(`\n📊 Total Orders in Database: ${totalOrders}`);
    
    if (totalOrders === 0) {
      console.log('❌ NO ORDERS FOUND! This is the root cause.');
      console.log('\n💡 SOLUTIONS:');
      console.log('1. Create some test orders first');
      console.log('2. Or import existing orders data');
      console.log('3. Run: node create-test-orders.js');
      return;
    }
    
    // 2. Check orders by status
    const statusCounts = await Order.aggregate([
      { $match: { isLoopBack: { $ne: true } } },
      { $group: { _id: '$status', count: { $sum: 1 } } },
      { $sort: { count: -1 } }
    ]);
    
    console.log('\n📋 Orders by Status:');
    statusCounts.forEach(item => {
      console.log(`   ${item._id}: ${item.count} orders`);
    });
    
    // 3. Check QC ready criteria
    const qcReadyCount = await Order.countDocuments({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    });
    
    console.log(`\n✅ QC Ready Orders (by status): ${qcReadyCount}`);
    
    // 4. Check individual QC ready orders
    const qcReadyOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    }).select('orderNumber status items.qcStatus items.qcPassedCartons items.allocatedCartons');
    
    if (qcReadyOrders.length === 0) {
      console.log('❌ NO QC READY ORDERS! Orders need QC inspection.');
      console.log('\n💡 SOLUTIONS:');
      console.log('1. Go to Warehouse page → Select orders → Start QC');
      console.log('2. Or run this fix command:');
      console.log('   node fix-qc-orders.js');
      
      // Show sample orders that need QC
      const sampleOrders = await Order.find({
        status: { $in: ['confirmed', 'in_production'] },
        isLoopBack: { $ne: true }
      }).select('orderNumber status').limit(3);
      
      if (sampleOrders.length > 0) {
        console.log('\n📦 Orders that need QC inspection:');
        sampleOrders.forEach(order => {
          console.log(`   - ${order.orderNumber} (status: ${order.status})`);
        });
      }
      
      return;
    }
    
    // 5. Check available cartons
    console.log(`\n🔍 Checking ${qcReadyOrders.length} QC Ready Orders:`);
    let totalAvailableCartons = 0;
    let ordersWithZeroCartons = 0;
    
    qcReadyOrders.forEach((order, index) => {
      console.log(`\n   ${index + 1}. ${order.orderNumber} (${order.status})`);
      
      let orderAvailableCartons = 0;
      order.items.forEach((item, itemIndex) => {
        const qcPassed = item.qcPassedCartons || 0;
        const allocated = item.allocatedCartons || 0;
        const available = qcPassed - allocated;
        
        orderAvailableCartons += available;
        totalAvailableCartons += available;
        
        if (itemIndex < 2) { // Show first 2 items
          console.log(`      Item ${itemIndex + 1}: ${available} cartons available (${qcPassed} passed - ${allocated} allocated)`);
        }
      });
      
      if (orderAvailableCartons === 0) {
        ordersWithZeroCartons++;
        console.log(`      ⚠️ This order has 0 available cartons!`);
      }
    });
    
    console.log(`\n📊 SUMMARY:`);
    console.log(`   Total QC Ready Orders: ${qcReadyOrders.length}`);
    console.log(`   Total Available Cartons: ${totalAvailableCartons}`);
    console.log(`   Orders with 0 cartons: ${ordersWithZeroCartons}`);
    
    if (totalAvailableCartons === 0) {
      console.log('\n❌ ZERO AVAILABLE CARTONS! This is why the interface is empty.');
      console.log('\n💡 POSSIBLE CAUSES:');
      console.log('1. Orders completed QC but all cartons were already allocated');
      console.log('2. QC inspection failed (0 cartons passed)');
      console.log('3. QC fields not properly set (qcPassedCartons = 0)');
      
      console.log('\n🛠️ QUICK FIX - Run this command:');
      console.log('   node fix-zero-cartons.js');
    } else {
      console.log('\n✅ Database looks good! The issue might be in the frontend.');
      console.log('\n🔍 CHECK:');
      console.log('1. Network tab in browser for API errors');
      console.log('2. Console logs for JavaScript errors');
      console.log('3. Authentication token validity');
    }
    
  } catch (error) {
    console.error('❌ Diagnostic error:', error);
  }
}

async function main() {
  console.log('🚀 Starting QC Orders Diagnosis...\n');
  
  await connectToDatabase();
  await diagnoseQCOrders();
  
  console.log('\n👋 Diagnosis complete. Disconnecting...');
  await mongoose.disconnect();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { diagnoseQCOrders };