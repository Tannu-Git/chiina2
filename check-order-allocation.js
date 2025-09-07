#!/usr/bin/env node

const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

async function checkOrderAllocation() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to database\n');
    
    console.log('=== CHECKING ORDER ORD-000001 ALLOCATION STATUS ===\n');
    
    // Find order ORD-000001
    const order = await Order.findOne({ orderNumber: 'ORD-000001' });
    if (!order) {
      console.log('❌ Order ORD-000001 not found');
      return;
    }
    
    console.log('📋 ORDER DETAILS:');
    console.log(`Order Number: ${order.orderNumber}`);
    console.log(`Client: ${order.clientName}`);
    console.log(`Status: ${order.status}`);
    console.log(`Container ID: ${order.containerId || 'None'}`);
    console.log(`Items count: ${order.items.length}\n`);
    
    console.log('📦 ITEM DETAILS:');
    order.items.forEach((item, index) => {
      console.log(`Item ${index + 1}: ${item.itemCode}`);
      console.log(`  Expected Cartons: ${item.cartons || 0}`);
      console.log(`  QC Passed Cartons: ${item.qcPassedCartons || 0}`);
      console.log(`  Allocated Cartons: ${item.allocatedCartons || 0}`);
      console.log(`  Container ID: ${item.containerId || 'None'}`);
      console.log(`  Available Cartons: ${Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0))}`);
      console.log('');
    });
    
    // Check containers that might have this order
    console.log('🚢 CHECKING CONTAINERS FOR THIS ORDER:');
    const containers = await Container.find({
      'orders.orderId': order._id
    });
    
    if (containers.length === 0) {
      console.log('❌ No containers found with this order');
    } else {
      console.log(`✅ Found ${containers.length} container(s) with this order:\n`);
      
      containers.forEach((container, index) => {
        console.log(`Container ${index + 1}: ${container.realContainerId}`);
        console.log(`  Status: ${container.status}`);
        console.log(`  Type: ${container.type}`);
        console.log(`  Current CBM: ${container.currentCbm}/${container.maxCbm}`);
        console.log(`  Current Weight: ${container.currentWeight}/${container.maxWeight}`);
        
        const orderAllocation = container.orders.find(o => o.orderId.toString() === order._id.toString());
        if (orderAllocation) {
          console.log(`  Order Allocation:`);
          console.log(`    CBM Share: ${orderAllocation.cbmShare}`);
          console.log(`    Weight Share: ${orderAllocation.weightShare}`);
          console.log(`    Carton Share: ${orderAllocation.cartonShare}`);
          console.log(`    Allocated At: ${orderAllocation.allocatedAt}`);
        }
        console.log('');
      });
    }
    
    // Calculate the discrepancy
    const totalAllocatedInContainers = containers.reduce((total, container) => {
      const orderAllocation = container.orders.find(o => o.orderId.toString() === order._id.toString());
      return total + (orderAllocation ? (orderAllocation.cartonShare || 0) : 0);
    }, 0);
    
    const totalAllocatedInOrder = order.items.reduce((total, item) => total + (item.allocatedCartons || 0), 0);
    
    console.log('🔍 ALLOCATION SUMMARY:');
    console.log(`Total cartons allocated in containers: ${totalAllocatedInContainers}`);
    console.log(`Total cartons marked as allocated in order: ${totalAllocatedInOrder}`);
    console.log(`Discrepancy: ${totalAllocatedInContainers - totalAllocatedInOrder} cartons\n`);
    
    if (totalAllocatedInContainers !== totalAllocatedInOrder) {
      console.log('❌ ISSUE IDENTIFIED: Allocation data inconsistency!');
      console.log('   The container shows allocations but the order items do not reflect this.');
      console.log('   This explains why the allocation page shows all cartons as available.');
    } else {
      console.log('✅ Allocation data is consistent');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

checkOrderAllocation();