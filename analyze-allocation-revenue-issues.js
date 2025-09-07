const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/logistics-oms-new');

async function analyzeAllocationAndRevenueIssues() {
  try {
    console.log('=== COMPREHENSIVE ALLOCATION & REVENUE ANALYSIS ===\n');
    
    // 1. Check current allocation state
    console.log('📦 CONTAINER ALLOCATION ANALYSIS');
    const containersWithAllocations = await Container.find({
      'orders.0': { $exists: true }
    }).populate('orders.orderId', 'orderNumber items');
    
    console.log(`Containers with allocations: ${containersWithAllocations.length}\n`);
    
    containersWithAllocations.forEach((container, index) => {
      console.log(`${index + 1}. Container: ${container.containerNumber}`);
      console.log(`   Status: ${container.status}`);
      console.log(`   Total CBM: ${container.totalCbm} | Current CBM: ${container.currentCbm}`);
      console.log(`   Orders allocated: ${container.orders.length}`);
      
      container.orders.forEach((orderAllocation, orderIndex) => {
        console.log(`     Order ${orderIndex + 1}: ${orderAllocation.orderId?.orderNumber || 'Unknown'}`);
        console.log(`       Allocated CBM: ${orderAllocation.allocatedCbm}`);
        console.log(`       Items: ${orderAllocation.items?.length || 0}`);
        
        if (orderAllocation.items) {
          orderAllocation.items.forEach((item, itemIndex) => {
            console.log(`         Item ${itemIndex + 1}: ${item.itemCode || 'Unknown'}`);
            console.log(`           Allocated Cartons: ${item.allocatedCartons}`);
            console.log(`           Allocated CBM: ${item.allocatedCbm}`);
          });
        }
      });
      console.log('');
    });
    
    // 2. Check orders with allocations vs available quantities
    console.log('⚖️ ALLOCATION vs AVAILABILITY ANALYSIS');
    const ordersWithAllocations = await Order.find({
      'items.allocatedCartons': { $gt: 0 }
    });
    
    console.log(`Orders with allocated items: ${ordersWithAllocations.length}\n`);
    
    let allocationIssues = [];
    
    ordersWithAllocations.forEach((order) => {
      console.log(`Order: ${order.orderNumber}`);
      
      order.items.forEach((item, itemIndex) => {
        const qcPassed = item.qcPassedCartons || 0;
        const allocated = item.allocatedCartons || 0;
        const available = qcPassed - allocated;
        
        console.log(`  Item ${itemIndex + 1}: ${item.itemCode}`);
        console.log(`    QC Passed: ${qcPassed} cartons`);
        console.log(`    Allocated: ${allocated} cartons`);
        console.log(`    Available: ${available} cartons`);
        
        // Check for over-allocation
        if (allocated > qcPassed) {
          console.log(`    ⚠️ ISSUE: Over-allocated by ${allocated - qcPassed} cartons!`);
          allocationIssues.push({
            type: 'OVER_ALLOCATION',
            orderNumber: order.orderNumber,
            itemCode: item.itemCode,
            qcPassed,
            allocated,
            overBy: allocated - qcPassed
          });
        }
        
        // Check for negative availability
        if (available < 0) {
          console.log(`    🚨 CRITICAL: Negative availability!`);
          allocationIssues.push({
            type: 'NEGATIVE_AVAILABILITY',
            orderNumber: order.orderNumber,
            itemCode: item.itemCode,
            qcPassed,
            allocated,
            available
          });
        }
        
        console.log('');
      });
    });
    
    // 3. Check for orphaned allocations (items allocated but no container reference)
    console.log('🔍 ORPHANED ALLOCATION CHECK');
    const orphanedAllocations = await Order.find({
      $and: [
        { 'items.allocatedCartons': { $gt: 0 } },
        { 'items.containerId': { $exists: false } }
      ]
    });
    
    console.log(`Orders with orphaned allocations: ${orphanedAllocations.length}\n`);
    
    orphanedAllocations.forEach((order) => {
      console.log(`Orphaned in Order: ${order.orderNumber}`);
      order.items.forEach((item, itemIndex) => {
        if ((item.allocatedCartons || 0) > 0 && !item.containerId) {
          console.log(`  Item ${itemIndex + 1}: ${item.itemCode} - ${item.allocatedCartons} cartons allocated but no container ID`);
          allocationIssues.push({
            type: 'ORPHANED_ALLOCATION',
            orderNumber: order.orderNumber,
            itemCode: item.itemCode,
            allocatedCartons: item.allocatedCartons,
            containerId: item.containerId
          });
        }
      });
    });
    
    // 4. REVENUE & CARRYING CHARGE ANALYSIS
    console.log('💰 REVENUE & CARRYING CHARGE ANALYSIS');
    const ordersWithFinancials = await Order.find({
      items: { $exists: true, $ne: [] }
    });
    
    console.log(`Orders to analyze for revenue: ${ordersWithFinancials.length}\n`);
    
    let revenueIssues = [];
    
    ordersWithFinancials.forEach((order) => {
      console.log(`Financial Analysis - Order: ${order.orderNumber}`);
      console.log(`  Total Amount: ₹${order.totalAmount}`);
      console.log(`  Total Carrying Charges: ₹${order.totalCarryingCharges}`);
      console.log(`  Currency: ${order.currency || 'INR'}`);
      console.log(`  Exchange Rate: ${order.exchangeRate || 1}`);
      
      let calculatedTotal = 0;
      let calculatedCarryingTotal = 0;
      
      order.items.forEach((item, itemIndex) => {
        console.log(`    Item ${itemIndex + 1}: ${item.itemCode}`);
        console.log(`      Quantity: ${item.quantity} | Cartons: ${item.cartons}`);
        console.log(`      Unit Price: ₹${item.unitPrice}`);
        console.log(`      Total Price: ₹${item.totalPrice}`);
        
        // Verify item total calculation
        const expectedItemTotal = item.quantity * item.unitPrice;
        if (Math.abs(item.totalPrice - expectedItemTotal) > 0.01) {
          console.log(`      ⚠️ ISSUE: Total price mismatch! Expected: ₹${expectedItemTotal}, Got: ₹${item.totalPrice}`);
          revenueIssues.push({
            type: 'ITEM_TOTAL_MISMATCH',
            orderNumber: order.orderNumber,
            itemCode: item.itemCode,
            expected: expectedItemTotal,
            actual: item.totalPrice
          });
        }
        
        calculatedTotal += item.totalPrice;
        
        // Analyze carrying charges
        const carryingCharge = item.carryingCharge || {};
        console.log(`      Carrying Charge Basis: ${carryingCharge.basis}`);
        console.log(`      Carrying Charge Rate: ₹${carryingCharge.rate}`);
        console.log(`      Carrying Charge Amount: ₹${carryingCharge.amount}`);
        
        // Verify carrying charge calculation
        let expectedCarryingAmount = 0;
        switch (carryingCharge.basis) {
          case 'carton':
            expectedCarryingAmount = item.cartons * carryingCharge.rate;
            break;
          case 'weight':
            expectedCarryingAmount = item.unitWeight * item.cartons * carryingCharge.rate;
            break;
          case 'cbm':
            expectedCarryingAmount = item.unitCbm * item.cartons * carryingCharge.rate;
            break;
        }
        
        if (Math.abs(carryingCharge.amount - expectedCarryingAmount) > 0.01) {
          console.log(`      ⚠️ ISSUE: Carrying charge mismatch! Expected: ₹${expectedCarryingAmount}, Got: ₹${carryingCharge.amount}`);
          revenueIssues.push({
            type: 'CARRYING_CHARGE_MISMATCH',
            orderNumber: order.orderNumber,
            itemCode: item.itemCode,
            basis: carryingCharge.basis,
            rate: carryingCharge.rate,
            expected: expectedCarryingAmount,
            actual: carryingCharge.amount
          });
        }
        
        calculatedCarryingTotal += carryingCharge.amount;
        console.log('');
      });
      
      // Verify order-level totals
      if (Math.abs(order.totalAmount - calculatedTotal) > 0.01) {
        console.log(`  ⚠️ ISSUE: Order total mismatch! Expected: ₹${calculatedTotal}, Got: ₹${order.totalAmount}`);
        revenueIssues.push({
          type: 'ORDER_TOTAL_MISMATCH',
          orderNumber: order.orderNumber,
          expected: calculatedTotal,
          actual: order.totalAmount
        });
      }
      
      if (Math.abs(order.totalCarryingCharges - calculatedCarryingTotal) > 0.01) {
        console.log(`  ⚠️ ISSUE: Carrying charges total mismatch! Expected: ₹${calculatedCarryingTotal}, Got: ₹${order.totalCarryingCharges}`);
        revenueIssues.push({
          type: 'CARRYING_TOTAL_MISMATCH',
          orderNumber: order.orderNumber,
          expected: calculatedCarryingTotal,
          actual: order.totalCarryingCharges
        });
      }
      
      console.log('  ✓ Financial verification complete\n');
    });
    
    // 5. SUMMARY OF ALL ISSUES
    console.log('📋 ISSUE SUMMARY');
    console.log(`Total Allocation Issues: ${allocationIssues.length}`);
    console.log(`Total Revenue Issues: ${revenueIssues.length}\n`);
    
    if (allocationIssues.length > 0) {
      console.log('🚨 ALLOCATION ISSUES:');
      allocationIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.orderNumber} - ${issue.itemCode || 'N/A'}`);
        if (issue.overBy) console.log(`   Over-allocated by: ${issue.overBy} cartons`);
        if (issue.available !== undefined) console.log(`   Available: ${issue.available} cartons`);
        if (issue.allocatedCartons) console.log(`   Allocated: ${issue.allocatedCartons} cartons`);
      });
      console.log('');
    }
    
    if (revenueIssues.length > 0) {
      console.log('💰 REVENUE ISSUES:');
      revenueIssues.forEach((issue, index) => {
        console.log(`${index + 1}. ${issue.type}: ${issue.orderNumber} - ${issue.itemCode || 'N/A'}`);
        if (issue.expected !== undefined) console.log(`   Expected: ₹${issue.expected}, Actual: ₹${issue.actual}`);
      });
    }
    
    console.log('\n=== ANALYSIS COMPLETE ===');
    
    return {
      allocationIssues,
      revenueIssues,
      totalContainers: containersWithAllocations.length,
      totalOrdersWithAllocations: ordersWithAllocations.length,
      totalOrphanedAllocations: orphanedAllocations.length
    };
    
  } catch (error) {
    console.error('Error in analysis:', error);
  } finally {
    mongoose.connection.close();
  }
}

analyzeAllocationAndRevenueIssues();