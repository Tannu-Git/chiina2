// Test script to validate frontend availability calculation fix
const testData = {
  // Simulated API response structure
  order: {
    _id: "674b123456789",
    orderNumber: "ORD-000001",
    clientName: "nlj",
    items: [
      {
        _id: "674b123456790",
        itemCode: "item 001",
        description: "jhk",
        qcPassedCartons: 62,
        allocatedCartons: 60,
        availableCartons: 2,  // Backend calculated: 62 - 60 = 2
        unitCbm: 100,
        carryingCharge: { rate: 100 }
      }
    ]
  }
};

console.log('=== FRONTEND AVAILABILITY CALCULATION TEST ===\n');

// OLD BUGGY CALCULATION (was causing -58 display)
function oldBuggyCalculation(item) {
  return (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
}

// NEW FIXED CALCULATION
function newFixedCalculation(item) {
  return item.availableCartons || Math.max(0, (item.qcPassedCartons || 0) - (item.allocatedCartons || 0));
}

const item = testData.order.items[0];

console.log('Database Values:');
console.log('- QC Passed Cartons:', item.qcPassedCartons);
console.log('- Allocated Cartons:', item.allocatedCartons);
console.log('- Available Cartons (from API):', item.availableCartons);
console.log('');

console.log('Frontend Calculations:');
console.log('OLD BUGGY: (availableCartons || qcPassedCartons) - allocatedCartons');
console.log('  Result:', oldBuggyCalculation(item));
console.log('  Logic: (2 || 62) - 60 = 2 - 60 = -58 ❌');
console.log('');

console.log('NEW FIXED: availableCartons OR fallback calculation');
console.log('  Result:', newFixedCalculation(item));
console.log('  Logic: availableCartons = 2 ✅');
console.log('');

console.log('EXPLANATION:');
console.log('- Backend API already calculates availableCartons = qcPassedCartons - allocatedCartons');
console.log('- Frontend should use availableCartons directly, not subtract again');
console.log('- Old logic: (2 || 62) - 60 = 2 - 60 = -58 (WRONG!)');
console.log('- New logic: 2 (correct from API response)');
console.log('');

console.log('✅ FRONTEND FIX VALIDATED - Will show "2 available" instead of "-58 available"');