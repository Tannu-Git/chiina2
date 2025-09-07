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

// Create admin user with manual password hashing (bypassing pre-save middleware)
const createAdmin = async () => {
  try {
    await connectDB();
    
    console.log('🔄 Creating admin user...\n');
    
    // Delete existing admin user
    await User.deleteOne({ email: 'admin@demo.com' });
    console.log('🗑️ Removed existing admin user');
    
    // Manually hash password (avoiding pre-save middleware issues)
    const salt = await bcrypt.genSalt(12);
    const hashedPassword = await bcrypt.hash('password', salt);
    
    // Create user directly in database
    const adminData = {
      name: 'Admin User',
      email: 'admin@demo.com',
      password: hashedPassword, // Already hashed
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
      ],
      isActive: true,
      registrationSource: 'manual'
    };
    
    // Insert directly using MongoDB driver to avoid middleware
    const result = await User.collection.insertOne(adminData);
    console.log('✅ Admin user created with ID:', result.insertedId);
    
    // Test login by finding user and comparing password
    const testUser = await User.findOne({ email: 'admin@demo.com' }).select('+password');
    if (testUser && testUser.password) {
      const isPasswordValid = await bcrypt.compare('password', testUser.password);
      console.log(`✅ Password test: ${isPasswordValid ? 'SUCCESS' : 'FAILED'}`);
      
      if (isPasswordValid) {
        console.log('\n🎉 Admin user is ready to use!');
        console.log('📧 Login credentials:');
        console.log('👑 Email: admin@demo.com');
        console.log('🔐 Password: password');
        console.log('\n🚀 Try logging in now!');
      }
    } else {
      console.log('❌ Could not retrieve user for testing');
    }
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run creation
createAdmin();