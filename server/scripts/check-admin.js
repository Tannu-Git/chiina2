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

// Check admin user and verify credentials
const checkAdminUser = async () => {
  try {
    await connectDB();
    
    console.log('🔍 Checking admin user...\n');
    
    // Check if admin user exists
    const adminUser = await User.findOne({ email: 'admin@demo.com' });
    
    if (!adminUser) {
      console.log('❌ Admin user not found in database');
      console.log('🔧 Creating admin user now...');
      
      // Create admin user
      const salt = await bcrypt.genSalt(12);
      const hashedPassword = await bcrypt.hash('password', salt);
      
      const newAdmin = new User({
        name: 'Admin User',
        email: 'admin@demo.com',
        password: hashedPassword,
        role: 'admin',
        company: 'Logistics OMS Corp',
        phone: '+91-9876543210',
        permissions: ['view_all_orders', 'edit_financials', 'view_profits', 'create_users', 'edit_orders', 'view_container_ids', 'initiate_loopbacks', 'view_all_clients']
      });
      
      await newAdmin.save();
      console.log('✅ Admin user created successfully');
    } else {
      console.log('✅ Admin user found in database');
      console.log(`   Name: ${adminUser.name}`);
      console.log(`   Email: ${adminUser.email}`);
      console.log(`   Role: ${adminUser.role}`);
      console.log(`   Company: ${adminUser.company}`);
      
      // Test password verification
      const isPasswordValid = await bcrypt.compare('password', adminUser.password);
      console.log(`   Password Valid: ${isPasswordValid ? '✅ Yes' : '❌ No'}`);
      
      if (!isPasswordValid) {
        console.log('\n🔧 Password mismatch detected. Updating password...');
        const salt = await bcrypt.genSalt(12);
        const hashedPassword = await bcrypt.hash('password', salt);
        
        adminUser.password = hashedPassword;
        await adminUser.save();
        console.log('✅ Password updated successfully');
      }
    }
    
    console.log('\n📧 Credentials to use:');
    console.log('👑 Admin: admin@demo.com / password');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error checking admin user:', error);
    process.exit(1);
  }
};

// Run check
checkAdminUser();