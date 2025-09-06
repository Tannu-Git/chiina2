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

async function analyzeAsdaClient() {
  try {
    console.log('🔍 Analyzing asda client (CLI-ASDA0PR)...\n');
    
    // Get all payment collections for asda
    const asdaTransactions = await PaymentCollection.find({
      clientId: 'CLI-ASDA0PR'
    }).sort({ createdAt: 1 });
    
    console.log(`Found ${asdaTransactions.length} payment collections for asda:`);
    
    let totalAmount = 0;
    let totalReceived = 0;
    let totalPending = 0;
    
    console.log('\nIndividual Payment Collections:');
    asdaTransactions.forEach((tx, index) => {
      console.log(`\n${index + 1}. Payment Collection (${tx.paymentType}):`);
      console.log(`   ID: ${tx._id}`);
      console.log(`   Description: ${tx.description}`);
      console.log(`   Order ID: ${tx.orderId || 'N/A'}`);
      console.log(`   Container ID: ${tx.containerId || 'N/A'}`);
      console.log(`   Total: ₹${tx.totalAmount}`);
      console.log(`   Received: ₹${tx.receivedAmount}`);
      console.log(`   Pending: ₹${tx.pendingAmount}`);
      console.log(`   Status: ${tx.status}`);
      console.log(`   Created: ${new Date(tx.createdAt).toLocaleString()}`);
      
      // Payment history for this collection
      console.log(`   Payment History (${tx.paymentHistory.length} entries):`);
      tx.paymentHistory.forEach((ph, phIndex) => {
        console.log(`     ${phIndex + 1}. Date: ${new Date(ph.receivedDate).toLocaleDateString()}, Amount: ₹${ph.amount}, Notes: ${ph.notes}`);
      });
      
      totalAmount += tx.totalAmount;
      totalReceived += tx.receivedAmount;
      totalPending += tx.pendingAmount;
    });
    
    console.log(`\n📊 ASDA Financial Summary:`);
    console.log(`   Total Amount Owed: ₹${totalAmount.toLocaleString('en-IN')}`);
    console.log(`   Total Received: ₹${totalReceived.toLocaleString('en-IN')}`);
    console.log(`   Net Pending: ₹${totalPending.toLocaleString('en-IN')}`);
    
    if (totalPending === 0) {
      console.log(`✅ Account is fully paid (₹0 pending)`);
    } else if (totalPending > 0) {
      console.log(`💰 asda owes you ₹${totalPending.toLocaleString('en-IN')}`);
    } else {
      console.log(`💚 You owe asda ₹${Math.abs(totalPending).toLocaleString('en-IN')} (credit balance)`);
    }
    
    // Check for specific issues
    console.log(`\n🔍 Data Quality Analysis:`);
    
    // Check for duplicate invoices for same order
    const orderTransactions = asdaTransactions.filter(tx => tx.orderId);
    const orderIds = [...new Set(orderTransactions.map(tx => tx.orderId?.toString()))];
    
    orderIds.forEach(orderId => {
      const sameOrderTxs = orderTransactions.filter(tx => tx.orderId?.toString() === orderId);
      if (sameOrderTxs.length > 1) {
        console.log(`⚠️ Multiple payment collections for same order ${orderId}:`);
        sameOrderTxs.forEach(tx => {
          console.log(`   - Collection ${tx._id}: Total=₹${tx.totalAmount}, Status=${tx.status}`);
        });
      }
    });
    
    // Check for manual transactions
    const manualTransactions = asdaTransactions.filter(tx => tx.paymentType === 'MANUAL');
    if (manualTransactions.length > 0) {
      console.log(`\n💳 Manual Transactions (${manualTransactions.length}):`);
      manualTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. ${tx.description}: Total=₹${tx.totalAmount}, Received=₹${tx.receivedAmount}, Pending=₹${tx.pendingAmount}`);
      });
    }
    
    // Check for overpayments or underpayments
    const issueTransactions = asdaTransactions.filter(tx => 
      tx.receivedAmount > tx.totalAmount || 
      (tx.totalAmount > 0 && tx.receivedAmount === 0 && tx.status === 'RECEIVED')
    );
    
    if (issueTransactions.length > 0) {
      console.log(`\n🚨 Potential Issues Found:`);
      issueTransactions.forEach((tx, index) => {
        console.log(`   ${index + 1}. Collection ${tx._id}:`);
        console.log(`      Total: ₹${tx.totalAmount}, Received: ₹${tx.receivedAmount}, Status: ${tx.status}`);
        if (tx.receivedAmount > tx.totalAmount) {
          console.log(`      Issue: Overpayment (received ₹${tx.receivedAmount - tx.totalAmount} more than owed)`);
        }
        if (tx.totalAmount > 0 && tx.receivedAmount === 0 && tx.status === 'RECEIVED') {
          console.log(`      Issue: Status mismatch (marked RECEIVED but no payment recorded)`);
        }
      });
    }
    
  } catch (error) {
    console.error('Error analyzing asda client:', error);
  }
}

async function main() {
  await analyzeAsdaClient();
  
  console.log('\n✅ Analysis complete for asda client.');
  
  mongoose.connection.close();
}

main().catch(console.error);