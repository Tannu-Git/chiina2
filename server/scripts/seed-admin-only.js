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

// Admin user data
const adminUser = {
  name: 'Admin User',
  email: 'admin@demo.com',
  password: 'password',
  role: 'admin',
  company: 'Logistics OMS Corp',
  phone: '+91-9876543210',
  permissions: ['view_all_orders', 'edit_financials', 'view_profits', 'create_users', 'edit_orders', 'view_container_ids', 'initiate_loopbacks', 'view_all_clients']
};

// Seed admin user only
const seedAdminUser = async () => {
  try {
    console.log('🌱 Creating admin user...');

    await connectDB();

    // Check if admin user already exists
    const existingAdmin = await User.findOne({ email: adminUser.email });
    if (existingAdmin) {
      console.log('✅ Admin user already exists');
      console.log('📧 Login Credentials:');
      console.log('👑 Admin: admin@demo.com / password');
      process.exit(0);
    }

    // Hash password
    const salt = await bcrypt.genSalt(12);
    adminUser.password = await bcrypt.hash(adminUser.password, salt);

    // Create admin user
    const admin = new User(adminUser);
    await admin.save();

    console.log('✅ Admin user created successfully!');
    console.log('\n📧 Login Credentials:');
    console.log('👑 Admin: admin@demo.com / password');

    process.exit(0);
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedAdminUser();
}

module.exports = { seedAdminUser };