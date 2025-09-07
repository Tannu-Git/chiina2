const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms-new');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Fix admin user password
const fixAdminUser = async () => {
  try {
    await connectDB();
    
    console.log('🔧 Fixing admin user password...\n');
    
    // Find admin user
    const adminUser = await User.findOne({ email: 'admin@demo.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found');
      process.exit(1);
    }
    
    console.log('📋 Current admin user state:');
    console.log(`   Password field exists: ${adminUser.password ? 'Yes' : 'No'}`);
    console.log(`   Password length: ${adminUser.password ? adminUser.password.length : 'N/A'}`);
    
    // Always update password to ensure it's properly hashed
    console.log('\n🔐 Setting new password...');
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    adminUser.password = hashedPassword;
    await adminUser.save();
    
    console.log('✅ Password updated successfully');
    
    // Verify the password works
    const testPassword = await bcrypt.compare('password', adminUser.password);
    console.log(`✅ Password verification test: ${testPassword ? 'PASSED' : 'FAILED'}`);
    
    console.log('\n📧 Updated credentials:');
    console.log('👑 Admin: admin@demo.com / password');
    console.log('\n🚀 You can now try logging in again!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error fixing admin user:', error);
    process.exit(1);
  }
};

// Run fix
fixAdminUser();