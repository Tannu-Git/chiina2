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

async function analyzeManualTransactions() {
  try {
    console.log('🔍 Analyzing manual transactions...\n');
    
    // Get all manual transactions
    const manualTransactions = await PaymentCollection.find({
      paymentType: 'MANUAL'
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${manualTransactions.length} manual transactions:`);
    
    // Group by client
    const clientTransactions = {};
    
    manualTransactions.forEach(transaction => {
      const clientId = transaction.clientId;
      if (!clientTransactions[clientId]) {
        clientTransactions[clientId] = {
          clientName: transaction.clientName,
          transactions: [],
          totalAmount: 0,
          totalReceived: 0,
          totalPending: 0
        };
      }
      
      clientTransactions[clientId].transactions.push(transaction);
      clientTransactions[clientId].totalAmount += transaction.totalAmount;
      clientTransactions[clientId].totalReceived += transaction.receivedAmount;
      clientTransactions[clientId].totalPending += transaction.pendingAmount;
    });
    
    // Analyze each client
    for (const [clientId, client] of Object.entries(clientTransactions)) {
      console.log(`\n📊 Client: ${client.clientName} (${clientId})`);
      console.log(`   Total Transactions: ${client.transactions.length}`);
      console.log(`   Aggregated Total: ₹${client.totalAmount.toLocaleString('en-IN')}`);
      console.log(`   Aggregated Received: ₹${client.totalReceived.toLocaleString('en-IN')}`);
      console.log(`   Aggregated Pending: ₹${client.totalPending.toLocaleString('en-IN')}`);
      
      console.log(`   Individual Transactions:`);
      client.transactions.forEach((tx, index) => {
        console.log(`     ${index + 1}. Total: ₹${tx.totalAmount}, Received: ₹${tx.receivedAmount}, Pending: ₹${tx.pendingAmount}`);
        console.log(`        Description: ${tx.description || 'N/A'}`);
        console.log(`        Payment History: ${tx.paymentHistory.length} entries`);
        tx.paymentHistory.forEach((ph, phIndex) => {
          console.log(`          ${phIndex + 1}. Amount: ₹${ph.amount}, Notes: ${ph.notes}`);
        });
      });
      
      // Check for potential issues
      if (client.transactions.length > 1) {
        console.log(`   ⚠️  Multiple manual transactions for same client - may cause aggregation issues`);
      }
      
      if (Math.abs(client.totalPending) < 1 && client.transactions.length > 1) {
        console.log(`   🔴 Transactions appear to cancel each other out (near-zero pending)`);
      }
    }
    
  } catch (error) {
    console.error('Error analyzing transactions:', error);
  }
}

async function fixManualTransactions() {
  try {
    console.log('\n🔧 Starting manual transaction fix...\n');
    
    // Get all manual transactions that might be problematic
    const problematicTransactions = await PaymentCollection.find({
      paymentType: 'MANUAL',
      $or: [
        { totalAmount: 0, receivedAmount: { $lt: 0 } }, // Old buggy "PAYMENT_GIVEN" structure
        { totalAmount: { $gt: 0 }, receivedAmount: 0, pendingAmount: { $gt: 0 } } // Possible incorrect structures
      ]
    });
    
    console.log(`Found ${problematicTransactions.length} potentially problematic transactions:`);
    
    for (const transaction of problematicTransactions) {
      console.log(`\n📝 Checking transaction for ${transaction.clientName}:`);
      console.log(`   Current: Total=₹${transaction.totalAmount}, Received=₹${transaction.receivedAmount}, Pending=₹${transaction.pendingAmount}`);
      
      // Check payment history to understand intent
      if (transaction.paymentHistory.length > 0) {
        const historyAmount = transaction.paymentHistory[0].amount;
        console.log(`   Payment History Amount: ₹${historyAmount}`);
        
        if (historyAmount < 0 && transaction.totalAmount === 0 && transaction.receivedAmount < 0) {
          console.log(`   🔴 Detected old buggy PAYMENT_GIVEN structure`);
          console.log(`   💡 This should be: You gave ₹${Math.abs(historyAmount)} to client`);
          console.log(`   💡 Correct structure: totalAmount=${Math.abs(historyAmount)}, receivedAmount=0, pending=${Math.abs(historyAmount)}`);
          
          // Ask user if they want to fix this
          console.log(`   ⚠️  To fix: Set totalAmount=${Math.abs(historyAmount)}, receivedAmount=0`);
        }
      }
    }
    
  } catch (error) {
    console.error('Error fixing transactions:', error);
  }
}

// Run the analysis
async function main() {
  await analyzeManualTransactions();
  await fixManualTransactions();
  
  console.log('\n✅ Analysis complete. Check the output above for issues.');
  console.log('\n💡 If you see transactions cancelling each other out, the fix has been applied to new transactions.');
  console.log('💡 Existing problematic transactions may need manual database correction.');
  
  mongoose.connection.close();
}

main().catch(console.error);