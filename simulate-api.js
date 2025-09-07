#!/usr/bin/env node

const mongoose = require('mongoose');

async function simulateQCReadyAPI() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms', {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    
    console.log('=== SIMULATING /api/warehouse/qc-ready-orders ===\n');
    
    // Exact filter from the API
    const filter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    console.log('Filter:', JSON.stringify(filter, null, 2));
    
    const orders = await db.collection('orders').find(filter).toArray();
    
    console.log(`\nFound ${orders.length} orders matching filter\n`);
    
    const allocatableOrders = [];
    
    orders.forEach(order => {
      console.log(`🔍 Processing: ${order.orderNumber}`);
      
      const allocatableItems = [];
      
      order.items.forEach(item => {
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        const availableCtn = Math.max(0, qcPassedCtn - allocatedCtn);
        
        console.log(`  Item: ${item.itemCode}`);
        console.log(`    QC Status: ${item.qcStatus}`);
        console.log(`    QC Passed: ${qcPassedCtn}, Allocated: ${allocatedCtn}, Available: ${availableCtn}`);
        
        const meetsQCFilter = item.qcStatus === 'completed' || item.qcStatus === 'partial';
        const meetsQuantityFilter = availableCtn > 0;
        
        console.log(`    Meets QC Filter: ${meetsQCFilter}`);
        console.log(`    Meets Quantity Filter: ${meetsQuantityFilter}`);
        
        if (meetsQCFilter && meetsQuantityFilter) {
          console.log(`    ✅ INCLUDED in API response`);
          allocatableItems.push({
            ...item,
            availableCartons: availableCtn,
            availableQuantity: Math.max(0, (item.qcPassedQuantity || 0) - (item.allocatedQuantity || 0))
          });
          
          if (availableCtn === 60) {
            console.log(`    🎯 FOUND 60 AVAILABLE CARTONS!`);
          }
        } else {
          console.log(`    ❌ EXCLUDED from API response`);
        }
      });
      
      if (allocatableItems.length > 0) {
        allocatableOrders.push({
          ...order,
          items: allocatableItems
        });
        console.log(`  ✅ Order ${order.orderNumber} included with ${allocatableItems.length} items`);
      } else {
        console.log(`  ❌ Order ${order.orderNumber} excluded - no allocatable items`);
      }
      console.log('');
    });
    
    console.log('=== API RESPONSE SUMMARY ===');
    console.log(`Orders returned: ${allocatableOrders.length}`);
    
    if (allocatableOrders.length === 0) {
      console.log('❌ No orders would be returned by the API!');
      console.log('This explains why allocation page shows no available orders.');
    } else {
      allocatableOrders.forEach(order => {
        console.log(`\n📦 ${order.orderNumber}:`);
        order.items.forEach(item => {
          console.log(`  - ${item.itemCode}: ${item.availableCartons} available`);
        });
      });
    }
    
    // Check for any orders with 60 total cartons (confusion source)
    console.log('\n=== CHECKING FOR 60-CARTON CONFUSION ===');
    const allOrders = await db.collection('orders').find({}).toArray();
    
    allOrders.forEach(order => {
      order.items?.forEach(item => {
        if ((item.cartons || 0) === 60) {
          console.log(`🔍 Found item with 60 total cartons: ${order.orderNumber} - ${item.itemCode}`);
        }
        if ((item.qcPassedCartons || 0) === 60) {
          console.log(`🔍 Found item with 60 QC passed cartons: ${order.orderNumber} - ${item.itemCode}`);
        }
      });
    });
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

simulateQCReadyAPI();