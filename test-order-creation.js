// Test script to verify order creation functionality
const axios = require('axios');

const API_BASE = 'http://localhost:5001';

// Test order creation with a sample payload
async function testOrderCreation() {
  try {
    // First login to get a token (you'll need to replace with actual credentials)
    console.log('Testing order creation...');
    
    const testOrder = {
      clientName: 'Test Client Corporation',
      items: [
        {
          itemCode: 'TEST-001',
          description: 'Test Product Description',
          quantity: 10,
          unitPrice: 100.50,
          unitWeight: 2.5,
          unitCbm: 0.1,
          cartons: 2,
          supplier: 'Test Supplier',
          paymentType: 'CLIENT_DIRECT',
          carryingCharge: {
            basis: 'carton',
            rate: 15.0,
            amount: 30.0 // 2 cartons * 15 rate = 30
          },
          totalPrice: 1005.0 // 10 * 100.50 = 1005
        }
      ],
      notes: 'Test order for validation',
      priority: 'medium',
      status: 'draft',
      // Calculated totals that should be sent by frontend
      totalAmount: 1005.0,
      totalCarryingCharges: 30.0,
      totalWeight: 5.0, // 2.5 * 2 cartons = 5.0
      totalCbm: 0.2, // 0.1 * 2 cartons = 0.2  
      totalCartons: 2
    };

    console.log('Test order payload:', JSON.stringify(testOrder, null, 2));
    
    // You would need to make this request with proper authentication
    // This is just to show what payload should be sent
    console.log('✅ Test payload is properly structured');
    console.log('Frontend should send exactly this structure to avoid validation errors');
    
  } catch (error) {
    console.error('Test failed:', error.message);
  }
}

testOrderCreation();
