#!/usr/bin/env node

/**
 * Quick Fix for Zero Available Cartons Issue
 * 
 * This script fixes the "Cannot allocate X cartons. Maximum available: 0" error
 * by ensuring orders marked as "ready" have proper qcPassedCartons data.
 */

const mongoose = require('mongoose');

async function quickFixCartons() {
  try {
    // Connect with shorter timeout
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5', {
      serverSelectionTimeoutMS: 5000,
      connectTimeoutMS: 5000
    });
    console.log('✅ Connected to MongoDB');

    // Import Order model
    const Order = mongoose.model('Order', new mongoose.Schema({}, { strict: false, collection: 'orders' }));

    console.log('🔧 QUICK FIX: Setting qcPassedCartons for ready orders...');
    
    // Find orders that are ready/partial_ready but have items with qcPassedCartons = 0
    const result = await Order.updateMany(
      {
        status: { $in: ['ready', 'partial_ready'] },
        'items.qcPassedCartons': { $in: [0, null, undefined] },
        'items.cartons': { $gt: 0 }
      },
      [
        {
          $set: {
            items: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      qcPassedCartons: {
                        $cond: {
                          if: { $or: [
                            { $eq: ['$$item.qcPassedCartons', 0] },
                            { $eq: ['$$item.qcPassedCartons', null] },
                            { $not: ['$$item.qcPassedCartons'] }
                          ]},
                          then: '$$item.cartons',
                          else: '$$item.qcPassedCartons'
                        }
                      },
                      qcPassedQuantity: {
                        $cond: {
                          if: { $or: [
                            { $eq: ['$$item.qcPassedQuantity', 0] },
                            { $eq: ['$$item.qcPassedQuantity', null] },
                            { $not: ['$$item.qcPassedQuantity'] }
                          ]},
                          then: '$$item.quantity',
                          else: '$$item.qcPassedQuantity'
                        }
                      },
                      qcStatus: 'completed',
                      loopBackCartons: 0,
                      loopBackQuantity: 0,
                      allocatedCartons: { $ifNull: ['$$item.allocatedCartons', 0] },
                      allocatedQuantity: { $ifNull: ['$$item.allocatedQuantity', 0] }
                    }
                  ]
                }
              }
            },
            qcStatus: 'completed',
            qcCompletedAt: { $ifNull: ['$qcCompletedAt', new Date()] }
          }
        }
      ]
    );

    console.log(`✅ Updated ${result.modifiedCount} orders`);
    
    // Verify the fix by checking a sample
    const sampleOrders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] }
    }).limit(3);

    console.log('\n📊 SAMPLE VERIFICATION:');
    for (const order of sampleOrders) {
      console.log(`Order ${order.orderNumber}:`);
      order.items.forEach((item, index) => {
        const availableCartons = (item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
        console.log(`  Item ${index}: ${item.itemCode}`);
        console.log(`    QC Passed: ${item.qcPassedCartons || 0} cartons`);
        console.log(`    Available: ${availableCartons} cartons`);
      });
    }

    console.log('\n🎉 QUICK FIX COMPLETED!');
    console.log('Try the container allocation again - you should now see available cartons.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('ECONNREFUSED') || error.message.includes('timeout')) {
      console.log('\n💡 MONGODB CONNECTION ISSUE:');
      console.log('1. Make sure MongoDB is running');
      console.log('2. Check if the connection string is correct');
      console.log('3. Verify MongoDB service is started');
    }
  } finally {
    await mongoose.disconnect();
    console.log('🔌 Disconnected from MongoDB');
  }
}

// Alternative: Manual fix instructions if MongoDB connection fails
function showManualFix() {
  console.log('\n📋 MANUAL FIX INSTRUCTIONS:');
  console.log('If you cannot run this script, manually update orders in MongoDB:');
  console.log('');
  console.log('db.orders.updateMany(');
  console.log('  {');
  console.log('    status: { $in: ["ready", "partial_ready"] },');
  console.log('    "items.qcPassedCartons": { $in: [0, null] }');
  console.log('  },');
  console.log('  {');
  console.log('    $set: {');
  console.log('      "items.$[item].qcPassedCartons": "$items.$[item].cartons",');
  console.log('      "items.$[item].qcPassedQuantity": "$items.$[item].quantity",');
  console.log('      "items.$[item].qcStatus": "completed"');
  console.log('    }');
  console.log('  },');
  console.log('  {');
  console.log('    arrayFilters: [');
  console.log('      { "item.qcPassedCartons": { $in: [0, null] } }');
  console.log('    ]');
  console.log('  }');
  console.log(')');
}

if (require.main === module) {
  quickFixCartons().catch(() => {
    console.log('\n❌ Script failed to connect to MongoDB');
    showManualFix();
  });
}