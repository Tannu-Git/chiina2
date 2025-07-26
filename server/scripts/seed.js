const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
require('dotenv').config();

// Import models
const User = require('../models/User');
const Order = require('../models/Order');
const Container = require('../models/Container');

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

// Sample users data
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
      street: '789 Trade Center',
      city: 'Bangalore',
      state: 'Karnataka',
      country: 'India',
      zipCode: '560001'
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
      street: '321 Export House',
      city: 'Chennai',
      state: 'Tamil Nadu',
      country: 'India',
      zipCode: '600001'
    }
  },
  {
    name: 'Sneha Reddy',
    email: 'sneha@techimports.com',
    password: 'password',
    role: 'client',
    company: 'Tech Imports & Exports',
    phone: '+91-9876543219',
    address: {
      street: '654 IT Park',
      city: 'Hyderabad',
      state: 'Telangana',
      country: 'India',
      zipCode: '500001'
    }
  },
  {
    name: 'Vikram Singh',
    email: 'vikram@fashionworld.com',
    password: 'password',
    role: 'client',
    company: 'Fashion World International',
    phone: '+91-9876543220',
    address: {
      street: '987 Fashion Street',
      city: 'Pune',
      state: 'Maharashtra',
      country: 'India',
      zipCode: '411001'
    }
  },
  {
    name: 'Kavya Nair',
    email: 'kavya@spicetraders.com',
    password: 'password',
    role: 'client',
    company: 'Spice Traders Kerala',
    phone: '+91-9876543221',
    address: {
      street: '147 Spice Market',
      city: 'Kochi',
      state: 'Kerala',
      country: 'India',
      zipCode: '682001'
    }
  },
  {
    name: 'Arjun Gupta',
    email: 'arjun@electronicsplus.com',
    password: 'password',
    role: 'client',
    company: 'Electronics Plus',
    phone: '+91-9876543222',
    address: {
      street: '258 Electronics Hub',
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

// Seed users
const seedUsers = async () => {
  try {
    // Clear existing users
    await User.deleteMany({});
    console.log('🗑️  Cleared existing users');

    // Hash passwords and generate client IDs
    let processedUsers = generateClientIds(sampleUsers);
    processedUsers = await hashPasswords(processedUsers);

    // Insert users
    const users = await User.insertMany(processedUsers);
    console.log(`✅ Created ${users.length} users`);

    return users;
  } catch (error) {
    console.error('❌ Error seeding users:', error);
    throw error;
  }
};

// Sample orders data
const createSampleOrders = async (users) => {
  const clientUsers = users.filter(u => u.role === 'client');
  const staffUsers = users.filter(u => u.role === 'staff');

  const sampleOrders = [];

  // Create orders for each client
  for (let i = 0; i < clientUsers.length; i++) {
    const client = clientUsers[i];
    const createdBy = staffUsers[Math.floor(Math.random() * staffUsers.length)];

    // Create 2-3 orders per client
    const orderCount = Math.floor(Math.random() * 2) + 2;

    for (let j = 0; j < orderCount; j++) {
      const orderNumber = `ORD-${(i * 10 + j + 1).toString().padStart(6, '0')}`;

      const items = [
        {
          itemCode: `ITEM-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
          description: `Sample Product ${j + 1} for ${client.company}`,
          quantity: Math.floor(Math.random() * 100) + 10,
          unitPrice: Math.floor(Math.random() * 1000) + 100,
          unitWeight: Math.floor(Math.random() * 10) + 1,
          unitCbm: Math.random() * 2 + 0.5,
          cartons: Math.floor(Math.random() * 20) + 5,
          supplier: {
            name: `Supplier ${j + 1}`,
            contact: '+91-9876543200',
            email: `supplier${j + 1}@example.com`
          },
          paymentType: Math.random() > 0.5 ? 'CLIENT_DIRECT' : 'THROUGH_ME',
          carryingCharge: {
            basis: ['carton', 'cbm', 'weight'][Math.floor(Math.random() * 3)],
            rate: Math.floor(Math.random() * 50) + 10,
            amount: 0 // Will be calculated
          },
          status: ['pending', 'confirmed', 'in_production', 'ready'][Math.floor(Math.random() * 4)]
        }
      ];

      // Calculate carrying charge amount
      items.forEach(item => {
        switch(item.carryingCharge.basis) {
          case 'carton':
            item.carryingCharge.amount = item.carryingCharge.rate * item.cartons;
            break;
          case 'cbm':
            item.carryingCharge.amount = item.carryingCharge.rate * (item.unitCbm * item.cartons);
            break;
          case 'weight':
            item.carryingCharge.amount = item.carryingCharge.rate * (item.unitWeight * item.cartons);
            break;
        }
        item.totalPrice = item.quantity * item.unitPrice;
      });

      // Calculate totals manually
      const totalAmount = items.reduce((sum, item) => sum + item.totalPrice, 0);
      const totalCarryingCharges = items.reduce((sum, item) => sum + item.carryingCharge.amount, 0);
      const totalWeight = items.reduce((sum, item) => sum + (item.unitWeight * item.quantity), 0);
      const totalCbm = items.reduce((sum, item) => sum + (item.unitCbm * item.quantity), 0);
      const totalCartons = items.reduce((sum, item) => sum + item.cartons, 0);

      sampleOrders.push({
        orderNumber,
        clientId: client.clientId,
        clientName: client.company,
        items,
        totalAmount,
        totalCarryingCharges,
        totalWeight,
        totalCbm,
        totalCartons,
        status: ['draft', 'submitted', 'confirmed', 'in_progress'][Math.floor(Math.random() * 4)],
        priority: ['low', 'medium', 'high'][Math.floor(Math.random() * 3)],
        deadline: new Date(Date.now() + Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within 30 days
        notes: `Sample order for ${client.company}`,
        createdBy: createdBy._id,
        createdAt: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000) // Random past date
      });
    }
  }

  return sampleOrders;
};

// Seed orders
const seedOrders = async (users) => {
  try {
    // Clear existing orders
    await Order.deleteMany({});
    console.log('🗑️  Cleared existing orders');

    // Create sample orders
    const sampleOrders = await createSampleOrders(users);

    // Insert orders
    const orders = await Order.insertMany(sampleOrders);
    console.log(`✅ Created ${orders.length} orders`);

    return orders;
  } catch (error) {
    console.error('❌ Error seeding orders:', error);
    throw error;
  }
};

// Sample containers data
const createSampleContainers = async (users, orders) => {
  const staffUsers = users.filter(u => u.role === 'staff');
  const sampleContainers = [];

  const containerTypes = ['20ft', '40ft', '40ft_hc', '45ft'];
  const statuses = ['planning', 'loading', 'sealed', 'shipped', 'in_transit', 'arrived'];

  for (let i = 0; i < 8; i++) {
    const type = containerTypes[Math.floor(Math.random() * containerTypes.length)];
    const capacityInfo = Container.getCapacityInfo(type);
    const createdBy = staffUsers[Math.floor(Math.random() * staffUsers.length)];

    // Select random orders for this container
    const containerOrders = orders.slice(i * 3, (i + 1) * 3).map(order => ({
      orderId: order._id,
      clientId: order.clientId,
      cbmShare: Math.random() * 10 + 5,
      weightShare: Math.random() * 1000 + 500,
      allocatedCharges: []
    }));

    const charges = [
      {
        name: 'Ocean Freight',
        type: 'fixed',
        value: Math.floor(Math.random() * 50000) + 30000,
        currency: 'INR',
        description: 'Ocean freight charges'
      },
      {
        name: 'Port Handling',
        type: 'fixed',
        value: Math.floor(Math.random() * 10000) + 5000,
        currency: 'INR',
        description: 'Port handling charges'
      },
      {
        name: 'Documentation',
        type: 'fixed',
        value: Math.floor(Math.random() * 5000) + 2000,
        currency: 'INR',
        description: 'Documentation charges'
      }
    ];

    sampleContainers.push({
      realContainerId: `MSKU${Math.random().toString(36).substr(2, 7).toUpperCase()}`,
      type,
      billNo: `BL-${Math.random().toString(36).substr(2, 8).toUpperCase()}`,
      sealNo: `SEAL-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
      maxWeight: capacityInfo.maxWeight,
      maxCbm: capacityInfo.maxCbm,
      currentWeight: containerOrders.reduce((sum, order) => sum + order.weightShare, 0),
      currentCbm: containerOrders.reduce((sum, order) => sum + order.cbmShare, 0),
      status: statuses[Math.floor(Math.random() * statuses.length)],
      charges,
      orders: containerOrders,
      location: {
        current: ['Mumbai Port', 'Chennai Port', 'JNPT', 'Warehouse A', 'In Transit'][Math.floor(Math.random() * 5)],
        lastUpdated: new Date()
      },
      estimatedArrival: new Date(Date.now() + Math.random() * 15 * 24 * 60 * 60 * 1000),
      createdBy: createdBy._id,
      createdAt: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000)
    });
  }

  return sampleContainers;
};

// Seed containers
const seedContainers = async (users, orders) => {
  try {
    // Clear existing containers
    await Container.deleteMany({});
    console.log('🗑️  Cleared existing containers');

    // Create sample containers
    const sampleContainers = await createSampleContainers(users, orders);

    // Insert containers
    const containers = await Container.insertMany(sampleContainers);

    // Calculate financials for each container
    for (let container of containers) {
      container.allocateCharges();
      container.calculateFinancials();
      await container.save();
    }

    console.log(`✅ Created ${containers.length} containers`);

    return containers;
  } catch (error) {
    console.error('❌ Error seeding containers:', error);
    throw error;
  }
};

// Main seeding function
const seedDatabase = async () => {
  try {
    console.log('🌱 Starting database seeding...');

    await connectDB();

    // Seed users
    const users = await seedUsers();

    // Seed orders
    const orders = await seedOrders(users);

    // Seed containers
    const containers = await seedContainers(users, orders);

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`   👥 Users: ${users.length}`);
    console.log(`   📦 Orders: ${orders.length}`);
    console.log(`   🚢 Containers: ${containers.length}`);

    console.log('\n📧 Demo Login Credentials:');
    console.log('👑 Admin: admin@demo.com / password');
    console.log('👷 Staff: staff@demo.com / password');
    console.log('👤 Client: client@demo.com / password');

    console.log('\n📋 Additional Client Users:');
    const clientUsers = users.filter(u => u.role === 'client');
    clientUsers.forEach(user => {
      console.log(`   ${user.name} (${user.company}): ${user.email} / password`);
    });

    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

// Run seeding if called directly
if (require.main === module) {
  seedDatabase();
}

module.exports = { seedDatabase, sampleUsers };
