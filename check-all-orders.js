#!/usr/bin/env node

const mongoose = require('mongoose');

async function checkAllOrders() {
  try {
    console.log('🔍 Connecting to database...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms', {
      maxPoolSize: 1,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 5000
    });
    console.log('✅ Connected to database\n');
    
    const db = mongoose.connection.db;
    
    console.log('=== CHECKING ALL ORDERS WITH QC DATA ===\n');
    
    // Find all orders with QC passed cartons
    const orders = await db.collection('orders').find({
      'items.qcPassedCartons': { $gt: 0 }
    }, {
      projection: { 
        orderNumber: 1, 
        clientName: 1, 
        status: 1, 
        'items.itemCode': 1,
        'items.qcPassedCartons': 1,
        'items.allocatedCartons': 1,
        'items.cartons': 1
      }
    }).toArray();
    
    console.log(`Found ${orders.length} orders with QC passed cartons:\n`);
    
    orders.forEach((order, orderIndex) => {
      console.log(`${orderIndex + 1}. Order: ${order.orderNumber} (${order.clientName})`);
      console.log(`   Status: ${order.status}`);
      
      if (order.items && order.items.length > 0) {
        order.items.forEach((item, itemIndex) => {
          const qcPassed = item.qcPassedCartons || 0;
          const allocated = item.allocatedCartons || 0;
          const total = item.cartons || 0;
          const available = Math.max(0, qcPassed - allocated);
          
          if (qcPassed > 0) {
            console.log(`   Item ${itemIndex + 1}: ${item.itemCode || 'Unknown'}`);
            console.log(`     Total Cartons: ${total}`);
            console.log(`     QC Passed: ${qcPassed}`);
            console.log(`     Allocated: ${allocated}`);
            console.log(`     Available: ${available}`);
            
            if (available !== (qcPassed - allocated)) {
              console.log(`     ⚠️  Calculation mismatch!`);
            }
          }
        });
      }
      console.log('');
    });
    
    // Check specific case mentioned by user
    console.log('=== LOOKING FOR SPECIFIC ISSUE ===\n');
    const specificOrder = await db.collection('orders').findOne({
      orderNumber: 'ORD-000001'
    });
    
    if (specificOrder && specificOrder.items) {
      console.log('Detailed ORD-000001 check:');
      specificOrder.items.forEach((item, index) => {
        console.log(`Item ${index + 1}: ${item.itemCode}`);
        console.log(`  Description: ${item.description || 'N/A'}`);
        console.log(`  Total Cartons: ${item.cartons || 0}`);
        console.log(`  QC Passed: ${item.qcPassedCartons || 0}`);
        console.log(`  Allocated: ${item.allocatedCartons || 0}`);
        console.log(`  Available: ${Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0))}`);
        console.log('');
      });
      
      // Check if the user's description matches any item
      const itemWith60Cartons = specificOrder.items.find(item => {
        const available = Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0));
        return available === 60 || (item.cartons || 0) === 60;
      });
      
      if (itemWith60Cartons) {
        console.log('🎯 Found item with 60 cartons:');
        console.log(JSON.stringify(itemWith60Cartons, null, 2));
      } else {
        console.log('❌ No item found with 60 available cartons in ORD-000001');
        
        // Let's check if the user might be looking at a different order
        console.log('\n🔍 Searching for any order with 60 available cartons...');
        
        const allOrdersWithItems = await db.collection('orders').find({
          'items.qcPassedCartons': { $gt: 0 }
        }).toArray();
        
        let found60Cartons = false;
        allOrdersWithItems.forEach(order => {
          order.items?.forEach(item => {
            const available = Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0));
            if (available === 60) {
              console.log(`✅ Found 60 available cartons in ${order.orderNumber}: ${item.itemCode}`);
              found60Cartons = true;
            }
          });
        });
        
        if (!found60Cartons) {
          console.log('❌ No order found with exactly 60 available cartons');
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n📴 Disconnected from database');
  }
}

checkAllOrders();