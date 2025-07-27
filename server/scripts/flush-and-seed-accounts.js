const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Order = require('../models/Order');
const Container = require('../models/Container');
const AuditLog = require('../models/AuditLog');

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Sample users data (accounts only)
const sampleUsers = [
  // Admin Users
  {
    name: 'Admin User',
    email: 'admin@demo.com',
    password: 'password',
    role: 'admin',
    company: 'Logistics OMS Corp',
    phone: '+91-9876543210',
    permissions: ['view_all_orders', 'edit_financials', 'view_profits', 'create_users', 'edit_orders', 'view_container_ids', 'initiate_loopbacks', 'view_all_clients']
  },
  {
    name: 'John Admin',
    email: 'john.admin@logistics.com',
    password: 'password',
    role: 'admin',
    company: 'Logistics OMS Corp',
    phone: '+91-9876543211',
    permissions: ['view_all_orders', 'edit_financials', 'view_profits', 'create_users', 'edit_orders', 'view_container_ids', 'initiate_loopbacks', 'view_all_clients']
  },

  // Staff Users
  {
    name: 'Staff User',
    email: 'staff@demo.com',
    password: 'password',
    role: 'staff',
    company: 'Logistics OMS Corp',
    phone: '+91-9876543212',
    permissions: ['view_all_orders', 'edit_orders', 'initiate_loopbacks']
  },
  {
    name: 'Sarah Manager',
    email: 'sarah.manager@logistics.com',
    password: 'password',
    role: 'staff',
    company: 'Logistics OMS Corp',
    phone: '+91-9876543213',
    permissions: ['view_all_orders', 'edit_orders', 'initiate_loopbacks']
  },
  {
    name: 'Mike Warehouse',
    email: 'mike.warehouse@logistics.com',
    password: 'password',
    role: 'staff',
    company: 'Logistics OMS Corp',
    phone: '+91-9876543214',
    permissions: ['view_all_orders', 'edit_orders', 'initiate_loopbacks']
  },

  // Client Users
  {
    name: 'Client User',
    email: 'client@demo.com',
    password: 'password',
    role: 'client',
    company: 'ABC Trading Co.',
    phone: '+91-9876543215',
    address: {
      street: '123 Business Street',
      city: 'Mumbai',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '400001'
    }
  },
  {
    name: 'Rajesh Patel',
    email: 'rajesh@abctrading.com',
    password: 'password',
    role: 'client',
    company: 'ABC Trading Co.',
    phone: '+91-9876543216',
    address: {
      street: '456 Commerce Road',
      city: 'Delhi',
      state: 'Delhi',
      country: 'India',
      zipCode: '110001'
    }
  },
  {
    name: 'Priya Sharma',
    email: 'priya@xyzimports.com',
    password: 'password',
    role: 'client',
    company: 'XYZ Imports Ltd.',
    phone: '+91-9876543217',
    address: {
      street: '789 Import Plaza',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      zipCode: '600001'
    }
  },
  {
    name: 'Amit Kumar',
    email: 'amit@globallogistics.com',
    password: 'password',
    role: 'client',
    company: 'Global Logistics Pvt Ltd',
    phone: '+91-9876543218',
    address: {
      street: '321 Logistics Hub',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001'
    }
  },
  {
    name: 'Sunita Gupta',
    email: 'sunita@techexports.com',
    password: 'password',
    role: 'client',
    company: 'Tech Exports India',
    phone: '+91-9876543219',
    address: {
      street: '654 Tech Park',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '411001'
    }
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@fashionhouse.com',
    password: 'password',
    role: 'client',
    company: 'Fashion House Ltd',
    phone: '+91-9876543220',
    address: {
      street: '987 Fashion Street',
      city: 'Kolkata',
      state: 'West Bengal',
      country: 'India',
      zipCode: '700001'
    }
  },
  {
    name: 'Neha Agarwal',
    email: 'neha@electronicsworld.com',
    password: 'password',
    role: 'client',
    company: 'Electronics World',
    phone: '+91-9876543221',
    address: {
      street: '147 Electronics Market',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      zipCode: '500001'
    }
  },
  {
    name: 'Ravi Mehta',
    email: 'ravi@autoparts.com',
    password: 'password',
    role: 'client',
    company: 'Auto Parts India',
    phone: '+91-9876543222',
    address: {
      street: '258 Auto Complex',
      city: 'Ahmedabad',
      state: 'Gujarat',
      country: 'India',
      zipCode: '380001'
    }
  },
  {
    name: 'Meera Joshi',
    email: 'meera@textileexports.com',
    password: 'password',
    role: 'client',
    company: 'Textile Exports India',
    phone: '+91-9876543223',
    address: {
      street: '369 Textile Mills',
      city: 'Coimbatore',
      state: 'Tamil Nadu',
      country: 'India',
      zipCode: '641001'
    }
  },
  {
    name: 'Rohit Agarwal',
    email: 'rohit@pharmaceuticals.com',
    password: 'password',
    role: 'client',
    company: 'Pharma Solutions Ltd',
    phone: '+91-9876543224',
    address: {
      street: '741 Pharma Complex',
      city: 'Gurgaon',
      state: 'Haryana',
      country: 'India',
      zipCode: '122001'
    }
  }
];

// Hash passwords
const hashPasswords = async (users) => {
  for (let user of users) {
    const salt = await bcrypt.genSalt(12);
    user.password = await bcrypt.hash(user.password, salt);
  }
  return users;
};

// Generate client IDs for client users
const generateClientIds = (users) => {
  return users.map(user => {
    if (user.role === 'client') {
      user.clientId = `CLI-${Math.random().toString(36).substr(2, 8).toUpperCase()}`;
    }
    return user;
  });
};

// Flush entire database
const flushDatabase = async () => {
  try {
    console.log('🗑️  Flushing entire database...');
    
    // Drop all collections
    const collections = await mongoose.connection.db.listCollections().toArray();
    
    for (let collection of collections) {
      await mongoose.connection.db.dropCollection(collection.name);
      console.log(`   ✅ Dropped collection: ${collection.name}`);
    }
    
    console.log('🗑️  Database flushed successfully');
  } catch (error) {
    console.error('❌ Error flushing database:', error);
    throw error;
  }
};

// Seed users only
const seedUsers = async () => {
  try {
    console.log('👥 Seeding user accounts...');

    // Hash passwords and generate client IDs
    let processedUsers = generateClientIds(sampleUsers);
    processedUsers = await hashPasswords(processedUsers);

    // Insert users
    const users = await User.insertMany(processedUsers);
    console.log(`✅ Created ${users.length} user accounts`);

    return users;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

// Main function
const flushAndSeedAccounts = async () => {
  try {
    console.log('🚀 Starting database flush and account seeding...');
    console.log('⚠️  WARNING: This will delete ALL data in the database!');
    
    await connectDB();

    // Flush entire database
    await flushDatabase();

    // Seed users only
    const users = await seedUsers();

    console.log('\n🎉 Database flush and account seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📦 Orders: 0 (not seeded)`);
    console.log(`   🚢 Containers: 0 (not seeded)`);

    console.log('\n📧 Demo Login Credentials:');
    console.log('👑 Admin: admin@demo.com / password');
    console.log('👷 Staff: staff@demo.com / password');
    console.log('👤 Client: client@demo.com / password');

    console.log('\n📋 Additional Client Users:');
    const clientUsers = users.filter(u => u.role === 'client');
    clientUsers.forEach(user => {
      console.log(`   ${user.name} (${user.company}): ${user.email} / password`);
    });

    console.log('\n✨ Database is now clean with only user accounts!');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  flushAndSeedAccounts();
}

module.exports = { flushAndSeedAccounts, sampleUsers };
