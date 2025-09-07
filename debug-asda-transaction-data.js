const mongoose = require('mongoose');
const Container = require('./server/models/Container');
const Order = require('./server/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/logistics-oms');

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

async function debugAsdaTransactionData() {
  try {
    console.log('🔍 DEBUGGING ASDA CLIENT TRANSACTION DATA\n');
    const clientId = 'CLI-ASDA0PR';
    
    // Step 1: Check Orders
    console.log('1️⃣ ORDERS DATA:');
    const orders = await Order.find({ 
      clientId,
      isLoopBack: { $ne: true },
      status: { $ne: 'cancelled' }
    }).populate('containerId', 'realContainerId clientFacingId').sort({ createdAt: 1 });
    
    console.log(`   Found ${orders.length} orders for ${clientId}`);
    let totalOrderAmount = 0;
    
    orders.forEach((order, index) => {
      console.log(`\n   Order ${index + 1}: ${order.orderNumber}`);
      console.log(`     Order ID: ${order._id}`);
      console.log(`     Container: ${order.containerId?.realContainerId || 'Not allocated'}`);
      console.log(`     Status: ${order.status}`);
      
      // Calculate product cost from items
      const productCost = order.items ? 
        order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
      const carryingCharges = order.totalCarryingCharges || 0;
      const orderTotal = productCost + carryingCharges;
      
      console.log(`     Product Cost: ₹${productCost.toLocaleString('en-IN')}`);
      console.log(`     Carrying Charges: ₹${carryingCharges.toLocaleString('en-IN')}`);
      console.log(`     Total Amount: ₹${orderTotal.toLocaleString('en-IN')}`);
      
      if (order.items && order.items.length > 0) {
        console.log(`     Items (${order.items.length}):`);
        order.items.forEach((item, i) => {
          console.log(`       ${i + 1}. ${item.description || 'Unnamed Item'} - ₹${(item.totalPrice || 0).toLocaleString('en-IN')}`);
        });
      }
      
      totalOrderAmount += orderTotal;
    });
    
    console.log(`\n   📊 TOTAL FROM ORDERS: ₹${totalOrderAmount.toLocaleString('en-IN')}`);
    
    // Step 2: Check Payment Collections
    console.log('\n\n2️⃣ PAYMENT COLLECTIONS DATA:');
    const paymentCollections = await PaymentCollection.find({ clientId }).sort({ createdAt: 1 });
    
    console.log(`   Found ${paymentCollections.length} payment collections for ${clientId}`);
    let totalReceived = 0;
    let totalPending = 0;
    
    paymentCollections.forEach((payment, index) => {
      console.log(`\n   Payment Collection ${index + 1}:`);
      console.log(`     ID: ${payment._id}`);
      console.log(`     Type: ${payment.paymentType}`);
      console.log(`     Description: ${payment.description}`);
      console.log(`     Total Amount: ₹${(payment.totalAmount || 0).toLocaleString('en-IN')}`);
      console.log(`     Received Amount: ₹${(payment.receivedAmount || 0).toLocaleString('en-IN')}`);
      console.log(`     Pending Amount: ₹${(payment.pendingAmount || 0).toLocaleString('en-IN')}`);
      console.log(`     Status: ${payment.status}`);
      console.log(`     Order ID: ${payment.orderId || 'N/A'}`);
      console.log(`     Container ID: ${payment.containerId || 'N/A'}`);
      console.log(`     Created At: ${payment.createdAt}`);
      
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        console.log(`     Payment History (${payment.paymentHistory.length} entries):`);
        payment.paymentHistory.forEach((history, i) => {
          console.log(`       ${i + 1}. Amount: ₹${(history.amount || 0).toLocaleString('en-IN')}, Date: ${history.receivedDate || 'N/A'}, Notes: ${history.notes || 'None'}`);
        });
      }
      
      totalReceived += (payment.receivedAmount || 0);
      totalPending += (payment.pendingAmount || 0);
    });
    
    console.log(`\n   📊 TOTAL RECEIVED: ₹${totalReceived.toLocaleString('en-IN')}`);
    console.log(`   📊 TOTAL PENDING: ₹${totalPending.toLocaleString('en-IN')}`);
    
    // Step 3: Cross-Check Calculation
    console.log('\n\n3️⃣ CALCULATION VERIFICATION:');
    console.log(`   Orders Total: ₹${totalOrderAmount.toLocaleString('en-IN')}`);
    console.log(`   Payments Received: ₹${totalReceived.toLocaleString('en-IN')}`);
    console.log(`   Expected Balance: ₹${(totalOrderAmount - totalReceived).toLocaleString('en-IN')}`);
    console.log(`   Payment Collections Pending: ₹${totalPending.toLocaleString('en-IN')}`);
    
    // Step 4: Transaction History Simulation (Matching API Logic)
    console.log('\n\n4️⃣ TRANSACTION HISTORY SIMULATION:');
    const paymentRecords = [];
    let runningBalance = 0;
    
    // Add orders chronologically
    orders.forEach(order => {
      const productCost = order.items ? 
        order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0) : 0;
      const carryingCharges = order.totalCarryingCharges || 0;
      const totalOrderAmount = productCost + carryingCharges;
      
      runningBalance += totalOrderAmount;
      
      paymentRecords.push({
        date: order.createdAt,
        type: 'INVOICE',
        reference: order.orderNumber,
        debit: totalOrderAmount,
        credit: 0,
        balance: runningBalance
      });
    });
    
    // Add payments chronologically
    paymentCollections.forEach(payment => {
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        payment.paymentHistory.forEach(history => {
          runningBalance -= history.amount;
          paymentRecords.push({
            date: history.receivedDate,
            type: 'PAYMENT',
            reference: `Payment #${payment._id.toString().slice(-6)}`,
            debit: 0,
            credit: history.amount,
            balance: runningBalance
          });
        });
      } else if (payment.receivedAmount > 0) {
        runningBalance -= payment.receivedAmount;
        paymentRecords.push({
          date: payment.createdAt,
          type: 'PAYMENT',
          reference: `Payment #${payment._id.toString().slice(-6)}`,
          debit: 0,
          credit: payment.receivedAmount,
          balance: runningBalance
        });
      }
    });
    
    // Sort chronologically
    paymentRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    // Recalculate running balance
    let recalculatedBalance = 0;
    paymentRecords.forEach(record => {
      recalculatedBalance += (record.debit || 0) - (record.credit || 0);
      record.balance = recalculatedBalance;
    });
    
    console.log('   Transaction History (Chronological):');
    console.log('   Date\t\t\tType\t\tReference\t\tDebit\t\tCredit\t\tBalance');
    console.log('   ' + '='.repeat(100));
    
    paymentRecords.forEach(record => {
      const date = new Date(record.date).toLocaleDateString();
      const debit = record.debit > 0 ? `+₹${record.debit.toLocaleString('en-IN')}` : '—';
      const credit = record.credit > 0 ? `-₹${record.credit.toLocaleString('en-IN')}` : '—';
      const balance = `₹${record.balance.toLocaleString('en-IN')}`;
      
      console.log(`   ${date}\t\t${record.type}\t\t${record.reference}\t\t${debit}\t\t${credit}\t\t${balance}`);
    });
    
    console.log('\n   📊 FINAL CALCULATED BALANCE: ₹' + recalculatedBalance.toLocaleString('en-IN'));
    
    // Step 5: Check for Data Issues
    console.log('\n\n5️⃣ DATA INTEGRITY CHECK:');
    
    const issues = [];
    
    // Check for orphaned payment collections
    const orphanedPayments = paymentCollections.filter(payment => {
      if (payment.orderId && payment.containerId) {
        const orderExists = orders.some(order => order._id.toString() === payment.orderId.toString());
        if (!orderExists) {
          return true;
        }
      }
      return false;
    });
    
    if (orphanedPayments.length > 0) {
      issues.push(`Found ${orphanedPayments.length} orphaned payment collections (reference non-existent orders)`);
    }
    
    // Check for manual transactions
    const manualPayments = paymentCollections.filter(payment => payment.paymentType === 'MANUAL');
    if (manualPayments.length > 0) {
      issues.push(`Found ${manualPayments.length} manual payment transactions`);
      manualPayments.forEach(manual => {
        console.log(`     Manual Transaction: ${manual.description}, Amount: ₹${manual.totalAmount}, Received: ₹${manual.receivedAmount}, Pending: ₹${manual.pendingAmount}`);
      });
    }
    
    // Check for balance mismatches
    if (Math.abs((totalOrderAmount - totalReceived) - totalPending) > 0.01) {
      issues.push(`Balance mismatch: Expected pending ₹${(totalOrderAmount - totalReceived).toFixed(2)} but payment collections show ₹${totalPending.toFixed(2)}`);
    }
    
    if (issues.length === 0) {
      console.log('   ✅ No data integrity issues found');
    } else {
      console.log('   ⚠️  Issues found:');
      issues.forEach(issue => console.log(`     - ${issue}`));
    }
    
  } catch (error) {
    console.error('❌ Error during debugging:', error);
  }
}

async function main() {
  await debugAsdaTransactionData();
  
  console.log('\n✅ Debugging complete!');
  console.log('💡 This report shows the exact data that would appear in the Transaction History modal');
  
  mongoose.connection.close();
}

main().catch(console.error);