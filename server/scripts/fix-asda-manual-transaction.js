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

async function fixAsdaManualTransaction() {
  try {
    console.log('🔧 Fixing asda manual transaction...\n');
    
    // Find the specific manual transaction for asda with ₹99.84
    const brokenTransaction = await PaymentCollection.findOne({
      clientId: 'CLI-ASDA0PR',
      paymentType: 'MANUAL',
      totalAmount: 99.84,
      receivedAmount: 99.84,
      pendingAmount: 0
    });
    
    if (brokenTransaction) {
      console.log('Found incorrect manual transaction:');
      console.log(`   Client: ${brokenTransaction.clientName}`);
      console.log(`   Description: ${brokenTransaction.description}`);
      console.log(`   Current: Total=₹${brokenTransaction.totalAmount}, Received=₹${brokenTransaction.receivedAmount}, Pending=₹${brokenTransaction.pendingAmount}`);
      console.log(`   Status: ${brokenTransaction.status}`);
      
      console.log('\\n🔧 This should represent: You gave ₹99.84 to asda client (credit balance)');
      console.log('   Correct structure: totalAmount=₹0, receivedAmount=-₹99.84, pending=-₹99.84');
      
      // Fix the transaction structure
      const result = await PaymentCollection.updateOne(
        { _id: brokenTransaction._id },
        { 
          $set: { 
            totalAmount: 0, // No debt from client
            receivedAmount: -99.84, // Negative = you gave money to them
            pendingAmount: -99.84, // Negative = credit balance (you owe them)
            status: 'RECEIVED' // Transaction is complete
          } 
        }
      );
      
      console.log('✅ Fixed manual transaction structure!');
      console.log(`   Update result: ${result.modifiedCount} document modified`);
      
      // Update payment history to show negative amount
      await PaymentCollection.updateOne(
        { _id: brokenTransaction._id, 'paymentHistory.0': { $exists: true } },
        {
          $set: {
            'paymentHistory.0.amount': -99.84,
            'paymentHistory.0.notes': 'Manual payment given: sd (corrected)'
          }
        }
      );
      
      console.log('✅ Updated payment history to show negative amount');
      
      // Verify the fix
      const updatedTransaction = await PaymentCollection.findById(brokenTransaction._id);
      console.log('\\n📊 Verified corrected transaction:');
      console.log(`   Total: ₹${updatedTransaction.totalAmount}`);
      console.log(`   Received: ₹${updatedTransaction.receivedAmount}`);
      console.log(`   Pending: ₹${updatedTransaction.pendingAmount}`);
      console.log(`   Status: ${updatedTransaction.status}`);
      console.log(`   Payment History Amount: ₹${updatedTransaction.paymentHistory[0]?.amount}`);
      
    } else {
      console.log('No manual transaction found matching the criteria');
    }
    
    // Now check asda's overall financial state
    console.log('\\n📊 Analyzing asda overall financial state after fix...');
    
    const asdaTransactions = await PaymentCollection.find({
      clientId: 'CLI-ASDA0PR'
    }).sort({ createdAt: 1 });
    
    let totalAmount = 0;
    let totalReceived = 0;
    let totalPending = 0;
    
    console.log('\\nAsda payment collections after fix:');
    asdaTransactions.forEach((tx, index) => {
      console.log(`  ${index + 1}. ${tx.paymentType} - ${tx.description}:`);
      console.log(`     Total: ₹${tx.totalAmount}, Received: ₹${tx.receivedAmount}, Pending: ₹${tx.pendingAmount}`);
      totalAmount += tx.totalAmount;
      totalReceived += tx.receivedAmount;
      totalPending += tx.pendingAmount;
    });
    
    console.log('\\n📊 Asda aggregated financial state:');
    console.log(`   Total Amount Owed: ₹${totalAmount.toLocaleString('en-IN')}`);
    console.log(`   Total Received: ₹${totalReceived.toLocaleString('en-IN')}`);
    console.log(`   Net Pending: ₹${totalPending.toLocaleString('en-IN')}`);
    
    if (totalPending > 0) {
      console.log(`💰 asda owes you ₹${totalPending.toLocaleString('en-IN')}`);
    } else if (totalPending < 0) {
      console.log(`💚 You owe asda ₹${Math.abs(totalPending).toLocaleString('en-IN')} (CREDIT BALANCE)`);
      console.log(`   This should now show as GREEN "WE OWE CLIENT" in the UI`);
    } else {
      console.log(`✅ asda account is perfectly balanced (₹0 pending)`);
    }
    
  } catch (error) {
    console.error('Error fixing asda transaction:', error);
  }
}

async function main() {
  await fixAsdaManualTransaction();
  
  console.log('\\n✅ Fix operation complete!');
  console.log('💡 The asda client should now show a ₹99.84 credit balance (green "WE OWE CLIENT")');
  console.log('💡 Refresh the Transaction Management page to see the corrected display');
  
  mongoose.connection.close();
}

main().catch(console.error);