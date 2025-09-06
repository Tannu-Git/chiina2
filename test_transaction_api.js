const axios = require('axios');

async function testPaymentRecordsAPI() {
  try {
    console.log('🌐 Testing Payment Records API...\n');
    
    // First login to get auth token
    console.log('🔐 Logging in...');
    const loginResponse = await axios.post('http://localhost:5001/api/auth/login', {
      email: 'admin@demo.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful\n');
    
    // Test the payment records API for CLI-APPLEFCG
    console.log('📊 Fetching payment records for CLI-APPLEFCG...');
    const response = await axios.get('http://localhost:5001/api/financials-comprehensive/payment-records/CLI-APPLEFCG', {
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });
    
    const data = response.data;
    console.log('=== PAYMENT RECORDS API RESPONSE ===\n');
    
    // Show account summary
    console.log('📋 ACCOUNT SUMMARY:');
    console.log(`   Client: ${data.clientName} (${data.clientId})`);
    console.log(`   Total Invoiced: ₹${data.accountSummary.totalInvoiced}`);
    console.log(`   Total Received: ₹${data.accountSummary.totalReceived}`);
    console.log(`   Current Balance: ₹${data.accountSummary.currentBalance}`);
    console.log(`   Total Orders: ${data.accountSummary.totalOrders}`);
    console.log(`   Total Payment Collections: ${data.accountSummary.totalPaymentCollections}`);
    console.log(`   Total Records: ${data.accountSummary.totalTransactions}`);
    
    // Show containers
    console.log('\n📦 CONTAINERS:');
    if (data.containers.length > 0) {
      data.containers.forEach((container, index) => {
        console.log(`   [${index + 1}] ${container.containerId} - ${container.orders}/${container.totalOrders} orders - ${container.shippingCompany}`);
      });
    } else {
      console.log('   No containers found');
    }
    
    // Show payment records ledger
    console.log('\n💰 PAYMENT LEDGER:');
    if (data.paymentRecords.length > 0) {
      console.log('   Date\t\tType\t\t\tReference\t\tDebit\t\tCredit\t\tBalance');
      console.log('   ' + '='.repeat(100));
      data.paymentRecords.forEach((record, index) => {
        const date = new Date(record.date).toLocaleDateString();
        const type = record.type.padEnd(15);
        const ref = (record.reference || '').padEnd(15);
        const debit = record.debit ? `₹${record.debit}`.padStart(10) : ''.padStart(10);
        const credit = record.credit ? `₹${record.credit}`.padStart(10) : ''.padStart(10);
        const balance = `₹${record.balance}`.padStart(12);
        
        console.log(`   ${date}\t${type}\t${ref}\t${debit}\t${credit}\t${balance}`);
        
        if (record.particulars) {
          if (record.type === 'ORDER_INVOICE') {
            console.log(`\t\t\t\t   → Product: ₹${record.particulars.productCost}, Carrying: ₹${record.particulars.carryingCharges}`);
            console.log(`\t\t\t\t   → Container: ${record.particulars.container}`);
          } else if (record.type === 'PAYMENT_RECEIVED') {
            console.log(`\t\t\t\t   → Method: ${record.particulars.paymentMethod}`);
            if (record.particulars.notes) {
              console.log(`\t\t\t\t   → Notes: ${record.particulars.notes}`);
            }
          }
        }
        console.log('');
      });
    } else {
      console.log('   No payment records found');
    }
    
    // Show metadata
    console.log('\n📊 METADATA:');
    console.log(`   Generated At: ${data.metadata.generatedAt}`);
    console.log(`   Period: ${data.metadata.period}`);
    
    // Show raw JSON structure
    console.log('\n🔍 RAW API STRUCTURE:');
    console.log(JSON.stringify({
      clientId: data.clientId,
      clientName: data.clientName,
      accountSummary: data.accountSummary,
      recordCount: data.paymentRecords.length,
      containerCount: data.containers.length,
      sampleRecord: data.paymentRecords[0] || null,
      metadata: data.metadata
    }, null, 2));
    
  } catch (error) {
    console.error('❌ API Error:', error.message);
    if (error.response) {
      console.log('   Status:', error.response.status);
      console.log('   Response:', error.response.data);
    }
  }
}

// Run the test
testPaymentRecordsAPI();