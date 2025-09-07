const mongoose = require('mongoose');
const Order = require('./server/models/Order');

// Connect to MongoDB
mongoose.connect('mongodb://localhost:27017/logistics-oms-new');

async function checkOrdersFromDB() {
  try {
    console.log('=== CHECKING ORDERS FROM DATABASE ===\n');
    
    // Get total count of orders
    const totalOrders = await Order.countDocuments();
    console.log(`Total Orders in DB: ${totalOrders}\n`);
    
    if (totalOrders === 0) {
      console.log('No orders found in database');
      return;
    }
    
    // Get orders with basic info
    const orders = await Order.find({})
      .select('orderNumber client supplier items status createdAt updatedAt')
      .populate('client', 'name')
      .populate('supplier', 'name')
      .sort({ createdAt: -1 })
      .limit(10);
    
    console.log('=== RECENT ORDERS (Last 10) ===');
    orders.forEach((order, index) => {
      console.log(`\n${index + 1}. Order: ${order.orderNumber}`);
      console.log(`   Client: ${order.client?.name || 'N/A'}`);
      console.log(`   Supplier: ${order.supplier?.name || 'N/A'}`);
      console.log(`   Status: ${order.status}`);
      console.log(`   Items Count: ${order.items?.length || 0}`);
      console.log(`   Created: ${order.createdAt}`);
      console.log(`   Updated: ${order.updatedAt}`);
    });
    
    // Check order statuses distribution
    console.log('\n=== ORDER STATUS DISTRIBUTION ===');
    const statusCounts = await Order.aggregate([
      {
        $group: {
          _id: '$status',
          count: { $sum: 1 }
        }
      },
      { $sort: { count: -1 } }
    ]);
    
    statusCounts.forEach(status => {
      console.log(`${status._id}: ${status.count} orders`);
    });
    
    // Check for orders with items
    console.log('\n=== ORDERS WITH ITEMS ANALYSIS ===');
    const ordersWithItems = await Order.find({ 'items.0': { $exists: true } })
      .select('orderNumber items')
      .limit(3);
    
    ordersWithItems.forEach((order, index) => {
      console.log(`\nOrder ${order.orderNumber} - Items (${order.items.length}):`);
      order.items.forEach((item, itemIndex) => {
        console.log(`  Item ${itemIndex + 1}:`);
        console.log(`    Description: ${item.description || 'N/A'}`);
        console.log(`    Quantity: ${item.quantity || 0}`);
        console.log(`    Cartons: ${item.cartons || 0}`);
        console.log(`    Unit Price: ${item.unitPrice || 0}`);
        console.log(`    Total Price: ${item.totalPrice || 0}`);
        console.log(`    QC Status: ${item.qcStatus || 'N/A'}`);
      });
    });
    
    // Check for potential issues
    console.log('\n=== POTENTIAL ISSUES CHECK ===');
    
    // Orders without client
    const ordersWithoutClient = await Order.countDocuments({ client: { $exists: false } });
    console.log(`Orders without client: ${ordersWithoutClient}`);
    
    // Orders without items
    const ordersWithoutItems = await Order.countDocuments({ $or: [{ items: { $exists: false } }, { items: { $size: 0 } }] });
    console.log(`Orders without items: ${ordersWithoutItems}`);
    
    // Orders with invalid status
    const validStatuses = ['draft', 'confirmed', 'processing', 'ready', 'partial_ready', 'shipped', 'delivered', 'cancelled'];
    const ordersWithInvalidStatus = await Order.countDocuments({ status: { $nin: validStatuses } });
    console.log(`Orders with invalid status: ${ordersWithInvalidStatus}`);
    
    console.log('\n=== DATABASE CHECK COMPLETE ===');
    
  } catch (error) {
    console.error('Error checking orders:', error);
  } finally {
    mongoose.connection.close();
  }
}

checkOrdersFromDB();