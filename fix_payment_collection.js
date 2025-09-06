const mongoose = require('mongoose');

async function fixPaymentCollection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('Connected to MongoDB (logistics-oms)');
    
    console.log('\n=== FIXING PAYMENT COLLECTION ===');
    
    // Get the current payment collection for CLI-APPLEFCG
    const paymentCollection = await mongoose.connection.db.collection('paymentcollections').findOne({ 
      clientId: 'CLI-APPLEFCG' 
    });
    
    if (paymentCollection) {
      console.log('🔍 Current Payment Collection:');
      console.log(`   Client: ${paymentCollection.clientName} (${paymentCollection.clientId})`);
      console.log(`   Total Amount: ₹${paymentCollection.totalAmount}`);
      console.log(`   Received Amount: ₹${paymentCollection.receivedAmount || 0}`);
      console.log(`   Pending Amount: ₹${paymentCollection.pendingAmount || paymentCollection.totalAmount - (paymentCollection.receivedAmount || 0)}`);
      
      // Get the corresponding order to check the correct total
      const order = await mongoose.connection.db.collection('orders').findOne({ 
        clientId: 'CLI-APPLEFCG' 
      });
      
      if (order) {
        const correctTotal = (order.totalAmount || 0) + (order.totalCarryingCharges || 0);
        console.log(`\n📋 Order Information:`);
        console.log(`   Order: ${order.orderNumber}`);
        console.log(`   Product Amount: ₹${order.totalAmount || 0}`);
        console.log(`   Carrying Charges: ₹${order.totalCarryingCharges || 0}`);
        console.log(`   Correct Total: ₹${correctTotal}`);
        
        // Update the payment collection with correct total
        console.log(`\n🔧 Updating Payment Collection:`);
        console.log(`   Old Total: ₹${paymentCollection.totalAmount}`);
        console.log(`   New Total: ₹${correctTotal}`);
        
        const receivedAmount = paymentCollection.receivedAmount || 0;
        const newPendingAmount = correctTotal - receivedAmount;
        
        console.log(`   Received Amount: ₹${receivedAmount} (unchanged)`);
        console.log(`   New Pending Amount: ₹${newPendingAmount}`);
        
        // Determine new status
        let newStatus;
        if (receivedAmount === 0) {
          newStatus = 'PENDING';
        } else if (receivedAmount >= correctTotal) {
          newStatus = 'RECEIVED';
        } else {
          newStatus = 'PARTIAL';
        }
        
        // Update the payment collection
        const updateResult = await mongoose.connection.db.collection('paymentcollections').updateOne(
          { _id: paymentCollection._id },
          {
            $set: {
              totalAmount: correctTotal,
              pendingAmount: newPendingAmount,
              status: newStatus
            }
          }
        );
        
        if (updateResult.modifiedCount > 0) {
          console.log('\n✅ Payment Collection Updated Successfully!');
          
          // Verify the update
          const updatedPayment = await mongoose.connection.db.collection('paymentcollections').findOne({ 
            clientId: 'CLI-APPLEFCG' 
          });
          
          console.log('\n📊 Updated Payment Collection:');
          console.log(`   Total Amount: ₹${updatedPayment.totalAmount}`);
          console.log(`   Received Amount: ₹${updatedPayment.receivedAmount || 0}`);
          console.log(`   Pending Amount: ₹${updatedPayment.pendingAmount}`);
          console.log(`   Status: ${updatedPayment.status}`);
          console.log(`   Outstanding (Total - Received): ₹${updatedPayment.totalAmount - (updatedPayment.receivedAmount || 0)}`);
          
        } else {
          console.log('❌ Failed to update payment collection');
        }
        
      } else {
        console.log('❌ No order found for CLI-APPLEFCG');
      }
      
    } else {
      console.log('❌ No payment collection found for CLI-APPLEFCG');
    }
    
  } catch (error) {
    console.error('❌ Error fixing payment collection:', error);
  } finally {
    await mongoose.connection.close();
    console.log('\n✅ Database connection closed');
  }
}

// Run the fix
fixPaymentCollection();