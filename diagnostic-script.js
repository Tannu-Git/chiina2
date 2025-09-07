const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

/**
 * Comprehensive Data Consistency Diagnostic Script
 * This script analyzes the current state of orders, containers, and allocations
 * to identify data integrity issues that need to be fixed.
 */

async function runDiagnostics() {
  try {
    console.log('🔍 CHINA5 DATA CONSISTENCY DIAGNOSTIC REPORT');
    console.log('='.repeat(60));
    console.log(`Report Generated: ${new Date().toISOString()}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB\n');

    const report = {
      timestamp: new Date().toISOString(),
      orders: {},
      containers: {},
      allocations: {},
      qc: {},
      issues: []
    };

    // 1. ANALYZE ORDERS
    console.log('📦 ANALYZING ORDERS...');
    const allOrders = await Order.find({}).lean();
    report.orders.total = allOrders.length;
    
    // Group orders by status
    const ordersByStatus = {};
    allOrders.forEach(order => {
      ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
    });
    report.orders.byStatus = ordersByStatus;

    // Check for loop-back orders (legacy system)
    const loopBackOrders = allOrders.filter(order => order.isLoopBack === true);
    report.orders.legacyLoopBackOrders = loopBackOrders.length;

    // Analyze QC completion
    const qcCompletedOrders = allOrders.filter(order => order.qcCompletedAt);
    report.orders.qcCompleted = qcCompletedOrders.length;

    console.log(`   Total Orders: ${report.orders.total}`);
    console.log(`   QC Completed: ${report.orders.qcCompleted}`);
    console.log(`   Legacy Loop-back: ${report.orders.legacyLoopBackOrders}`);
    console.log(`   Status Distribution:`, ordersByStatus);

    // 2. ANALYZE CONTAINERS
    console.log('\n📦 ANALYZING CONTAINERS...');
    const allContainers = await Container.find({}).lean();
    report.containers.total = allContainers.length;

    const containersByStatus = {};
    allContainers.forEach(container => {
      containersByStatus[container.status] = (containersByStatus[container.status] || 0) + 1;
    });
    report.containers.byStatus = containersByStatus;

    console.log(`   Total Containers: ${report.containers.total}`);
    console.log(`   Status Distribution:`, containersByStatus);

    // 3. ANALYZE ALLOCATION CONSISTENCY
    console.log('\n🔄 ANALYZING ALLOCATION CONSISTENCY...');
    
    // Find orders with item-level allocations
    const ordersWithAllocations = allOrders.filter(order => 
      order.items && order.items.some(item => 
        (item.allocatedCartons && item.allocatedCartons > 0) || 
        (item.allocatedQuantity && item.allocatedQuantity > 0) ||
        item.containerId
      )
    );
    report.allocations.ordersWithAllocations = ordersWithAllocations.length;

    // Find orphaned allocations (items allocated but no container reference)
    const orphanedAllocations = ordersWithAllocations.filter(order => !order.containerId);
    report.allocations.orphanedOrderAllocations = orphanedAllocations.length;

    // Check for negative availability
    const negativeAvailabilityIssues = [];
    allOrders.forEach(order => {
      if (order.items) {
        order.items.forEach((item, index) => {
          const qcPassed = item.qcPassedCartons || 0;
          const allocated = item.allocatedCartons || 0;
          const available = qcPassed - allocated;
          
          if (available < 0) {
            negativeAvailabilityIssues.push({
              orderNumber: order.orderNumber,
              orderId: order._id,
              itemIndex: index,
              itemCode: item.itemCode,
              qcPassed,
              allocated,
              negative: available
            });
          }
        });
      }
    });
    report.allocations.negativeAvailabilityIssues = negativeAvailabilityIssues.length;

    console.log(`   Orders with Allocations: ${report.allocations.ordersWithAllocations}`);
    console.log(`   Orphaned Allocations: ${report.allocations.orphanedOrderAllocations}`);
    console.log(`   Negative Availability Issues: ${report.allocations.negativeAvailabilityIssues}`);

    // 4. ANALYZE QC STATUS CONSISTENCY
    console.log('\n🔬 ANALYZING QC STATUS CONSISTENCY...');
    
    // Check orders ready for QC
    const qcReadyOrders = allOrders.filter(order => 
      ['ready', 'partial_ready'].includes(order.status) && 
      order.isLoopBack !== true
    );
    report.qc.qcReadyOrders = qcReadyOrders.length;

    // Check items with QC status
    let totalItemsWithQcStatus = 0;
    let itemsWithLoopBack = 0;
    
    allOrders.forEach(order => {
      if (order.items) {
        order.items.forEach(item => {
          if (item.qcStatus) totalItemsWithQcStatus++;
          if ((item.loopBackQuantity && item.loopBackQuantity > 0) || 
              (item.loopBackCartons && item.loopBackCartons > 0)) {
            itemsWithLoopBack++;
          }
        });
      }
    });
    
    report.qc.totalItemsWithQcStatus = totalItemsWithQcStatus;
    report.qc.itemsWithLoopBack = itemsWithLoopBack;

    console.log(`   QC Ready Orders: ${report.qc.qcReadyOrders}`);
    console.log(`   Items with QC Status: ${report.qc.totalItemsWithQcStatus}`);
    console.log(`   Items with Loop-back: ${report.qc.itemsWithLoopBack}`);

    // 5. IDENTIFY CRITICAL ISSUES
    console.log('\n⚠️  CRITICAL ISSUES IDENTIFIED:');
    
    if (report.allocations.orphanedOrderAllocations > 0) {
      const issue = `${report.allocations.orphanedOrderAllocations} orders have item allocations but no container assignment`;
      report.issues.push({
        type: 'ORPHANED_ALLOCATIONS',
        severity: 'HIGH',
        count: report.allocations.orphanedOrderAllocations,
        description: issue
      });
      console.log(`   🚨 ${issue}`);
    }

    if (report.allocations.negativeAvailabilityIssues > 0) {
      const issue = `${report.allocations.negativeAvailabilityIssues} items have negative available quantities`;
      report.issues.push({
        type: 'NEGATIVE_AVAILABILITY',
        severity: 'CRITICAL',
        count: report.allocations.negativeAvailabilityIssues,
        description: issue,
        details: negativeAvailabilityIssues.slice(0, 5) // Show first 5 examples
      });
      console.log(`   🚨 ${issue}`);
    }

    if (report.orders.legacyLoopBackOrders > 0) {
      const issue = `${report.orders.legacyLoopBackOrders} legacy loop-back orders found (should be converted)`;
      report.issues.push({
        type: 'LEGACY_LOOPBACK',
        severity: 'MEDIUM',
        count: report.orders.legacyLoopBackOrders,
        description: issue
      });
      console.log(`   ⚠️  ${issue}`);
    }

    // 6. GENERATE SUMMARY
    console.log('\n📊 SUMMARY:');
    console.log(`   Total Issues Found: ${report.issues.length}`);
    console.log(`   Critical Issues: ${report.issues.filter(i => i.severity === 'CRITICAL').length}`);
    console.log(`   High Priority Issues: ${report.issues.filter(i => i.severity === 'HIGH').length}`);
    console.log(`   Medium Priority Issues: ${report.issues.filter(i => i.severity === 'MEDIUM').length}`);

    // 7. SAVE DETAILED REPORT
    const fs = require('fs');
    const reportPath = './diagnostic-report.json';
    fs.writeFileSync(reportPath, JSON.stringify(report, null, 2));
    console.log(`\n💾 Detailed report saved to: ${reportPath}`);

    // 8. RECOMMENDATIONS
    console.log('\n🎯 RECOMMENDATIONS:');
    
    if (report.issues.some(i => i.type === 'ORPHANED_ALLOCATIONS')) {
      console.log('   1. Run cleanup script for orphaned allocations');
    }
    
    if (report.issues.some(i => i.type === 'NEGATIVE_AVAILABILITY')) {
      console.log('   2. Fix negative availability issues (CRITICAL)');
    }
    
    if (report.issues.some(i => i.type === 'LEGACY_LOOPBACK')) {
      console.log('   3. Convert legacy loop-back orders to new system');
    }

    console.log('\n✅ Diagnostic complete. Ready for next steps.');
    
    return report;

  } catch (error) {
    console.error('❌ Diagnostic failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
  }
}

// Run if called directly
if (require.main === module) {
  runDiagnostics()
    .then(report => {
      console.log('\n🎉 Diagnostic completed successfully');
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Diagnostic failed:', error);
      process.exit(1);
    });
}

module.exports = { runDiagnostics };