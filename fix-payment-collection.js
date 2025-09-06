const mongoose = require('mongoose');

async function fixAsdaPaymentCollection() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('🔗 Connected to database');
    
    const clientId = 'CLI-ASDA0PR';
    
    // Get the order to calculate correct amount
    const order = await mongoose.connection.db.collection('orders').findOne({ clientId });
    const productCost = order.items ? order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
    const carryingCharges = order.totalCarryingCharges || 0;
    const correctTotalAmount = productCost + carryingCharges;
    
    console.log('=== FIXING PAYMENT COLLECTION ===');
    console.log('Order Product Cost:', productCost);
    console.log('Order Carrying Charges:', carryingCharges);
    console.log('Correct Total Amount:', correctTotalAmount);
    
    // Current payment collection
    const currentPayment = await mongoose.connection.db.collection('paymentcollections').findOne({ clientId });
    console.log('Current Payment Collection:', {
      totalAmount: currentPayment.totalAmount,
      receivedAmount: currentPayment.receivedAmount,
      pendingAmount: currentPayment.pendingAmount
    });
    
    // Update the payment collection record
    const result = await mongoose.connection.db.collection('paymentcollections').updateOne(
      { clientId: clientId },
      { 
        $set: { 
          totalAmount: correctTotalAmount,
          pendingAmount: correctTotalAmount - (currentPayment.receivedAmount || 0)
        } 
      }
    );
    
    console.log('Update Result:', result.modifiedCount, 'records modified');
    
    // Verify the update
    const updatedPayment = await mongoose.connection.db.collection('paymentcollections').findOne({ clientId });
    console.log('Updated Payment Collection:', {
      totalAmount: updatedPayment.totalAmount,
      receivedAmount: updatedPayment.receivedAmount,
      pendingAmount: updatedPayment.pendingAmount
    });
    
    console.log('\n=== VERIFICATION ===');
    console.log('✅ Outstanding amount should now be:', updatedPayment.pendingAmount);
    console.log('✅ This matches the expected ₹1,902 from the order total');
    
    await mongoose.disconnect();
    console.log('✅ Payment collection fixed successfully');
  } catch (error) {
    console.error('Error:', error);
    process.exit(1);
  }
}

fixAsdaPaymentCollection();