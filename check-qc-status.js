#!/usr/bin/env node

const mongoose = require('mongoose');

async function checkQCStatus() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms', {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    
    console.log('=== QC STATUS CHECK ===\n');
    
    // Find ORD-000001 specifically
    const order = await db.collection('orders').findOne(
      { orderNumber: 'ORD-000001' }
    );
    
    if (!order) {
      console.log('❌ Order ORD-000001 not found');
      return;
    }
    
    console.log(`📋 ORDER: ${order.orderNumber} (${order.clientName})`);
    console.log(`Status: ${order.status}`);
    console.log(`QC Status: ${order.qcStatus}`);
    console.log(`Container ID: ${order.containerId || 'None'}\n`);
    
    // Check each item in detail
    console.log('📦 ITEMS ANALYSIS:');
    order.items.forEach((item, index) => {
      console.log(`\nItem ${index + 1}: ${item.itemCode}`);
      console.log(`  Description: ${item.description}`);
      console.log(`  QC Status: ${item.qcStatus}`);
      console.log(`  Total Cartons: ${item.cartons || 0}`);
      console.log(`  QC Passed Cartons: ${item.qcPassedCartons || 0}`);
      console.log(`  Allocated Cartons: ${item.allocatedCartons || 0}`);
      console.log(`  Available Cartons: ${Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0))}`);
      console.log(`  Container Item ID: ${item.containerId || 'None'}`);
      
      // Calculate what the API would return
      const qcPassedCtn = item.qcPassedCartons || 0;
      const allocatedCtn = item.allocatedCartons || 0;
      const availableCtn = Math.max(0, qcPassedCtn - allocatedCtn);
      
      console.log(`  API would return: ${availableCtn} available cartons`);
      
      if (availableCtn === 60) {
        console.log(`  🎯 THIS IS THE 60-CARTON ITEM!`);
      }
      
      if (qcPassedCtn === 60) {
        console.log(`  ⚠️  QC Passed = 60, might be source of confusion`);
      }
    });
    
    // Check containers
    console.log('\n🚢 CONTAINER ANALYSIS:');
    const containers = await db.collection('containers').find({
      'orders.orderId': order._id
    }).toArray();
    
    if (containers.length === 0) {
      console.log('❌ No containers found with this order');
    } else {
      containers.forEach((container, index) => {
        console.log(`\nContainer ${index + 1}: ${container.realContainerId}`);
        const orderAllocation = container.orders.find(o => o.orderId.toString() === order._id.toString());
        if (orderAllocation) {
          console.log(`  Carton Share: ${orderAllocation.cartonShare}`);
          console.log(`  CBM Share: ${orderAllocation.cbmShare}`);
          console.log(`  Allocated At: ${orderAllocation.allocatedAt}`);
        }
      });
    }
    
    // Summary
    const totalQcPassed = order.items.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0);
    const totalAllocated = order.items.reduce((sum, item) => sum + (item.allocatedCartons || 0), 0);
    const totalAvailable = order.items.reduce((sum, item) => sum + Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0)), 0);
    
    console.log('\n📊 SUMMARY:');
    console.log(`Total QC Passed: ${totalQcPassed} cartons`);
    console.log(`Total Allocated: ${totalAllocated} cartons`);
    console.log(`Total Available: ${totalAvailable} cartons`);
    
    if (totalAvailable === 60) {
      console.log('🎯 FOUND IT: Total available = 60!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

checkQCStatus();