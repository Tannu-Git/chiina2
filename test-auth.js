// Quick Authentication Test Script
// Run this to test your authentication and API access

const testAuth = async () => {
  console.log('🔍 Testing Authentication...\n');

  // Get token from localStorage (simulating browser behavior)
  const authStorage = localStorage?.getItem('auth-storage');
  let token = null;

  if (authStorage) {
    try {
      const parsed = JSON.parse(authStorage);
      token = parsed?.state?.token;
    } catch (e) {
      console.log('❌ Failed to parse auth storage');
    }
  }

  console.log('📋 Authentication Check:');
  console.log(`Token exists: ${!!token}`);
  console.log(`Token length: ${token ? token.length : 0}`);

  if (token) {
    try {
      // Decode token to check expiration
      const payload = JSON.parse(atob(token.split('.')[1]));
      const isExpired = Date.now() >= (payload.exp * 1000);
      
      console.log(`Token expired: ${isExpired}`);
      console.log(`User role: ${payload.role}`);
      console.log(`User email: ${payload.email}`);
      
      if (isExpired) {
        console.log('\n⚠️ TOKEN EXPIRED - You need to log in again');
        return;
      }

      if (!['admin', 'staff'].includes(payload.role)) {
        console.log('\n⚠️ INSUFFICIENT PERMISSIONS - You need admin or staff role');
        return;
      }

      // Test the API call
      console.log('\n🧪 Testing QC Ready Orders API...');
      
      const response = await fetch('/api/warehouse/qc-ready-orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      console.log(`API Response Status: ${response.status}`);
      
      if (response.ok) {
        const data = await response.json();
        console.log('✅ API call successful!');
        console.log(`Orders found: ${data.orders?.length || 0}`);
      } else {
        console.log('❌ API call failed');
        const errorText = await response.text();
        console.log(`Error: ${errorText}`);
      }

    } catch (error) {
      console.log('❌ Token validation failed:', error.message);
    }
  } else {
    console.log('\n⚠️ NO TOKEN FOUND - You need to log in');
  }

  console.log('\n🔧 Quick Fixes:');
  console.log('1. Visit: http://localhost:3000/login');
  console.log('2. Visit: http://localhost:3000/debug/auth');
  console.log('3. Check if server is running on port 5000/5001');
};

// For browser console
if (typeof window !== 'undefined') {
  window.testAuth = testAuth;
  console.log('Run testAuth() in your browser console to test authentication');
}

// For Node.js
if (typeof module !== 'undefined') {
  module.exports = testAuth;
}