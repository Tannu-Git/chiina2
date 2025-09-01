// Container Cleanup and QC Fix Script
const mongoose = require('mongoose');
require('dotenv').config();

// Import models
const Container = require('./server/models/Container');
const Order = require('./server/models/Order');

async function connectToDatabase() {
  try {
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
}

async function removeAllContainers() {
  try {
    console.log('🗑️ Removing all existing containers...');
    
    // First, let's see what containers exist
    const existingContainers = await Container.find({});
    console.log(`📦 Found ${existingContainers.length} existing containers:`);
    
    existingContainers.forEach((container, index) => {
      console.log(`  ${index + 1}. ${container.realContainerId} (${container.type}) - Status: ${container.status}`);
    });
    
    if (existingContainers.length > 0) {
      // Remove all containers
      const deleteResult = await Container.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} containers`);
      
      // Update orders to remove container references
      const orderUpdateResult = await Order.updateMany(
        { containerId: { $exists: true } },
        { 
          $unset: { containerId: 1 },
          $set: { status: 'ready' } // Reset to ready status for reallocation
        }
      );
      console.log(`✅ Updated ${orderUpdateResult.modifiedCount} orders (removed container references)`);
    } else {
      console.log('ℹ️ No containers to remove');
    }
    
  } catch (error) {
    console.error('❌ Error removing containers:', error);
  }
}

async function checkQCReadyOrders() {
  try {
    console.log('\n🔍 Checking QC ready orders...');
    
    // Check orders that should be QC ready
    const qcReadyFilter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true }
    };
    
    const qcReadyOrders = await Order.find(qcReadyFilter);
    console.log(`📋 Found ${qcReadyOrders.length} QC ready orders:`);
    
    qcReadyOrders.forEach((order, index) => {
      console.log(`  ${index + 1}. ${order.orderNumber} - ${order.clientName} (${order.status})`);
      console.log(`     Items: ${order.items.length}, CBM: ${order.totalCbm}, Weight: ${order.totalWeight}`);
    });
    
    if (qcReadyOrders.length === 0) {
      console.log('⚠️ No QC ready orders found. Let\'s check all orders...');
      
      const allOrders = await Order.find({ isLoopBack: { $ne: true } });
      console.log(`📊 Total orders in system: ${allOrders.length}`);
      
      const ordersByStatus = {};
      allOrders.forEach(order => {
        ordersByStatus[order.status] = (ordersByStatus[order.status] || 0) + 1;
      });
      
      console.log('📈 Orders by status:');
      Object.entries(ordersByStatus).forEach(([status, count]) => {
        console.log(`  ${status}: ${count}`);
      });
      
      // Create some test ready orders if none exist
      if (allOrders.length > 0) {
        console.log('\n🔧 Creating test QC ready orders...');
        
        const testOrders = allOrders.slice(0, 3); // Take first 3 orders
        for (const order of testOrders) {
          order.status = 'ready';
          order.qcCompletedAt = new Date();
          order.qcInspector = order.createdBy; // Use creator as inspector
          
          // Set QC status for items
          order.items.forEach(item => {
            item.qcStatus = 'completed';
            item.qcPassedQuantity = item.quantity;
            item.qcPassedCartons = item.cartons;
          });
          
          await order.save();
          console.log(`✅ Updated ${order.orderNumber} to ready status`);
        }
      }
    }
    
  } catch (error) {
    console.error('❌ Error checking QC ready orders:', error);
  }
}

async function testQCReadyAPI() {
  try {
    console.log('\n🧪 Testing QC Ready Orders API simulation...');
    
    // Simulate the API logic
    const filter = {
      status: { $in: ['ready', 'partial_ready'] },
      isLoopBack: { $ne: true },
      $or: [
        { 'items.qcStatus': 'completed' },
        { 'items.qcStatus': 'partial' }
      ]
    };
    
    const orders = await Order.find(filter)
      .populate('createdBy', 'name')
      .sort({ qcCompletedAt: -1, createdAt: -1 })
      .lean();
    
    console.log(`🔍 API simulation found ${orders.length} orders`);
    
    if (orders.length === 0) {
      console.log('⚠️ No orders match QC ready criteria. Checking individual conditions...');
      
      // Check status condition
      const statusOrders = await Order.find({
        status: { $in: ['ready', 'partial_ready'] },
        isLoopBack: { $ne: true }
      });
      console.log(`  Orders with ready/partial_ready status: ${statusOrders.length}`);
      
      // Check QC status condition
      const qcStatusOrders = await Order.find({
        $or: [
          { 'items.qcStatus': 'completed' },
          { 'items.qcStatus': 'partial' }
        ]
      });
      console.log(`  Orders with QC status: ${qcStatusOrders.length}`);
    }
    
  } catch (error) {
    console.error('❌ Error testing API:', error);
  }
}

async function main() {
  console.log('🚀 Starting Container Cleanup and QC Fix Script');
  console.log('=====================================\n');
  
  await connectToDatabase();
  
  console.log('Step 1: Remove all existing containers');
  console.log('--------------------------------------');
  await removeAllContainers();
  
  console.log('\nStep 2: Check QC ready orders');
  console.log('-----------------------------');
  await checkQCReadyOrders();
  
  console.log('\nStep 3: Test QC Ready API logic');
  console.log('-------------------------------');
  await testQCReadyAPI();
  
  console.log('\n✅ Script completed successfully!');
  console.log('\n📝 Next steps:');
  console.log('1. Start your server: npm start');
  console.log('2. Test the QC ready orders API: GET /api/warehouse/qc-ready-orders');
  console.log('3. Use the simplified container allocation component');
  
  await mongoose.disconnect();
  console.log('👋 Disconnected from MongoDB');
}

// Run the script
main().catch(error => {
  console.error('❌ Script failed:', error);
  process.exit(1);
});