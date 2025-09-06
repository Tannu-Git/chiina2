# Database & API Documentation - China5 Logistics System

## System Overview
**China5 Logistics System** - MERN stack application for international shipping operations
- **Backend**: Node.js + Express.js  
- **Database**: MongoDB with Mongoose ODM
- **Authentication**: JWT with role-based access
- **Main Features**: Container logistics, order management, financial tracking, QC operations

---

## Database Architecture

### Core Collections
1. **users** - User accounts and authentication
2. **orders** - Order management with carton-based tracking
3. **containers** - Container allocation and financial tracking
4. **paymenttransactions** - Financial transactions
5. **accountbalances** - Party account balances
6. **timelines** - Order event tracking
7. **audit_logs** - Security and compliance auditing
8. **shippingcompanies** - Shipping partner management

---

## Key Models

### 1. User Model
```javascript
{
  name: String (required),
  email: String (unique, sparse),
  password: String (hashed),
  role: ['admin', 'staff', 'client'],
  clientId: String (auto-generated for clients),
  company: String,
  phone: String,
  address: Object,
  isActive: Boolean,
  permissions: [String], // Granular permissions
  registrationSource: String
}
```

### 2. Order Model
```javascript
{
  orderNumber: String (unique, ORD-XXXXXX),
  clientId: String (required),
  clientName: String,
  items: [OrderItemSchema],
  
  // Financial totals (calculated)
  totalAmount: Number,
  totalCarryingCharges: Number,
  totalWeight: Number,
  totalCbm: Number,
  totalCartons: Number,
  
  // Status tracking
  status: String (enum),
  qcStatus: String,
  
  // Carton-based QC tracking (PRIMARY)
  totalQcPassedCartons: Number,
  totalLoopBackCartons: Number,
  totalPendingCartons: Number,
  qcCompletionPercentage: Number,
  
  containerId: ObjectId,
  createdBy: ObjectId
}
```

**Order Item Sub-Schema:**
```javascript
{
  itemCode: String,
  description: String,
  quantity: Number,
  cartons: Number,
  unitPrice: Number,
  
  // Carton-based tracking (PRIMARY)
  qcPassedCartons: Number,
  loopBackCartons: Number,
  allocatedCartons: Number,
  
  // Quantity tracking (derived)
  qcPassedQuantity: Number,
  loopBackQuantity: Number,
  
  paymentType: ['CLIENT_DIRECT', 'THROUGH_ME'],
  carryingCharge: {
    basis: ['carton', 'cbm', 'weight'],
    rate: Number,
    amount: Number
  },
  
  // Loop-back management
  loopBackReason: String,
  loopBackStatus: String,
  loopBackNotes: String
}
```

### 3. Container Model
```javascript
{
  realContainerId: String (unique),
  clientFacingId: String,
  type: ['20ft', '40ft', '40ft_hc', '45ft'],
  maxWeight: Number,
  maxCbm: Number,
  currentWeight: Number (calculated),
  currentCbm: Number (calculated),
  status: String,
  
  // Order allocations
  orders: [{
    orderId: ObjectId,
    clientId: String,
    cbmShare: Number,
    weightShare: Number,
    cartonShare: Number,
    paymentType: String,
    carryingCharges: Number
  }],
  
  // Financial tracking
  baseCharges: {
    gst: Number,
    duty: Number,
    misc: Number,
    extraCharge: Number
  },
  
  // Calculated financials
  totalRevenue: Number,
  totalCosts: Number,
  grossProfit: Number, // Revenue - Base Charges
  profitMargin: Number
}
```

### 4. Payment Models
**PaymentTransaction:**
```javascript
{
  transactionId: String (auto-generated),
  type: String (enum),
  amount: Number,
  currency: String,
  party: {
    id: String,
    name: String,
    type: String
  },
  status: String,
  paymentDate: Date,
  description: String
}
```

**AccountBalance:**
```javascript
{
  party: Object,
  balances: {
    INR: { credit: Number, debit: Number, balance: Number },
    USD: { credit: Number, debit: Number, balance: Number }
  },
  paymentTerms: String
}
```

---

## API Routes

### Authentication (`/api/auth`)
- `POST /register` - Register new user
- `POST /login` - User authentication  
- `GET /me` - Get current user
- `PUT /profile` - Update profile

### Orders (`/api/orders`)
- `GET /` - List orders (filtered by client)
- `GET /:id` - Get order details
- `POST /` - Create order
- `PUT /:id` - Update order
- `GET /recent-clients` - Recent client names
- `GET /item-suggestions` - Item autocomplete

### Containers (`/api/containers`)
- `GET /` - List containers (client filtered)
- `GET /:id` - Get container details
- `POST /` - Create container (admin/staff)
- `PUT /:id` - Update container (admin/staff)

### Users (`/api/users`)
- `GET /` - List users (admin only)
- `POST /` - Create user (admin only)
- `PUT /:id` - Update user (admin only)
- `DELETE /:id` - Deactivate user (admin only)

### Financials (`/api/financials`)
- `GET /` - Financial dashboard
- `GET /simple-dashboard` - Basic metrics (admin/staff)
- `GET /profit-analysis` - Container profit breakdown

### Warehouse (`/api/warehouse`)
- `GET /dashboard` - Warehouse operations dashboard
- `GET /loopback` - Orders with loop-back quantities
- `PATCH /loopback/:orderId/item/:itemIndex` - Update loop-back quantities
- `POST /qc-inspection/:orderId` - QC inspection

### Payments (`/api/payments`)
- `GET /transactions` - Payment transactions
- `POST /transactions` - Create transaction
- `GET /balances` - Account balances

---

## Data Flow & Business Logic

### Order Processing Flow
1. **Create Order** → `draft` status, auto-generate order number
2. **Submit Order** → `confirmed` status, financial calculations
3. **Production** → `in_progress` status
4. **QC Process** → Carton-based tracking, loop-back handling within order
5. **Container Allocation** → Capacity validation, charge distribution
6. **Shipping** → Container tracking and delivery

### Financial Calculations
- **Order Level**: Item prices + carrying charges
- **Container Level**: Gross Profit = Carrying Charges - Base Charges (GST+Duty+Misc+Extra)
- **Payment Processing**: Account balance updates, invoice generation

### QC & Loop-Back System
- **Primary Tracking**: Carton-based (qcPassedCartons, loopBackCartons)
- **Secondary**: Quantity derived from cartons for compatibility
- **Loop-backs**: Handled as quantity allocations within same order (not separate orders)

---

## Security & Features

### Authentication & Authorization
- JWT token-based authentication
- Role-based access: admin, staff, client
- Permission-based granular access
- Client data isolation and filtering

### Audit & Compliance
- Comprehensive audit logging for all actions
- Financial data access tracking
- 7-year retention for financial data
- IP address and user agent tracking

### Data Validation
- Schema-level validation
- Capacity validation for containers
- Optimistic locking for concurrent updates
- Input sanitization and XSS protection

### Performance Optimizations
- Strategic indexing for common queries
- Data denormalization for performance
- Aggregation pipelines for reporting
- Efficient pagination and filtering

---

## Key Database Operations

### Indexes
- **Users**: `{ role: 1 }`, `{ email: 1 }`
- **Orders**: `{ orderNumber: 1 }`, `{ clientId: 1 }`, `{ status: 1 }`
- **Containers**: `{ realContainerId: 1 }`, `{ status: 1 }`
- **Audit**: `{ timestamp: -1 }`, `{ userId: 1, timestamp: -1 }`

### Critical Features
- **Auto Order Numbers**: Collision-resistant ORD-XXXXXX format
- **Container Capacity**: Atomic validation prevents over-allocation
- **Financial Tracking**: Real-time profit calculations
- **Client Security**: ID masking and data filtering
- **Loop-Back Management**: Shortage handling within orders

This system provides comprehensive logistics management with strong security, audit capabilities, and efficient carton-based tracking for international shipping operations.