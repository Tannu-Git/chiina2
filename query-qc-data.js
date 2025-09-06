const mongoose = require('mongoose');

// Import models
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');

async function queryQCData() {
  try {
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to database');
    
    console.log('\n=== QC DATA FROM DATABASE ===\n');
    
    // Get all orders with QC data
    const orders = await Order.find({}).select('orderNumber clientId clientName items createdAt').lean();
    
    console.log('Total Orders Found:', orders.length);
    console.log('\n=== ORDER-LEVEL QC STATUS ===');
    
    let totalOrdersWithQC = 0;
    let totalItemsWithQC = 0;
    let totalQCPassedCartons = 0;
    let totalLoopBackCartons = 0;
    let totalPendingCartons = 0;
    let totalCartons = 0;
    
    for (const order of orders) {
      const hasQCData = order.items?.some(item => 
        (item.qcPassedCartons && item.qcPassedCartons > 0) || 
        (item.loopBackCartons && item.loopBackCartons > 0) ||
        (item.qcPassedQuantity && item.qcPassedQuantity > 0) ||
        (item.qcStatus && item.qcStatus !== 'pending')
      );
      
      if (hasQCData) {
        totalOrdersWithQC++;
        console.log(`\nOrder: ${order.orderNumber} | Client: ${order.clientName || order.clientId}`);
        
        let orderTotalCartons = 0;
        let orderQCPassed = 0;
        let orderLoopBack = 0;
        let orderPending = 0;
        
        order.items?.forEach((item, index) => {
          const cartons = item.cartons || 0;
          const qcPassed = item.qcPassedCartons || 0;
          const loopBack = item.loopBackCartons || 0;
          const pending = Math.max(0, cartons - qcPassed - loopBack);
          
          orderTotalCartons += cartons;
          orderQCPassed += qcPassed;
          orderLoopBack += loopBack;
          orderPending += pending;
          
          if (qcPassed > 0 || loopBack > 0 || (item.qcStatus && item.qcStatus !== 'pending')) {
            totalItemsWithQC++;
            console.log(`  Item ${index + 1} [${item.itemCode}]: Total: ${cartons}, QC Passed: ${qcPassed}, Loop-back: ${loopBack}, Pending: ${pending}`);
            if (item.qcStatus) console.log(`    QC Status: ${item.qcStatus}`);
            if (item.qcNotes) console.log(`    QC Notes: ${item.qcNotes}`);
            if (item.qcPassedQuantity > 0) console.log(`    QC Passed Quantity: ${item.qcPassedQuantity}/${item.quantity}`);
            if (item.loopBackReason) console.log(`    Loop-back Reason: ${item.loopBackReason}`);
            if (item.loopBackStatus && item.loopBackStatus !== 'none') console.log(`    Loop-back Status: ${item.loopBackStatus}`);
          }
        });
        
        console.log(`  Order Total - Cartons: ${orderTotalCartons}, QC Passed: ${orderQCPassed}, Loop-back: ${orderLoopBack}, Pending: ${orderPending}`);
        
        totalCartons += orderTotalCartons;
        totalQCPassedCartons += orderQCPassed;
        totalLoopBackCartons += orderLoopBack;
        totalPendingCartons += orderPending;
      }
    }
    
    console.log('\n=== QC SUMMARY STATISTICS ===');
    console.log(`Orders with QC Data: ${totalOrdersWithQC}/${orders.length}`);
    console.log(`Items with QC Activities: ${totalItemsWithQC}`);
    console.log(`Total Cartons: ${totalCartons}`);
    console.log(`QC Passed Cartons: ${totalQCPassedCartons}`);
    console.log(`Loop-back Cartons: ${totalLoopBackCartons}`);
    console.log(`Pending QC Cartons: ${totalPendingCartons}`);
    
    if (totalCartons > 0) {
      console.log(`QC Completion Rate: ${((totalQCPassedCartons / totalCartons) * 100).toFixed(1)}%`);
      console.log(`Loop-back Rate: ${((totalLoopBackCartons / totalCartons) * 100).toFixed(1)}%`);
    }
    
    // Check QC History
    console.log('\n=== QC HISTORY DETAILS ===');
    const ordersWithHistory = await Order.find({ 
      'items.qcHistory': { $exists: true, $ne: [] } 
    }).select('orderNumber clientName items.itemCode items.qcHistory').lean();
    
    if (ordersWithHistory.length > 0) {
      console.log(`Orders with QC History: ${ordersWithHistory.length}`);
      ordersWithHistory.forEach(order => {
        console.log(`\nOrder: ${order.orderNumber}`);
        order.items?.forEach(item => {
          if (item.qcHistory && item.qcHistory.length > 0) {
            console.log(`  Item [${item.itemCode}] - QC History (${item.qcHistory.length} entries):`);
            item.qcHistory.forEach((history, i) => {
              console.log(`    ${i+1}. Date: ${new Date(history.date).toLocaleDateString()}, Status: ${history.status}, Qty: ${history.receivedQuantity || 0}`);
              if (history.notes) console.log(`       Notes: ${history.notes}`);
            });
          }
        });
      });
    } else {
      console.log('No QC history records found.');
    }
    
    // Check Container QC allocation data
    console.log('\n=== CONTAINER QC ALLOCATION DATA ===');
    const containers = await Container.find({}).select('realContainerId orders').lean();
    
    if (containers.length > 0) {
      console.log(`Total Containers: ${containers.length}`);
      
      for (const container of containers) {
        if (container.orders && container.orders.length > 0) {
          console.log(`\nContainer: ${container.realContainerId}`);
          
          for (const orderRef of container.orders) {
            if (orderRef.partialAllocation && orderRef.partialAllocation.isPartial) {
              console.log(`  Order [${orderRef.orderId}]: Allocated ${orderRef.partialAllocation.allocatedCartons}/${orderRef.partialAllocation.totalCartons} cartons`);
            }
          }
        }
      }
    } else {
      console.log('No containers found.');
    }
    
    await mongoose.disconnect();
    console.log('\nDatabase connection closed.');
  } catch (error) {
    console.error('Error querying QC data:', error.message);
    console.error(error.stack);
    process.exit(1);
  }
}

queryQCData();