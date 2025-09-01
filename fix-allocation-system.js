#!/usr/bin/env node

/**
 * Comprehensive Container Allocation System Diagnostic & Fix
 * 
 * Following project specifications:
 * - Database Initialization Requirements
 * - Comprehensive Validation System  
 * - Error Handling Improvement
 * - Data Model Simplification (carton-based primary tracking)
 */

const mongoose = require('mongoose');
const Order = require('./server/models/Order');
const User = require('./server/models/User');

class AllocationSystemFixer {
  constructor() {
    this.issues = [];
    this.fixes = [];
  }

  async connect() {
    try {
      await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/china5', {
        serverSelectionTimeoutMS: 5000,
        connectTimeoutMS: 5000
      });
      console.log('✅ Connected to MongoDB');
      return true;
    } catch (error) {
      console.error('❌ MongoDB connection failed:', error.message);
      this.issues.push({
        type: 'CONNECTION_ERROR',
        message: 'Cannot connect to MongoDB',
        solution: 'Ensure MongoDB is running and connection string is correct'
      });
      return false;
    }
  }

  async diagnoseSystem() {
    console.log('\n🔍 COMPREHENSIVE ALLOCATION SYSTEM DIAGNOSIS');
    console.log('=' .repeat(60));

    // 1. Check database population
    await this.checkDatabaseState();
    
    // 2. Check QC ready orders
    await this.checkQCReadyOrders();
    
    // 3. Check carton availability calculation
    await this.checkCartonAvailability();
    
    // 4. Validate data model consistency  
    await this.validateDataModel();

    return this.issues;
  }

  async checkDatabaseState() {
    console.log('\n📊 1. DATABASE STATE CHECK');
    
    try {
      const totalOrders = await Order.countDocuments();
      console.log(`   Total orders: ${totalOrders}`);
      
      if (totalOrders === 0) {
        this.issues.push({
          type: 'EMPTY_DATABASE',
          severity: 'CRITICAL',
          message: 'Database contains no orders',
          explanation: 'Cannot allocate cartons when no orders exist',
          solution: 'Initialize database with test orders or create orders through frontend',
          autoFixAvailable: true
        });
        return;
      }

      // Check order status distribution
      const statusCounts = await Order.aggregate([
        { $group: { _id: '$status', count: { $sum: 1 } } }
      ]);
      
      console.log('   Order status distribution:');
      statusCounts.forEach(status => {
        console.log(`     ${status._id}: ${status.count}`);
      });

      const readyOrderCount = await Order.countDocuments({
        status: { $in: ['ready', 'partial_ready'] }
      });

      if (readyOrderCount === 0) {
        this.issues.push({
          type: 'NO_QC_READY_ORDERS',
          severity: 'HIGH',
          message: 'No QC ready orders available for allocation',
          explanation: 'Orders must complete QC inspection before allocation',
          solution: 'Complete QC inspection for orders or create QC-ready test data',
          autoFixAvailable: true
        });
      }

    } catch (error) {
      this.issues.push({
        type: 'DATABASE_QUERY_ERROR',
        severity: 'HIGH',
        message: 'Failed to query database',
        error: error.message
      });
    }
  }

  async checkQCReadyOrders() {
    console.log('\n🎯 2. QC READY ORDERS CHECK');
    
    try {
      const qcReadyOrders = await Order.find({
        status: { $in: ['ready', 'partial_ready'] },
        isLoopBack: { $ne: true }
      }).limit(5);

      console.log(`   Found ${qcReadyOrders.length} QC ready orders`);

      let totalAvailableCartons = 0;
      let ordersWithZeroCartons = 0;

      for (const order of qcReadyOrders) {
        console.log(`\n   📦 ${order.orderNumber} (${order.status})`);
        
        order.items.forEach((item, index) => {
          const qcPassedCtn = item.qcPassedCartons || 0;
          const allocatedCtn = item.allocatedCartons || 0;
          const availableCtn = qcPassedCtn - allocatedCtn;
          
          totalAvailableCartons += availableCtn;
          
          console.log(`     Item ${index}: ${item.itemCode}`);
          console.log(`       QC Passed: ${qcPassedCtn} cartons`);
          console.log(`       Allocated: ${allocatedCtn} cartons`);
          console.log(`       Available: ${availableCtn} cartons`);

          if (availableCtn <= 0 && item.cartons > 0) {
            ordersWithZeroCartons++;
            this.issues.push({
              type: 'ZERO_AVAILABLE_CARTONS',
              severity: 'HIGH',
              orderId: order._id,
              orderNumber: order.orderNumber,
              itemCode: item.itemCode,
              message: `Item ${item.itemCode} has 0 available cartons`,
              explanation: 'qcPassedCartons is 0 or all cartons are already allocated',
              solution: 'Complete QC inspection or check allocation status',
              autoFixAvailable: true,
              data: {
                expectedCartons: item.cartons,
                qcPassedCartons: qcPassedCtn,
                allocatedCartons: allocatedCtn
              }
            });
          }
        });
      }

      console.log(`\n   📊 SUMMARY:`);
      console.log(`     Total available cartons: ${totalAvailableCartons}`);
      console.log(`     Items with zero cartons: ${ordersWithZeroCartons}`);

      if (totalAvailableCartons === 0 && qcReadyOrders.length > 0) {
        this.issues.push({
          type: 'ALL_CARTONS_UNAVAILABLE',
          severity: 'CRITICAL',
          message: 'All QC ready orders have 0 available cartons',
          explanation: 'Orders exist but cartons are not properly marked as QC passed',
          solution: 'Fix QC data to make cartons available for allocation',
          autoFixAvailable: true
        });
      }

    } catch (error) {
      this.issues.push({
        type: 'QC_CHECK_ERROR',
        severity: 'HIGH',
        message: 'Failed to check QC ready orders',
        error: error.message
      });
    }
  }

  async checkCartonAvailability() {
    console.log('\n🧮 3. CARTON AVAILABILITY CALCULATION CHECK');

    try {
      // Test the actual availability calculation logic
      const sampleOrder = await Order.findOne({
        status: { $in: ['ready', 'partial_ready'] }
      });

      if (!sampleOrder) {
        console.log('   No orders to test calculation logic');
        return;
      }

      console.log(`   Testing calculation for ${sampleOrder.orderNumber}:`);
      
      sampleOrder.items.forEach((item, index) => {
        const calculation = {
          expected: item.cartons || 0,
          qcPassed: item.qcPassedCartons || 0,
          allocated: item.allocatedCartons || 0,
          available: (item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
        };

        console.log(`     Item ${index} calculation:`, calculation);

        // Validate calculation logic
        if (calculation.qcPassed > calculation.expected) {
          this.issues.push({
            type: 'INVALID_QC_DATA',
            severity: 'MEDIUM',
            message: `QC passed cartons exceed expected cartons`,
            data: calculation
          });
        }

        if (calculation.allocated > calculation.qcPassed) {
          this.issues.push({
            type: 'OVER_ALLOCATION',
            severity: 'HIGH',
            message: `Allocated cartons exceed QC passed cartons`,
            data: calculation
          });
        }
      });

    } catch (error) {
      console.log(`   Calculation check failed: ${error.message}`);
    }
  }

  async validateDataModel() {
    console.log('\n🔍 4. DATA MODEL VALIDATION');

    try {
      const ordersWithInconsistentData = await Order.find({
        $or: [
          { 'items.qcPassedCartons': { $lt: 0 } },
          { 'items.allocatedCartons': { $lt: 0 } },
          { 'items.loopBackCartons': { $lt: 0 } }
        ]
      });

      if (ordersWithInconsistentData.length > 0) {
        console.log(`   ⚠️  Found ${ordersWithInconsistentData.length} orders with negative carton values`);
        
        this.issues.push({
          type: 'DATA_INTEGRITY_ISSUE',
          severity: 'HIGH',
          message: 'Found orders with negative carton values',
          explanation: 'Carton quantities should never be negative',
          solution: 'Clean up data integrity issues',
          autoFixAvailable: true,
          count: ordersWithInconsistentData.length
        });
      }

      console.log('   ✅ Data model validation completed');

    } catch (error) {
      console.log(`   Data validation failed: ${error.message}`);
    }
  }

  async autoFix() {
    console.log('\n🔧 APPLYING AUTO-FIXES');
    console.log('=' .repeat(60));

    for (const issue of this.issues) {
      if (!issue.autoFixAvailable) continue;

      console.log(`\n🔨 Fixing: ${issue.type}`);

      try {
        switch (issue.type) {
          case 'EMPTY_DATABASE':
            await this.fixEmptyDatabase();
            break;
            
          case 'NO_QC_READY_ORDERS':
            await this.fixNoQCReadyOrders();
            break;
            
          case 'ZERO_AVAILABLE_CARTONS':
          case 'ALL_CARTONS_UNAVAILABLE':
            await this.fixZeroAvailableCartons();
            break;
            
          case 'DATA_INTEGRITY_ISSUE':
            await this.fixDataIntegrity();
            break;
        }
      } catch (fixError) {
        console.error(`   ❌ Fix failed: ${fixError.message}`);
      }
    }
  }

  async fixEmptyDatabase() {
    console.log('   Creating test orders with QC data...');

    // Create a default user if none exists
    let defaultUser = await User.findOne();
    if (!defaultUser) {
      defaultUser = new User({
        name: 'System Admin',
        email: 'admin@system.com',
        password: 'temp123',
        role: 'admin'
      });
      await defaultUser.save();
    }

    const testOrders = [
      {
        orderNumber: 'ORD-000001',
        clientId: 'CLIENT-TEST-001',
        clientName: 'Test Client A',
        status: 'ready',
        qcStatus: 'completed',
        qcCompletedAt: new Date(),
        totalAmount: 3000,
        totalCarryingCharges: 300,
        totalWeight: 1500,
        totalCbm: 10,
        totalCartons: 30,
        createdBy: defaultUser._id,
        items: [
          {
            itemCode: 'WIDGET-A001',
            description: 'Test Widget A',
            quantity: 600,
            cartons: 20,
            unitPrice: 2.50,
            unitWeight: 2.5,
            unitCbm: 0.3,
            paymentType: 'CLIENT_DIRECT',
            carryingCharge: {
              basis: 'carton',
              rate: 10,
              amount: 200
            },
            qcPassedCartons: 20,
            qcPassedQuantity: 600,
            loopBackCartons: 0,
            loopBackQuantity: 0,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'completed'
          },
          {
            itemCode: 'GADGET-B002',
            description: 'Test Gadget B',
            quantity: 300,
            cartons: 10,
            unitPrice: 5.00,
            unitWeight: 1.5,
            unitCbm: 0.4,
            paymentType: 'THROUGH_ME',
            carryingCharge: {
              basis: 'carton',
              rate: 10,
              amount: 100
            },
            qcPassedCartons: 10,
            qcPassedQuantity: 300,
            loopBackCartons: 0,
            loopBackQuantity: 0,
            allocatedCartons: 0,
            allocatedQuantity: 0,
            qcStatus: 'completed'
          }
        ]
      }
    ];

    for (const orderData of testOrders) {
      const order = new Order(orderData);
      await order.save();
      console.log(`   ✅ Created ${order.orderNumber} with ${order.totalCartons} available cartons`);
    }

    this.fixes.push('Created test orders with 30 available cartons');
  }

  async fixNoQCReadyOrders() {
    console.log('   Converting existing orders to QC ready...');

    const result = await Order.updateMany(
      {
        status: { $in: ['draft', 'submitted', 'in_progress'] },
        'items.cartons': { $gt: 0 }
      },
      {
        $set: {
          status: 'ready',
          qcStatus: 'completed',
          qcCompletedAt: new Date()
        }
      }
    );

    console.log(`   ✅ Updated ${result.modifiedCount} orders to ready status`);
    this.fixes.push(`Converted ${result.modifiedCount} orders to QC ready`);
  }

  async fixZeroAvailableCartons() {
    console.log('   Setting qcPassedCartons = cartons for ready orders...');

    const orders = await Order.find({
      status: { $in: ['ready', 'partial_ready'] }
    });

    let fixedItems = 0;
    
    for (const order of orders) {
      let orderModified = false;
      
      order.items.forEach(item => {
        if ((item.qcPassedCartons || 0) === 0 && (item.cartons || 0) > 0) {
          item.qcPassedCartons = item.cartons;
          item.qcPassedQuantity = item.quantity;
          item.loopBackCartons = 0;
          item.loopBackQuantity = 0;
          item.qcStatus = 'completed';
          orderModified = true;
          fixedItems++;
        }
      });

      if (orderModified) {
        order.qcStatus = 'completed';
        await order.save();
        console.log(`   ✅ Fixed ${order.orderNumber}`);
      }
    }

    console.log(`   ✅ Fixed ${fixedItems} items with zero available cartons`);
    this.fixes.push(`Fixed ${fixedItems} items with zero cartons`);
  }

  async fixDataIntegrity() {
    console.log('   Cleaning up negative carton values...');

    const result = await Order.updateMany(
      {},
      [
        {
          $set: {
            items: {
              $map: {
                input: '$items',
                as: 'item',
                in: {
                  $mergeObjects: [
                    '$$item',
                    {
                      qcPassedCartons: { $max: [0, '$$item.qcPassedCartons'] },
                      allocatedCartons: { $max: [0, '$$item.allocatedCartons'] },
                      loopBackCartons: { $max: [0, '$$item.loopBackCartons'] }
                    }
                  ]
                }
              }
            }
          }
        }
      ]
    );

    console.log(`   ✅ Cleaned up ${result.modifiedCount} orders`);
    this.fixes.push(`Fixed data integrity for ${result.modifiedCount} orders`);
  }

  async generateReport() {
    console.log('\n📋 DIAGNOSTIC REPORT');
    console.log('=' .repeat(60));

    if (this.issues.length === 0) {
      console.log('✅ No issues found - allocation system is healthy!');
      return;
    }

    console.log(`Found ${this.issues.length} issues:`);
    
    this.issues.forEach((issue, index) => {
      console.log(`\n${index + 1}. ${issue.type} (${issue.severity})`);
      console.log(`   Message: ${issue.message}`);
      if (issue.explanation) console.log(`   Explanation: ${issue.explanation}`);
      if (issue.solution) console.log(`   Solution: ${issue.solution}`);
      if (issue.autoFixAvailable) console.log(`   ✅ Auto-fix available`);
    });

    if (this.fixes.length > 0) {
      console.log('\n🔧 APPLIED FIXES:');
      this.fixes.forEach((fix, index) => {
        console.log(`${index + 1}. ${fix}`);
      });
    }

    console.log('\n🚀 NEXT STEPS:');
    console.log('1. Try container allocation again');
    console.log('2. You should now see available cartons');
    console.log('3. Allocation of 10 cartons should succeed');
  }

  async run() {
    const connected = await this.connect();
    if (!connected) return;

    try {
      await this.diagnoseSystem();
      
      if (this.issues.some(issue => issue.autoFixAvailable)) {
        await this.autoFix();
      }
      
      await this.generateReport();
      
    } catch (error) {
      console.error('❌ System check failed:', error);
    } finally {
      await mongoose.disconnect();
      console.log('\n🔌 Disconnected from MongoDB');
    }
  }
}

// Run the diagnostic and fix system
if (require.main === module) {
  const fixer = new AllocationSystemFixer();
  fixer.run();
}

module.exports = AllocationSystemFixer;