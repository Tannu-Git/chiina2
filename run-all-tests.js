const { runDiagnostics } = require('./diagnostic-script');
const { fixOrphanedAllocations } = require('./fix-orphaned-allocations');
const { testWarehouseQC } = require('./test-warehouse-qc');
const { simulateAPIResponses } = require('./simulate-api-responses');

/**
 * Master Test Runner Script
 * Executes all diagnostic and test scripts in the correct order
 */

async function runAllTests(options = {}) {
  const { skipFixes = false, verbose = true } = options;
  
  console.log('🚀 CHINA5 MASTER TEST RUNNER');
  console.log('='.repeat(60));
  console.log(`Started: ${new Date().toISOString()}\n`);

  const results = {
    timestamp: new Date().toISOString(),
    tests: [],
    summary: {
      total: 0,
      passed: 0,
      failed: 0,
      skipped: 0,
      issues: []
    }
  };

  // Test 1: Run Diagnostics
  console.log('📊 STEP 1: Running System Diagnostics...');
  try {
    const diagnosticResult = await runDiagnostics();
    results.tests.push({
      name: 'System Diagnostics',
      status: 'PASSED',
      details: diagnosticResult,
      issues: diagnosticResult.issues || []
    });
    
    if (diagnosticResult.issues && diagnosticResult.issues.length > 0) {
      console.log(`⚠️  Found ${diagnosticResult.issues.length} issues to address`);
      results.summary.issues.push(...diagnosticResult.issues);
    } else {
      console.log('✅ No critical issues found in diagnostics');
    }
    
  } catch (error) {
    console.error('❌ Diagnostics failed:', error.message);
    results.tests.push({
      name: 'System Diagnostics',
      status: 'FAILED',
      error: error.message
    });
  }

  // Test 2: Check for Orphaned Allocations
  console.log('\n🔧 STEP 2: Checking for Orphaned Allocations...');
  try {
    // First do a dry run to check
    const orphanCheck = await fixOrphanedAllocations({ dryRun: true });
    
    if (orphanCheck.issues > 0) {
      console.log(`⚠️  Found ${orphanCheck.issues} orders with orphaned allocations`);
      
      if (!skipFixes) {
        console.log('🔧 Auto-fixing orphaned allocations...');
        const fixResult = await fixOrphanedAllocations({ autoFix: true });
        results.tests.push({
          name: 'Fix Orphaned Allocations',
          status: 'PASSED',
          details: fixResult
        });
        console.log(`✅ Fixed ${fixResult.fixed || 0} orders`);
      } else {
        console.log('⏭️  Skipping auto-fix (use --fix to enable)');
        results.tests.push({
          name: 'Check Orphaned Allocations',
          status: 'SKIPPED',
          details: orphanCheck
        });
      }
    } else {
      console.log('✅ No orphaned allocations found');
      results.tests.push({
        name: 'Check Orphaned Allocations',
        status: 'PASSED',
        details: { message: 'No orphaned allocations found' }
      });
    }
    
  } catch (error) {
    console.error('❌ Orphaned allocation check failed:', error.message);
    results.tests.push({
      name: 'Check Orphaned Allocations',
      status: 'FAILED',
      error: error.message
    });
  }

  // Test 3: Warehouse QC Operations
  console.log('\n🔬 STEP 3: Testing Warehouse QC Operations...');
  try {
    const qcTestResult = await testWarehouseQC();
    const qcPassed = qcTestResult.summary.failed === 0;
    
    results.tests.push({
      name: 'Warehouse QC Operations',
      status: qcPassed ? 'PASSED' : 'FAILED',
      details: qcTestResult
    });
    
    if (qcPassed) {
      console.log('✅ All QC operation tests passed');
    } else {
      console.log(`❌ ${qcTestResult.summary.failed} QC tests failed`);
      results.summary.issues.push({
        type: 'QC_TEST_FAILURE',
        severity: 'HIGH',
        count: qcTestResult.summary.failed,
        description: `${qcTestResult.summary.failed} warehouse QC tests failed`
      });
    }
    
  } catch (error) {
    console.error('❌ Warehouse QC testing failed:', error.message);
    results.tests.push({
      name: 'Warehouse QC Operations',
      status: 'FAILED',
      error: error.message
    });
  }

  // Test 4: API Response Simulation
  console.log('\n🌐 STEP 4: Testing API Logic...');
  try {
    const apiTestResult = await simulateAPIResponses();
    const highSeverityIssues = apiTestResult.issues.filter(i => i.severity === 'HIGH').length;
    const apiPassed = highSeverityIssues === 0;
    
    results.tests.push({
      name: 'API Logic Simulation',
      status: apiPassed ? 'PASSED' : 'FAILED',
      details: apiTestResult
    });
    
    if (apiPassed) {
      console.log('✅ All API logic tests passed');
    } else {
      console.log(`❌ ${highSeverityIssues} high-severity API issues found`);
      results.summary.issues.push(...apiTestResult.issues);
    }
    
  } catch (error) {
    console.error('❌ API testing failed:', error.message);
    results.tests.push({
      name: 'API Logic Simulation',
      status: 'FAILED',
      error: error.message
    });
  }

  // Calculate summary
  results.summary.total = results.tests.length;
  results.summary.passed = results.tests.filter(t => t.status === 'PASSED').length;
  results.summary.failed = results.tests.filter(t => t.status === 'FAILED').length;
  results.summary.skipped = results.tests.filter(t => t.status === 'SKIPPED').length;

  // Display final summary
  console.log('\n📊 FINAL TEST SUMMARY');
  console.log('='.repeat(50));
  console.log(`Total Tests: ${results.summary.total}`);
  console.log(`Passed: ${results.summary.passed} ✅`);
  console.log(`Failed: ${results.summary.failed} ❌`);
  console.log(`Skipped: ${results.summary.skipped} ⏭️`);
  console.log(`Total Issues: ${results.summary.issues.length}`);

  const overallSuccess = results.summary.failed === 0;
  console.log(`\nOverall Status: ${overallSuccess ? '✅ PASSED' : '❌ FAILED'}`);

  // Show critical issues
  if (results.summary.issues.length > 0) {
    console.log('\n⚠️  CRITICAL ISSUES TO ADDRESS:');
    results.summary.issues.forEach((issue, index) => {
      console.log(`${index + 1}. ${issue.description} (${issue.severity})`);
    });
  }

  // Save comprehensive report
  const fs = require('fs');
  const reportPath = './master-test-report.json';
  fs.writeFileSync(reportPath, JSON.stringify(results, null, 2));
  console.log(`\n💾 Comprehensive report saved to: ${reportPath}`);

  // Recommendations
  console.log('\n💡 NEXT STEPS:');
  if (overallSuccess) {
    console.log('   ✅ All tests passed! System appears stable.');
    console.log('   📋 Consider running regular automated testing.');
    console.log('   🔄 Review performance optimizations.');
  } else {
    console.log('   🔧 Fix failed tests before proceeding.');
    console.log('   📋 Review detailed error reports.');
    console.log('   🔄 Re-run tests after fixes.');
  }

  console.log(`\n🎉 Test run completed: ${new Date().toISOString()}`);
  return results;
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const skipFixes = !args.includes('--fix');
  const verbose = !args.includes('--quiet');
  
  console.log('Usage: node run-all-tests.js [--fix] [--quiet]');
  console.log('  --fix: Enable auto-fixing of issues');
  console.log('  --quiet: Reduce verbose output\n');
  
  runAllTests({ skipFixes, verbose })
    .then(results => {
      const success = results.summary.failed === 0;
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('💥 Test runner failed:', error);
      process.exit(1);
    });
}

module.exports = { runAllTests };