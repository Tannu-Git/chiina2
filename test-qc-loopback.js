// QC Inspection and Loop-back Test Script
const axios = require('axios')

const BASE_URL = 'http://localhost:5000/api'

// Test QC inspection with shortage to create loop-back
async function testQCInspectionWithShortage() {
  try {
    console.log('🧪 Testing QC Inspection with Shortage...\n')
    
    // First, let's check what orders are available
    const dashboardResponse = await axios.get(`${BASE_URL}/warehouse/dashboard`, {
      headers: {
        'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with valid token
      }
    })
    
    console.log('📊 Dashboard Data:')
    console.log('- Pending QC Orders:', dashboardResponse.data.readyOrders?.length || 0)
    console.log('- Completed QC Orders:', dashboardResponse.data.completedOrders?.length || 0)
    
    if (dashboardResponse.data.readyOrders?.length > 0) {
      const testOrder = dashboardResponse.data.readyOrders[0]
      console.log(`\n🎯 Testing with Order: ${testOrder.orderNumber}`)
      console.log(`- Client: ${testOrder.clientName}`)
      console.log(`- Items: ${testOrder.items?.length}`)
      
      // Simulate QC inspection with shortage
      const qcPayload = {
        orderId: testOrder._id,
        inspectorId: 'YOUR_USER_ID', // Replace with valid user ID
        items: testOrder.items.map((item, index) => ({
          itemIndex: item._id,
          itemCode: item.itemCode,
          description: item.description,
          expectedQuantity: item.quantity,
          receivedQuantity: item.quantity - 5, // Simulate 5 units shortage
          status: 'shortage',
          notes: 'Test shortage - 5 units missing',
          defects: []
        }))
      }
      
      console.log('\n📝 Submitting QC Inspection with shortage...')
      
      const qcResponse = await axios.post(`${BASE_URL}/warehouse/qc-inspection`, qcPayload, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE', // Replace with valid token
          'Content-Type': 'application/json'
        }
      })
      
      console.log('✅ QC Inspection Response:')
      console.log('- Message:', qcResponse.data.message)
      console.log('- Order Status:', qcResponse.data.order.status)
      console.log('- Loop-backs Created:', qcResponse.data.summary.loopBacksCreated)
      console.log('- Loop-back Order Numbers:', qcResponse.data.summary.loopBackOrderNumbers)
      
      // Check loop-backs
      const loopBackResponse = await axios.get(`${BASE_URL}/warehouse/loopback`, {
        headers: {
          'Authorization': 'Bearer YOUR_TOKEN_HERE' // Replace with valid token
        }
      })
      
      console.log('\n📋 Loop-back Orders:')
      console.log('- Total Loop-backs:', loopBackResponse.data.loopbackOrders?.length || 0)
      
      if (loopBackResponse.data.loopbackOrders?.length > 0) {
        loopBackResponse.data.loopbackOrders.forEach((lb, index) => {
          console.log(`  ${index + 1}. ${lb.orderNumber} - ${lb.loopBackReason} (${lb.status})`)
        })
      }
      
    } else {
      console.log('❌ No orders available for QC testing')
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.response?.data || error.message)
  }
}

// Manual test instructions
console.log(`
🔧 QC INSPECTION & LOOP-BACK TEST SETUP

1. Make sure server is running: npm run dev
2. Update the following in this script:
   - YOUR_TOKEN_HERE: Get from login response
   - YOUR_USER_ID: Get from user profile

3. Run this script: node test-qc-loopback.js

📋 MANUAL TESTING STEPS:

1. Open warehouse dashboard
2. Find an order with status 'confirmed' or 'in_production' 
3. Click 'Start QC' button
4. Set received quantity LESS than expected quantity
5. Select 'Shortage' status
6. Add notes about the shortage
7. Click 'Complete Inspection'
8. Check these tabs:
   - ✅ 'QC Done' tab should show the processed order
   - ✅ 'Loop-backs' tab should show new loop-back order
   - ✅ Success message should mention loop-back creation

🐛 DEBUGGING TIPS:

If loop-backs aren't created:
1. Check browser console for errors
2. Check server logs for QC processing details
3. Verify shortage quantity > 0
4. Ensure 'shortage' or 'damaged' status selected

Expected Behavior:
- Order disappears from 'Pending' tab  
- Order appears in 'QC Done' tab with status badge
- New entry appears in 'Loop-backs' tab
- Toast message confirms loop-back creation
`)

// Uncomment to run automated test (after adding valid token/user ID)
// testQCInspectionWithShortage()