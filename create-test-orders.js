#!/usr/bin/env node

/**
 * Create Test Orders with QC Data for Container Allocation Testing
 */

const mongoose = require('mongoose');

async function createTestOrders() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    // Import the Order model
    const Order = require('./server/models/Order');

    console.log('🏭 CREATING TEST ORDERS FOR ALLOCATION...');
    
    // Create test orders with different scenarios
    const testOrders = [
      {
        orderNumber: 'ORD-TEST-001',
        clientId: 'CLIENT-A',
        clientName: 'Test Client A',
        status: 'ready',
        qcStatus: 'completed',
        qcCompletedAt: new Date(),
        totalAmount: 5000,
        totalCarryingCharges: 500,
        totalWeight: 2500,
        totalCbm: 15,
        totalCartons: 50,
        items: [
          {
            itemCode: 'ITEM-A-001',
            description: 'Test Widget A',
            quantity: 1000,
            cartons: 20,
            unitPrice: 2.50,
            unitWeight: 2.5,
            unitCbm: 0.3,
            paymentType: 'CLIENT_DIRECT',
            carryingCharge: {
              basis: 'carton',
              rate: 10,
              amount: 200
            },
            // QC completed - ready for allocation
            qcPassedCartons: 20,
            qcPassedQuantity: 1000,
            loopBackCartons: 0,
            loopBackQuantity: 0,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'completed'
          },
          {
            itemCode: 'ITEM-A-002', 
            description: 'Test Gadget A',
            quantity: 1500,
            cartons: 30,
            unitPrice: 1.80,
            unitWeight: 2.0,
            unitCbm: 0.2,
            paymentType: 'THROUGH_ME',
            carryingCharge: {
              basis: 'carton',
              rate: 10,
              amount: 300
            },
            // QC completed - ready for allocation
            qcPassedCartons: 30,
            qcPassedQuantity: 1500,
            loopBackCartons: 0,
            loopBackQuantity: 0,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'completed'
          }
        ]
      },
      {
        orderNumber: 'ORD-TEST-002',
        clientId: 'CLIENT-B',
        clientName: 'Test Client B',
        status: 'partial_ready',
        qcStatus: 'partial',
        qcCompletedAt: new Date(),
        totalAmount: 3000,
        totalCarryingCharges: 200,
        totalWeight: 1800,
        totalCbm: 10,
        totalCartons: 40,
        items: [
          {
            itemCode: 'ITEM-B-001',
            description: 'Test Product B',
            quantity: 2000,
            cartons: 40,
            unitPrice: 1.50,
            unitWeight: 2.0,
            unitCbm: 0.25,
            paymentType: 'CLIENT_DIRECT',
            carryingCharge: {
              basis: 'carton',
              rate: 5,
              amount: 200
            },
            // Partial QC - some available for allocation
            qcPassedCartons: 25,  // Only 25 out of 40 cartons passed
            qcPassedQuantity: 1250,
            loopBackCartons: 10,  // 10 cartons have issues
            loopBackQuantity: 500,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'partial'
          }
        ]
      },
      {
        orderNumber: 'ORD-TEST-003',
        clientId: 'CLIENT-C',
        clientName: 'Test Client C',
        status: 'ready',
        qcStatus: 'completed',
        qcCompletedAt: new Date(),
        totalAmount: 8000,
        totalCarryingCharges: 600,
        totalWeight: 4000,
        totalCbm: 25,
        totalCartons: 80,
        items: [
          {
            itemCode: 'ITEM-C-001',
            description: 'Large Test Item C',
            quantity: 800,
            cartons: 80,
            unitPrice: 10,
            unitWeight: 5,
            unitCbm: 0.31,
            paymentType: 'THROUGH_ME',
            carryingCharge: {
              basis: 'cbm',
              rate: 30,
              amount: 600
            },
            // All QC passed - ready for allocation
            qcPassedCartons: 80,
            qcPassedQuantity: 800,
            loopBackCartons: 0,
            loopBackQuantity: 0,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'completed'
          }
        ]
      }
    ];

    console.log('📦 Creating test orders...');
    
    // Add default user ID for createdBy field
    const defaultUserId = new mongoose.Types.ObjectId();
    
    for (const orderData of testOrders) {
      orderData.createdBy = defaultUserId;
      orderData.updatedBy = defaultUserId;
      
      const order = new Order(orderData);
      await order.save();
      
      console.log(`✅ Created ${order.orderNumber}`);
      
      // Calculate and show available cartons
      order.items.forEach((item, index) => {
        const availableCartons = item.qcPassedCartons - item.allocatedCartons;
        console.log(`   Item ${index}: ${item.itemCode} - ${availableCartons} cartons available`);
      });
    }

    console.log('\n🎉 TEST ORDERS CREATED SUCCESSFULLY!');
    console.log('\n📊 ALLOCATION TEST SUMMARY:');
    console.log('- ORD-TEST-001: 50 cartons available (20 + 30)');
    console.log('- ORD-TEST-002: 25 cartons available (partial QC)');  
    console.log('- ORD-TEST-003: 80 cartons available');
    console.log('- Total Available: 155 cartons for allocation');
    
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Try container allocation again in the frontend');
    console.log('2. You should now see orders with available cartons');
    console.log('3. Test allocating 10 cartons - should work now!');

  } catch (error) {
    console.error('❌ Error creating test orders:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n🔌 Disconnected from MongoDB');
  }
}

if (require.main === module) {
  createTestOrders();
}