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

// Reset admin user completely
const resetAdminUser = async () => {
  try {
    await connectDB();
    
    console.log('🔄 Resetting admin user...\n');
    
    // Delete existing admin user
    await User.deleteOne({ email: 'admin@demo.com' });
    console.log('🗑️ Removed existing admin user');
    
    // Create fresh admin user
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    const adminUser = new User({
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword,
      role: 'admin',
      company: 'Logistics OMS Corp',
      phone: '+91-9876543210',
      permissions: [
        'view_all_orders', 
        'edit_financials', 
        'view_profits', 
        'create_users', 
        'edit_orders', 
        'view_container_ids', 
        'initiate_loopbacks', 
        'view_all_clients'
      ]
    });
    
    await adminUser.save();
    console.log('✅ Created fresh admin user');
    
    // Verify the password works
    const testUser = await User.findOne({ email: 'admin@demo.com' });
    const testPassword = await bcrypt.compare('password', testUser.password);
    console.log(`✅ Password verification: ${testPassword ? 'SUCCESS' : 'FAILED'}`);
    
    if (testPassword) {
      console.log('\n🎉 Admin user is ready!');
      console.log('📧 Login credentials:');
      console.log('👑 Email: admin@demo.com');
      console.log('🔐 Password: password');
      console.log('\n🚀 You can now log in to the application!');
    } else {
      console.log('\n❌ Something went wrong with password verification');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error resetting admin user:', error);
    process.exit(1);
  }
};

// Run reset
resetAdminUser();