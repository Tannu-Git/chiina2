// Comprehensive test to validate allocation-aware financial calculation fixes
const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');
const {
  calculateAllocatedProductCost,
  calculateAllocatedCarryingCharges,
  getOrderAllocationSummary,
  validateFinancialConsistency
} = require('./server/utils/financialCalculationHelpers');

async function validateAllocationFinancialFixes() {
  try {
    console.log('🔬 COMPREHENSIVE ALLOCATION-AWARE FINANCIAL VALIDATION');
    console.log('='.repeat(70));
    
    await mongoose.connect('mongodb://localhost:27017/logistics-oms-new');
    
    // Get sample order and container data
    const sampleOrder = await Order.findOne({ 
      orderNumber: 'ORD-000001',
      'items.allocatedCartons': { $gt: 0 }
    });
    
    const relatedContainers = await Container.find({
      'orders.orderId': sampleOrder._id
    });
    
    if (!sampleOrder || relatedContainers.length === 0) {
      console.log('❌ No suitable test data found (order with allocations needed)');
      return;
    }
    
    console.log(`\n📋 TESTING ORDER: ${sampleOrder.orderNumber}`);
    console.log(`   Client: ${sampleOrder.clientName}`);
    console.log(`   Containers: ${relatedContainers.length}`);
    
    // 1. Test allocation calculation helper functions
    console.log('\n1️⃣ ALLOCATION CALCULATION HELPER TESTS');
    console.log('-'.repeat(45));
    
    const allocatedProductCost = calculateAllocatedProductCost(sampleOrder, relatedContainers);
    const allocatedCarryingCharges = calculateAllocatedCarryingCharges(sampleOrder, relatedContainers);
    const allocationSummary = getOrderAllocationSummary(sampleOrder, relatedContainers);
    
    console.log(`✅ Allocated Product Cost: ₹${allocatedProductCost.toLocaleString()}`);
    console.log(`✅ Allocated Carrying Charges: ₹${allocatedCarryingCharges.toLocaleString()}`);
    console.log(`✅ Allocation Summary:`, {
      allocationRatio: `${allocationSummary.allocationRatio}%`,
      totalCartons: allocationSummary.totalCartons,
      allocatedCartons: allocationSummary.allocatedCartons,
      isPartiallyAllocated: allocationSummary.isPartiallyAllocated
    });
    
    // 2. Compare OLD vs NEW financial calculation approach
    console.log('\n2️⃣ OLD vs NEW FINANCIAL CALCULATION COMPARISON');
    console.log('-'.repeat(50));
    
    // OLD approach (WRONG)
    const oldProductCost = sampleOrder.items ? 
      sampleOrder.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
    const oldCarryingCharges = sampleOrder.totalCarryingCharges || 0;
    const oldTotalAmount = oldProductCost + oldCarryingCharges;
    
    console.log('❌ OLD (WRONG) Calculation:');
    console.log(`   Product Cost: ₹${oldProductCost.toLocaleString()} (FULL ORDER)`);
    console.log(`   Carrying Charges: ₹${oldCarryingCharges.toLocaleString()} (FULL ORDER)`);
    console.log(`   Total Amount: ₹${oldTotalAmount.toLocaleString()} (FULL ORDER)`);
    
    // NEW approach (CORRECT)
    console.log('\n✅ NEW (CORRECT) Allocation-Aware Calculation:');
    console.log(`   Product Cost: ₹${allocatedProductCost.toLocaleString()} (ALLOCATED ONLY)`);
    console.log(`   Carrying Charges: ₹${allocatedCarryingCharges.toLocaleString()} (ALLOCATED ONLY)`);
    console.log(`   Total Amount: ₹${(allocatedProductCost + allocatedCarryingCharges).toLocaleString()} (ALLOCATED ONLY)`);
    
    // Calculate savings/difference
    const difference = oldTotalAmount - (allocatedProductCost + allocatedCarryingCharges);
    const percentageDiff = ((difference / oldTotalAmount) * 100).toFixed(2);
    
    console.log(`\n💰 FINANCIAL IMPACT:`)
    console.log(`   Amount Difference: ₹${difference.toLocaleString()}`);
    console.log(`   Percentage Reduction: ${percentageDiff}%`);
    console.log(`   Interpretation: Client now pays ${percentageDiff}% less (allocated portion only)`);
    
    // 3. Test THROUGH_ME vs CLIENT_DIRECT calculation differences
    console.log('\n3️⃣ PAYMENT TYPE IMPACT ANALYSIS');
    console.log('-'.repeat(40));
    
    const paymentType = sampleOrder.items[0]?.paymentType || 'THROUGH_ME';
    console.log(`   Order Payment Type: ${paymentType}`);
    
    if (paymentType === 'THROUGH_ME') {
      console.log('   ✅ THROUGH_ME: Client pays allocated product cost + allocated carrying charges');
      console.log(`   Client Owes: ₹${(allocatedProductCost + allocatedCarryingCharges).toLocaleString()}`);
      console.log(`   You Pay Supplier: ₹${allocatedProductCost.toLocaleString()}`);
      console.log(`   You Keep: ₹${allocatedCarryingCharges.toLocaleString()}`);
    } else {
      console.log('   ✅ CLIENT_DIRECT: Client pays you only allocated carrying charges');
      console.log(`   Client Pays You: ₹${allocatedCarryingCharges.toLocaleString()}`);
      console.log(`   Client Pays Supplier Directly: ₹${allocatedProductCost.toLocaleString()}`);
      console.log(`   You Keep: ₹${allocatedCarryingCharges.toLocaleString()}`);
    }
    
    // 4. Validate container revenue consistency
    console.log('\n4️⃣ CONTAINER REVENUE CONSISTENCY CHECK');
    console.log('-'.repeat(45));
    
    let totalContainerRevenue = 0;
    relatedContainers.forEach((container, index) => {
      const containerOrder = container.orders.find(o => 
        o.orderId.toString() === sampleOrder._id.toString()
      );
      
      if (containerOrder) {
        console.log(`   Container ${index + 1}: ${container.realContainerId}`);
        console.log(`     Allocated Carrying Charges: ₹${containerOrder.carryingCharges.toLocaleString()}`);
        totalContainerRevenue += containerOrder.carryingCharges;
      }
    });
    
    console.log(`\n   Total Container Revenue: ₹${totalContainerRevenue.toLocaleString()}`);
    console.log(`   Calculated Allocated Carrying: ₹${allocatedCarryingCharges.toLocaleString()}`);
    
    if (Math.abs(totalContainerRevenue - allocatedCarryingCharges) < 0.01) {
      console.log('   ✅ CONSISTENCY CHECK PASSED: Container revenue matches allocated calculation');
    } else {
      console.log('   ❌ CONSISTENCY ISSUE: Container revenue does NOT match allocated calculation');
    }
    
    // 5. Test validation function
    console.log('\n5️⃣ FINANCIAL CONSISTENCY VALIDATION');
    console.log('-'.repeat(42));
    
    const validationResult = validateFinancialConsistency(sampleOrder, relatedContainers);
    console.log(`   Validation Status: ${validationResult.isValid ? '✅ VALID' : '❌ INVALID'}`);
    
    if (validationResult.issues.length > 0) {
      console.log('   Issues Found:');
      validationResult.issues.forEach(issue => {
        console.log(`     - ${issue.type}: ${issue.message}`);
      });
    } else {
      console.log('   ✅ No consistency issues found');
    }
    
    // 6. Summary and recommendations
    console.log('\n🎯 VALIDATION SUMMARY');
    console.log('='.repeat(25));
    
    console.log('✅ FIXES IMPLEMENTED:');
    console.log('   1. Created allocation-aware helper functions');
    console.log('   2. Fixed financials-comprehensive.js THROUGH_ME calculations');
    console.log('   3. Fixed payment collections to use allocated amounts');
    console.log('   4. Fixed supplier payments to use allocated amounts');
    console.log('   5. Updated payment breakdown calculations');
    
    console.log('\n📊 EXPECTED RESULTS:');
    console.log('   - Financial overview will show correct allocated amounts');
    console.log(`   - Payment collections reduced by ${percentageDiff}% (allocated vs full)`);
    console.log('   - Container revenue matches client payment obligations');
    console.log('   - Supplier payments reflect only allocated portions');
    
    console.log('\n🚀 SYSTEM STATUS:');
    if (validationResult.isValid && Math.abs(totalContainerRevenue - allocatedCarryingCharges) < 0.01) {
      console.log('   ✅ ALL ALLOCATION FINANCIAL FIXES WORKING CORRECTLY');
      console.log('   ✅ Ready for production use with accurate financial calculations');
    } else {
      console.log('   ⚠️ Some issues detected - manual review recommended');
    }
    
  } catch (error) {
    console.error('❌ Financial validation error:', error.message);
  } finally {
    mongoose.connection.close();
  }
}

validateAllocationFinancialFixes();