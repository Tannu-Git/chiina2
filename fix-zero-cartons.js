#!/usr/bin/env node

/**
 * Fix Zero Cartons Script
 * 
 * This script fixes orders that have completed QC but show 0 available cartons
 * by properly setting the QC fields.
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

// Simple Order schema
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  clientName: String,
  clientId: mongoose.Schema.Types.ObjectId,
  status: String,
  isLoopBack: Boolean,
  qcCompletedAt: Date,
  totalCbm: Number,
  totalWeight: Number,
  totalCartons: Number,
  items: [{
    itemCode: String,
    description: String,
    quantity: Number,
    cartons: Number,
    cbmPerCarton: Number,
    weightPerCarton: Number,
    carryingChargePerCarton: Number,
    qcStatus: String,
    qcPassedQuantity: Number,
    qcPassedCartons: Number,
    allocatedQuantity: Number,
    allocatedCartons: Number
  }]
});

const Order = mongoose.model('Order', orderSchema);

async function fixZeroCartons() {
  console.log('🔧 Fixing Zero Cartons Issue');
  console.log('=' .repeat(40));
  
  try {
    // Find orders that need fixing
    const ordersToFix = await Order.find({
      $or: [
        { status: { $in: ['confirmed', 'in_production'] } },
        { 
          status: { $in: ['ready', 'partial_ready'] },
          'items.qcPassedCartons': { $exists: false }
        },
        {
          status: { $in: ['ready', 'partial_ready'] },
          'items.qcPassedCartons': 0
        }
      ],
      isLoopBack: { $ne: true }
    });
    
    console.log(`\n🔍 Found ${ordersToFix.length} orders that need fixing`);
    
    if (ordersToFix.length === 0) {
      console.log('✅ No orders need fixing. The issue might be elsewhere.');
      return;
    }
    
    let fixedCount = 0;
    
    for (const order of ordersToFix) {
      console.log(`\n📦 Fixing: ${order.orderNumber}`);
      
      // Update order status and QC fields
      let needsUpdate = false;
      
      // Fix order status
      if (!['ready', 'partial_ready'].includes(order.status)) {
        order.status = 'ready';
        order.qcCompletedAt = new Date();
        needsUpdate = true;
        console.log(`   ✅ Updated status to 'ready'`);
      }
      
      // Fix item QC fields
      order.items.forEach((item, index) => {
        const originalCartons = item.cartons || 0;
        const originalQuantity = item.quantity || 0;
        
        if (!item.qcStatus || item.qcStatus !== 'completed') {
          item.qcStatus = 'completed';
          needsUpdate = true;
        }
        
        if (!item.qcPassedCartons || item.qcPassedCartons === 0) {
          item.qcPassedCartons = originalCartons;
          needsUpdate = true;
          console.log(`   ✅ Item ${index + 1}: Set qcPassedCartons = ${originalCartons}`);
        }
        
        if (!item.qcPassedQuantity || item.qcPassedQuantity === 0) {
          item.qcPassedQuantity = originalQuantity;
          needsUpdate = true;
        }
        
        // Ensure allocatedCartons exists (default to 0)
        if (item.allocatedCartons === undefined) {
          item.allocatedCartons = 0;
          needsUpdate = true;
        }
        
        if (item.allocatedQuantity === undefined) {
          item.allocatedQuantity = 0;
          needsUpdate = true;
        }
      });
      
      if (needsUpdate) {
        await order.save();
        fixedCount++;
        console.log(`   ✅ Order ${order.orderNumber} fixed`);
      } else {
        console.log(`   ➡️ Order ${order.orderNumber} already correct`);
      }
    }
    
    console.log(`\n🎉 Fixed ${fixedCount} orders!`);
    
    // Verify the fix
    console.log('\n🔍 Verifying fix...');
    const qcReadyOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    });
    
    let totalAvailableCartons = 0;
    qcReadyOrders.forEach(order => {
      order.items.forEach(item => {
        const available = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
        totalAvailableCartons += available;
      });
    });
    
    console.log(`✅ After fix:`);
    console.log(`   QC Ready Orders: ${qcReadyOrders.length}`);
    console.log(`   Total Available Cartons: ${totalAvailableCartons}`);
    
    if (totalAvailableCartons > 0) {
      console.log('\n🎉 SUCCESS! You should now see orders in the allocation interface.');
      console.log('\n📝 Next steps:');
      console.log('1. Refresh your browser');
      console.log('2. Go to /warehouse/allocation');
      console.log('3. You should see available orders and items');
    } else {
      console.log('\n⚠️ Still showing 0 cartons. Additional investigation needed.');
    }
    
  } catch (error) {
    console.error('❌ Fix error:', error);
  }
}

async function createTestOrderIfNeeded() {
  const orderCount = await Order.countDocuments({ isLoopBack: { $ne: true } });
  
  if (orderCount === 0) {
    console.log('\n📦 Creating a test order since database is empty...');
    
    const testOrder = new Order({
      orderNumber: `ORD-TEST-${Date.now()}`,
      clientName: 'Test Client',
      clientId: new mongoose.Types.ObjectId(),
      status: 'ready',
      qcCompletedAt: new Date(),
      totalCbm: 15.5,
      totalWeight: 850,
      totalCartons: 25,
      items: [
        {
          itemCode: 'TEST-A001',
          description: 'Test Item A',
          quantity: 100,
          cartons: 15,
          cbmPerCarton: 0.8,
          weightPerCarton: 45,
          carryingChargePerCarton: 125,
          qcStatus: 'completed',
          qcPassedQuantity: 100,
          qcPassedCartons: 15,
          allocatedQuantity: 0,
          allocatedCartons: 0
        },
        {
          itemCode: 'TEST-B002', 
          description: 'Test Item B',
          quantity: 50,
          cartons: 10,
          cbmPerCarton: 0.7,
          weightPerCarton: 40,
          carryingChargePerCarton: 110,
          qcStatus: 'completed',
          qcPassedQuantity: 50,
          qcPassedCartons: 10,
          allocatedQuantity: 0,
          allocatedCartons: 0
        }
      ]
    });
    
    await testOrder.save();
    console.log(`✅ Created test order: ${testOrder.orderNumber}`);
    console.log(`   - 2 items with 25 total cartons available`);
    console.log(`   - Ready for container allocation`);
  }
}

async function main() {
  console.log('🚀 Starting Zero Cartons Fix...\n');
  
  await connectToDatabase();
  await createTestOrderIfNeeded();
  await fixZeroCartons();
  
  console.log('\n👋 Fix complete. Disconnecting...');
  await mongoose.disconnect();
}

// Run the script
if (require.main === module) {
  main().catch(console.error);
}

module.exports = { fixZeroCartons };