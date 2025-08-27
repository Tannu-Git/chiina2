const mongoose = require('mongoose');
require('dotenv').config({ path: './server/.env' });

// Import models
const Order = require('./server/models/Order');
const User = require('./server/models/User');

// Connect to MongoDB
const connectDB = async () => {
  try {
    const uri = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms';
    console.log('Connecting to:', uri);
    await mongoose.connect(uri);
    console.log('✅ Connected to MongoDB');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    return false;
  }
};

// Check existing data
const checkData = async () => {
  try {
    const orderCount = await Order.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log(`📊 Current data: ${orderCount} orders, ${userCount} users`);
    
    // Count orders by status
    const statusCounts = await Order.aggregate([
      { $group: { _id: '$status', count: { $sum: 1 } } }
    ]);
    
    console.log('📈 Orders by status:');
    statusCounts.forEach(status => {
      console.log(`  - ${status._id}: ${status.count}`);
    });
    
    // Check warehouse-ready orders
    const warehouseOrders = await Order.find({
      status: { $in: ['confirmed', 'in_production', 'ready'] }
    }).limit(5);
    
    console.log(`🏭 Warehouse-ready orders: ${warehouseOrders.length}`);
    warehouseOrders.forEach(order => {
      console.log(`  - ${order.orderNumber} (${order.status}) - ${order.clientName}`);
    });
    
    // Check loop-back orders
    const loopBackOrders = await Order.find({ isLoopBack: true }).limit(5);
    console.log(`🔄 Loop-back orders: ${loopBackOrders.length}`);
    
    return { orderCount, userCount, warehouseOrders: warehouseOrders.length };
  } catch (error) {
    console.error('❌ Error checking data:', error);
    return null;
  }
};

// Create some test orders if none exist
const createTestOrders = async () => {
  try {
    // Find or create a test user
    let testUser = await User.findOne({ email: 'admin@demo.com' });
    if (!testUser) {
      const bcrypt = require('bcryptjs');
      const salt = await bcrypt.genSalt(12);
      testUser = new User({
        name: 'Test Admin',
        email: 'admin@demo.com',
        password: await bcrypt.hash('password', salt),
        role: 'admin',
        permissions: ['view_all_orders', 'edit_orders']
      });
      await testUser.save();
      console.log('✅ Created test user');
    }

    // Create test orders with warehouse statuses
    const testOrders = [
      {
        orderNumber: 'ORD-WH001',
        clientId: 'CLI-TEST001',
        clientName: 'Test Client A',
        items: [{
          itemCode: 'ITEM001',
          description: 'Test Product 1',
          quantity: 100,
          unitPrice: 50,
          totalPrice: 5000,
          unitWeight: 2,
          unitCbm: 0.1,
          cartons: 10,
          paymentType: 'CLIENT_DIRECT',
          carryingCharge: {
            basis: 'carton',
            rate: 10,
            amount: 100
          }
        }],
        totalAmount: 5000,
        totalCarryingCharges: 100,
        totalWeight: 200,
        totalCbm: 10,
        totalCartons: 10,
        status: 'confirmed',
        priority: 'medium',
        deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        createdBy: testUser._id
      },
      {
        orderNumber: 'ORD-WH002',
        clientId: 'CLI-TEST002',
        clientName: 'Test Client B',
        items: [{
          itemCode: 'ITEM002',
          description: 'Test Product 2',
          quantity: 50,
          unitPrice: 100,
          totalPrice: 5000,
          unitWeight: 5,
          unitCbm: 0.2,
          cartons: 5,
          paymentType: 'THROUGH_ME',
          carryingCharge: {
            basis: 'cbm',
            rate: 50,
            amount: 50
          }
        }],
        totalAmount: 5000,
        totalCarryingCharges: 50,
        totalWeight: 250,
        totalCbm: 10,
        totalCartons: 5,
        status: 'in_production',
        priority: 'high',
        deadline: new Date(Date.now() + 5 * 24 * 60 * 60 * 1000),
        createdBy: testUser._id
      },
      {
        orderNumber: 'ORD-WH003',
        clientId: 'CLI-TEST003',
        clientName: 'Test Client C',
        items: [{
          itemCode: 'ITEM003',
          description: 'Test Product 3',
          quantity: 75,
          unitPrice: 80,
          totalPrice: 6000,
          unitWeight: 3,
          unitCbm: 0.15,
          cartons: 8,
          paymentType: 'CLIENT_DIRECT',
          carryingCharge: {
            basis: 'weight',
            rate: 5,
            amount: 90
          }
        }],
        totalAmount: 6000,
        totalCarryingCharges: 90,
        totalWeight: 225,
        totalCbm: 11.25,
        totalCartons: 8,
        status: 'ready',
        priority: 'low',
        deadline: new Date(Date.now() + 10 * 24 * 60 * 60 * 1000),
        createdBy: testUser._id
      }
    ];

    // Insert test orders
    for (const orderData of testOrders) {
      const existingOrder = await Order.findOne({ orderNumber: orderData.orderNumber });
      if (!existingOrder) {
        await Order.create(orderData);
        console.log(`✅ Created test order: ${orderData.orderNumber}`);
      } else {
        console.log(`⚠️  Order already exists: ${orderData.orderNumber}`);
      }
    }

    // Create a test loop-back order
    const loopBackOrder = {
      orderNumber: 'ORD-LB001',
      clientId: 'CLI-TEST001',
      clientName: 'Test Client A',
      items: [{
        itemCode: 'ITEM001-DAMAGED',
        description: 'Damaged Test Product 1',
        quantity: 10,
        unitPrice: 50,
        totalPrice: 500,
        unitWeight: 2,
        unitCbm: 0.1,
        cartons: 1,
        paymentType: 'CLIENT_DIRECT',
        carryingCharge: {
          basis: 'carton',
          rate: 10,
          amount: 10
        },
        notes: 'Replacement for damaged items'
      }],
      totalAmount: 500,
      totalCarryingCharges: 10,
      totalWeight: 20,
      totalCbm: 1,
      totalCartons: 1,
      status: 'pending',
      priority: 'high',
      isLoopBack: true,
      loopBackReason: 'DAMAGE',
      deadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
      createdBy: testUser._id
    };

    const existingLoopBack = await Order.findOne({ orderNumber: loopBackOrder.orderNumber });
    if (!existingLoopBack) {
      await Order.create(loopBackOrder);
      console.log(`✅ Created test loop-back order: ${loopBackOrder.orderNumber}`);
    } else {
      console.log(`⚠️  Loop-back order already exists: ${loopBackOrder.orderNumber}`);
    }

    return true;
  } catch (error) {
    console.error('❌ Error creating test orders:', error);
    return false;
  }
};

// Main function
const main = async () => {
  console.log('🧪 Testing warehouse data...\n');
  
  const connected = await connectDB();
  if (!connected) {
    process.exit(1);
  }

  const dataInfo = await checkData();
  
  if (dataInfo && dataInfo.warehouseOrders === 0) {
    console.log('\n🔧 No warehouse orders found, creating test data...');
    await createTestOrders();
    console.log('\n📊 Rechecking data after creation...');
    await checkData();
  }

  await mongoose.disconnect();
  console.log('\n✅ Test completed');
};

main();