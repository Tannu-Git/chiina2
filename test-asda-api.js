const axios = require('axios');

async function testAsdaAPI() {
  try {
    console.log('🔐 Testing ASDA Transaction API...\n');
    
    // Login first
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@demo.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Get ASDA transaction data
    console.log('📊 Fetching ASDA payment records...');
    const response = await axios.get('http://localhost:5001/api/financials-comprehensive/payment-records/CLI-ASDA0PR', {
      headers: { 'Authorization': `Bearer ${token}` }
    });
    
    const data = response.data;
    
    console.log('=== ASDA ACCOUNT SUMMARY ===');
    console.log(`Client: ${data.clientName} (${data.clientId})`);
    console.log(`Total Invoiced: ₹${data.accountSummary.totalInvoiced.toLocaleString('en-IN')}`);
    console.log(`Total Received: ₹${data.accountSummary.totalReceived.toLocaleString('en-IN')}`);
    console.log(`Current Balance: ₹${data.accountSummary.currentBalance.toLocaleString('en-IN')}`);
    console.log(`Total Transactions: ${data.accountSummary.totalTransactions}`);
    
    console.log('\n=== TRANSACTION LEDGER ===');
    console.log('Date\t\tType\t\tReference\t\tDebit\t\tCredit\t\tBalance\t\tStatus');
    console.log('='.repeat(100));
    
    data.paymentRecords.forEach((record, index) => {
      const date = new Date(record.date).toLocaleDateString();
      const debit = record.debit > 0 ? `+₹${record.debit.toLocaleString('en-IN')}` : '—';
      const credit = record.credit > 0 ? `-₹${record.credit.toLocaleString('en-IN')}` : '—';
      const balance = `₹${record.balance.toLocaleString('en-IN')}`;
      
      console.log(`${date}\t${record.type}\t\t${record.reference}\t${debit}\t\t${credit}\t\t${balance}\t${record.status}`);
      
      // Show calculation check
      if (index === 0) {
        console.log(`  → First transaction: Starting balance = ${debit}`);
      } else {
        const prevBalance = data.paymentRecords[index - 1].balance;
        const expectedBalance = prevBalance + (record.debit || 0) - (record.credit || 0);
        if (Math.abs(expectedBalance - record.balance) > 0.01) {
          console.log(`  ❌ CALCULATION ERROR: Expected ₹${expectedBalance.toFixed(2)}, Got ₹${record.balance.toFixed(2)}`);
        }
      }
    });
    
    console.log('\n=== VERIFICATION ===');
    const totalDebits = data.paymentRecords.reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredits = data.paymentRecords.reduce((sum, r) => sum + (r.credit || 0), 0);
    const calculatedBalance = totalDebits - totalCredits;
    
    console.log(`Total Debits: ₹${totalDebits.toLocaleString('en-IN')}`);
    console.log(`Total Credits: ₹${totalCredits.toLocaleString('en-IN')}`);
    console.log(`Calculated Balance: ₹${calculatedBalance.toLocaleString('en-IN')}`);
    console.log(`API Balance: ₹${data.accountSummary.currentBalance.toLocaleString('en-IN')}`);
    
    if (Math.abs(calculatedBalance - data.accountSummary.currentBalance) > 0.01) {
      console.log('❌ BALANCE MISMATCH DETECTED!');
    } else {
      console.log('✅ Balance calculation is correct');
    }
    
    // Check for specific issues from your report
    console.log('\n=== ISSUE ANALYSIS ===');
    const issues = [];
    
    // Check for missing amounts that still affect balance
    data.paymentRecords.forEach((record, index) => {
      if (record.debit === 0 && record.credit === 0) {
        const prevBalance = index > 0 ? data.paymentRecords[index - 1].balance : 0;
        if (Math.abs(record.balance - prevBalance) > 0.01) {
          issues.push(`Transaction ${index + 1}: No debit/credit but balance changed from ₹${prevBalance} to ₹${record.balance}`);
        }
      }
    });
    
    if (issues.length > 0) {
      console.log('❌ Issues found:');
      issues.forEach(issue => console.log(`  - ${issue}`));
    } else {
      console.log('✅ No obvious calculation issues detected');
    }
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.log('Response status:', error.response.status);
      console.log('Response data:', error.response.data);
    }
  }
}

testAsdaAPI();