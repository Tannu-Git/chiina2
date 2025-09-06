const mongoose = require('mongoose');

// Import models
const User = require('./server/models/User');
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');
const ShippingCompany = require('./server/models/ShippingCompany');
const { PaymentTransaction, AccountBalance, Invoice } = require('./server/models/Payment');

// Payment Collection Schema (inline since it's defined in routes)
const paymentCollectionSchema = new mongoose.Schema({
  clientId: { type: String, required: true },
  clientName: { type: String, required: true },
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: false },
  containerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Container', required: false },
  totalAmount: { type: Number, required: true },
  receivedAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number, default: function() { return this.totalAmount - this.receivedAmount; } },
  paymentType: { type: String, enum: ['THROUGH_ME', 'CLIENT_DIRECT', 'MANUAL'], required: true },
  description: { type: String, default: 'Payment collection' },
  notes: { type: String },
  status: { type: String, enum: ['PENDING', 'PARTIAL', 'RECEIVED'], default: 'PENDING' },
  paymentHistory: [{
    amount: Number,
    receivedDate: { type: Date, default: Date.now },
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

const PaymentCollection = mongoose.model('PaymentCollection', paymentCollectionSchema);

// Connect to MongoDB
const connectDB = async () => {
  try {
    await mongoose.connect('mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');
  } catch (error) {
    console.error('❌ MongoDB connection error:', error);
    process.exit(1);
  }
};

// Get admin user ID
const getAdminUser = async () => {
  const adminUser = await User.findOne({ role: 'admin' });
  if (!adminUser) {
    throw new Error('No admin user found. Please run the main seed script first.');
  }
  return adminUser._id;
};

// Create sample containers with proper order allocations
const createContainers = async (adminUserId) => {
  console.log('🗑️ Clearing existing containers...');
  await Container.deleteMany({});

  console.log('📦 Creating containers with order allocations...');
  
  // Get existing orders
  const orders = await Order.find({}).limit(20);
  if (orders.length === 0) {
    throw new Error('No orders found. Please run the main seed script first.');
  }

  // Group orders by client for realistic container allocations
  const ordersByClient = {};
  orders.forEach(order => {
    if (!ordersByClient[order.clientId]) {
      ordersByClient[order.clientId] = [];
    }
    ordersByClient[order.clientId].push(order);
  });

  const containers = [];
  let containerIndex = 1;

  // Create containers for each client
  for (const [clientId, clientOrders] of Object.entries(ordersByClient)) {
    if (clientOrders.length === 0) continue;

    const clientName = clientOrders[0].clientName;
    const totalCbm = clientOrders.reduce((sum, order) => sum + (order.totalCbm || 0), 0);
    const totalWeight = clientOrders.reduce((sum, order) => sum + (order.totalWeight || 0), 0);
    const totalCarryingCharges = clientOrders.reduce((sum, order) => sum + (order.totalCarryingCharges || 0), 0);

    // Determine container type based on volume
    let containerType = '20ft';
    let maxCbm = 28;
    let maxWeight = 25000;
    
    if (totalCbm > 28) {
      containerType = '40ft';
      maxCbm = 58;
      maxWeight = 27000;
    }

    const container = {
      realContainerId: `CONT-${String(containerIndex).padStart(3, '0')}`,
      clientFacingId: `C${String(containerIndex).padStart(3, '0')}`,
      type: containerType,
      maxWeight: maxWeight,
      maxCbm: maxCbm,
      currentWeight: totalWeight,
      currentCbm: totalCbm,
      status: 'loading',
      orders: clientOrders.map(order => {
        // Get payment type from order items (use THROUGH_ME as default per specs)
        const paymentType = order.items[0]?.paymentType || 'THROUGH_ME';
        
        return {
          orderId: order._id,
          clientId: order.clientId,
          clientName: order.clientName, // Required field
          cbmShare: order.totalCbm || 0,
          weightShare: order.totalWeight || 0,
          cartonShare: order.totalCartons || 0,
          paymentType: paymentType, // Required field
          partialAllocation: {
            isPartial: false,
            allocatedQuantity: order.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
            totalQuantity: order.items.reduce((sum, item) => sum + (item.quantity || 0), 0),
            allocatedCartons: order.totalCartons || 0,
            totalCartons: order.totalCartons || 0
          }
        };
      }),
      baseCharges: {
        gst: Math.round(totalCarryingCharges * 0.18), // 18% GST
        duty: Math.round(totalCarryingCharges * 0.10), // 10% duty
        misc: Math.round(Math.random() * 5000) + 1000, // Random misc charges
        extraCharge: Math.round(Math.random() * 2000),
        currency: 'INR'
      },
      createdBy: adminUserId
    };

    containers.push(container);
    containerIndex++;
    
    if (containerIndex > 8) break; // Limit to 8 containers
  }

  // Save containers
  for (const containerData of containers) {
    const container = new Container(containerData);
    await container.save();
    console.log(`   📦 Created container: ${container.realContainerId} for ${container.orders.length} orders`);
  }

  console.log(`✅ Created ${containers.length} containers`);
  return containers;
};

// Create payment collections based on containers
const createPaymentCollections = async (adminUserId) => {
  console.log('🗑️ Clearing existing payment collections...');
  await PaymentCollection.deleteMany({});

  console.log('💰 Creating payment collections...');
  
  const containers = await Container.find({}).populate('orders.orderId');
  let collectionsCreated = 0;

  for (const container of containers) {
    for (const containerOrder of container.orders) {
      const order = await Order.findById(containerOrder.orderId);
      if (!order) continue;

      // Calculate total amount based on payment type
      let totalAmount = order.totalCarryingCharges || 0; // Always include carrying charges
      
      if (containerOrder.paymentType === 'THROUGH_ME') {
        // For THROUGH_ME: carrying charges + product cost
        const productCost = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        totalAmount += productCost;
      }

      if (totalAmount === 0) continue;

      // Create payment collection record
      const paymentCollection = new PaymentCollection({
        clientId: containerOrder.clientId,
        clientName: containerOrder.clientName,
        orderId: order._id,
        containerId: container._id,
        totalAmount: totalAmount,
        receivedAmount: Math.random() > 0.7 ? Math.round(totalAmount * (0.3 + Math.random() * 0.5)) : 0, // Some random payments
        paymentType: containerOrder.paymentType,
        description: `Payment for order ${order.orderNumber} in container ${container.realContainerId}`,
        notes: `Container: ${container.realContainerId}, Payment Type: ${containerOrder.paymentType}`,
        status: 'PENDING',
        createdBy: adminUserId
      });

      // Add some payment history for variety
      if (paymentCollection.receivedAmount > 0) {
        paymentCollection.paymentHistory.push({
          amount: paymentCollection.receivedAmount,
          receivedDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000), // Random date within last 30 days
          notes: 'Partial payment received',
          recordedBy: adminUserId
        });
        paymentCollection.status = paymentCollection.receivedAmount >= paymentCollection.totalAmount ? 'RECEIVED' : 'PARTIAL';
      }

      await paymentCollection.save();
      collectionsCreated++;
    }
  }

  console.log(`✅ Created ${collectionsCreated} payment collection records`);
  return collectionsCreated;
};

// Create payment transactions based on collections
const createPaymentTransactions = async (adminUserId) => {
  console.log('🗑️ Clearing existing payment transactions...');
  await PaymentTransaction.deleteMany({});

  console.log('💳 Creating payment transactions...');
  
  const paymentCollections = await PaymentCollection.find({});
  let transactionsCreated = 0;

  for (const collection of paymentCollections) {
    // Create invoice transaction for each collection
    const invoiceTransaction = new PaymentTransaction({
      type: 'INVOICE_GENERATED',
      paymentMethod: 'BANK_TRANSFER',
      amount: collection.totalAmount,
      currency: 'INR',
      party: {
        id: collection.clientId,
        name: collection.clientName,
        type: 'CLIENT'
      },
      references: {
        orderId: collection.orderId,
        containerId: collection.containerId
      },
      status: 'COMPLETED',
      paymentDate: new Date(Date.now() - Math.random() * 45 * 24 * 60 * 60 * 1000), // Random date within last 45 days
      description: `Invoice for ${collection.description}`,
      notes: `Payment type: ${collection.paymentType}`,
      createdBy: adminUserId
    });

    await invoiceTransaction.save();
    transactionsCreated++;

    // Create payment received transaction if money was received
    if (collection.receivedAmount > 0) {
      const paymentTransaction = new PaymentTransaction({
        type: 'PAYMENT_RECEIVED',
        paymentMethod: ['BANK_TRANSFER', 'UPI', 'CASH', 'CHEQUE'][Math.floor(Math.random() * 4)],
        amount: collection.receivedAmount,
        currency: 'INR',
        party: {
          id: collection.clientId,
          name: collection.clientName,
          type: 'CLIENT'
        },
        references: {
          orderId: collection.orderId,
          containerId: collection.containerId
        },
        status: 'COMPLETED',
        paymentDate: new Date(Date.now() - Math.random() * 15 * 24 * 60 * 60 * 1000), // Random date within last 15 days
        description: `Payment received for ${collection.description}`,
        notes: `Partial payment of ₹${collection.receivedAmount}`,
        bankDetails: {
          accountNumber: '****1234',
          bankName: 'HDFC Bank',
          transactionReference: `TXN${Date.now()}${Math.random().toString(36).substr(2, 4).toUpperCase()}`
        },
        createdBy: adminUserId
      });

      await paymentTransaction.save();
      transactionsCreated++;
    }

    // Create some supplier payment transactions for THROUGH_ME orders
    if (collection.paymentType === 'THROUGH_ME') {
      const order = await Order.findById(collection.orderId);
      if (order) {
        const supplierPayment = order.items.reduce((sum, item) => sum + (item.totalPrice || 0), 0);
        
        const supplierTransaction = new PaymentTransaction({
          type: 'PAYMENT_MADE',
          paymentMethod: 'BANK_TRANSFER',
          amount: supplierPayment,
          currency: 'INR',
          party: {
            id: `supplier_${order.items[0]?.supplier?.name?.replace(/\s+/g, '_').toLowerCase() || 'default'}`,
            name: order.items[0]?.supplier?.name || 'Default Supplier',
            type: 'SUPPLIER'
          },
          references: {
            orderId: collection.orderId,
            containerId: collection.containerId
          },
          status: Math.random() > 0.3 ? 'COMPLETED' : 'PENDING',
          paymentDate: new Date(Date.now() - Math.random() * 20 * 24 * 60 * 60 * 1000),
          description: `Supplier payment for order ${order.orderNumber}`,
          notes: `Product payment to supplier`,
          createdBy: adminUserId
        });

        await supplierTransaction.save();
        transactionsCreated++;
      }
    }
  }

  console.log(`✅ Created ${transactionsCreated} payment transactions`);
  return transactionsCreated;
};

// Create account balances
const createAccountBalances = async (adminUserId) => {
  console.log('🗑️ Clearing existing account balances...');
  await AccountBalance.deleteMany({});

  console.log('📊 Creating account balances...');
  
  const transactions = await PaymentTransaction.find({});
  const balanceMap = new Map();

  // Calculate balances from transactions
  for (const transaction of transactions) {
    const partyKey = transaction.party.id;
    
    if (!balanceMap.has(partyKey)) {
      balanceMap.set(partyKey, {
        party: transaction.party,
        inrCredit: 0,
        inrDebit: 0,
        inrBalance: 0
      });
    }

    const balance = balanceMap.get(partyKey);
    
    if (['PAYMENT_RECEIVED', 'INVOICE_GENERATED'].includes(transaction.type)) {
      balance.inrCredit += transaction.amount;
      balance.inrBalance += transaction.amount;
    } else if (['PAYMENT_MADE', 'REFUND'].includes(transaction.type)) {
      balance.inrDebit += transaction.amount;
      balance.inrBalance -= transaction.amount;
    }
  }

  // Save account balances
  let balancesCreated = 0;
  for (const [partyId, balanceData] of balanceMap) {
    const accountBalance = new AccountBalance({
      party: balanceData.party,
      balances: {
        INR: {
          credit: balanceData.inrCredit,
          debit: balanceData.inrDebit,
          balance: balanceData.inrBalance
        },
        USD: {
          credit: 0,
          debit: 0,
          balance: 0
        }
      },
      lastTransactionDate: new Date(),
      creditLimit: {
        INR: balanceData.party.type === 'CLIENT' ? 100000 : 50000,
        USD: balanceData.party.type === 'CLIENT' ? 1200 : 600
      },
      paymentTerms: balanceData.party.type === 'CLIENT' ? 'NET_30' : 'NET_15'
    });

    await accountBalance.save();
    balancesCreated++;
  }

  console.log(`✅ Created ${balancesCreated} account balances`);
  return balancesCreated;
};

// Create some sample invoices
const createInvoices = async (adminUserId) => {
  console.log('🗑️ Clearing existing invoices...');
  await Invoice.deleteMany({});

  console.log('📄 Creating sample invoices...');
  
  const paymentCollections = await PaymentCollection.find({ paymentType: 'THROUGH_ME' }).limit(10);
  let invoicesCreated = 0;

  for (const collection of paymentCollections) {
    const order = await Order.findById(collection.orderId);
    if (!order) continue;

    const subtotal = collection.totalAmount;
    const taxAmount = Math.round(subtotal * 0.18); // 18% GST
    const totalAmount = subtotal + taxAmount;

    const invoice = new Invoice({
      party: {
        id: collection.clientId,
        name: collection.clientName,
        type: 'CLIENT',
        address: '123 Business Street, City, State, ZIP',
        contactInfo: {
          email: `${collection.clientName.toLowerCase().replace(/\s+/g, '.')}@example.com`,
          phone: '+91-9876543210'
        }
      },
      items: [{
        description: `Logistics services for order ${order.orderNumber}`,
        quantity: 1,
        unitPrice: subtotal,
        totalPrice: subtotal,
        orderId: collection.orderId,
        containerId: collection.containerId
      }],
      amounts: {
        subtotal: subtotal,
        taxAmount: taxAmount,
        discountAmount: 0,
        totalAmount: totalAmount
      },
      currency: 'INR',
      status: collection.status === 'RECEIVED' ? 'PAID' : 'SENT',
      dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000), // 30 days from now
      paidAmount: collection.receivedAmount,
      notes: `Invoice for ${collection.description}`,
      createdBy: adminUserId
    });

    if (collection.receivedAmount > 0) {
      invoice.paidDate = new Date();
    }

    await invoice.save();
    invoicesCreated++;
  }

  console.log(`✅ Created ${invoicesCreated} invoices`);
  return invoicesCreated;
};

// Main restoration function
const restoreDatabase = async () => {
  try {
    console.log('🚀 Starting database restoration...');
    
    await connectDB();
    
    // Get admin user
    const adminUserId = await getAdminUser();
    console.log(`👤 Using admin user: ${adminUserId}`);

    // Create all financial data
    await createContainers(adminUserId);
    await createPaymentCollections(adminUserId);
    await createPaymentTransactions(adminUserId);
    await createAccountBalances(adminUserId);
    await createInvoices(adminUserId);

    console.log('\n🎉 Database restoration completed successfully!');
    console.log('\n📊 Summary:');
    
    // Get final counts
    const counts = {
      users: await User.countDocuments(),
      orders: await Order.countDocuments(),
      containers: await Container.countDocuments(),
      paymentCollections: await PaymentCollection.countDocuments(),
      paymentTransactions: await PaymentTransaction.countDocuments(),
      accountBalances: await AccountBalance.countDocuments(),
      invoices: await Invoice.countDocuments()
    };
    
    Object.entries(counts).forEach(([key, count]) => {
      console.log(`   ${key}: ${count}`);
    });

    console.log('\n✅ Transaction page should now work properly with real data!');
    
  } catch (error) {
    console.error('❌ Database restoration failed:', error);
  } finally {
    await mongoose.disconnect();
    console.log('📱 Disconnected from MongoDB');
  }
};

// Run the restoration
restoreDatabase();