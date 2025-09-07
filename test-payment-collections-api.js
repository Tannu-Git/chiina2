const axios = require('axios');

async function testPaymentCollectionsAPI() {
  try {
    console.log('🧪 Testing Payment Collections API...\n');
    
    // Test the payment-collections API endpoint
    const token = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGVhMzJlMzMzOTUzNjgyYjNhYTk5OSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNzM2MTc3NCwiZXhwIjoxNzM5OTUzNzc0fQ.Dq0QboL60RGJ0Uxlr_PzXbzqO2MkHsxS_oJdJ6qFPGw';
    
    const response = await axios.get('http://localhost:5001/api/financials-comprehensive/payment-collections', {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    });
    
    console.log('✅ API Response Status:', response.status);
    console.log('📊 Full Response Data:');
    console.log(JSON.stringify(response.data, null, 2));
    
    // Extract key values
    const data = response.data;
    console.log('\n📋 Summary Values:');
    console.log('   Total to Collect:', data.summary?.totalToCollect || 'N/A');
    console.log('   Total to Pay:', data.summary?.totalToPay || 'N/A');
    console.log('   Net Position:', data.summary?.netPosition || 'N/A');
    console.log('   Clients Owing:', data.summary?.totalClientsOwing || 'N/A');
    
    if (data.toCollectFromClients && data.toCollectFromClients.length > 0) {
      console.log('\n👥 Client Details:');
      data.toCollectFromClients.forEach((client, index) => {
        console.log(`   Client ${index + 1}:`);
        console.log(`     Name: ${client.clientName}`);
        console.log(`     ID: ${client.clientId}`);
        console.log(`     Carrying Charges: ₹${client.carryingCharges}`);
        console.log(`     Through Me Amount: ₹${client.throughMeAmount}`);
        console.log(`     Total Amount: ₹${client.totalAmount}`);
        console.log(`     Orders: ${client.orders?.length || 0}`);
      });
    }
    
  } catch (error) {
    console.error('❌ API Test Failed:', error.message);
    if (error.response) {
      console.error('   Status:', error.response.status);
      console.error('   Data:', error.response.data);
    }
  }
}

testPaymentCollectionsAPI();