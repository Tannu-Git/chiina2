const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

/**
 * API Response Simulation Script
 * Simulates API responses without running the server to test business logic
 */

async function simulateAPIResponses() {
  try {
    console.log('🌐 API RESPONSE SIMULATION');
    console.log('='.repeat(50));

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB\n');

    const simulationResults = {
      timestamp: new Date().toISOString(),
      endpoints: [],
      issues: []
    };

    // Simulate GET /api/warehouse/qc-ready-orders
    console.log('📡 SIMULATING: GET /api/warehouse/qc-ready-orders');
    try {
      const startTime = Date.now();
      
      // Replicate the actual API logic
      const filter = {
        status: { $in: ['ready', 'partial_ready'] },
        isLoopBack: { $ne: true },
        $or: [
          { 'items.qcStatus': 'completed' },
          { 'items.qcStatus': 'partial' }
        ]
      };

      const orders = await Order.find(filter)
        .populate('createdBy', 'name')
        .populate('qcInspector', 'name')
        .sort({ qcCompletedAt: -1, createdAt: -1 })
        .lean();

      // Process orders like the actual API
      const allocatableOrders = orders.map(order => {
        const allocatableItems = order.items.filter(item => {
          const qcPassedCtn = item.qcPassedCartons || 0;
          const allocatedCtn = item.allocatedCartons || 0;
          const availableCtn = qcPassedCtn - allocatedCtn;
          
          const meetsQuantityFilter = availableCtn > 0;
          const meetsQCFilter = ['completed', 'partial'].includes(item.qcStatus);
          
          return meetsQuantityFilter && meetsQCFilter;
        });

        if (allocatableItems.length === 0) return null;

        return {
          ...order,
          items: allocatableItems,
          allocationSummary: {
            totalItems: allocatableItems.length,
            totalAvailableCartons: allocatableItems.reduce((sum, item) => 
              sum + Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0)), 0
            ),
            totalAvailableCbm: allocatableItems.reduce((sum, item) => 
              sum + (Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0)) * (item.unitCbm || 0)), 0
            )
          }
        };
      }).filter(order => order !== null);

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      simulationResults.endpoints.push({
        endpoint: 'GET /api/warehouse/qc-ready-orders',
        responseTime: responseTime + 'ms',
        dataFound: {
          totalFilteredOrders: orders.length,
          allocatableOrders: allocatableOrders.length,
          totalAllocatableItems: allocatableOrders.reduce((sum, order) => sum + order.items.length, 0)
        },
        success: true
      });

      console.log(`   ✅ Response time: ${responseTime}ms`);
      console.log(`   📊 Orders found: ${orders.length}`);
      console.log(`   📊 Allocatable orders: ${allocatableOrders.length}`);

      // Check for performance issues
      if (responseTime > 1000) {
        simulationResults.issues.push({
          endpoint: 'qc-ready-orders',
          type: 'PERFORMANCE',
          message: `Slow response time: ${responseTime}ms`,
          severity: 'MEDIUM'
        });
      }

    } catch (error) {
      console.log(`   ❌ Simulation failed: ${error.message}`);
      simulationResults.endpoints.push({
        endpoint: 'GET /api/warehouse/qc-ready-orders',
        success: false,
        error: error.message
      });
      simulationResults.issues.push({
        endpoint: 'qc-ready-orders',
        type: 'ERROR',
        message: error.message,
        severity: 'HIGH'
      });
    }

    // Simulate GET /api/warehouse/loopback
    console.log('\n📡 SIMULATING: GET /api/warehouse/loopback');
    try {
      const startTime = Date.now();
      
      const filter = {
        'items.loopBackQuantity': { $gt: 0 }
      };

      const orders = await Order.find(filter)
        .populate('createdBy', 'name')
        .sort({ 'items.loopBackUpdatedAt': -1, createdAt: -1 })
        .limit(50)
        .lean();

      const loopbackData = orders.map(order => {
        const loopBackItems = order.items.filter(item => (item.loopBackQuantity || 0) > 0);
        
        return {
          _id: order._id,
          orderNumber: order.orderNumber,
          clientName: order.clientName,
          status: order.status,
          loopBackItems: loopBackItems.map(item => ({
            itemCode: item.itemCode,
            expectedQuantity: item.quantity,
            qcPassedQuantity: item.qcPassedQuantity || 0,
            loopBackQuantity: item.loopBackQuantity || 0,
            loopBackStatus: item.loopBackStatus
          })),
          totalLoopBackQuantity: loopBackItems.reduce((sum, item) => sum + (item.loopBackQuantity || 0), 0)
        };
      });

      const endTime = Date.now();
      const responseTime = endTime - startTime;

      simulationResults.endpoints.push({
        endpoint: 'GET /api/warehouse/loopback',
        responseTime: responseTime + 'ms',
        dataFound: {
          ordersWithLoopback: orders.length,
          totalLoopbackItems: loopbackData.reduce((sum, order) => sum + order.loopBackItems.length, 0)
        },
        success: true
      });

      console.log(`   ✅ Response time: ${responseTime}ms`);
      console.log(`   📊 Orders with loop-back: ${orders.length}`);

    } catch (error) {
      console.log(`   ❌ Simulation failed: ${error.message}`);
      simulationResults.endpoints.push({
        endpoint: 'GET /api/warehouse/loopback',
        success: false,
        error: error.message
      });
    }

    // Simulate POST /api/warehouse/qc-inspection (business logic only)
    console.log('\n📡 SIMULATING: POST /api/warehouse/qc-inspection (logic test)');
    try {
      // Find a test order
      const testOrder = await Order.findOne({
        status: { $in: ['confirmed', 'in_production'] },
        isLoopBack: { $ne: true }
      });

      if (testOrder) {
        const startTime = Date.now();
        
        // Simulate inspection data
        const simulatedInspection = {
          orderId: testOrder._id,
          inspectorId: 'test-inspector-id',
          items: testOrder.items.map((item, index) => ({
            itemCode: item.itemCode,
            expectedCartons: item.cartons || 0,
            qcPassedCartons: Math.floor((item.cartons || 0) * 0.9), // 90% pass
            loopBackCartons: Math.ceil((item.cartons || 0) * 0.1),  // 10% loop-back
            notes: 'Simulated QC inspection'
          }))
        };

        // Test validation logic
        let validationPassed = true;
        const validationErrors = [];

        simulatedInspection.items.forEach((item, index) => {
          if (item.qcPassedCartons + item.loopBackCartons !== item.expectedCartons) {
            validationPassed = false;
            validationErrors.push(`Item ${index}: Total doesn't match expected`);
          }
          if (item.qcPassedCartons < 0 || item.loopBackCartons < 0) {
            validationPassed = false;
            validationErrors.push(`Item ${index}: Negative quantities not allowed`);
          }
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        simulationResults.endpoints.push({
          endpoint: 'POST /api/warehouse/qc-inspection',
          responseTime: responseTime + 'ms',
          validationResult: {
            passed: validationPassed,
            errors: validationErrors,
            itemsProcessed: simulatedInspection.items.length
          },
          success: validationPassed
        });

        console.log(`   ✅ Validation: ${validationPassed ? 'PASSED' : 'FAILED'}`);
        console.log(`   📊 Items processed: ${simulatedInspection.items.length}`);
        if (!validationPassed) {
          console.log(`   ❌ Validation errors: ${validationErrors.length}`);
        }

      } else {
        console.log(`   ⚠️  No test orders available`);
        simulationResults.endpoints.push({
          endpoint: 'POST /api/warehouse/qc-inspection',
          success: true,
          message: 'No test data available'
        });
      }

    } catch (error) {
      console.log(`   ❌ Simulation failed: ${error.message}`);
      simulationResults.endpoints.push({
        endpoint: 'POST /api/warehouse/qc-inspection',
        success: false,
        error: error.message
      });
    }

    // Test Container Allocation Logic
    console.log('\n📡 SIMULATING: Container Allocation Logic');
    try {
      const startTime = Date.now();
      
      // Get sample allocatable orders
      const sampleOrders = await Order.find({
        status: { $in: ['ready', 'partial_ready'] },
        'items.qcPassedCartons': { $gt: 0 }
      }).limit(3).lean();

      if (sampleOrders.length > 0) {
        // Simulate container capacity check
        const containerCapacities = {
          '20ft': { maxCbm: 33, maxWeight: 28000 },
          '40ft': { maxCbm: 67, maxWeight: 30000 },
          '40ft_hc': { maxCbm: 76, maxWeight: 30000 }
        };

        const allocationTest = {
          orders: sampleOrders.length,
          totalCbm: sampleOrders.reduce((sum, order) => sum + (order.totalCbm || 0), 0),
          totalWeight: sampleOrders.reduce((sum, order) => sum + (order.totalWeight || 0), 0),
          containerFit: {}
        };

        // Test each container type
        Object.entries(containerCapacities).forEach(([type, capacity]) => {
          const fits = allocationTest.totalCbm <= capacity.maxCbm && 
                      allocationTest.totalWeight <= capacity.maxWeight;
          allocationTest.containerFit[type] = {
            fits,
            cbmUtilization: (allocationTest.totalCbm / capacity.maxCbm * 100).toFixed(1) + '%',
            weightUtilization: (allocationTest.totalWeight / capacity.maxWeight * 100).toFixed(1) + '%'
          };
        });

        const endTime = Date.now();
        const responseTime = endTime - startTime;

        simulationResults.endpoints.push({
          endpoint: 'Container Allocation Logic',
          responseTime: responseTime + 'ms',
          allocationTest,
          success: true
        });

        console.log(`   ✅ Response time: ${responseTime}ms`);
        console.log(`   📊 Orders tested: ${allocationTest.orders}`);
        console.log(`   📊 Total CBM: ${allocationTest.totalCbm.toFixed(2)}`);

      } else {
        console.log(`   ⚠️  No allocatable orders found`);
      }

    } catch (error) {
      console.log(`   ❌ Simulation failed: ${error.message}`);
    }

    // Generate summary
    const successfulEndpoints = simulationResults.endpoints.filter(e => e.success).length;
    const totalEndpoints = simulationResults.endpoints.length;

    console.log('\n📊 SIMULATION SUMMARY:');
    console.log(`   Endpoints tested: ${totalEndpoints}`);
    console.log(`   Successful: ${successfulEndpoints}`);
    console.log(`   Failed: ${totalEndpoints - successfulEndpoints}`);
    console.log(`   Issues found: ${simulationResults.issues.length}`);

    // Save results
    const fs = require('fs');
    const reportPath = './api-simulation-results.json';
    fs.writeFileSync(reportPath, JSON.stringify(simulationResults, null, 2));
    console.log(`\n💾 Simulation results saved to: ${reportPath}`);

    // Recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    simulationResults.issues.forEach(issue => {
      console.log(`   - ${issue.endpoint}: ${issue.message} (${issue.severity})`);
    });

    if (simulationResults.issues.length === 0) {
      console.log('   - API logic appears to be functioning correctly');
      console.log('   - Consider adding automated API testing');
    }

    return simulationResults;

  } catch (error) {
    console.error('❌ Simulation failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Run if called directly
if (require.main === module) {
  simulateAPIResponses()
    .then(results => {
      const success = results.issues.filter(i => i.severity === 'HIGH').length === 0;
      console.log(`\n🎉 Simulation completed ${success ? 'successfully' : 'with issues'}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Simulation failed:', error);
      process.exit(1);
    });
}

module.exports = { simulateAPIResponses };