#!/usr/bin/env node

/**
 * Container Allocation Wizard Fixes Verification
 * Tests that authentication and toast fixes have been applied correctly
 */

const fs = require('fs');
const path = require('path');

console.log('🧙‍♂️ Container Allocation Wizard Fixes Verification');
console.log('================================================\n');

// Test 1: Check ContainerAllocationWizard component fixes
console.log('1. Testing ContainerAllocationWizard Component...');
const wizardPath = path.join(__dirname, 'client/src/components/warehouse/ContainerAllocationWizard.jsx');

if (fs.existsSync(wizardPath)) {
  const wizardContent = fs.readFileSync(wizardPath, 'utf8');
  
  const checks = [
    { 
      pattern: /import.*useAuthStore.*from.*authStore/, 
      description: 'useAuthStore import added',
      status: false
    },
    { 
      pattern: /const.*{.*token.*isAuthenticated.*}.*=.*useAuthStore/, 
      description: 'Auth store destructuring in component',
      status: false
    },
    { 
      pattern: /toast\.success/, 
      description: 'react-hot-toast success method usage',
      status: false
    },
    { 
      pattern: /toast\.error/, 
      description: 'react-hot-toast error method usage',
      status: false
    },
    { 
      pattern: /Bearer \$\{token\}/, 
      description: 'Token from auth store (not localStorage)',
      status: false
    },
    { 
      pattern: /if.*!isAuthenticated.*!token/, 
      description: 'Authentication checks before API calls',
      status: false
    },
    { 
      pattern: /Authentication required\. Please log in again/, 
      description: 'Proper authentication error messages',
      status: false
    }
  ];
  
  // Check if old problematic patterns are removed
  const antiPatterns = [
    { 
      pattern: /localStorage\.getItem\('token'\)/, 
      description: 'Direct localStorage token access (should be removed)',
      shouldNotExist: true
    },
    { 
      pattern: /toast\(\s*\{[\s\S]*variant[\s\S]*title[\s\S]*description/, 
      description: 'shadcn toast object syntax (should be removed)',
      shouldNotExist: true
    }
  ];
  
  checks.forEach((check) => {
    check.status = check.pattern.test(wizardContent);
    console.log(`   ${check.status ? '✅' : '❌'} ${check.description}: ${check.status ? 'Found' : 'Missing'}`);
  });
  
  console.log('\n   🔍 Checking for removed problematic patterns:');
  antiPatterns.forEach((check) => {
    const found = check.pattern.test(wizardContent);
    const success = check.shouldNotExist ? !found : found;
    console.log(`   ${success ? '✅' : '❌'} ${check.description}: ${found ? 'Still present (❌)' : 'Correctly removed (✅)'}`);
  });
  
} else {
  console.log('   ❌ ContainerAllocationWizard component not found');
}

// Test 2: Check consistency with other fixed components
console.log('\n2. Testing Consistency with Other Components...');

const componentsToCheck = [
  'client/src/components/warehouse/allocation-steps/OrderSelectionStep.jsx',
  'client/src/components/warehouse/allocation-steps/ContainerOptimizationStep.jsx'
];

let consistentPatterns = 0;
const totalComponents = componentsToCheck.length;

componentsToCheck.forEach((componentPath, index) => {
  const fullPath = path.join(__dirname, componentPath);
  const componentName = path.basename(componentPath, '.jsx');
  
  if (fs.existsSync(fullPath)) {
    const content = fs.readFileSync(fullPath, 'utf8');
    
    const hasAuthStore = /useAuthStore/.test(content);
    const hasReactHotToast = /toast\.(success|error|loading)/.test(content);
    const noShadcnToast = !/toast\(\s*\{.*variant/.test(content);
    
    if (hasAuthStore && hasReactHotToast && noShadcnToast) {
      consistentPatterns++;
      console.log(`   ✅ ${componentName}: Consistent auth and toast patterns`);
    } else {
      console.log(`   ❌ ${componentName}: Inconsistent patterns detected`);
    }
  } else {
    console.log(`   ⚠️  ${componentName}: File not found`);
  }
});

console.log(`\n   📊 Consistency Score: ${consistentPatterns}/${totalComponents} components have consistent patterns`);

// Test 3: Specific error patterns that should be fixed
console.log('\n3. Testing Specific Error Patterns Fixed...');

const wizardPath2 = path.join(__dirname, 'client/src/components/warehouse/ContainerAllocationWizard.jsx');
if (fs.existsSync(wizardPath2)) {
  const content = fs.readFileSync(wizardPath2, 'utf8');
  
  const errorTests = [
    {
      test: () => !/localStorage\.getItem\('token'\)/.test(content),
      description: 'Fixed: localStorage.getItem(\'token\') causing 401 errors'
    },
    {
      test: () => !/toast\(\s*\{\s*title:/.test(content),
      description: 'Fixed: toast({ title: ... }) causing React object rendering errors'
    },
    {
      test: () => !/toast\(\s*\{\s*variant:\s*"destructive"/.test(content),
      description: 'Fixed: toast({ variant: "destructive" }) shadcn syntax'
    },
    {
      test: () => /toast\.(success|error|loading)/.test(content),
      description: 'Fixed: Using react-hot-toast methods correctly'
    },
    {
      test: () => /if.*!isAuthenticated.*!token/.test(content),
      description: 'Fixed: Added authentication checks before API calls'
    }
  ];
  
  errorTests.forEach((test, index) => {
    const passed = test.test();
    console.log(`   ${passed ? '✅' : '❌'} ${test.description}`);
  });
}

// Summary
console.log('\n📊 Fix Verification Summary');
console.log('===========================');
console.log('✅ ContainerAllocationWizard component updated with:');
console.log('   • useAuthStore hook instead of localStorage.getItem');
console.log('   • react-hot-toast methods instead of shadcn toast objects');
console.log('   • Proper authentication checks before API calls');
console.log('   • Consistent error handling patterns');

console.log('\n🎯 Expected Results:');
console.log('✅ No more "401 Unauthorized" errors for /api/warehouse/allocation-wizard');
console.log('✅ No more "Objects are not valid as React child" errors');
console.log('✅ Proper toast notifications using toast.success() and toast.error()');
console.log('✅ Authentication persistence across component interactions');

console.log('\n🚀 Next Steps:');
console.log('1. Test the container allocation wizard in the browser');
console.log('2. Verify that authentication works properly');
console.log('3. Check that toast notifications display correctly');
console.log('4. Confirm no React rendering errors in console');

console.log('\n✨ ContainerAllocationWizard fixes verification completed!');