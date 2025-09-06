# Complete Payment Management Flow - Logistics OMS

## Table of Contents
1. [System Overview](#system-overview)
2. [Frontend Architecture](#frontend-architecture)
3. [Backend Architecture](#backend-architecture)
4. [Database Schema](#database-schema)
5. [API Flow Details](#api-flow-details)
6. [Security & Authentication](#security--authentication)
7. [Error Handling](#error-handling)
8. [Performance Considerations](#performance-considerations)

---

## System Overview

### Architecture Pattern
The Logistics OMS implements a **API-driven RESTful architecture** with four distinct layers:
- **Routes Layer**: Express.js REST endpoints
- **Middleware Layer**: Authentication, authorization, audit logging
- **Service Layer**: Business logic processing
- **Model Layer**: Mongoose ODM with MongoDB

### Core Payment Components
```
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (React 18)                     │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ TransactionMgmt │ │ PaymentCollect  │ │ FinancialDash   │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ HTTP/REST
┌─────────────────────────────────────────────────────────────┐
│                    BACKEND (Express.js)                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Auth Middleware │ │ Audit Logger    │ │ Security        │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Payment Routes  │ │ Financial API   │ │ Collection API  │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
                              │
                              ▼ Mongoose ODM
┌─────────────────────────────────────────────────────────────┐
│                      DATABASE (MongoDB)                    │
├─────────────────────────────────────────────────────────────┤
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ Orders          │ │ Containers      │ │ Users           │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
│ ┌─────────────────┐ ┌─────────────────┐ ┌─────────────────┐ │
│ │ PaymentCollect  │ │ PaymentTxns     │ │ AuditLogs       │ │
│ └─────────────────┘ └─────────────────┘ └─────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

---

## Frontend Architecture

### Route Configuration (`App.jsx`)
```javascript
// Financial Routes with Role-Based Access Control
<Route path="/financials/transactions" element={
  <ProtectedRoute requiredRole="admin">
    <DashboardLayout>
      <TransactionManagement />
    </DashboardLayout>
  </ProtectedRoute>
} />
```

### Authentication Flow
```javascript
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated } = useAuthStore()

  // Step 1: Check if user is authenticated
  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  // Step 2: Check role-based access
  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}
```

### State Management (Zustand)
```javascript
// Auth Store Structure
const useAuthStore = create((set, get) => ({
  user: null,
  token: null,
  isAuthenticated: false,
  
  login: async (credentials) => {
    // JWT token management
    // User role validation
    // Session persistence
  },
  
  logout: () => {
    // Clear localStorage
    // Reset state
    // Navigate to login
  }
}))
```

### Component Hierarchy
```
TransactionManagement.jsx
├── Header Section
│   ├── Title & Description
│   ├── Refresh Button
│   └── Bulk Actions Dropdown
├── Summary Cards (4 cards)
│   ├── Total Due Amount
│   ├── Number of Clients Owing
│   ├── Average Debt per Client
│   └── Collection Rate Percentage
├── Client Payment Cards
│   ├── Client Information
│   ├── Payment Breakdown
│   ├── Action Buttons
│   └── Status Indicators
└── Modal Components
    ├── Payment Recording Modal
    ├── Bulk Payment Modal
    └── Transaction Details Modal
```

---

## Backend Architecture

### Server Entry Point (`index.js`)
```javascript
// Middleware Chain Order (Critical for Security)
app.use(securityHeaders);           // 1. Security headers first
app.use(cors(corsOptions));         // 2. CORS configuration
app.use(express.json({ limit: '10mb' })); // 3. Body parsing
app.use(validateRequest);           // 4. Request validation
app.use(sanitizeAndValidateInput);  // 5. Input sanitization
app.use(sessionSecurity);           // 6. Session security
app.use('/api', auditMiddleware);   // 7. Audit logging

// Financial Routes with Special Audit
app.use('/api/payment-collections', auditFinancialMiddleware, require('./routes/payment-collections'));
app.use('/api/financials', auditFinancialMiddleware, require('./routes/financials'));
app.use('/api/financials-comprehensive', auditFinancialMiddleware, require('./routes/financials-comprehensive'));
```

### Authentication Middleware (`auth.js`)
```javascript
const auth = async (req, res, next) => {
  try {
    // Step 1: Extract Bearer token
    const token = req.header('Authorization')?.replace('Bearer ', '');
    
    if (!token) {
      return res.status(401).json({ message: 'No token, authorization denied' });
    }

    // Step 2: Verify JWT token
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    
    // Step 3: Find user in database
    const user = await User.findById(decoded.id).select('-password');
    
    if (!user) {
      return res.status(401).json({ message: 'Token is not valid' });
    }

    // Step 4: Check if account is active
    if (!user.isActive) {
      return res.status(401).json({ message: 'Account is deactivated' });
    }

    // Step 5: Attach user to request object
    req.user = user;
    next();
  } catch (error) {
    console.error('Auth middleware error:', error);
    res.status(401).json({ message: 'Token is not valid' });
  }
};
```

### Authorization Middleware
```javascript
const authorize = (...roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ message: 'Not authorized' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ 
        message: `Role ${req.user.role} is not authorized to access this resource` 
      });
    }

    next();
  };
};
```

---

## Database Schema

### Order Model Schema
```javascript
const orderSchema = new mongoose.Schema({
  orderNumber: { type: String, required: true, unique: true },
  clientId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  
  // Dual Tracking System (Primary: Cartons, Legacy: Quantity)
  qcPassedCartons: { type: Number, default: 0 },
  loopBackCartons: { type: Number, default: 0 },
  qcPassedQuantity: { type: Number, default: 0 }, // Calculated from cartons
  loopBackQuantity: { type: Number, default: 0 }, // Calculated from cartons
  
  // Financial Fields
  totalAmount: { type: Number, required: true },
  totalCarryingCharges: { type: Number, default: 0 },
  
  // Container Allocation
  containerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Container' },
  status: { 
    type: String, 
    enum: ['pending', 'processing', 'allocated', 'qc_passed', 'delivered', 'cancelled'],
    default: 'pending',
    index: true
  },
  
  // Items with Supplier Information
  items: [{
    itemCode: String,
    description: String,
    quantity: Number,
    unitPrice: Number,
    totalPrice: Number,
    supplier: {
      name: String,
      contact: String,
      email: String
    },
    paymentType: {
      type: String,
      enum: ['THROUGH_ME', 'CLIENT_DIRECT'],
      default: 'THROUGH_ME'
    }
  }],
  
  // Audit Trail
  createdAt: { type: Date, default: Date.now, index: true },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Compound Indexes for Performance
orderSchema.index({ clientId: 1, status: 1 });
orderSchema.index({ status: 1, qcStatus: 1 });
orderSchema.index({ createdAt: -1, clientId: 1 });
```

### Container Model Schema
```javascript
const containerSchema = new mongoose.Schema({
  realContainerId: { type: String, required: true, unique: true, index: true },
  clientFacingId: { type: String, required: true, unique: true },
  
  // Capacity Information
  type: { type: String, enum: ['20ft', '40ft', '40ft_hc'], required: true },
  maxCbm: { type: Number, required: true },
  maxWeight: { type: Number, required: true },
  currentCbm: { type: Number, default: 0 },
  currentWeight: { type: Number, default: 0 },
  currentCartons: { type: Number, default: 0 },
  
  // Order Allocations
  orders: [{
    orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order', required: true },
    clientId: { type: String, required: true },
    clientName: { type: String, required: true },
    cbmShare: { type: Number, default: 0 },
    weightShare: { type: Number, default: 0 },
    carryingCharges: { type: Number, default: 0 },
    paymentType: {
      type: String,
      enum: ['THROUGH_ME', 'CLIENT_DIRECT'],
      default: 'THROUGH_ME'
    },
    allocatedAt: { type: Date, default: Date.now }
  }],
  
  // Financial Calculations
  baseCharges: {
    gst: { type: Number, default: 0 },
    duty: { type: Number, default: 0 },
    misc: { type: Number, default: 0 },
    extraCharge: { type: Number, default: 0 },
    currency: { type: String, default: 'INR' }
  },
  
  // Payment Distribution
  paymentDistribution: {
    throughMe: {
      totalAmount: { type: Number, default: 0 },
      orderCount: { type: Number, default: 0 }
    },
    direct: {
      totalAmount: { type: Number, default: 0 },
      orderCount: { type: Number, default: 0 }
    }
  },
  
  // Shipping Company Reference
  shippingCompany: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'ShippingCompany'
  },
  
  status: { 
    type: String, 
    enum: ['active', 'in_transit', 'delivered', 'returned'],
    default: 'active',
    index: true 
  }
});

// Performance Indexes
containerSchema.index({ status: 1, clientId: 1 });
containerSchema.index({ realContainerId: 1, status: 1 });
```

### Payment Collection Schema
```javascript
const paymentCollectionSchema = new mongoose.Schema({
  clientId: { type: String, required: true, index: true },
  clientName: { type: String, required: true },
  
  // Order Reference
  orderId: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
  orderNumber: { type: String },
  containerId: { type: mongoose.Schema.Types.ObjectId, ref: 'Container' },
  
  // Financial Amounts
  totalAmount: { type: Number, required: true },
  receivedAmount: { type: Number, default: 0 },
  pendingAmount: { type: Number },
  
  // Payment Type Classification
  paymentType: {
    type: String,
    enum: ['THROUGH_ME', 'CLIENT_DIRECT'],
    default: 'THROUGH_ME'
  },
  
  // Payment History (Detailed Records)
  paymentHistory: [{
    amount: { type: Number, required: true },
    receivedDate: { type: Date, default: Date.now },
    paymentMethod: {
      type: String,
      enum: ['CASH', 'BANK_TRANSFER', 'CHEQUE', 'UPI', 'CARD'],
      default: 'BANK_TRANSFER'
    },
    bankReference: String,
    notes: String,
    recordedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  
  // Status Tracking
  status: {
    type: String,
    enum: ['PENDING', 'PARTIAL', 'COMPLETED', 'OVERDUE'],
    default: 'PENDING'
  },
  
  // Due Date Management
  dueDate: { type: Date },
  isOverdue: { type: Boolean, default: false },
  
  // Audit Information
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
  createdBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
  updatedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
});

// Pre-save middleware to calculate pending amount
paymentCollectionSchema.pre('save', function(next) {
  this.pendingAmount = this.totalAmount - this.receivedAmount;
  this.updatedAt = new Date();
  
  // Update status based on payment
  if (this.receivedAmount === 0) {
    this.status = 'PENDING';
  } else if (this.receivedAmount >= this.totalAmount) {
    this.status = 'COMPLETED';
  } else {
    this.status = 'PARTIAL';
  }
  
  // Check if overdue
  if (this.dueDate && new Date() > this.dueDate && this.status !== 'COMPLETED') {
    this.isOverdue = true;
    this.status = 'OVERDUE';
  }
  
  next();
});
```

---

## API Flow Details

### 1. Transaction Management Page Load

#### Frontend Request Chain
```javascript
// 1. Component Mount
useEffect(() => {
  loadPaymentCollections()
}, [])

// 2. Authentication Check
if (!isAuthenticated || !token) {
  toast({ title: "Authentication Required" })
  navigate('/login')
  return
}

// 3. API Call with Headers
const response = await axios.get('/api/payment-collections', {
  headers: {
    'Authorization': `Bearer ${token}`,
    'Content-Type': 'application/json'
  }
})
```

#### Backend Processing Flow
```javascript
// Route: /api/payment-collections
router.get('/', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    // Step 1: Query Orders (Exclude Loop-backs)
    const orders = await Order.find({ 
      isLoopBack: { $ne: true },
      status: { $ne: 'cancelled' }
    }).populate('containerId', 'realContainerId clientFacingId baseCharges');
    
    // Step 2: Query Containers with Orders
    const containers = await Container.find({})
      .populate('orders.orderId', 'orderNumber items');
    
    // Step 3: Query Payment Collections
    const PaymentCollectionModel = mongoose.connection.collection('paymentcollections');
    const paymentCollections = await PaymentCollectionModel.find({}).toArray();
    
    // Step 4: Process Client Financial Data
    const clientCollections = processClientFinancials(orders, containers, paymentCollections);
    
    // Step 5: Calculate Summary Statistics
    const summary = calculatePaymentSummary(clientCollections);
    
    // Step 6: Return Structured Response
    res.json({
      clientCollections,
      summary,
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('Payment collections error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
```

### 2. Client Financial Processing Algorithm

```javascript
function processClientFinancials(orders, containers, paymentCollections) {
  const clientFinancials = {};
  
  // Step 1: Process Orders by Client
  orders.forEach(order => {
    const clientId = order.clientId;
    if (!clientFinancials[clientId]) {
      clientFinancials[clientId] = {
        clientId,
        clientName: order.clientName,
        totalAmount: 0,
        receivedAmount: 0,
        pendingAmount: 0,
        payments: [],
        paymentHistory: [],
        containers: new Set(),
        orderCount: 0
      };
    }
    
    const client = clientFinancials[clientId];
    
    // Calculate total amount (product cost + carrying charges)
    const productCost = order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
    const carryingCharges = order.totalCarryingCharges || 0;
    const totalOrderAmount = productCost + carryingCharges;
    
    client.totalAmount += totalOrderAmount;
    client.orderCount++;
    
    // Add order details
    client.payments.push({
      paymentId: `payment_${order._id}`,
      orderNumber: order.orderNumber,
      totalAmount: totalOrderAmount,
      productCost,
      carryingCharges,
      pendingAmount: totalOrderAmount, // Will be adjusted by payment collections
      status: 'PENDING',
      containerId: order.containerId?.realContainerId || 'Not Allocated',
      paymentType: determinePaymentType(order)
    });
    
    // Track containers
    if (order.containerId) {
      client.containers.add(order.containerId.realContainerId || order.containerId.clientFacingId);
    }
  });
  
  // Step 2: Apply Payment Collections
  paymentCollections.forEach(payment => {
    const client = clientFinancials[payment.clientId];
    if (client) {
      client.receivedAmount += payment.receivedAmount || 0;
      
      // Add to payment history
      if (payment.paymentHistory && payment.paymentHistory.length > 0) {
        client.paymentHistory.push(...payment.paymentHistory);
      }
      
      // Update specific payment if order reference exists
      if (payment.orderId) {
        const orderPayment = client.payments.find(p => p.orderNumber === payment.orderNumber);
        if (orderPayment) {
          orderPayment.receivedAmount = payment.receivedAmount || 0;
          orderPayment.pendingAmount = Math.max(0, orderPayment.totalAmount - orderPayment.receivedAmount);
          orderPayment.status = orderPayment.pendingAmount === 0 ? 'COMPLETED' : 'PARTIAL';
        }
      }
    }
  });
  
  // Step 3: Calculate Final Pending Amounts
  Object.values(clientFinancials).forEach(client => {
    client.pendingAmount = Math.max(0, client.totalAmount - client.receivedAmount);
    client.containers = Array.from(client.containers);
    
    // Update payment statuses
    client.payments.forEach(payment => {
      if (!payment.hasOwnProperty('receivedAmount')) {
        payment.receivedAmount = 0;
        payment.pendingAmount = payment.totalAmount;
        payment.status = 'PENDING';
      }
    });
  });
  
  return Object.values(clientFinancials);
}
```

### 3. Payment Recording Flow

#### Frontend Payment Recording
```javascript
const handleRecordPayment = async () => {
  // Validation
  const amount = parseFloat(paymentAmount);
  if (amount <= 0) {
    toast({ title: "Error", description: "Payment amount must be greater than zero" });
    return;
  }

  try {
    // API Call
    const response = await axios.post('/api/payment-collections/record-payment', {
      paymentId: selectedPayment.paymentId,
      amount: amount,
      notes: paymentNotes
    }, getAuthHeaders());

    // Check for overpayment
    const isOverpayment = amount > selectedPayment.pendingAmount;
    
    toast({
      title: "Success",
      description: isOverpayment ? 
        `Payment recorded (Overpayment: ${formatCurrency(amount - selectedPayment.pendingAmount)})` :
        `Payment of ${formatCurrency(amount)} recorded successfully`
    });

    // Reset form and reload data
    setPaymentAmount('');
    setShowPaymentModal(false);
    await loadPaymentCollections();
    
  } catch (error) {
    toast({ title: "Error", description: error.response?.data?.message || "Failed to record payment" });
  }
};
```

#### Backend Payment Recording
```javascript
router.post('/record-payment', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { paymentId, amount, notes } = req.body;
    
    // Validation
    if (!paymentId || !amount || amount <= 0) {
      return res.status(400).json({ message: 'Valid payment ID and amount required' });
    }
    
    // Extract order ID from payment ID
    const orderId = paymentId.replace('payment_', '');
    
    // Find or create payment collection record
    let paymentCollection = await PaymentCollection.findOne({ 
      orderId: new mongoose.Types.ObjectId(orderId) 
    });
    
    if (!paymentCollection) {
      // Create new payment collection record
      const order = await Order.findById(orderId);
      if (!order) {
        return res.status(404).json({ message: 'Order not found' });
      }
      
      const totalAmount = (order.totalCarryingCharges || 0) + 
        (order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0);
      
      paymentCollection = new PaymentCollection({
        clientId: order.clientId,
        clientName: order.clientName,
        orderId: order._id,
        orderNumber: order.orderNumber,
        containerId: order.containerId,
        totalAmount,
        receivedAmount: 0,
        paymentType: 'THROUGH_ME',
        createdBy: req.user._id
      });
    }
    
    // Add payment to history
    paymentCollection.paymentHistory.push({
      amount: parseFloat(amount),
      receivedDate: new Date(),
      paymentMethod: 'BANK_TRANSFER',
      notes: notes || '',
      recordedBy: req.user._id
    });
    
    // Update received amount
    paymentCollection.receivedAmount += parseFloat(amount);
    paymentCollection.updatedBy = req.user._id;
    
    // Save with pre-save middleware calculations
    await paymentCollection.save();
    
    // Log audit trail
    console.log(`💰 Payment recorded: ₹${amount} for order ${paymentCollection.orderNumber} by ${req.user.name}`);
    
    res.json({
      message: 'Payment recorded successfully',
      paymentCollection: {
        totalAmount: paymentCollection.totalAmount,
        receivedAmount: paymentCollection.receivedAmount,
        pendingAmount: paymentCollection.pendingAmount,
        status: paymentCollection.status
      }
    });
    
  } catch (error) {
    console.error('Record payment error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
```

### 4. Transaction Details Flow

#### Frontend Detail Request
```javascript
const handleShowPartyDetails = async (client) => {
  try {
    const response = await axios.get(
      `/api/financials-comprehensive/payment-records/${client.clientId}`,
      getAuthHeaders()
    );
    
    const partyDetails = {
      ...client,
      accountSummary: response.data.accountSummary,
      paymentRecords: response.data.paymentRecords,
      containers: response.data.containers
    };
    
    setSelectedPartyDetails(partyDetails);
    setShowTransactionDetails(true);
  } catch (error) {
    toast({ title: "Error", description: "Failed to load transaction details" });
  }
};
```

#### Backend Comprehensive Records
```javascript
router.get('/payment-records/:clientId', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { clientId } = req.params;
    
    // Get orders with container info
    const orders = await Order.find({ 
      clientId,
      isLoopBack: { $ne: true },
      status: { $ne: 'cancelled' }
    }).populate('containerId', 'realContainerId clientFacingId').sort({ createdAt: 1 });
    
    // Get payment collections
    const paymentCollections = await PaymentCollection.find({ clientId })
      .sort({ createdAt: 1 });
    
    // Build ledger-style records
    const paymentRecords = [];
    let runningBalance = 0;
    
    // Process orders chronologically
    orders.forEach(order => {
      const productCost = order.items?.reduce((sum, item) => sum + (item.totalPrice || 0), 0) || 0;
      const carryingCharges = order.totalCarryingCharges || 0;
      const totalAmount = productCost + carryingCharges;
      
      runningBalance += totalAmount;
      
      paymentRecords.push({
        id: order._id,
        date: order.createdAt,
        type: 'ORDER_INVOICE',
        reference: order.orderNumber,
        description: `Order Invoice - ${order.orderNumber}`,
        debit: totalAmount,
        credit: 0,
        balance: runningBalance,
        status: order.status?.toUpperCase(),
        particulars: {
          productCost,
          carryingCharges,
          container: order.containerId?.realContainerId || 'Not Allocated'
        }
      });
    });
    
    // Process payments chronologically
    paymentCollections.forEach(collection => {
      collection.paymentHistory?.forEach(payment => {
        runningBalance -= payment.amount;
        
        paymentRecords.push({
          id: `${collection._id}-${payment._id}`,
          date: payment.receivedDate,
          type: 'PAYMENT_RECEIVED',
          reference: `Payment #${payment._id?.toString().slice(-6)}`,
          description: `Payment received`,
          debit: 0,
          credit: payment.amount,
          balance: runningBalance,
          status: 'RECEIVED',
          particulars: {
            paymentMethod: payment.paymentMethod,
            bankReference: payment.bankReference,
            notes: payment.notes
          }
        });
      });
    });
    
    // Sort chronologically and recalculate balance
    paymentRecords.sort((a, b) => new Date(a.date) - new Date(b.date));
    
    let recalculatedBalance = 0;
    paymentRecords.forEach(record => {
      recalculatedBalance += (record.debit || 0) - (record.credit || 0);
      record.balance = recalculatedBalance;
    });
    
    const totalDebits = paymentRecords.reduce((sum, r) => sum + (r.debit || 0), 0);
    const totalCredits = paymentRecords.reduce((sum, r) => sum + (r.credit || 0), 0);
    
    res.json({
      clientId,
      clientName: orders[0]?.clientName || 'Unknown Client',
      accountSummary: {
        totalInvoiced: totalDebits,
        totalReceived: totalCredits,
        currentBalance: totalDebits - totalCredits,
        totalTransactions: paymentRecords.length
      },
      paymentRecords,
      containers: [...new Set(orders.map(o => o.containerId?.realContainerId).filter(Boolean))],
      metadata: {
        generatedAt: new Date().toISOString(),
        recordType: 'PAYMENT_LEDGER'
      }
    });
    
  } catch (error) {
    console.error('Payment records error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});
```

---

## Security & Authentication

### JWT Token Management
```javascript
// Token Structure
{
  "id": "user_object_id",
  "role": "admin|staff|client",
  "iat": timestamp,
  "exp": timestamp + 30_minutes
}

// Token Verification Flow
1. Extract from Authorization header
2. Verify signature with JWT_SECRET
3. Check expiration
4. Validate user exists and is active
5. Attach user object to request
```

### Role-Based Access Control
```javascript
// Route Protection Levels

// Level 1: Authentication Required
router.get('/public-data', auth, handler);

// Level 2: Role-Based Access
router.get('/admin-data', auth, authorize('admin'), handler);
router.get('/staff-data', auth, authorize('admin', 'staff'), handler);

// Level 3: Data Isolation
router.get('/client-data', auth, clientDataFilter, handler);
```

### Financial Data Masking
```javascript
const maskFinancialData = (data, user) => {
  if (user.role === 'admin') return data;
  
  const sensitiveFields = [
    'unitCost', 'profitMargin', 'supplierPrice', 
    'totalCosts', 'grossProfit', 'baseCharges'
  ];
  
  // Remove sensitive fields for non-admin users
  return removeFields(data, sensitiveFields);
};
```

### Audit Logging
```javascript
// Financial Operations Audit
const auditFinancialMiddleware = (req, res, next) => {
  const auditData = {
    userId: req.user?.id,
    action: determineAction(req.path, req.method),
    resource: extractResourceInfo(req),
    ipAddress: req.ip,
    userAgent: req.get('user-agent'),
    timestamp: new Date(),
    requestData: sanitizeRequestData(req.body)
  };
  
  // Log to AuditLog collection
  AuditLog.create(auditData);
  next();
};
```

---

## Error Handling

### Frontend Error Handling
```javascript
// Centralized Error Processing
const handleApiError = (error) => {
  let errorMessage = "An unexpected error occurred";
  
  if (error.response?.status === 401) {
    errorMessage = "Authentication required. Please log in again.";
    navigate('/login');
  } else if (error.response?.status === 403) {
    errorMessage = "Access denied. Insufficient permissions.";
  } else if (error.response?.status === 404) {
    errorMessage = "Resource not found.";
  } else if (error.response?.data?.message) {
    errorMessage = error.response.data.message;
  }
  
  toast({
    title: "Error",
    description: errorMessage,
    variant: "destructive"
  });
};
```

### Backend Error Handling
```javascript
// Global Error Handler
app.use((err, req, res, next) => {
  console.error('Error:', err);
  
  // Mongoose Validation Errors
  if (err.name === 'ValidationError') {
    const messages = Object.values(err.errors).map(e => e.message);
    return res.status(400).json({ 
      message: 'Validation failed', 
      errors: messages 
    });
  }
  
  // JWT Errors
  if (err.name === 'JsonWebTokenError') {
    return res.status(401).json({ message: 'Invalid token' });
  }
  
  // MongoDB Duplicate Key
  if (err.code === 11000) {
    return res.status(400).json({ message: 'Duplicate entry' });
  }
  
  // Default Error
  res.status(500).json({
    message: 'Internal server error',
    error: process.env.NODE_ENV === 'development' ? err.message : {}
  });
});
```

---

## Performance Considerations

### Database Optimization
```javascript
// Critical Indexes for Payment Queries
db.orders.createIndex({ "clientId": 1, "status": 1 });
db.orders.createIndex({ "createdAt": -1, "clientId": 1 });
db.containers.createIndex({ "realContainerId": 1, "status": 1 });
db.paymentcollections.createIndex({ "clientId": 1, "createdAt": -1 });

// Aggregation Pipeline Optimization
const clientFinancials = await Order.aggregate([
  { $match: { isLoopBack: { $ne: true }, status: { $ne: 'cancelled' } } },
  { $group: {
    _id: '$clientId',
    clientName: { $first: '$clientName' },
    totalOrders: { $sum: 1 },
    totalAmount: { $sum: '$totalAmount' },
    totalCarryingCharges: { $sum: '$totalCarryingCharges' }
  }},
  { $sort: { totalAmount: -1 } }
]);
```

### Frontend Optimization
```javascript
// React Query for Caching
const usePaymentCollections = () => {
  return useQuery(
    ['payment-collections'],
    fetchPaymentCollections,
    {
      staleTime: 5 * 60 * 1000, // 5 minutes
      cacheTime: 10 * 60 * 1000, // 10 minutes
      refetchOnWindowFocus: false
    }
  );
};

// Debounced Search
const [searchTerm, setSearchTerm] = useState('');
const debouncedSearch = useMemo(
  () => debounce((term) => filterPayments(term), 300),
  []
);

// Virtual Scrolling for Large Lists
const VirtualizedPaymentList = ({ payments }) => {
  return (
    <FixedSizeList
      height={600}
      itemCount={payments.length}
      itemSize={120}
      itemData={payments}
    >
      {PaymentRow}
    </FixedSizeList>
  );
};
```

### Memory Management
```javascript
// Cleanup Effect
useEffect(() => {
  return () => {
    // Cancel pending requests
    abortController.abort();
    
    // Clear intervals
    clearInterval(refreshInterval);
    
    // Reset state
    setPaymentCollections([]);
    setSelectedClient(null);
  };
}, []);
```

---

## API Response Examples

### Payment Collections Response
```json
{
  "clientCollections": [
    {
      "clientId": "CLIENT_001",
      "clientName": "ABC Trading Co.",
      "totalAmount": 485000,
      "receivedAmount": 350000,
      "pendingAmount": 135000,
      "orderCount": 5,
      "payments": [
        {
          "paymentId": "payment_64f7b8c9d1234567890abcde",
          "orderNumber": "ORD-2024-001",
          "totalAmount": 125000,
          "productCost": 100000,
          "carryingCharges": 25000,
          "receivedAmount": 75000,
          "pendingAmount": 50000,
          "status": "PARTIAL",
          "containerId": "CONT-2024-001",
          "paymentType": "THROUGH_ME"
        }
      ],
      "containers": ["CONT-2024-001", "CONT-2024-002"],
      "paymentHistory": [
        {
          "amount": 75000,
          "receivedDate": "2024-01-15T10:30:00Z",
          "paymentMethod": "BANK_TRANSFER",
          "bankReference": "TXN123456789",
          "notes": "Partial payment received"
        }
      ]
    }
  ],
  "summary": {
    "totalToCollect": 2450000,
    "totalReceived": 1825000,
    "totalPending": 625000,
    "clientCount": 15,
    "averageDebt": 41666.67,
    "collectionRate": 74.49
  },
  "timestamp": "2024-01-20T15:45:30Z"
}
```

### Transaction Details Response
```json
{
  "clientId": "CLIENT_001",
  "clientName": "ABC Trading Co.",
  "accountSummary": {
    "totalInvoiced": 485000,
    "totalReceived": 350000,
    "currentBalance": 135000,
    "totalTransactions": 12
  },
  "paymentRecords": [
    {
      "id": "64f7b8c9d1234567890abcde",
      "date": "2024-01-10T09:00:00Z",
      "type": "ORDER_INVOICE",
      "reference": "ORD-2024-001",
      "description": "Order Invoice - ORD-2024-001",
      "debit": 125000,
      "credit": 0,
      "balance": 125000,
      "status": "ALLOCATED",
      "particulars": {
        "productCost": 100000,
        "carryingCharges": 25000,
        "container": "CONT-2024-001"
      }
    },
    {
      "id": "payment_64f7b8c9d1234567890abcde_001",
      "date": "2024-01-15T10:30:00Z",
      "type": "PAYMENT_RECEIVED",
      "reference": "Payment #890abc",
      "description": "Payment received",
      "debit": 0,
      "credit": 75000,
      "balance": 50000,
      "status": "RECEIVED",
      "particulars": {
        "paymentMethod": "BANK_TRANSFER",
        "bankReference": "TXN123456789",
        "notes": "Partial payment received"
      }
    }
  ],
  "containers": ["CONT-2024-001", "CONT-2024-002"],
  "metadata": {
    "generatedAt": "2024-01-20T15:45:30Z",
    "recordType": "PAYMENT_LEDGER"
  }
}
```

---

## Summary

This comprehensive payment management system provides:

1. **Complete Transaction Tracking**: From order creation to payment completion
2. **Role-Based Security**: Admin/Staff access with audit logging
3. **Real-Time Updates**: Optimistic UI with immediate feedback
4. **Financial Analytics**: Client-wise payment analysis and reporting
5. **Audit Trail**: Complete history of all financial operations
6. **Performance Optimization**: Efficient database queries and frontend caching
7. **Error Handling**: Comprehensive error management and user feedback
8. **Data Integrity**: Multi-layer validation and consistency checks

The system follows the **API-driven RESTful architecture** pattern with clear separation of concerns across the frontend React components, backend Express.js routes, and MongoDB data persistence layer.
```