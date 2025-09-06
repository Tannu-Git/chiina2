const mongoose = require('mongoose');
const axios = require('axios');

async function checkAPIData() {
  try {
    console.log('🌐 Testing Financial API Response...\n');
    
    // First login to get auth token
    console.log('🔐 Logging in to get auth token...');
    
    // Try both possible ports
    let baseUrl = 'http://localhost:5001';
    let loginResponse;
    
    try {
      loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'admin@demo.com',
        password: 'password'
      });
    } catch (portError) {
      console.log('   Port 5001 failed, trying 5000...');
      baseUrl = 'http://localhost:5000';
      loginResponse = await axios.post(`${baseUrl}/api/auth/login`, {
        email: 'admin@demo.com',
        password: 'password'
      });
    }
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful');
    console.log('🌐 Using server at:', baseUrl, '\n');
    
    // Test the financial comprehensive API with auth
    try {
      const response = await axios.get(`${baseUrl}/api/financials-comprehensive/comprehensive-dashboard`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const data = response.data;
      
      console.log('=== API RESPONSE ANALYSIS ===\n');
      
      // Find CLI-APPLEFCG data
      const applefcgData = data.clientFinancials && data.clientFinancials['CLI-APPLEFCG'];
      
      if (applefcgData) {
        console.log('🍎 CLI-APPLEFCG API Data:');
        console.log(`   Client ID: ${applefcgData.clientId}`);
        console.log(`   Client Name: ${applefcgData.clientName}`);
        console.log(`   Total Order Value: ₹${applefcgData.totalOrderValue}`);
        console.log(`   Total Carrying Charges: ₹${applefcgData.totalCarryingCharges}`);
        console.log(`   Payment Breakdown:`);
        console.log(`     Through Me: ₹${applefcgData.paymentBreakdown.throughMe.amount} (${applefcgData.paymentBreakdown.throughMe.orders} orders)`);
        console.log(`     Direct: ₹${applefcgData.paymentBreakdown.direct.amount} (${applefcgData.paymentBreakdown.direct.orders} orders)`);
        console.log(`   Total Outstanding: ₹${applefcgData.paymentBreakdown.throughMe.amount + applefcgData.paymentBreakdown.direct.amount}`);
        
        if (applefcgData.orders && applefcgData.orders.length > 0) {
          console.log(`\n   Orders (${applefcgData.orders.length}):`);
          applefcgData.orders.forEach((order, index) => {
            console.log(`     [${index + 1}] ${order.orderNumber}: ₹${order.totalAmount}, Carrying: ₹${order.carryingCharges}, PaymentType: ${order.paymentType}`);
          });
        }
        
        if (applefcgData.containers && applefcgData.containers.length > 0) {
          console.log(`\n   Containers (${applefcgData.containers.length}):`);
          applefcgData.containers.forEach((containerId, index) => {
            console.log(`     [${index + 1}] Container: ${containerId}`);
          });
        }
      } else {
        console.log('❌ CLI-APPLEFCG not found in API response');
        
        // Show all available clients
        if (data.clientFinancials) {
          console.log('\n📋 Available clients in API response:');
          Object.keys(data.clientFinancials).forEach(clientId => {
            const client = data.clientFinancials[clientId];
            console.log(`   ${clientId}: ${client.clientName} - ₹${client.paymentBreakdown.throughMe.amount + client.paymentBreakdown.direct.amount}`);
          });
        }
      }
      
      // Show summary
      if (data.summary) {
        console.log('\n📊 API Summary:');
        console.log(`   Total Outstanding: ₹${data.summary.totalOutstanding}`);
        console.log(`   Recent Orders: ${data.summary.recentOrders}`);
        console.log(`   Active Containers: ${data.summary.activeContainers}`);
      }
      
    } catch (apiError) {
      console.error('❌ API Error:', apiError.message);
      if (apiError.response) {
        console.log('   Status:', apiError.response.status);
        console.log('   Response:', apiError.response.data);
      }
      console.log('   Make sure the server is running on port 5001');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

// Run the API check
checkAPIData();