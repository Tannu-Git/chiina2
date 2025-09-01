// Authentication Fix Verification
console.log('🔐 Auth Fix Verification Script');
console.log('================================\n');

// 1. Check localStorage for auth data
const checkLocalStorage = () => {
  console.log('1. Checking localStorage auth data...');
  try {
    const authData = localStorage.getItem('auth-storage');
    if (authData) {
      const parsed = JSON.parse(authData);
      console.log('✅ Auth data found:', {
        hasToken: !!parsed.state?.token,
        isAuthenticated: parsed.state?.isAuthenticated,
        user: parsed.state?.user?.email,
        tokenLength: parsed.state?.token?.length || 0
      });
      return parsed.state;
    } else {
      console.log('❌ No auth data in localStorage');
      return null;
    }
  } catch (error) {
    console.log('❌ Error parsing auth data:', error.message);
    return null;
  }
};

// 2. Check axios headers
const checkAxiosHeaders = () => {
  console.log('\n2. Checking axios headers...');
  try {
    if (window.axios?.defaults?.headers?.common?.Authorization) {
      console.log('✅ Axios Authorization header set:', 
        window.axios.defaults.headers.common.Authorization.substring(0, 20) + '...');
      return true;
    } else {
      console.log('❌ No Authorization header in axios defaults');
      return false;
    }
  } catch (error) {
    console.log('❌ Error checking axios headers:', error.message);
    return false;
  }
};

// 3. Test API call
const testAPICall = async () => {
  console.log('\n3. Testing container API call...');
  try {
    const response = await fetch('/api/containers', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json'
      }
    });
    
    console.log('API Response Status:', response.status);
    
    if (response.status === 200) {
      console.log('✅ Container API call successful');
      const data = await response.json();
      console.log('Total containers:', data.total || 0);
    } else if (response.status === 401) {
      console.log('❌ 401 Unauthorized - Token issue detected');
    } else {
      console.log('⚠️ API returned:', response.status, response.statusText);
    }
  } catch (error) {
    console.log('❌ Network error:', error.message);
  }
};

// 4. Provide fix instructions
const showFixInstructions = () => {
  console.log('\n🔧 Quick Fix Instructions:');
  console.log('1. Clear browser storage: localStorage.clear(); sessionStorage.clear();');
  console.log('2. Hard refresh: Ctrl+Shift+R');
  console.log('3. Login again at: http://localhost:3000/login');
  console.log('4. Use credentials: admin@demo.com / password');
  console.log('\n🔍 Or visit debug page: http://localhost:3000/debug/auth');
};

// Run all checks
const runAllChecks = async () => {
  const authData = checkLocalStorage();
  const hasAxiosAuth = checkAxiosHeaders();
  await testAPICall();
  
  if (!authData || !hasAxiosAuth) {
    showFixInstructions();
  } else {
    console.log('\n✅ Authentication appears to be working correctly!');
  }
};

// Export for browser console use
if (typeof window !== 'undefined') {
  window.testAuth = runAllChecks;
  window.clearAuthAndReload = () => {
    localStorage.clear();
    sessionStorage.clear();
    location.reload();
  };
  console.log('\n💡 Available functions:');
  console.log('- testAuth() - Run all authentication checks');
  console.log('- clearAuthAndReload() - Clear storage and reload');
}

// Auto-run in browser
if (typeof window !== 'undefined') {
  runAllChecks();
}