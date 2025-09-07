const axios = require('axios');

async function inspectAsdaPaymentDatabase() {
  try {
    console.log('🔍 DEEP DATABASE INSPECTION FOR ASDA PHANTOM TRANSACTIONS\n');
    
    // Login
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@demo.com', password: 'password'
    });
    const token = loginResponse.data.token;
    
    // Get raw payment collections data
    console.log('📊 Fetching raw payment collections...');
    const rawResponse = await axios.get('http://localhost:5001/api/payment-collections/raw', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const asdaPayments = rawResponse.data.filter(p => p.clientId === 'CLI-ASDA0PR');
    
    console.log(`Found ${asdaPayments.length} payment collections for ASDA:`);
    
    asdaPayments.forEach((payment, index) => {
      console.log(`\\n=== PAYMENT COLLECTION ${index + 1} ===`);
      console.log(`ID: ${payment._id}`);
      console.log(`Type: ${payment.paymentType}`);
      console.log(`Description: ${payment.description}`);
      console.log(`Total Amount: ₹${(payment.totalAmount || 0).toFixed(2)}`);
      console.log(`Received Amount: ₹${(payment.receivedAmount || 0).toFixed(2)}`);
      console.log(`Pending Amount: ₹${(payment.pendingAmount || 0).toFixed(2)}`);
      console.log(`Status: ${payment.status}`);
      console.log(`Created: ${payment.createdAt}`);
      
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        console.log(`Payment History (${payment.paymentHistory.length} entries):`);
        payment.paymentHistory.forEach((history, i) => {
          console.log(`  [${i + 1}] Amount: ₹${(history.amount || 0).toFixed(2)}`);
          console.log(`      Date: ${history.receivedDate}`);
          console.log(`      Notes: ${history.notes || 'None'}`);
          console.log(`      ID: ${history._id}`);
          
          // Flag suspicious entries
          if (!history.amount || history.amount === 0) {
            console.log(`      🚨 PHANTOM TRANSACTION: Zero or missing amount!`);
          }
          if (history.amount && typeof history.amount !== 'number') {
            console.log(`      🚨 DATA TYPE ISSUE: Amount is ${typeof history.amount}, not number!`);
          }
        });
      } else {
        console.log('No detailed payment history');
      }
      
      // Check for inconsistencies
      const historyTotal = payment.paymentHistory ? 
        payment.paymentHistory.reduce((sum, h) => sum + (h.amount || 0), 0) : 0;
      
      if (Math.abs(historyTotal - (payment.receivedAmount || 0)) > 0.01) {
        console.log(`🚨 INCONSISTENCY: History total (₹${historyTotal.toFixed(2)}) != Received amount (₹${(payment.receivedAmount || 0).toFixed(2)})`);
      }
    });
    
    // Analyze the specific phantom payment IDs from the transaction history
    console.log('\\n\\n🔍 ANALYZING SPECIFIC PHANTOM PAYMENTS:');
    
    const phantomPaymentIds = ['eb41c2', 'b189f7']; // From the transaction history output
    
    phantomPaymentIds.forEach(phantomId => {
      console.log(`\\n--- Searching for payment ending in ${phantomId} ---`);
      
      asdaPayments.forEach(payment => {
        if (payment.paymentHistory) {
          payment.paymentHistory.forEach((history, i) => {
            const historyId = history._id?.toString() || '';
            if (historyId.includes(phantomId) || historyId.endsWith(phantomId)) {
              console.log(`FOUND: Payment Collection ${payment._id}`);
              console.log(`  History Entry [${i + 1}]: ${history._id}`);
              console.log(`  Amount: ₹${(history.amount || 0).toFixed(2)}`);
              console.log(`  Date: ${history.receivedDate}`);
              console.log(`  Notes: ${history.notes || 'None'}`);
              console.log(`  Raw amount value: ${JSON.stringify(history.amount)}`);
              console.log(`  Amount type: ${typeof history.amount}`);
              
              if (!history.amount || history.amount === 0) {
                console.log(`  🚨 CONFIRMED PHANTOM: This is a zero-amount payment affecting balance!`);
              }
            }
          });
        }
      });
    });
    
    // Calculate expected vs actual totals
    console.log('\\n\\n📊 FINANCIAL VALIDATION:');
    
    const totalFromCollections = asdaPayments.reduce((sum, p) => sum + (p.receivedAmount || 0), 0);
    const totalFromHistory = asdaPayments.reduce((sum, payment) => {
      if (payment.paymentHistory) {
        return sum + payment.paymentHistory.reduce((histSum, h) => histSum + (h.amount || 0), 0);
      }
      return sum + (payment.receivedAmount || 0);
    }, 0);
    
    console.log(`Total from receivedAmount fields: ₹${totalFromCollections.toFixed(2)}`);
    console.log(`Total from payment history: ₹${totalFromHistory.toFixed(2)}`);
    console.log(`Difference: ₹${(totalFromHistory - totalFromCollections).toFixed(2)}`);
    
    if (Math.abs(totalFromHistory - totalFromCollections) > 0.01) {
      console.log('🚨 MISMATCH: Payment history totals do not match collection amounts!');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    if (error.response?.data) {
      console.error('Response:', error.response.data);
    }
  }
}

inspectAsdaPaymentDatabase();