// Test script to verify order creation functionality
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

async function testOrderCreation() {
  try {
    console.log('🧪 Testing Order Creation API...\n');

    // Test 1: Health check
    console.log('1. Testing health endpoint...');
    const healthResponse = await axios.get(`${API_BASE}/api/health`);
    console.log('✅ Health check passed:', healthResponse.data);

    // Test 2: Login to get token
    console.log('\n2. Testing login...');
    const loginResponse = await axios.post(`${API_BASE}/api/auth/login`, {
      email: 'admin@demo.com',
      password: 'password'
    });
    
    const token = loginResponse.data.token;
    console.log('✅ Login successful, token received');

    // Set up axios with auth header
    const authAxios = axios.create({
      baseURL: API_BASE,
      headers: {
        'Authorization': `Bearer ${token}`
      }
    });

    // Test 3: Item suggestions (empty database)
    console.log('\n3. Testing item suggestions...');
    const suggestionsResponse = await authAxios.get('/api/orders/item-suggestions?q=test');
    console.log('✅ Item suggestions:', suggestionsResponse.data);

    // Test 4: AI suggestions
    console.log('\n4. Testing AI suggestions...');
    const aiResponse = await authAxios.post('/api/orders/ai-suggestions', {
      query: 'laptop',
      context: 'item_search'
    });
    console.log('✅ AI suggestions:', aiResponse.data);

    // Test 5: Create order
    console.log('\n5. Testing order creation...');
    const orderData = {
      clientName: 'Test Client',
      items: [
        {
          itemCode: 'TEST-001',
          description: 'Test Product',
          quantity: 2,
          unitPrice: 100,
          unitWeight: 1.5,
          unitCbm: 0.1,
          cartons: 1,
          supplier: 'Test Supplier',
          paymentType: 'CLIENT_DIRECT',
          carryingCharge: {
            basis: 'carton',
            rate: 10,
            amount: 10
          }
        }
      ],
      notes: 'Test order',
      priority: 'medium'
    };

    const orderResponse = await authAxios.post('/api/orders', orderData);
    console.log('✅ Order created successfully:', orderResponse.data.order.orderNumber);

    // Test 6: Get orders
    console.log('\n6. Testing get orders...');
    const ordersResponse = await authAxios.get('/api/orders');
    console.log('✅ Orders retrieved:', ordersResponse.data.orders.length, 'orders found');

    console.log('\n🎉 All tests passed! Order creation functionality is working correctly.');

  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message);
    process.exit(1);
  }
}

// Run the test
testOrderCreation();
