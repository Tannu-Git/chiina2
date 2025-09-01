#!/usr/bin/env node

/**
 * Simple Database Initialization for Container Allocation Testing
 * 
 * This script quickly initializes the database with test orders that have
 * available cartons for allocation, fixing the "Maximum available: 0" error.
 */

const mongoose = require('mongoose');

async function initializeTestData() {
  try {
    console.log('🚀 Initializing test data for container allocation...');
    
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5');
    console.log('✅ Connected to MongoDB');

    // Import models with simplified schema for quick creation
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false }));
    const User = mongoose.model('User', new mongoose.Schema({}, { strict: false }));

    // Check if we already have orders
    const existingOrders = await Order.countDocuments();
    if (existingOrders > 0) {
      console.log(`📦 Found ${existingOrders} existing orders`);
      
      // Fix existing orders to have available cartons
      const result = await Order.updateMany(
        {
          status: { $in: ['ready', 'partial_ready', 'draft', 'submitted'] },
          'items.cartons': { $gt: 0 }
        },
        [
          {
            $set: {
              status: 'ready',
              qcStatus: 'completed',
              qcCompletedAt: new Date(),
              items: {
                $map: {
                  input: '$items',
                  as: 'item',
                  in: {
                    $mergeObjects: [
                      '$$item',
                      {
                        qcPassedCartons: { $ifNull: ['$$item.qcPassedCartons', '$$item.cartons'] },
                        qcPassedQuantity: { $ifNull: ['$$item.qcPassedQuantity', '$$item.quantity'] },
                        loopBackCartons: 0,
                        loopBackQuantity: 0,
                        allocatedCartons: { $ifNull: ['$$item.allocatedCartons', 0] },
                        allocatedQuantity: { $ifNull: ['$$item.allocatedQuantity', 0] },
                        qcStatus: 'completed'
                      }
                    ]
                  }
                }
              }
            }
          }
        ]
      );
      
      console.log(`✅ Updated ${result.modifiedCount} existing orders to be QC ready`);
    }

    // Create test user if none exists
    let testUser = await User.findOne();
    if (!testUser) {
      await User.create({
        _id: new mongoose.Types.ObjectId(),
        name: 'Test Admin',
        email: 'admin@test.com',
        password: 'hashed_password',
        role: 'admin'
      });
      testUser = await User.findOne();
      console.log('✅ Created test user');
    }

    // Create additional test orders if database was empty
    if (existingOrders === 0) {
      console.log('📦 Creating test orders with available cartons...');
      
      const testOrders = [
        {
          _id: new mongoose.Types.ObjectId(),
          orderNumber: 'ORD-000001',
          clientId: 'CLI-TEST-A',
          clientName: 'Test Client Alpha',
          status: 'ready',
          qcStatus: 'completed',
          qcCompletedAt: new Date(),
          totalAmount: 5000,
          totalCarryingCharges: 500,
          totalWeight: 2000,
          totalCbm: 15,
          totalCartons: 50,
          totalQcPassedCartons: 50,
          totalLoopBackCartons: 0,
          totalPendingCartons: 0,
          qcCompletionPercentage: 100,
          priority: 'medium',
          createdBy: testUser._id,
          updatedBy: testUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
          items: [
            {
              itemCode: 'WIDGET-100',
              description: 'Premium Widget Set',
              quantity: 1000,
              cartons: 20,
              unitPrice: 2.50,
              unitWeight: 2.0,
              unitCbm: 0.3,
              totalPrice: 2500,
              paymentType: 'CLIENT_DIRECT',
              carryingCharge: {
                basis: 'carton',
                rate: 12,
                amount: 240
              },
              qcPassedCartons: 20,
              qcPassedQuantity: 1000,
              loopBackCartons: 0,
              loopBackQuantity: 0,
              allocatedCartons: 0,
              allocatedQuantity: 0,
              pendingCartons: 0,
              pendingQuantity: 0,
              qcStatus: 'completed'
            },
            {
              itemCode: 'GADGET-200',
              description: 'Advanced Gadget Kit',
              quantity: 900,
              cartons: 30,
              unitPrice: 2.78,
              unitWeight: 1.8,
              unitCbm: 0.25,
              totalPrice: 2500,
              paymentType: 'THROUGH_ME',
              carryingCharge: {
                basis: 'carton',
                rate: 8.67,
                amount: 260
              },
              qcPassedCartons: 30,
              qcPassedQuantity: 900,
              loopBackCartons: 0,
              loopBackQuantity: 0,
              allocatedCartons: 0,
              allocatedQuantity: 0,
              pendingCartons: 0,
              pendingQuantity: 0,
              qcStatus: 'completed'
            }
          ]
        },
        {
          _id: new mongoose.Types.ObjectId(),
          orderNumber: 'ORD-000002',
          clientId: 'CLI-TEST-B',
          clientName: 'Test Client Beta',
          status: 'partial_ready',
          qcStatus: 'partial',
          qcCompletedAt: new Date(),
          totalAmount: 3600,
          totalCarryingCharges: 180,
          totalWeight: 1200,
          totalCbm: 8,
          totalCartons: 30,
          totalQcPassedCartons: 20,
          totalLoopBackCartons: 5,
          totalPendingCartons: 5,
          qcCompletionPercentage: 67,
          priority: 'high',
          createdBy: testUser._id,
          updatedBy: testUser._id,
          createdAt: new Date(),
          updatedAt: new Date(),
          __v: 0,
          items: [
            {
              itemCode: 'DEVICE-300',
              description: 'Smart Device Collection',
              quantity: 750,
              cartons: 30,
              unitPrice: 4.80,
              unitWeight: 1.6,
              unitCbm: 0.27,
              totalPrice: 3600,
              paymentType: 'CLIENT_DIRECT',
              carryingCharge: {
                basis: 'carton',
                rate: 6,
                amount: 180
              },
              qcPassedCartons: 20,
              qcPassedQuantity: 500,
              loopBackCartons: 5,
              loopBackQuantity: 125,
              allocatedCartons: 0,
              allocatedQuantity: 0,
              pendingCartons: 5,
              pendingQuantity: 125,
              qcStatus: 'partial'
            }
          ]
        }
      ];

      await Order.insertMany(testOrders);
      console.log('✅ Created 2 test orders');
    }

    // Verify available cartons
    const qcReadyOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] }
    });

    let totalAvailableCartons = 0;
    console.log('\n📊 VERIFICATION - Available Cartons:');
    
    qcReadyOrders.forEach(order => {
      console.log(`\n📦 ${order.orderNumber} (${order.status})`);
      order.items?.forEach((item, index) => {
        const available = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
        totalAvailableCartons += available;
        console.log(`   Item ${index}: ${item.itemCode} - ${available} cartons available`);
      });
    });

    console.log(`\n🎉 SUCCESS! Total available cartons: ${totalAvailableCartons}`);
    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Try container allocation again in your frontend');
    console.log('2. You should now see orders with available cartons');
    console.log('3. Allocation of 10 cartons should work successfully');
    
    if (totalAvailableCartons === 0) {
      console.log('\n⚠️  Still no available cartons! This indicates a deeper issue.');
      console.log('Try running the comprehensive diagnostic: node fix-allocation-system.js');
    }

  } catch (error) {
    console.error('❌ Initialization failed:', error.message);
    
    if (error.message.includes('ECONNREFUSED')) {
      console.log('\n💡 SOLUTION: Make sure MongoDB is running');
      console.log('   - Start MongoDB service');
      console.log('   - Check connection string in environment variables');
    }
  } finally {
    if (mongoose.connection.readyState === 1) {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

if (require.main === module) {
  initializeTestData();
}

module.exports = { initializeTestData };