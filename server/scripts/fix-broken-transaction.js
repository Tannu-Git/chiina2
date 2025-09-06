const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB
mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');

// Payment Collection Schema (matching the main file)
const paymentCollectionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  clientName: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  containerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: false },
  totalAmount: { type: Number, required: true },
  receivedAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: function() { return this.totalAmount - this.receivedAmount; } },
  paymentType: { type: String, enum: ['THROUGH_ME', 'CLIENT_DIRECT', 'MANUAL'], required: true },
  description: { type: String, default: 'Payment collection' },
  notes: { type: String },
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'RECEIVED'], default: 'PENDING' },
  paymentHistory: [{
    amount: Number,
    receivedDate: { type: Date, default: Date.now },
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const PaymentCollection = mongoose.model('PaymentCollection', paymentCollectionSchema);

async function fixBrokenManualTransaction() {
  try {
    console.log('🔧 Fixing broken manual transaction...');
    
    // Find the specific broken transaction for Apple with description "sad"
    const brokenTransaction = await PaymentCollection.findOne({
      clientId: 'CLI-APPLEFCG',
      clientName: 'Apple',
      description: 'sad',
      totalAmount: 0,
      receivedAmount: 0,
      pendingAmount: 0,
      paymentType: 'MANUAL'
    });
    
    if (brokenTransaction) {
      console.log('Found broken transaction:');
      console.log(`   Client: ${brokenTransaction.clientName}`);
      console.log(`   Description: ${brokenTransaction.description}`);
      console.log(`   Current: Total=${brokenTransaction.totalAmount}, Received=${brokenTransaction.receivedAmount}, Pending=${brokenTransaction.pendingAmount}`);
      
      if (brokenTransaction.paymentHistory.length > 0) {
        const historyAmount = brokenTransaction.paymentHistory[0].amount;
        console.log(`   Payment History Amount: ${historyAmount}`);
        
        if (historyAmount < 0) {
          const absoluteAmount = Math.abs(historyAmount);
          console.log(`This was a PAYMENT_GIVEN transaction (you gave ${absoluteAmount} to client)`);
          console.log(`Correct structure should be: totalAmount=${absoluteAmount}, receivedAmount=0, pending=${absoluteAmount}`);
          
          // Fix the transaction
          brokenTransaction.totalAmount = absoluteAmount;
          brokenTransaction.receivedAmount = 0;
          // Manually set pendingAmount since pre-save might not persist it correctly
          brokenTransaction.pendingAmount = absoluteAmount;
          
          await brokenTransaction.save();
          
          console.log(`✅ Transaction fixed!`);
          console.log(`   New: Total=${brokenTransaction.totalAmount}, Received=${brokenTransaction.receivedAmount}, Pending=${brokenTransaction.pendingAmount}`);
          console.log(`The ${absoluteAmount} you gave to Apple should now properly show as money they owe back to you.`);
        }
      }
    } else {
      console.log('No broken transaction found matching the criteria.');
    }
    
    // Now analyze the overall state for Apple
    console.log('Analyzing Apple overall financial state after fix...');
    
    const appleTransactions = await PaymentCollection.find({
      clientId: 'CLI-APPLEFCG'
    }).sort({ createdAt: 1 });
    
    let totalAmount = 0;
    let totalReceived = 0;
    let totalPending = 0;
    
    console.log('Apple individual transactions:');
    appleTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.description}: Total=${tx.totalAmount}, Received=${tx.receivedAmount}, Pending=${tx.pendingAmount}`);
      totalAmount += tx.totalAmount;
      totalReceived += tx.receivedAmount;
      totalPending += tx.pendingAmount;
    });
    
    console.log('Apple aggregated state:');
    console.log(`   Total Owed: ${totalAmount}`);
    console.log(`   Total Received: ${totalReceived}`);
    console.log(`   Net Pending: ${totalPending}`);
    
    if (totalPending > 0) {
      console.log(`💰 Apple owes you ${totalPending}`);
    } else if (totalPending < 0) {
      console.log(`💚 You owe Apple ${Math.abs(totalPending)} (credit balance)`);
    } else {
      console.log(`⚖️  Apple account is balanced (0 pending)`);
    }
    
  } catch (error) {
    console.error('Error fixing transaction:', error);
  }
}

async function main() {
  await fixBrokenManualTransaction();
  
  console.log('✅ Fix operation complete!');
  console.log('💡 The manual transaction should now work correctly.');
  console.log('💡 Try refreshing your financial dashboard to see the corrected amounts.');
  
  mongoose.connection.close();
}

main().catch(console.error);