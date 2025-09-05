// Quick test script to verify user creation fix
// Run this in browser console to test user creation

const testUserCreation = async () => {
  console.log('Testing user creation flow...')
  
  // Simulate user creation data
  const testUser = {
    name: 'Test User ' + Date.now(),
    email: 'test' + Date.now() + '@example.com',
    role: 'client',
    company: 'Test Company',
    phone: '+1234567890'
  }
  
  try {
    // Check if we have auth token
    const token = localStorage.getItem('auth-storage')
    if (!token) {
      console.error('No auth token found. Please login first.')
      return
    }
    
    console.log('Creating user:', testUser)
    
    // Make API call
    const response = await fetch('/api/users', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JSON.parse(token).state.token}`
      },
      body: JSON.stringify(testUser)
    })
    
    if (response.ok) {
      const result = await response.json()
      console.log('✅ User created successfully:', result)
      console.log('You should now see the new user in the table on page 1')
    } else {
      const error = await response.text()
      console.error('❌ Failed to create user:', error)
    }
  } catch (error) {
    console.error('❌ Error during user creation:', error)
  }
}

// Export for console use
window.testUserCreation = testUserCreation
console.log('Test function available: testUserCreation()')