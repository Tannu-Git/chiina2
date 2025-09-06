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

async function fixPendingAmountDirectly() {
  try {
    console.log('🔧 Fixing pending amount directly...');
    
    // Find the specific transaction with totalAmount=899.8, receivedAmount=0, but pendingAmount=0
    const brokenTransaction = await PaymentCollection.findOne({
      clientId: 'CLI-APPLEFCG',
      description: 'sad',
      totalAmount: 899.8,
      receivedAmount: 0,
      pendingAmount: 0,
      paymentType: 'MANUAL'
    });
    
    if (brokenTransaction) {
      console.log('Found transaction with incorrect pending amount:');
      console.log(`   Client: ${brokenTransaction.clientName}`);
      console.log(`   Description: ${brokenTransaction.description}`);
      console.log(`   Current: Total=${brokenTransaction.totalAmount}, Received=${brokenTransaction.receivedAmount}, Pending=${brokenTransaction.pendingAmount}`);
      
      // Directly update the pending amount using MongoDB update
      const result = await PaymentCollection.updateOne(
        { _id: brokenTransaction._id },
        { 
          $set: { 
            pendingAmount: 899.8,
            status: 'PENDING' // Since there's money owed
          } 
        }
      );
      
      console.log('✅ Updated pending amount directly!');
      console.log(`   Update result: ${result.modifiedCount} document modified`);
      
      // Verify the fix
      const updatedTransaction = await PaymentCollection.findById(brokenTransaction._id);
      console.log(`   Verified: Total=${updatedTransaction.totalAmount}, Received=${updatedTransaction.receivedAmount}, Pending=${updatedTransaction.pendingAmount}`);
      
    } else {
      console.log('No transaction found with the specific criteria');
      
      // List all Apple transactions to debug
      const appleTransactions = await PaymentCollection.find({
        clientId: 'CLI-APPLEFCG'
      }).sort({ createdAt: 1 });
      
      console.log('All Apple transactions:');
      appleTransactions.forEach((tx, index) => {
        console.log(`  ${index + 1}. ${tx.description}: Total=${tx.totalAmount}, Received=${tx.receivedAmount}, Pending=${tx.pendingAmount}`);
      });
    }
    
  } catch (error) {
    console.error('Error fixing transaction:', error);
  }
}

async function main() {
  await fixPendingAmountDirectly();
  
  console.log('✅ Direct fix operation complete!');
  
  mongoose.connection.close();
}

main().catch(console.error);