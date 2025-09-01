#!/usr/bin/env node

/**
 * Container Allocation Issues Debug Script
 * 
 * This script analyzes the complete container allocation flow to identify issues:
 * 1. QC data validation
 * 2. Available quantity calculations
 * 3. Frontend/backend validation mismatches
 * 4. Data flow problems
 */

const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

async function debugAllocationFlow() {
  try {
    console.log('🔍 Container Allocation Flow Debug Starting...\n');
    
    await mongoose.connect('mongodb://localhost:27017/chinadb');
    console.log('✅ Connected to database\n');

    // 1. Check QC Ready Orders
    console.log('=' .repeat(60));
    console.log('1. QC READY ORDERS ANALYSIS');
    console.log('=' .repeat(60));
    
    const qcReadyFilter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    const qcReadyOrders = await Order.find(qcReadyFilter).lean();
    console.log(`📊 QC Ready Orders Found: ${qcReadyOrders.length}`);
    
    if (qcReadyOrders.length === 0) {
      console.log('❌ No QC ready orders found! This could be the main issue.\n');
      
      // Check all orders to understand the status distribution
      const allOrders = await Order.find({ isLoopBack: { $ne: true } }).lean();
      const statusDistribution = {};
      
      allOrders.forEach(order => {
        statusDistribution[order.status] = (statusDistribution[order.status] || 0) + 1;
      });
      
      console.log('📈 Order Status Distribution:');
      Object.entries(statusDistribution).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} orders`);
      });
      
      // Check QC status distribution
      const qcStatusDistribution = {};
      allOrders.forEach(order => {
        order.items.forEach(item => {
          const qcStatus = item.qcStatus || 'none';
          qcStatusDistribution[qcStatus] = (qcStatusDistribution[qcStatus] || 0) + 1;
        });
      });
      
      console.log('\n📈 QC Status Distribution:');
      Object.entries(qcStatusDistribution).forEach(([status, count]) => {
        console.log(`   ${status}: ${count} items`);
      });
    }

    // 2. Analyze allocation issues for each QC ready order
    let issuesFound = [];
    
    for (const order of qcReadyOrders) {
      console.log(`\n📦 Analyzing Order: ${order.orderNumber} (${order.clientName})`);
      
      order.items.forEach((item, index) => {
        const qcPassedQty = item.qcPassedQuantity || 0;
        const qcPassedCtn = item.qcPassedCartons || 0;
        const allocatedQty = item.allocatedQuantity || 0;
        const allocatedCtn = item.allocatedCartons || 0;
        const expectedQty = item.quantity || 0;
        const expectedCtn = item.cartons || 0;
        
        const availableQty = qcPassedQty - allocatedQty;
        const availableCtn = qcPassedCtn - allocatedCtn;
        
        console.log(`   📋 Item ${index}: ${item.itemCode}`);
        console.log(`      QC Status: ${item.qcStatus || 'MISSING'}`);
        console.log(`      Expected: ${expectedQty} qty, ${expectedCtn} cartons`);
        console.log(`      QC Passed: ${qcPassedQty} qty, ${qcPassedCtn} cartons`);
        console.log(`      Allocated: ${allocatedQty} qty, ${allocatedCtn} cartons`);
        console.log(`      Available: ${availableQty} qty, ${availableCtn} cartons`);
        
        // Issue detection
        if (availableQty < 0) {
          issuesFound.push({
            type: 'NEGATIVE_AVAILABLE_QTY',
            order: order.orderNumber,
            item: item.itemCode,
            details: `Available quantity is negative: ${availableQty}`
          });
        }
        
        if (availableCtn < 0) {
          issuesFound.push({
            type: 'NEGATIVE_AVAILABLE_CTN',
            order: order.orderNumber,
            item: item.itemCode,
            details: `Available cartons is negative: ${availableCtn}`
          });
        }
        
        if (qcPassedQty > expectedQty) {
          issuesFound.push({
            type: 'QC_EXCEEDS_EXPECTED_QTY',
            order: order.orderNumber,
            item: item.itemCode,
            details: `QC passed (${qcPassedQty}) exceeds expected (${expectedQty})`
          });
        }
        
        if (qcPassedCtn > expectedCtn) {
          issuesFound.push({
            type: 'QC_EXCEEDS_EXPECTED_CTN',
            order: order.orderNumber,
            item: item.itemCode,
            details: `QC passed cartons (${qcPassedCtn}) exceeds expected (${expectedCtn})`
          });
        }
        
        if (allocatedQty > qcPassedQty) {
          issuesFound.push({
            type: 'ALLOCATED_EXCEEDS_QC_QTY',
            order: order.orderNumber,
            item: item.itemCode,
            details: `Allocated (${allocatedQty}) exceeds QC passed (${qcPassedQty})`
          });
        }
        
        if (allocatedCtn > qcPassedCtn) {
          issuesFound.push({
            type: 'ALLOCATED_EXCEEDS_QC_CTN',
            order: order.orderNumber,
            item: item.itemCode,
            details: `Allocated cartons (${allocatedCtn}) exceeds QC passed (${qcPassedCtn})`
          });
        }
        
        if (!item.qcStatus) {
          issuesFound.push({
            type: 'MISSING_QC_STATUS',
            order: order.orderNumber,
            item: item.itemCode,
            details: 'Item has no QC status'
          });
        }
        
        if ((item.unitCbm || 0) === 0) {
          issuesFound.push({
            type: 'MISSING_UNIT_CBM',
            order: order.orderNumber,
            item: item.itemCode,
            details: 'Item has no unit CBM for allocation calculations'
          });
        }
        
        if ((item.unitWeight || 0) === 0) {
          issuesFound.push({
            type: 'MISSING_UNIT_WEIGHT',
            order: order.orderNumber,
            item: item.itemCode,
            details: 'Item has no unit weight for allocation calculations'
          });
        }
      });
    }

    // 3. Check existing containers that might be causing allocation conflicts
    console.log('\n' + '=' .repeat(60));
    console.log('2. EXISTING CONTAINERS ANALYSIS');
    console.log('=' .repeat(60));
    
    const existingContainers = await Container.find({}).lean();
    console.log(`📦 Existing Containers: ${existingContainers.length}`);
    
    existingContainers.forEach(container => {
      console.log(`\nContainer: ${container.realContainerId || container.clientFacingId || container._id}`);
      console.log(`  Type: ${container.type}, Status: ${container.status}`);
      console.log(`  Capacity: ${container.currentCbm || 0}/${container.maxCbm} CBM`);
      console.log(`  Orders: ${(container.orders || []).length}`);
      
      if (container.orders) {
        container.orders.forEach(orderAlloc => {
          console.log(`    - Order: ${orderAlloc.orderId} (${orderAlloc.cbmShare || 0} CBM)`);
        });
      }
    });

    // 4. Summary of issues
    console.log('\n' + '=' .repeat(60));
    console.log('3. ISSUES SUMMARY');
    console.log('=' .repeat(60));
    
    if (issuesFound.length === 0) {
      console.log('✅ No data integrity issues found!');
    } else {
      console.log(`❌ Found ${issuesFound.length} issues:`);
      
      const issuesByType = {};
      issuesFound.forEach(issue => {
        issuesByType[issue.type] = (issuesByType[issue.type] || []);
        issuesByType[issue.type].push(issue);
      });
      
      Object.entries(issuesByType).forEach(([type, issues]) => {
        console.log(`\n🔴 ${type}: ${issues.length} issues`);
        issues.forEach(issue => {
          console.log(`   - ${issue.order} / ${issue.item}: ${issue.details}`);
        });
      });
    }

    // 5. Recommendations
    console.log('\n' + '=' .repeat(60));
    console.log('4. RECOMMENDATIONS');
    console.log('=' .repeat(60));
    
    if (qcReadyOrders.length === 0) {
      console.log('🔧 CRITICAL: No QC ready orders found');
      console.log('   → Run QC inspection on confirmed orders first');
      console.log('   → Ensure orders have status "ready" or "partial_ready"');
      console.log('   → Verify items have qcStatus "completed" or "partial"');
    }
    
    if (issuesFound.some(i => i.type.includes('NEGATIVE'))) {
      console.log('🔧 CRITICAL: Negative available quantities detected');
      console.log('   → Reset allocated quantities on affected items');
      console.log('   → Verify QC data integrity');
    }
    
    if (issuesFound.some(i => i.type.includes('EXCEEDS'))) {
      console.log('🔧 WARNING: Data exceeds expected values');
      console.log('   → Review QC inspection data');
      console.log('   → Verify allocation calculations');
    }
    
    if (issuesFound.some(i => i.type === 'MISSING_QC_STATUS')) {
      console.log('🔧 INFO: Missing QC status fields');
      console.log('   → Update items with proper QC status');
    }
    
    if (issuesFound.some(i => i.type.includes('MISSING_UNIT'))) {
      console.log('🔧 INFO: Missing unit measurements');
      console.log('   → Add unit CBM and weight to items for proper allocation');
    }
    
    console.log('\n🏁 Debug completed!');
    
  } catch (error) {
    console.error('❌ Debug script error:', error);
  } finally {
    await mongoose.disconnect();
    console.log('✅ Disconnected from database');
  }
}

// Run the debug script
debugAllocationFlow();