#!/usr/bin/env node

/**
 * QC Validation Issue Analysis
 * 
 * This script demonstrates the potential QC validation calculation issue
 * in the Container Edit component on line 2526.
 */

console.log('🔍 QC VALIDATION CALCULATION ANALYSIS\n');

// Simulate the current problematic calculation
function analyzeQCCalculation(scenario) {
  console.log(`=== SCENARIO: ${scenario.name} ===`);
  console.log(`Item: ${scenario.itemCode}`);
  console.log(`QC Passed Cartons: ${scenario.qcPassed}`);
  console.log(`Already Allocated (other containers): ${scenario.allocated}`);
  console.log(`Current Container Allocation: ${scenario.currentAllocation}`);
  
  // Current problematic calculation from ContainerEdit.jsx line 2526
  const maxAvailableForItemCurrent = Math.max(0, scenario.qcPassed - (scenario.allocated - scenario.currentAllocation));
  
  // Correct calculation should be:
  const maxAvailableForItemCorrect = Math.max(0, scenario.qcPassed - scenario.allocated + scenario.currentAllocation);
  
  // Even simpler and clearer calculation:
  const maxAvailableForItemSimple = scenario.qcPassed - scenario.allocated;
  const maxEditableForItem = Math.max(0, maxAvailableForItemSimple + scenario.currentAllocation);
  
  console.log(`\n📊 CALCULATION RESULTS:`);
  console.log(`Current (Problematic): maxAvailable = Math.max(0, ${scenario.qcPassed} - (${scenario.allocated} - ${scenario.currentAllocation})) = ${maxAvailableForItemCurrent}`);
  console.log(`Corrected Formula 1: maxAvailable = Math.max(0, ${scenario.qcPassed} - ${scenario.allocated} + ${scenario.currentAllocation}) = ${maxAvailableForItemCorrect}`);
  console.log(`Corrected Formula 2: maxEditable = ${scenario.qcPassed} - ${scenario.allocated} + ${scenario.currentAllocation} = ${maxEditableForItem}`);
  
  // Analysis
  const isCurrentCorrect = maxAvailableForItemCurrent === maxAvailableForItemCorrect;
  console.log(`\n✅ Current calculation ${isCurrentCorrect ? 'CORRECT' : 'INCORRECT'}`);
  
  if (!isCurrentCorrect) {
    console.log(`❌ ISSUE: Current calculation gives ${maxAvailableForItemCurrent} but should be ${maxAvailableForItemCorrect}`);
    const difference = maxAvailableForItemCorrect - maxAvailableForItemCurrent;
    console.log(`   Difference: ${difference} cartons`);
    
    if (difference > 0) {
      console.log(`   Impact: User cannot allocate ${difference} cartons that should be available`);
    } else {
      console.log(`   Impact: User can over-allocate by ${Math.abs(difference)} cartons`);
    }
  }
  
  console.log('');
}

// Test scenarios
const scenarios = [
  {
    name: "Normal Case",
    itemCode: "ITEM-001",
    qcPassed: 10,
    allocated: 3,
    currentAllocation: 2
  },
  {
    name: "Full QC Passed",
    itemCode: "ITEM-002", 
    qcPassed: 5,
    allocated: 0,
    currentAllocation: 0
  },
  {
    name: "Partially Allocated",
    itemCode: "ITEM-003",
    qcPassed: 8,
    allocated: 5,
    currentAllocation: 3
  },
  {
    name: "Over-allocated Case",
    itemCode: "ITEM-004",
    qcPassed: 6,
    allocated: 8,
    currentAllocation: 2
  }
];

scenarios.forEach(scenario => {
  analyzeQCCalculation(scenario);
});

console.log('🛠️ RECOMMENDED FIX:');
console.log('===================');
console.log('Replace line 2526 in ContainerEdit.jsx:');
console.log('');
console.log('FROM:');
console.log('  const maxAvailableForItem = Math.max(0, qcPassed - (allocated - currentAllocation));');
console.log('');
console.log('TO:');
console.log('  const maxAvailableForItem = Math.max(0, qcPassed - allocated + currentAllocation);');
console.log('');
console.log('OR for clarity:');
console.log('  const alreadyAllocatedElsewhere = allocated - currentAllocation;');
console.log('  const maxAvailableForItem = Math.max(0, qcPassed - alreadyAllocatedElsewhere);');
console.log('');
console.log('This ensures users can edit up to the QC passed quantity minus what is allocated elsewhere.');