const mongoose = require('mongoose');
const Order = require('./server/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/logistics-oms-new');

async function checkWarehouseQC() {
  try {
    console.log('=== WAREHOUSE QC ANALYSIS ===\n');
    
    // Get orders relevant for QC
    const orders = await Order.find({
      status: { $in: ['processing', 'ready', 'partial_ready'] }
    });
    
    console.log(`Orders in QC-relevant status: ${orders.length}\n`);
    
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. ORDER: ${order.orderNumber}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   QC Status: ${order.qcStatus}`);
      console.log(`   QC Completion: ${order.qcCompletionPercentage || 0}%`);
      console.log(`   Total Received Qty: ${order.totalReceivedQuantity || 0}`);
      console.log(`   Total QC Passed Cartons: ${order.totalQcPassedCartons || 0}`);
      console.log(`   Total Loop-back Cartons: ${order.totalLoopBackCartons || 0}`);
      console.log(`   Total Pending Cartons: ${order.totalPendingCartons || 0}`);
      
      if (order.qcInspector) {
        console.log(`   QC Inspector: ${order.qcInspector}`);
      }
      if (order.qcCompletedAt) {
        console.log(`   QC Completed At: ${order.qcCompletedAt}`);
      }
      
      console.log(`\n   ITEMS ANALYSIS (${order.items.length} items):`);
      order.items.forEach((item, itemIndex) => {
        console.log(`     Item ${itemIndex + 1}: ${item.description}`);
        console.log(`       Item Code: ${item.itemCode}`);
        console.log(`       Original Qty: ${item.quantity}`);
        console.log(`       Original Cartons: ${item.cartons}`);
        console.log(`       Received Qty: ${item.receivedQuantity || 0}`);
        console.log(`       QC Passed Qty: ${item.qcPassedQuantity || 0}`);
        console.log(`       QC Passed Cartons: ${item.qcPassedCartons || 0}`);
        console.log(`       Loop-back Qty: ${item.loopBackQuantity || 0}`);
        console.log(`       Loop-back Cartons: ${item.loopBackCartons || 0}`);
        console.log(`       Allocated Qty: ${item.allocatedQuantity || 0}`);
        console.log(`       Allocated Cartons: ${item.allocatedCartons || 0}`);
        console.log(`       Pending Qty: ${item.pendingQuantity || 0}`);
        console.log(`       Pending Cartons: ${item.pendingCartons || 0}`);
        console.log(`       QC Status: ${item.qcStatus || 'N/A'}`);
        console.log(`       Loop-back Status: ${item.loopBackStatus || 'N/A'}`);
        console.log(`       Loop-back Reason: ${item.loopBackReason || 'N/A'}`);
        
        if (item.qcDefects && item.qcDefects.length > 0) {
          console.log(`       QC Defects: ${item.qcDefects.length}`);
          item.qcDefects.forEach((defect, defectIndex) => {
            console.log(`         Defect ${defectIndex + 1}: ${defect.type} - ${defect.description}`);
          });
        }
        
        if (item.qcHistory && item.qcHistory.length > 0) {
          console.log(`       QC History: ${item.qcHistory.length} entries`);
        }
        
        console.log(''); // Empty line for readability
      });
    });
    
    // Analyze QC statistics
    console.log('\n=== QC STATISTICS ===');
    
    const qcStats = {
      totalItems: 0,
      pendingQC: 0,
      partialQC: 0,
      completedQC: 0,
      loopBackItems: 0,
      allocatedItems: 0
    };
    
    orders.forEach(order => {
      order.items.forEach(item => {
        qcStats.totalItems++;
        
        switch(item.qcStatus) {
          case 'pending':
            qcStats.pendingQC++;
            break;
          case 'partial':
            qcStats.partialQC++;
            break;
          case 'completed':
            qcStats.completedQC++;
            break;
        }
        
        if (item.loopBackQuantity > 0) {
          qcStats.loopBackItems++;
        }
        
        if (item.allocatedQuantity > 0) {
          qcStats.allocatedItems++;
        }
      });
    });
    
    console.log(`Total Items: ${qcStats.totalItems}`);
    console.log(`Pending QC: ${qcStats.pendingQC}`);
    console.log(`Partial QC: ${qcStats.partialQC}`);
    console.log(`Completed QC: ${qcStats.completedQC}`);
    console.log(`Items with Loop-back: ${qcStats.loopBackItems}`);
    console.log(`Items with Allocation: ${qcStats.allocatedItems}`);
    
    // Check for potential QC issues
    console.log('\n=== POTENTIAL QC ISSUES ===');
    
    let issuesFound = 0;
    
    orders.forEach(order => {
      order.items.forEach(item => {
        // Check for inconsistent quantities
        const totalProcessed = (item.qcPassedQuantity || 0) + (item.loopBackQuantity || 0);
        if (totalProcessed > (item.receivedQuantity || 0)) {
          console.log(`⚠️  ${order.orderNumber} - ${item.itemCode}: Processed qty (${totalProcessed}) > Received qty (${item.receivedQuantity})`);
          issuesFound++;
        }
        
        // Check for missing QC status
        if (!item.qcStatus && (item.receivedQuantity > 0)) {
          console.log(`⚠️  ${order.orderNumber} - ${item.itemCode}: No QC status but has received quantity`);
          issuesFound++;
        }
        
        // Check for inconsistent carton calculations
        const totalCartons = (item.qcPassedCartons || 0) + (item.loopBackCartons || 0);
        if (totalCartons > (item.cartons || 0)) {
          console.log(`⚠️  ${order.orderNumber} - ${item.itemCode}: Processed cartons (${totalCartons}) > Original cartons (${item.cartons})`);
          issuesFound++;
        }
        
        // Check for loop-back without reason
        if ((item.loopBackQuantity > 0) && !item.loopBackReason) {
          console.log(`⚠️  ${order.orderNumber} - ${item.itemCode}: Loop-back quantity without reason`);
          issuesFound++;
        }
      });
    });
    
    if (issuesFound === 0) {
      console.log('✅ No QC issues detected');
    } else {
      console.log(`🔍 Found ${issuesFound} potential issues`);
    }
    
    console.log('\n=== QC ANALYSIS COMPLETE ===');
    
  } catch (error) {
    console.error('Error checking warehouse QC:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkWarehouseQC();