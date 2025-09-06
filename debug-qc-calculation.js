const { MongoClient } = require('mongodb');

async function debugQCCalculation() {
  const client = new MongoClient('mongodb://localhost:27017');
  
  try {
    await client.connect();
    const db = client.db('logistics-oms');
    
    console.log('=== QC CALCULATION DEBUG ===\n');
    
    const ObjectId = require('mongodb').ObjectId;
    const containerId = new ObjectId('68bc04ed88c85587b92127a0');
    const container = await db.collection('containers').findOne({ _id: containerId });
    
    if (container && container.orders) {
      for (const orderRef of container.orders) {
        const order = await db.collection('orders').findOne({ _id: orderRef.orderId });
        
        if (order && order.orderNumber === 'ORD-000001') {
          console.log('ORDER ORD-000001 DEBUG:');
          
          order.items.forEach((item, idx) => {
            if (item.itemCode === 'Item 001') {
              console.log('\nItem 001 Debug Values:');
              console.log('  qcPassedCartons:', item.qcPassedCartons || 0);
              console.log('  allocatedCartons:', item.allocatedCartons || 0);
              console.log('  cartons (current container):', item.cartons || 0);
              
              console.log('\nCurrent Problematic Calculation:');
              const qcPassed = item.qcPassedCartons || 0;
              const allocated = item.allocatedCartons || 0;
              const currentAllocation = item.cartons || 0;
              const wrongMax = Math.max(0, qcPassed - (allocated - currentAllocation));
              
              console.log(`  maxAvailable = Math.max(0, ${qcPassed} - (${allocated} - ${currentAllocation}))`);
              console.log(`  maxAvailable = Math.max(0, ${qcPassed} - ${allocated - currentAllocation})`);
              console.log(`  maxAvailable = Math.max(0, ${qcPassed - (allocated - currentAllocation)})`);
              console.log(`  maxAvailable = ${wrongMax} ❌ WRONG`);
              
              console.log('\nCorrect Calculation Should Be:');
              const alreadyAllocatedElsewhere = Math.max(0, allocated - currentAllocation);
              const correctMax = Math.max(0, qcPassed - alreadyAllocatedElsewhere);
              
              console.log(`  alreadyAllocatedElsewhere = Math.max(0, ${allocated} - ${currentAllocation}) = ${alreadyAllocatedElsewhere}`);
              console.log(`  maxAvailable = Math.max(0, ${qcPassed} - ${alreadyAllocatedElsewhere}) = ${correctMax} ✅ CORRECT`);
              
              console.log('\n=== EXPLANATION ===');
              console.log('The issue is in the original calculation:');
              console.log(`- QC Passed: ${qcPassed} cartons`);
              console.log(`- Total Allocated: ${allocated} cartons`);
              console.log(`- Current Container: ${currentAllocation} cartons`);
              console.log(`- Already allocated elsewhere: ${alreadyAllocatedElsewhere} cartons`);
              console.log(`- Available for editing in this container: ${correctMax} cartons`);
              
              if (wrongMax !== correctMax) {
                console.log(`\n❌ BUG: Original calculation gives ${wrongMax}, but should be ${correctMax}`);
              }
            }
          });
        }
      }
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  } finally {
    await client.close();
  }
}

debugQCCalculation();