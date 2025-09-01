#!/usr/bin/env node

/**
 * Fix QC Status via API
 * 
 * This script fixes the QC status of orders through the API endpoints
 * to make them available for container allocation.
 */

const fs = require('fs');
const path = require('path');

const SERVER_URL = 'http://localhost:5001';

// You'll need to get this token from your browser's localStorage or login
// Check browser console: localStorage.getItem('auth-storage')
const getAuthToken = () => {
  const authFile = path.join(__dirname, 'auth-token.txt');
  if (fs.existsSync(authFile)) {
    return fs.readFileSync(authFile, 'utf8').trim();
  }
  
  console.log('❌ No auth token found!');
  console.log('💡 To get your auth token:');
  console.log('1. Login to the application in your browser');
  console.log('2. Open browser console (F12)');
  console.log('3. Type: JSON.parse(localStorage.getItem("auth-storage")).state.token');
  console.log('4. Copy the token and save it to: auth-token.txt');
  console.log('5. Re-run this script');
  process.exit(1);
};

async function fixQCStatus() {
  console.log('🔧 Fixing QC Status via API...\n');
  
  try {
    const token = getAuthToken();
    const headers = {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };

    // Step 1: Get all orders
    console.log('1️⃣ Fetching orders...');
    const ordersResponse = await fetch(`${SERVER_URL}/api/orders`, { headers });
    
    if (!ordersResponse.ok) {
      throw new Error(`Failed to fetch orders: ${ordersResponse.status} ${ordersResponse.statusText}`);
    }
    
    const ordersData = await ordersResponse.json();
    const orders = ordersData.orders || [];
    console.log(`   Found ${orders.length} orders`);
    
    if (orders.length === 0) {
      console.log('❌ No orders found to fix');
      return;
    }

    // Step 2: Find orders needing QC completion
    const ordersNeedingQC = orders.filter(order => {
      const needsQC = order.status !== 'ready' && order.status !== 'partial_ready';
      if (needsQC) {
        console.log(`   📦 ${order.orderNumber}: ${order.status} (needs QC)`);
      }
      return needsQC;
    });

    if (ordersNeedingQC.length === 0) {
      console.log('✅ All orders are already QC ready!');
      return;
    }

    console.log(`\n2️⃣ Fixing ${ordersNeedingQC.length} orders...\n`);

    // Step 3: Update each order's QC status
    for (const order of ordersNeedingQC) {
      try {
        console.log(`🔄 Processing ${order.orderNumber}...`);
        
        // Create QC inspection data
        const qcData = {
          orderId: order._id,
          inspectorNotes: 'Auto-completed for container allocation',
          items: order.items.map((item, index) => ({
            itemIndex: index,
            qcStatus: 'completed',
            qcPassedQuantity: item.quantity,
            qcPassedCartons: item.cartons,
            qcNotes: 'Auto-approved for allocation'
          }))
        };

        // Submit QC inspection
        const qcResponse = await fetch(`${SERVER_URL}/api/warehouse/qc-inspection`, {
          method: 'POST',
          headers,
          body: JSON.stringify(qcData)
        });

        if (qcResponse.ok) {
          console.log(`   ✅ ${order.orderNumber}: QC completed`);
        } else {
          const errorData = await qcResponse.json().catch(() => ({}));
          console.log(`   ❌ ${order.orderNumber}: ${errorData.message || 'QC update failed'}`);
        }

      } catch (error) {
        console.log(`   ❌ ${order.orderNumber}: ${error.message}`);
      }
    }

    console.log('\n3️⃣ Verifying QC ready orders...');
    
    // Step 4: Check QC ready orders
    const qcReadyResponse = await fetch(`${SERVER_URL}/api/warehouse/qc-ready-orders`, { headers });
    
    if (qcReadyResponse.ok) {
      const qcReadyData = await qcReadyResponse.json();
      const qcReadyOrders = qcReadyData.orders || [];
      
      console.log(`✅ QC Ready Orders: ${qcReadyOrders.length}`);
      
      let totalAvailableCartons = 0;
      qcReadyOrders.forEach(order => {
        console.log(`   📦 ${order.orderNumber}: ${order.totalCartons || 0} cartons available`);
        totalAvailableCartons += order.totalCartons || 0;
      });
      
      console.log(`📊 Total Available Cartons: ${totalAvailableCartons}`);
      
      if (totalAvailableCartons > 0) {
        console.log('\n🎉 SUCCESS! Orders are now ready for container allocation');
        console.log('💡 Refresh your container allocation page to see the orders');
      } else {
        console.log('\n❌ Orders exist but no cartons available');
        console.log('💡 Check QC passed quantities in the orders');
      }
    } else {
      console.log('❌ Failed to verify QC ready orders');
    }

  } catch (error) {
    console.error('❌ Error:', error.message);
    
    if (error.message.includes('fetch')) {
      console.log('\n💡 Server Connection Issues:');
      console.log('1. Make sure the server is running on port 5001');
      console.log('2. Run: cd server && npm start');
      console.log('3. Check if http://localhost:5001 is accessible');
    }
  }
}

// Create auth token instructions
if (!fs.existsSync(path.join(__dirname, 'auth-token.txt'))) {
  console.log('📝 First time setup required:');
  console.log('\n1. Login to the application at http://localhost:3000');
  console.log('2. Open browser console (F12)');
  console.log('3. Run: JSON.parse(localStorage.getItem("auth-storage")).state.token');
  console.log('4. Copy the token result');
  console.log('5. Create file: auth-token.txt with your token');
  console.log('6. Re-run: node fix-qc-status-via-api.js\n');
} else {
  fixQCStatus().catch(console.error);
}