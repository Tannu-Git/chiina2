// Simple JWT Debug Script
const mongoose = require('mongoose');
const jwt = require('jsonwebtoken');
require('dotenv').config();

async function debugJWT() {
  try {
    // Connect to database
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');

    // Check JWT configuration
    console.log('\n🔍 JWT Configuration:');
    console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
    console.log('JWT_SECRET length:', process.env.JWT_SECRET?.length || 0);
    console.log('JWT_EXPIRE:', process.env.JWT_EXPIRE || 'not set');

    // Test JWT generation
    console.log('\n🧪 Testing JWT Generation:');
    const testPayload = { id: 'test123', email: 'test@example.com' };
    
    try {
      const testToken = jwt.sign(testPayload, process.env.JWT_SECRET, { expiresIn: '1h' });
      console.log('✅ JWT generation works');
      
      // Test JWT verification
      const decoded = jwt.verify(testToken, process.env.JWT_SECRET);
      console.log('✅ JWT verification works');
      console.log('Decoded payload:', decoded);
    } catch (jwtError) {
      console.log('❌ JWT error:', jwtError.message);
    }

    // Check for existing users
    const User = require('./models/User');
    const userCount = await User.countDocuments({});
    console.log('\n👥 Database Users:', userCount);
    
    if (userCount > 0) {
      const users = await User.find({}).select('name email role isActive').limit(5);
      console.log('Sample users:');
      users.forEach(user => {
        console.log(`- ${user.name} (${user.email}) - ${user.role} - Active: ${user.isActive}`);
      });
    }

    console.log('\n📝 Fix Steps:');
    console.log('1. Clear browser localStorage for localhost:3000');
    console.log('2. Clear browser cookies for localhost');
    console.log('3. Try logging in again');
    console.log('4. If users exist, use their credentials');
    console.log('5. If no users exist, register a new account');

  } catch (error) {
    console.error('❌ Error:', error.message);
  } finally {
    await mongoose.disconnect();
    console.log('\n👋 Disconnected from MongoDB');
  }
}

debugJWT();