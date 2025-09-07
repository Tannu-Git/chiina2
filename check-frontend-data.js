#!/usr/bin/env node

const mongoose = require('mongoose');

async function checkWhatFrontendWouldSee() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms', {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    
    console.log('=== WHAT ALLOCATION PAGE WOULD SHOW ===\n');
    
    // Check all orders to see what might show "60"
    const allOrders = await db.collection('orders').find({}).toArray();
    
    console.log('Checking all orders for any 60-related values:\n');
    
    allOrders.forEach(order => {
      console.log(`📋 ${order.orderNumber} (${order.clientName || order.clientId})`);
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, index) => {
          const totalCartons = item.cartons || 0;
          const qcPassed = item.qcPassedCartons || 0;
          const allocated = item.allocatedCartons || 0;
          const available = Math.max(0, qcPassed - allocated);
          const totalQuantity = item.quantity || 0;
          const qcPassedQty = item.qcPassedQuantity || 0;
          const allocatedQty = item.allocatedQuantity || 0;
          const availableQty = Math.max(0, qcPassedQty - allocatedQty);
          
          console.log(`  Item ${index + 1}: ${item.itemCode || 'Unknown'}`);
          console.log(`    Total Cartons: ${totalCartons}`);
          console.log(`    QC Passed Cartons: ${qcPassed}`);
          console.log(`    Allocated Cartons: ${allocated}`);
          console.log(`    Available Cartons: ${available}`);
          console.log(`    Total Quantity: ${totalQuantity}`);
          console.log(`    Available Quantity: ${availableQty}`);
          
          // Check for any field with value 60
          const fieldsWithValue60 = [];
          if (totalCartons === 60) fieldsWithValue60.push('Total Cartons');
          if (qcPassed === 60) fieldsWithValue60.push('QC Passed Cartons');
          if (allocated === 60) fieldsWithValue60.push('Allocated Cartons');
          if (available === 60) fieldsWithValue60.push('Available Cartons');
          if (totalQuantity === 60) fieldsWithValue60.push('Total Quantity');
          if (availableQty === 60) fieldsWithValue60.push('Available Quantity');
          
          if (fieldsWithValue60.length > 0) {
            console.log(`    🎯 HAS VALUE 60 IN: ${fieldsWithValue60.join(', ')}`);
          }
          
          console.log('');
        });
      }
      console.log('');
    });
    
    // Simulate exact API response structure
    console.log('=== SIMULATING EXACT API RESPONSE ===\n');
    
    const qcReadyFilter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    const qcReadyOrders = await db.collection('orders').find(qcReadyFilter).toArray();
    
    if (qcReadyOrders.length === 0) {
      console.log('❌ API would return empty array - no QC ready orders');
      console.log('This means allocation page would show "No QC ready orders found"');
    } else {
      console.log(`API would process ${qcReadyOrders.length} orders:`);
      
      qcReadyOrders.forEach(order => {
        console.log(`\n📦 ${order.orderNumber}:`);
        console.log(`  Status: ${order.status}`);
        console.log(`  Client: ${order.clientName}`);
        
        const hasAllocatableItems = order.items.some(item => {
          const available = Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0));
          const qcStatus = item.qcStatus;
          return available > 0 && (qcStatus === 'completed' || qcStatus === 'partial');
        });
        
        console.log(`  Would be included in API: ${hasAllocatableItems}`);
      });
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

checkWhatFrontendWouldSee();