const axios = require('axios');

async function testAPI() {
  try {
    // Test the API endpoint directly
    console.log('Testing API endpoint...');
    
    const response = await axios.get('http://localhost:3000/api/financials-comprehensive/comprehensive-dashboard?period=30', {
      headers: {
        'Authorization': 'Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpZCI6IjY3OGVhMzJlMzMzOTUzNjgyYjNhYTk5OSIsInJvbGUiOiJhZG1pbiIsImlhdCI6MTczNzM2MTc3NCwiZXhwIjoxNzM5OTUzNzc0fQ.Dq0QboL60RGJ0Uxlr_PzXbzqO2MkHsxS_oJdJ6qFPGw'
      }
    });
    
    console.log('API Response Status:', response.status);
    console.log('Payment Flow Summary:', JSON.stringify(response.data.paymentFlowSummary, null, 2));
    
    const data = response.data;
    
    // Calculate the values as the frontend does
    const netClientPayments = (data.paymentFlowSummary.throughMe?.clientPayments || 0) + 
                              (data.paymentFlowSummary.direct?.carryingCharges || 0);
    const toPaySuppliers = data.paymentFlowSummary.throughMe?.supplierPayments || 0;
    
    console.log('\\nCalculated Values:');
    console.log('Net Client Payments (Pending):', '₹' + netClientPayments.toLocaleString());
    console.log('To Pay Suppliers:', '₹' + toPaySuppliers.toLocaleString());
    console.log('Already Received:', '₹2,000 (hardcoded)');
    
  } catch (error) {
    console.error('API Error:', error.response?.status, error.response?.statusText);
    console.error('Error details:', error.message);
  }
}

testAPI();