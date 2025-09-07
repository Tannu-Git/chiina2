#!/usr/bin/env node

const mongoose = require('mongoose');

async function directDatabaseCheck() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms', {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    console.log('✅ Connected to database\n');
    
    // Direct MongoDB operations to avoid model complexity
    const db = mongoose.connection.db;
    
    console.log('=== CHECKING ORDER ORD-000001 ===\n');
    
    const order = await db.collection('orders').findOne(
      { orderNumber: 'ORD-000001' },
      { projection: { orderNumber: 1, clientName: 1, status: 1, containerId: 1, items: 1 } }
    );
    
    if (!order) {
      console.log('❌ Order not found');
      return;
    }
    
    console.log('📋 ORDER FOUND:');
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Client: ${order.clientName}`);
    console.log(`Status: ${order.status}`);
    console.log(`Container ID: ${order.containerId || 'None'}`);
    console.log(`Items: ${order.items?.length || 0}\n`);
    
    // Check each item
    if (order.items && order.items.length > 0) {
      console.log('📦 ITEM DETAILS:');
      order.items.forEach((item, index) => {
        const qcPassed = item.qcPassedCartons || 0;
        const allocated = item.allocatedCartons || 0;
        const available = Math.max(0, qcPassed - allocated);
        
        console.log(`Item ${index + 1}: ${item.itemCode || 'Unknown'}`);
        console.log(`  QC Passed: ${qcPassed} cartons`);
        console.log(`  Allocated: ${allocated} cartons`);
        console.log(`  Available: ${available} cartons`);
        console.log(`  Container ID: ${item.containerId || 'None'}`);
        console.log('');
      });
    }
    
    // Check containers
    console.log('🚢 CHECKING CONTAINERS:');
    const containers = await db.collection('containers').find({
      'orders.orderId': order._id
    }).toArray();
    
    console.log(`Found ${containers.length} containers with this order\n`);
    
    containers.forEach((container, index) => {
      console.log(`Container ${index + 1}: ${container.realContainerId}`);
      console.log(`  Status: ${container.status}`);
      
      const orderAllocation = container.orders?.find(o => o.orderId.toString() === order._id.toString());
      if (orderAllocation) {
        console.log(`  Allocation:`);
        console.log(`    Carton Share: ${orderAllocation.cartonShare || 0}`);
        console.log(`    CBM Share: ${orderAllocation.cbmShare || 0}`);
        console.log(`    Weight Share: ${orderAllocation.weightShare || 0}`);
        console.log(`    Allocated At: ${orderAllocation.allocatedAt}`);
      }
      console.log('');
    });
    
    // Summary
    const containerCartons = containers.reduce((total, container) => {
      const allocation = container.orders?.find(o => o.orderId.toString() === order._id.toString());
      return total + (allocation?.cartonShare || 0);
    }, 0);
    
    const orderCartons = order.items?.reduce((total, item) => total + (item.allocatedCartons || 0), 0) || 0;
    
    console.log('📊 SUMMARY:');
    console.log(`Cartons allocated in containers: ${containerCartons}`);
    console.log(`Cartons marked allocated in order: ${orderCartons}`);
    console.log(`Discrepancy: ${containerCartons - orderCartons}`);
    
    if (containerCartons > 0 && orderCartons === 0) {
      console.log('\n❌ PROBLEM IDENTIFIED:');
      console.log('   Containers show allocations but order items have allocatedCartons = 0');
      console.log('   This is why the allocation page shows all cartons as available');
      console.log('   The allocation process updated containers but not order items');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

directDatabaseCheck();