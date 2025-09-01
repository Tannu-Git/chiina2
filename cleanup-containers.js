// Simple Container Cleanup Script
const mongoose = require('mongoose');

// Connect to MongoDB
async function connectDB() {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ Connection failed:', error);
    process.exit(1);
  }
}

// Container Schema (simplified)
const containerSchema = new mongoose.Schema({
  realContainerId: String,
  clientFacingId: String,
  type: String,
  status: String
}, { timestamps: true });

const Container = mongoose.model('Container', containerSchema);

// Order Schema (simplified)
const orderSchema = new mongoose.Schema({
  orderNumber: String,
  status: String,
  containerId: mongoose.Schema.Types.ObjectId
}, { timestamps: true });

const Order = mongoose.model('Order', orderSchema);

async function cleanupContainers() {
  try {
    console.log('🗑️ Starting container cleanup...');
    
    // Find all containers
    const containers = await Container.find({});
    console.log(`📦 Found ${containers.length} containers to remove:`);
    
    containers.forEach((container, index) => {
      console.log(`  ${index + 1}. ${container.realContainerId || container.clientFacingId} (${container.type || 'unknown'}) - ${container.status}`);
    });
    
    if (containers.length > 0) {
      // Remove all containers
      const deleteResult = await Container.deleteMany({});
      console.log(`✅ Deleted ${deleteResult.deletedCount} containers`);
      
      // Reset orders that were allocated to containers
      const orderUpdate = await Order.updateMany(
        { containerId: { $exists: true } },
        { 
          $unset: { containerId: 1 },
          $set: { status: 'ready' }
        }
      );
      console.log(`✅ Reset ${orderUpdate.modifiedCount} orders to ready status`);
      
      console.log('\n🎉 Cleanup completed successfully!');
      console.log('\n📋 Summary:');
      console.log(`- Removed containers: ${deleteResult.deletedCount}`);
      console.log(`- Reset orders: ${orderUpdate.modifiedCount}`);
      console.log('\n✨ Your system is now clean and ready for new container allocations!');
      
    } else {
      console.log('ℹ️ No containers found to remove');
    }
    
  } catch (error) {
    console.error('❌ Cleanup failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('👋 Disconnected from MongoDB');
  }
}

// Run cleanup
connectDB().then(cleanupContainers);