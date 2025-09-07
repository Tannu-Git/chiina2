const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

/**
 * Fix Orphaned Allocations Script
 * This script identifies and fixes orders that have item-level allocations
 * but no valid container assignment, which causes data inconsistency.
 */

async function fixOrphanedAllocations(options = {}) {
  const { dryRun = false, autoFix = false } = options;
  
  try {
    console.log('🔧 ORPHANED ALLOCATION FIX SCRIPT');
    console.log('='.repeat(50));
    console.log(`Mode: ${dryRun ? 'DRY RUN (no changes)' : autoFix ? 'AUTO FIX' : 'ANALYSIS ONLY'}\n`);

    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB\n');

    // Step 1: Find orphaned allocations using Order model method
    console.log('🔍 Scanning for orphaned allocations...');
    const orphanedResult = await Order.findOrphanedAllocations({ dryRun: true });
    
    console.log(`📋 Found ${orphanedResult.totalOrders} orders with orphaned allocations`);
    console.log(`📋 Total affected items: ${orphanedResult.totalItems}\n`);

    if (orphanedResult.totalOrders === 0) {
      console.log('✅ No orphaned allocations found. System is clean!');
      return { success: true, fixed: 0, message: 'No issues found' };
    }

    // Step 2: Show details of issues
    console.log('📊 DETAILED BREAKDOWN:');
    orphanedResult.issues.slice(0, 10).forEach((orderIssue, index) => {
      console.log(`\n${index + 1}. Order: ${orderIssue.orderNumber}`);
      orderIssue.itemIssues.forEach(item => {
        console.log(`   📦 Item: ${item.itemCode}`);
        console.log(`      Allocated Cartons: ${item.allocatedCartons}`);
        console.log(`      QC Passed Cartons: ${item.qcPassedCartons}`);
        console.log(`      Available Cartons: ${item.availableCartons}`);
        if (item.containerId) {
          console.log(`      ⚠️  Has Container ID: ${item.containerId}`);
        }
      });
    });

    if (orphanedResult.totalOrders > 10) {
      console.log(`\n... and ${orphanedResult.totalOrders - 10} more orders with similar issues`);
    }

    // Step 3: Check for container references that might be invalid
    console.log('\n🔍 Checking for invalid container references...');
    const allContainers = await Container.find({}).select('_id').lean();
    const validContainerIds = new Set(allContainers.map(c => c._id.toString()));
    
    let invalidContainerRefs = 0;
    for (const orderIssue of orphanedResult.issues) {
      for (const item of orderIssue.itemIssues) {
        if (item.containerId && !validContainerIds.has(item.containerId.toString())) {
          invalidContainerRefs++;
        }
      }
    }
    
    if (invalidContainerRefs > 0) {
      console.log(`⚠️  Found ${invalidContainerRefs} items with invalid container references`);
    }

    // Step 4: Perform fixes if requested
    if (!dryRun && autoFix) {
      console.log('\n🔧 STARTING AUTO-FIX PROCESS...');
      
      const fixResult = await Order.findOrphanedAllocations({ 
        dryRun: false, 
        autoFix: true 
      });
      
      console.log(`✅ Fixed ${fixResult.fixedOrders} orders`);
      console.log(`✅ Fixed ${fixResult.fixedItems} items`);
      
      // Verify the fix
      console.log('\n🔍 Verifying fixes...');
      const verifyResult = await Order.findOrphanedAllocations({ dryRun: true });
      
      if (verifyResult.totalOrders === 0) {
        console.log('✅ All orphaned allocations successfully fixed!');
      } else {
        console.log(`⚠️  ${verifyResult.totalOrders} orders still have issues (may need manual review)`);
      }
      
      return {
        success: true,
        fixed: fixResult.fixedOrders,
        remainingIssues: verifyResult.totalOrders,
        message: `Fixed ${fixResult.fixedOrders} orders, ${fixResult.fixedItems} items`
      };
    }

    // Step 5: Generate fix recommendations
    console.log('\n💡 RECOMMENDATIONS:');
    console.log('1. Run this script with --auto-fix to automatically clear orphaned allocations');
    console.log('2. Verify container allocation workflow to prevent future orphans');
    console.log('3. Add validation to prevent allocations without valid containers');
    console.log('4. Consider implementing soft deletes for containers to maintain history');

    return {
      success: true,
      issues: orphanedResult.totalOrders,
      items: orphanedResult.totalItems,
      message: `Found ${orphanedResult.totalOrders} orders with orphaned allocations`
    };

  } catch (error) {
    console.error('❌ Fix script failed:', error);
    throw error;
  } finally {
    await mongoose.disconnect();
    console.log('\n📡 Disconnected from MongoDB');
  }
}

// Command line interface
if (require.main === module) {
  const args = process.argv.slice(2);
  const dryRun = args.includes('--dry-run') || args.length === 0;
  const autoFix = args.includes('--auto-fix');
  
  if (autoFix && dryRun) {
    console.log('❌ Cannot use --auto-fix with --dry-run. Choose one option.');
    process.exit(1);
  }
  
  fixOrphanedAllocations({ dryRun, autoFix })
    .then(result => {
      console.log(`\n🎉 Script completed: ${result.message}`);
      process.exit(0);
    })
    .catch(error => {
      console.error('💥 Script failed:', error);
      process.exit(1);
    });
}

module.exports = { fixOrphanedAllocations };