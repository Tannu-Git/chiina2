const mongoose = require('mongoose');

/**
 * FINANCIAL DATA CORRUPTION REPAIR UTILITY
 * 
 * This script fixes:
 * 1. Negative pending amounts (overpayments)
 * 2. Orphaned payment collections (no orders/containers)
 * 3. Invalid calculation states
 * 4. Data integrity issues
 */

async function fixCorruptedPayments() {
  try {
    console.log('🔧 STARTING FINANCIAL DATA CORRUPTION REPAIR...\n');
    
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB (logistics-oms)\n');
    
    const db = mongoose.connection.db;
    
    // Get all payment collections
    const paymentCollections = await db.collection('paymentcollections').find({}).toArray();
    console.log(`📊 Found ${paymentCollections.length} payment collection records\n`);
    
    if (paymentCollections.length === 0) {
      console.log('ℹ️ No payment collections found to fix');
      return;
    }
    
    let fixedRecords = 0;
    let negativeBalancesFixed = 0;
    let orphanedRecordsFixed = 0;
    let calculationIssuesFixed = 0;
    
    console.log('🔍 ANALYZING AND FIXING PAYMENT RECORDS:\n');
    
    for (const payment of paymentCollections) {
      const originalPending = payment.pendingAmount;
      const originalReceived = payment.receivedAmount;
      const originalTotal = payment.totalAmount;
      
      console.log(`📝 Processing: ${payment.clientName} (${payment.clientId})`);
      console.log(`   Current: Total=₹${originalTotal}, Received=₹${originalReceived}, Pending=₹${originalPending}`);
      
      let needsUpdate = false;
      const updates = {};
      const issues = [];
      
      // 1. Fix negative amounts and invalid calculations
      const safeTotal = Math.max(0, originalTotal || 0);
      const safeReceived = Math.max(0, originalReceived || 0);
      const calculatedPending = safeTotal - safeReceived;
      
      if (originalTotal !== safeTotal || originalReceived !== safeReceived) {
        issues.push('Invalid negative amounts');
        updates.totalAmount = safeTotal;
        updates.receivedAmount = safeReceived;
        calculationIssuesFixed++;
        needsUpdate = true;
      }
      
      // 2. Fix negative pending amounts (overpayments)
      if (originalPending < 0) {
        issues.push(`Negative balance: ₹${originalPending}`);
        
        // Cap received amount to total to prevent negative pending
        const correctedReceived = Math.min(safeReceived, safeTotal);
        const correctedPending = Math.max(0, safeTotal - correctedReceived);
        
        updates.receivedAmount = correctedReceived;
        updates.pendingAmount = correctedPending;
        
        // Add correction note to payment history
        const correctionNote = {
          amount: -(safeReceived - correctedReceived), // Negative for overpayment adjustment
          receivedDate: new Date(),
          notes: `SYSTEM: Overpayment correction - adjusted from ₹${originalPending} to ₹${correctedPending}`,
          recordedBy: null
        };
        
        if (!payment.paymentHistory) {
          updates.paymentHistory = [correctionNote];
        } else {
          updates.paymentHistory = [...payment.paymentHistory, correctionNote];
        }
        
        negativeBalancesFixed++;
        needsUpdate = true;
      } else if (originalPending !== calculatedPending) {
        // Fix calculation mismatches
        issues.push('Calculation mismatch');
        updates.pendingAmount = calculatedPending;
        calculationIssuesFixed++;
        needsUpdate = true;
      }
      
      // 3. Fix status based on corrected amounts
      const finalTotal = updates.totalAmount || originalTotal;
      const finalReceived = updates.receivedAmount || originalReceived;
      const finalPending = updates.pendingAmount || calculatedPending;
      
      let correctStatus;
      if (finalReceived === 0) {
        correctStatus = 'PENDING';
      } else if (finalReceived >= finalTotal) {
        correctStatus = 'RECEIVED';
      } else {
        correctStatus = 'PARTIAL';
      }
      
      if (payment.status !== correctStatus) {
        issues.push(`Status mismatch: ${payment.status} → ${correctStatus}`);
        updates.status = correctStatus;
        needsUpdate = true;
      }
      
      // 4. Handle orphaned records (no order/container references)
      if (!payment.orderId && !payment.containerId && payment.paymentType !== 'MANUAL') {
        issues.push('Orphaned record (no order/container)');
        updates.paymentType = 'MANUAL'; // Convert to manual payment
        updates.description = (payment.description || 'Payment collection') + ' [Auto-converted from orphaned record]';
        orphanedRecordsFixed++;
        needsUpdate = true;
      }
      
      // Apply fixes if needed
      if (needsUpdate) {
        console.log(`   🔧 FIXING Issues: ${issues.join(', ')}`);
        
        const updateResult = await db.collection('paymentcollections').updateOne(
          { _id: payment._id },
          { $set: updates }
        );
        
        if (updateResult.modifiedCount > 0) {
          fixedRecords++;
          console.log(`   ✅ FIXED Successfully`);
          
          // Log the changes
          if (updates.totalAmount !== undefined) console.log(`      Total: ₹${originalTotal} → ₹${updates.totalAmount}`);
          if (updates.receivedAmount !== undefined) console.log(`      Received: ₹${originalReceived} → ₹${updates.receivedAmount}`);
          if (updates.pendingAmount !== undefined) console.log(`      Pending: ₹${originalPending} → ₹${updates.pendingAmount}`);
          if (updates.status !== undefined) console.log(`      Status: ${payment.status} → ₹{updates.status}`);
        } else {
          console.log(`   ❌ FAILED to update`);
        }
      } else {
        console.log(`   ✅ No issues found - record is healthy`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    // Summary report
    console.log('📋 REPAIR SUMMARY:');
    console.log('==================');
    console.log(`Total records processed: ${paymentCollections.length}`);
    console.log(`Records fixed: ${fixedRecords}`);
    console.log(`Negative balances corrected: ${negativeBalancesFixed}`);
    console.log(`Orphaned records fixed: ${orphanedRecordsFixed}`);
    console.log(`Calculation issues resolved: ${calculationIssuesFixed}`);
    console.log(`Records already healthy: ${paymentCollections.length - fixedRecords}`);
    
    // Verify the fixes
    console.log('\n🔍 VERIFICATION - Checking corrected data:');
    const verificationPayments = await db.collection('paymentcollections').find({}).toArray();
    
    let healthyRecords = 0;
    let stillCorrupted = 0;
    
    for (const payment of verificationPayments) {
      const hasNegativePending = payment.pendingAmount < 0;
      const hasNegativeAmounts = payment.totalAmount < 0 || payment.receivedAmount < 0;
      const hasCalculationError = Math.abs((payment.totalAmount - payment.receivedAmount) - payment.pendingAmount) > 0.01;
      
      if (hasNegativePending || hasNegativeAmounts || hasCalculationError) {
        stillCorrupted++;
        console.log(`❌ Still corrupted: ${payment.clientName} - Pending: ₹${payment.pendingAmount}`);
      } else {
        healthyRecords++;
      }
    }
    
    console.log(`\n📊 FINAL STATUS:`);
    console.log(`   Healthy records: ${healthyRecords}`);
    console.log(`   Still corrupted: ${stillCorrupted}`);
    console.log(`   System health: ${stillCorrupted === 0 ? '✅ HEALTHY' : '⚠️ ISSUES REMAIN'}`);
    
    if (stillCorrupted === 0) {
      console.log('\n🎉 ALL FINANCIAL DATA CORRUPTION SUCCESSFULLY REPAIRED!');
      console.log('💼 The system is now in a healthy state for financial operations.');
    } else {
      console.log('\n⚠️ Some issues remain and may require manual intervention.');
    }
    
  } catch (error) {
    console.error('❌ Error during repair:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the repair
fixCorruptedPayments().then(() => {
  console.log('\n🏁 Repair process completed');
  process.exit(0);
});