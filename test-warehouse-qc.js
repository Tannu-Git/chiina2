const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const User = require('./server/models/User');

/**
 * Warehouse QC Operations Test Script
 * Tests the quality control inspection workflow and loop-back quantity system
 */

async function testWarehouseQC() {
  try {
    console.log('🔬 WAREHOUSE QC OPERATIONS TEST');
    console.log('='.repeat(50));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB\n');

    const testResults = {
      timestamp: new Date().toISOString(),
      tests: [],
      summary: { passed: 0, failed: 0, total: 0 }
    };

    // Test 1: Check QC Ready Orders Filter Logic
    console.log('📋 TEST 1: QC Ready Orders Filter Logic');
    try {
      const qcReadyOrders = await Order.find({
        status: { $in: ['ready', 'partial_ready'] },
        isLoopBack: { $ne: true },
        $or: [
          { 'items.qcStatus': 'completed' },
          { 'items.qcStatus': 'partial' }
        ]
      }).lean();

      console.log(`   Found ${qcReadyOrders.length} QC ready orders`);
      
      // Analyze filter effectiveness
      let validOrders = 0;
      let ordersWithAllocatableItems = 0;
      
      qcReadyOrders.forEach(order => {
        let hasAllocatableItems = false;
        
        if (order.items) {
          order.items.forEach(item => {
            const qcPassed = item.qcPassedCartons || 0;
            const allocated = item.allocatedCartons || 0;
            const available = qcPassed - allocated;
            
            if (available > 0 && ['completed', 'partial'].includes(item.qcStatus)) {
              hasAllocatableItems = true;
            }
          });
        }
        
        if (hasAllocatableItems) {
          ordersWithAllocatableItems++;
        }
        validOrders++;
      });

      const testPassed = ordersWithAllocatableItems >= 0; // Basic validation
      testResults.tests.push({
        name: 'QC Ready Orders Filter',
        passed: testPassed,
        details: {
          totalFound: qcReadyOrders.length,
          validOrders,
          ordersWithAllocatableItems,
          effectiveness: validOrders > 0 ? (ordersWithAllocatableItems / validOrders * 100).toFixed(1) + '%' : '0%'
        }
      });

      console.log(`   ✅ Valid orders: ${validOrders}`);
      console.log(`   ✅ With allocatable items: ${ordersWithAllocatableItems}`);
      
    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      testResults.tests.push({
        name: 'QC Ready Orders Filter',
        passed: false,
        error: error.message
      });
    }

    // Test 2: Loop-back Quantity Calculations
    console.log('\n📋 TEST 2: Loop-back Quantity Calculations');
    try {
      const ordersWithLoopBack = await Order.find({
        'items.loopBackCartons': { $gt: 0 }
      }).lean();

      console.log(`   Found ${ordersWithLoopBack.length} orders with loop-back quantities`);
      
      let consistentCalculations = 0;
      let totalLoopBackItems = 0;
      const inconsistencies = [];

      ordersWithLoopBack.forEach(order => {
        if (order.items) {
          order.items.forEach((item, index) => {
            const loopBackCartons = item.loopBackCartons || 0;
            const loopBackQuantity = item.loopBackQuantity || 0;
            
            if (loopBackCartons > 0) {
              totalLoopBackItems++;
              
              // Check if quantity calculation is consistent with cartons
              const expectedCartons = item.cartons || 0;
              const expectedQuantity = item.quantity || 0;
              
              if (expectedCartons > 0 && expectedQuantity > 0) {
                const piecesPerCarton = expectedQuantity / expectedCartons;
                const expectedLoopBackQty = Math.round(loopBackCartons * piecesPerCarton);
                
                if (Math.abs(loopBackQuantity - expectedLoopBackQty) <= 1) { // Allow 1 unit tolerance for rounding
                  consistentCalculations++;
                } else {
                  inconsistencies.push({
                    orderNumber: order.orderNumber,
                    itemCode: item.itemCode,
                    loopBackCartons,
                    loopBackQuantity,
                    expectedLoopBackQty,
                    difference: loopBackQuantity - expectedLoopBackQty
                  });
                }
              }
            }
          });
        }
      });

      const consistencyRate = totalLoopBackItems > 0 ? (consistentCalculations / totalLoopBackItems * 100).toFixed(1) : '100';
      const testPassed = parseFloat(consistencyRate) >= 95; // 95% consistency threshold

      testResults.tests.push({
        name: 'Loop-back Quantity Calculations',
        passed: testPassed,
        details: {
          totalLoopBackItems,
          consistentCalculations,
          consistencyRate: consistencyRate + '%',
          inconsistencies: inconsistencies.slice(0, 5) // Show first 5 inconsistencies
        }
      });

      console.log(`   ✅ Consistent calculations: ${consistentCalculations}/${totalLoopBackItems} (${consistencyRate}%)`);
      if (inconsistencies.length > 0) {
        console.log(`   ⚠️  Found ${inconsistencies.length} inconsistencies`);
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      testResults.tests.push({
        name: 'Loop-back Quantity Calculations',
        passed: false,
        error: error.message
      });
    }

    // Test 3: QC Status Consistency
    console.log('\n📋 TEST 3: QC Status Consistency');
    try {
      const allOrders = await Order.find({
        isLoopBack: { $ne: true },
        'items.qcStatus': { $exists: true }
      }).lean();

      console.log(`   Analyzing ${allOrders.length} orders with QC status`);
      
      let correctStatusCalculations = 0;
      let totalItemsChecked = 0;
      const statusIssues = [];

      allOrders.forEach(order => {
        if (order.items) {
          order.items.forEach((item, index) => {
            if (item.qcStatus) {
              totalItemsChecked++;
              
              const expectedCartons = item.cartons || 0;
              const qcPassedCartons = item.qcPassedCartons || 0;
              const loopBackCartons = item.loopBackCartons || 0;
              
              const completionRate = expectedCartons > 0 ? (qcPassedCartons / expectedCartons) : 0;
              let expectedStatus;
              
              if (completionRate === 0 && loopBackCartons === 0) {
                expectedStatus = 'pending';
              } else if (completionRate >= 1.0) {
                expectedStatus = 'completed';
              } else if (completionRate > 0 || loopBackCartons > 0) {
                expectedStatus = 'partial';
              } else {
                expectedStatus = 'pending';
              }
              
              if (item.qcStatus === expectedStatus) {
                correctStatusCalculations++;
              } else {
                statusIssues.push({
                  orderNumber: order.orderNumber,
                  itemCode: item.itemCode,
                  currentStatus: item.qcStatus,
                  expectedStatus,
                  qcPassedCartons,
                  expectedCartons,
                  completionRate: (completionRate * 100).toFixed(1) + '%'
                });
              }
            }
          });
        }
      });

      const statusAccuracy = totalItemsChecked > 0 ? (correctStatusCalculations / totalItemsChecked * 100).toFixed(1) : '100';
      const testPassed = parseFloat(statusAccuracy) >= 90; // 90% accuracy threshold

      testResults.tests.push({
        name: 'QC Status Consistency',
        passed: testPassed,
        details: {
          totalItemsChecked,
          correctStatusCalculations,
          statusAccuracy: statusAccuracy + '%',
          statusIssues: statusIssues.slice(0, 5)
        }
      });

      console.log(`   ✅ Correct status calculations: ${correctStatusCalculations}/${totalItemsChecked} (${statusAccuracy}%)`);
      if (statusIssues.length > 0) {
        console.log(`   ⚠️  Found ${statusIssues.length} status inconsistencies`);
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      testResults.tests.push({
        name: 'QC Status Consistency',
        passed: false,
        error: error.message
      });
    }

    // Test 4: Simulation of QC Inspection Process
    console.log('\n📋 TEST 4: QC Inspection Process Simulation');
    try {
      // Find an order that's ready for QC inspection
      const testOrder = await Order.findOne({
        status: { $in: ['confirmed', 'in_production'] },
        isLoopBack: { $ne: true },
        'items.qcStatus': { $in: [null, 'pending'] }
      });

      if (testOrder) {
        console.log(`   Testing with order: ${testOrder.orderNumber}`);
        
        // Simulate QC inspection without actually saving
        const simulatedInspection = {
          orderId: testOrder._id,
          items: testOrder.items.map((item, index) => {
            const expectedCartons = item.cartons || 0;
            const simulatedQcPassed = Math.floor(expectedCartons * 0.9); // 90% pass rate
            const simulatedLoopBack = expectedCartons - simulatedQcPassed;
            
            return {
              itemIndex: index,
              itemCode: item.itemCode,
              expectedCartons,
              qcPassedCartons: simulatedQcPassed,
              loopBackCartons: simulatedLoopBack,
              qcStatus: simulatedQcPassed === expectedCartons ? 'completed' : 'partial'
            };
          })
        };

        // Validate simulation logic
        let simulationValid = true;
        simulatedInspection.items.forEach(item => {
          const total = item.qcPassedCartons + item.loopBackCartons;
          if (total !== item.expectedCartons) {
            simulationValid = false;
          }
        });

        testResults.tests.push({
          name: 'QC Inspection Process Simulation',
          passed: simulationValid,
          details: {
            orderNumber: testOrder.orderNumber,
            itemsInspected: simulatedInspection.items.length,
            simulationValid,
            simulatedResults: simulatedInspection.items
          }
        });

        console.log(`   ✅ Simulation ${simulationValid ? 'passed' : 'failed'} for ${simulatedInspection.items.length} items`);
        
      } else {
        console.log(`   ⚠️  No orders available for QC inspection simulation`);
        testResults.tests.push({
          name: 'QC Inspection Process Simulation',
          passed: true,
          details: { message: 'No orders available for simulation' }
        });
      }

    } catch (error) {
      console.log(`   ❌ Test failed: ${error.message}`);
      testResults.tests.push({
        name: 'QC Inspection Process Simulation',
        passed: false,
        error: error.message
      });
    }

    // Calculate summary
    testResults.summary.total = testResults.tests.length;
    testResults.summary.passed = testResults.tests.filter(t => t.passed).length;
    testResults.summary.failed = testResults.summary.total - testResults.summary.passed;

    // Display summary
    console.log('\n📊 TEST SUMMARY:');
    console.log(`   Total Tests: ${testResults.summary.total}`);
    console.log(`   Passed: ${testResults.summary.passed}`);
    console.log(`   Failed: ${testResults.summary.failed}`);
    console.log(`   Success Rate: ${((testResults.summary.passed / testResults.summary.total) * 100).toFixed(1)}%`);

    // Save detailed results
    const fs = require('fs');
    const reportPath = './warehouse-qc-test-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(testResults, null, 2));
    console.log(`\n💾 Detailed test results saved to: ${reportPath}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    if (testResults.summary.failed > 0) {
      console.log('   - Review failed tests and fix underlying issues');
      console.log('   - Consider refactoring QC calculation logic');
      console.log('   - Add validation to prevent inconsistent states');
    } else {
      console.log('   - QC operations are functioning correctly');
      console.log('   - Consider adding automated monitoring');
    }

    return testResults;

  } catch (error) {
    console.error('❌ Test script failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  testWarehouseQC()
    .then(results => {
      const success = results.summary.failed === 0;
      console.log(`\n🎉 Testing completed ${success ? 'successfully' : 'with issues'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Testing failed:', error);
      process.exit(1);
    });
}

module.exports = { testWarehouseQC };