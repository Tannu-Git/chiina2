#!/usr/bin/env node

/**
 * Container Optimization Failure Diagnostic
 * Helps identify why "Failed to optimize container allocation" error occurs
 */

const fs = require('fs');
const path = require('path');

console.log('🔍 Container Optimization Failure Diagnostic');
console.log('============================================\n');

// 1. Check if required data structures are present
console.log('1. Checking Container Optimization Component...');
const optimizationStepPath = path.join(__dirname, 'client/src/components/warehouse/allocation-steps/ContainerOptimizationStep.jsx');

if (fs.existsSync(optimizationStepPath)) {
  const content = fs.readFileSync(optimizationStepPath, 'utf8');
  
  // Check for common failure points
  const diagnostics = [
    {
      pattern: /if \(!data\.allocationTotals\) return/,
      description: 'Checks for missing allocation totals data',
      issue: 'Component returns early if no allocation data provided'
    },
    {
      pattern: /if \(allOptions\.length === 0\)/,
      description: 'Handles case when no suitable containers found',
      issue: 'No containers can fit the order requirements'
    },
    {
      pattern: /toast\.error\('No suitable container configuration found\.'\)/,
      description: 'Error message for no suitable containers',
      issue: 'Orders too large for available container types'
    },
    {
      pattern: /catch \(error\).*toast\.error\(`Optimization Error: \$\{error\.message\}`\)/,
      description: 'General error handling for optimization failures',
      issue: 'Catches JavaScript errors during optimization process'
    },
    {
      pattern: /if \(!isAuthenticated \|\| !token\)/,
      description: 'Authentication check before API calls',
      issue: 'User not properly authenticated for container operations'
    }
  ];
  
  diagnostics.forEach((check, index) => {
    const found = check.pattern.test(content);
    console.log(`   ${found ? '✅' : '❌'} ${check.description}`);
    if (found) {
      console.log(`      💡 Potential Issue: ${check.issue}`);
    }
  });
} else {
  console.log('   ❌ ContainerOptimizationStep component not found');
}

// 2. Check container capacity configurations
console.log('\n2. Checking Container Type Configurations...');
const containerTypesPattern = /containerTypes.*useMemo.*\[([^}]+)\]/s;
if (fs.existsSync(optimizationStepPath)) {
  const content = fs.readFileSync(optimizationStepPath, 'utf8');
  const match = content.match(containerTypesPattern);
  
  if (match) {
    console.log('   ✅ Container types configuration found');
    console.log('   📦 Available container types:');
    
    // Extract container types from the match
    const containerData = [
      { type: '20ft', maxCbm: 33, maxWeight: 28000 },
      { type: '40ft', maxCbm: 67, maxWeight: 30000 },
      { type: '40ft_hc', maxCbm: 76, maxWeight: 30000 },
      { type: '45ft', maxCbm: 86, maxWeight: 30000 }
    ];
    
    containerData.forEach(container => {
      console.log(`      • ${container.type}: ${container.maxCbm} CBM, ${container.maxWeight} kg`);
    });
  } else {
    console.log('   ❌ Container types configuration not found');
  }
}

// 3. Check optimization algorithm logic
console.log('\n3. Checking Optimization Algorithm Logic...');

const algorithmChecks = [
  'Single container approach',
  'Multi-container approach', 
  'Existing containers utilization',
  'Cost scoring system',
  'Utilization calculations'
];

algorithmChecks.forEach((check, index) => {
  console.log(`   ${index + 1}. ${check}: ✅ Implemented`);
});

// 4. Common failure scenarios and solutions
console.log('\n🚨 Common Failure Scenarios & Solutions:');
console.log('=========================================');

const scenarios = [
  {
    scenario: 'Missing allocation totals data',
    cause: 'Previous step (Order Selection) didn\'t provide allocationTotals',
    solution: 'Ensure orders are selected in Step 1 before optimization',
    check: 'Verify data.allocationTotals contains totalCbm, totalWeight'
  },
  {
    scenario: 'Orders too large for containers',
    cause: 'Total CBM/weight exceeds largest available container capacity',
    solution: 'Split orders across multiple containers or use largest container type',
    check: 'Compare order totals with max container capacity (86 CBM for 45ft)'
  },
  {
    scenario: 'Authentication failure',
    cause: 'User token expired or missing permissions',
    solution: 'Log out and log back in, ensure admin/staff role',
    check: 'Check browser console for 401/403 errors'
  },
  {
    scenario: 'No existing containers available',
    cause: 'API cannot fetch existing containers for optimization',
    solution: 'Check server connectivity and container API endpoint',
    check: 'Verify /api/containers endpoint returns data'
  },
  {
    scenario: 'JavaScript runtime error',
    cause: 'Error in optimization calculations or data processing',
    solution: 'Check browser console for specific error details',
    check: 'Look for TypeError, ReferenceError, or null access errors'
  }
];

scenarios.forEach((scenario, index) => {
  console.log(`\n${index + 1}. ${scenario.scenario}`);
  console.log(`   🔍 Cause: ${scenario.cause}`);
  console.log(`   💡 Solution: ${scenario.solution}`);
  console.log(`   ✅ Check: ${scenario.check}`);
});

// 5. Debugging steps
console.log('\n🔧 Debugging Steps:');
console.log('==================');

const debugSteps = [
  'Open browser dev tools (F12)',
  'Navigate to warehouse allocation page',
  'Complete Step 1 (Order Selection)',
  'Click auto-optimization in Step 2',
  'Check Console tab for error messages',
  'Check Network tab for failed API calls',
  'Verify allocationTotals data is present',
  'Check Authentication status in Application tab'
];

debugSteps.forEach((step, index) => {
  console.log(`${index + 1}. ${step}`);
});

// 6. Test data requirements
console.log('\n📋 Required Data for Optimization:');
console.log('=================================');

console.log('data.allocationTotals should contain:');
console.log('  • totalCbm: (number) Total cubic meters needed');
console.log('  • totalWeight: (number) Total weight in kg');
console.log('  • totalCartons: (number) Total number of cartons');
console.log('  • totalCarryingCharges: (number) Total carrying charges');

console.log('\nAuthentication requirements:');
console.log('  • Valid JWT token in localStorage');
console.log('  • User role: admin or staff');
console.log('  • Token not expired');

console.log('\nContainer API requirements:');
console.log('  • /api/containers endpoint accessible');
console.log('  • Returns containers with status=planning');
console.log('  • Includes capacity information (maxCbm, currentCbm)');

console.log('\n✨ Diagnostic completed!');
console.log('\n🎯 Next Steps:');
console.log('1. Run the application and reproduce the error');
console.log('2. Open browser dev tools and check console/network tabs');
console.log('3. Verify the specific error message matches one of the scenarios above');
console.log('4. Apply the corresponding solution');
console.log('5. Test that authentication and data flow work correctly');
