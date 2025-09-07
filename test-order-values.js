#!/usr/bin/env node

/**
 * Order Values Validation and Analysis Script
 * Comprehensive test script to check order data integrity and values
 */

const mongoose = require('mongoose');
require('dotenv').config();

// Connect to MongoDB using the correct connection string
const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms';
    console.log('🔌 Connecting to MongoDB:', mongoURI);
    await mongoose.connect(mongoURI);
    console.log('✅ Connected to MongoDB successfully');
    return true;
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    return false;
  }
};

// Import models
const Order = require('./server/models/Order');
const Container = require('./server/models/Container');
const User = require('./server/models/User');

// Main analysis function
const analyzeOrderValues = async () => {
  console.log('\n📊 ANALYZING ORDER VALUES AND DATA INTEGRITY\n');
  console.log('='.repeat(60));
  
  try {
    // Get database connection info
    const dbName = mongoose.connection.db.databaseName;
    console.log(`📍 Database: ${dbName}`);
    
    // Get collection stats
    const orderCount = await Order.countDocuments();
    const containerCount = await Container.countDocuments();
    const userCount = await User.countDocuments();
    
    console.log(`📈 Collection Stats:`);
    console.log(`   Orders: ${orderCount}`);
    console.log(`   Containers: ${containerCount}`);
    console.log(`   Users: ${userCount}`);
    
    if (orderCount === 0) {
      console.log('\n⚠️  No orders found in database');
      return {
        summary: { 
          totalOrders: 0, 
          database: dbName,
          issues: ['No orders found - database may be empty or connection incorrect'] 
        },
        orders: [],
        recommendations: [
          'Verify database connection string',
          'Check if orders exist in the correct database',
          'Create test orders to validate the system'
        ]
      };
    }

    // Get all orders (excluding loop-backs)
    const orders = await Order.find({ isLoopBack: { $ne: true } })
      .populate('createdBy', 'name email role')
      .populate('containerId', 'realContainerId clientFacingId status')
      .sort({ createdAt: -1 })
      .limit(50); // Limit for performance

    console.log(`\n🔍 Analyzing ${orders.length} orders...\n`);

    const analysis = {
      summary: {
        database: dbName,
        totalOrders: orders.length,
        validOrders: 0,
        ordersWithIssues: 0,
        totalValue: 0,
        totalCarryingCharges: 0,
        totalWeight: 0,
        totalCbm: 0,
        totalCartons: 0,
        criticalIssues: 0,
        warningIssues: 0,
        issues: []
      },
      orderDetails: [],
      systemHealth: {
        dataIntegrityScore: 0,
        calculationAccuracy: 0,
        qcTrackingHealth: 0
      },
      recommendations: []
    };

    // Analyze each order
    for (let orderIndex = 0; orderIndex < Math.min(orders.length, 10); orderIndex++) {
      const order = orders[orderIndex];
      
      console.log(`📦 Order ${orderIndex + 1}: ${order.orderNumber}`);
      console.log(`   Client: ${order.clientName} (${order.clientId})`);
      console.log(`   Status: ${order.status} | QC: ${order.qcStatus} | Items: ${order.items.length}`);

      const orderAnalysis = {
        orderNumber: order.orderNumber,
        clientName: order.clientName,
        clientId: order.clientId,
        status: order.status,
        qcStatus: order.qcStatus,
        createdAt: order.createdAt,
        values: {
          totalAmount: order.totalAmount || 0,
          totalCarryingCharges: order.totalCarryingCharges || 0,
          totalWeight: order.totalWeight || 0,
          totalCbm: order.totalCbm || 0,
          totalCartons: order.totalCartons || 0
        },
        qcTracking: {
          totalQcPassedCartons: order.totalQcPassedCartons || 0,
          totalLoopBackCartons: order.totalLoopBackCartons || 0,
          totalPendingCartons: order.totalPendingCartons || 0,
          qcCompletionPercentage: order.qcCompletionPercentage || 0
        },
        issues: [],
        itemIssues: 0,
        severity: 'none'
      };

      // Calculate expected totals from items
      let calculatedTotals = {
        amount: 0,
        carryingCharges: 0,
        weight: 0,
        cbm: 0,
        cartons: 0,
        qcPassedCartons: 0,
        loopBackCartons: 0
      };

      // Analyze items
      for (const item of order.items) {
        const quantity = item.quantity || 0;
        const cartons = item.cartons || 0;
        const unitPrice = item.unitPrice || 0;
        const totalPrice = item.totalPrice || 0;
        const expectedTotalPrice = quantity * unitPrice;
        
        // Item calculations
        calculatedTotals.amount += totalPrice;
        calculatedTotals.carryingCharges += item.carryingCharge?.amount || 0;
        calculatedTotals.weight += (item.unitWeight || 0) * cartons;
        calculatedTotals.cbm += (item.unitCbm || 0) * cartons;
        calculatedTotals.cartons += cartons;
        calculatedTotals.qcPassedCartons += item.qcPassedCartons || 0;
        calculatedTotals.loopBackCartons += item.loopBackCartons || 0;

        // Check for item-level issues
        if (Math.abs(totalPrice - expectedTotalPrice) > 0.01) {
          orderAnalysis.issues.push({
            type: 'PRICE_CALCULATION_ERROR',
            severity: 'medium',
            message: `Item ${item.itemCode}: Price mismatch (${totalPrice} vs ${expectedTotalPrice})`,
            item: item.itemCode
          });
          orderAnalysis.itemIssues++;
        }

        // Check QC carton overflow
        const totalUsedCartons = (item.qcPassedCartons || 0) + (item.loopBackCartons || 0);
        if (totalUsedCartons > cartons) {
          orderAnalysis.issues.push({
            type: 'CARTON_OVERFLOW',
            severity: 'high',
            message: `Item ${item.itemCode}: QC+Loop-back cartons exceed total (${totalUsedCartons} > ${cartons})`,
            item: item.itemCode
          });
          orderAnalysis.itemIssues++;
        }

        // Check allocation overflow
        if ((item.allocatedCartons || 0) > (item.qcPassedCartons || 0)) {
          orderAnalysis.issues.push({
            type: 'ALLOCATION_OVERFLOW',
            severity: 'high',
            message: `Item ${item.itemCode}: Allocated cartons exceed QC passed`,
            item: item.itemCode
          });
          orderAnalysis.itemIssues++;
        }
      }

      // Check order-level total accuracy
      const tolerance = 0.01;
      
      if (Math.abs(order.totalAmount - calculatedTotals.amount) > tolerance) {
        orderAnalysis.issues.push({
          type: 'TOTAL_AMOUNT_MISMATCH',
          severity: 'medium',
          message: `Order total amount mismatch: ${order.totalAmount} vs calculated ${calculatedTotals.amount.toFixed(2)}`
        });
      }

      if (Math.abs(order.totalCartons - calculatedTotals.cartons) > 0) {
        orderAnalysis.issues.push({
          type: 'TOTAL_CARTONS_MISMATCH',
          severity: 'medium',
          message: `Order total cartons mismatch: ${order.totalCartons} vs calculated ${calculatedTotals.cartons}`
        });
      }

      if (Math.abs((order.totalQcPassedCartons || 0) - calculatedTotals.qcPassedCartons) > 0) {
        orderAnalysis.issues.push({
          type: 'QC_TRACKING_MISMATCH',
          severity: 'low',
          message: `QC cartons mismatch: ${order.totalQcPassedCartons} vs calculated ${calculatedTotals.qcPassedCartons}`
        });
      }

      // Determine severity
      const highSeverityIssues = orderAnalysis.issues.filter(i => i.severity === 'high').length;
      const mediumSeverityIssues = orderAnalysis.issues.filter(i => i.severity === 'medium').length;
      
      if (highSeverityIssues > 0) {
        orderAnalysis.severity = 'high';
        analysis.summary.criticalIssues += highSeverityIssues;
      } else if (mediumSeverityIssues > 0) {
        orderAnalysis.severity = 'medium';
        analysis.summary.warningIssues += mediumSeverityIssues;
      } else if (orderAnalysis.issues.length > 0) {
        orderAnalysis.severity = 'low';
      }

      // Update summary
      if (orderAnalysis.issues.length === 0) {
        analysis.summary.validOrders++;
        console.log(`   ✅ No issues found`);
      } else {
        analysis.summary.ordersWithIssues++;
        console.log(`   ⚠️  Found ${orderAnalysis.issues.length} issue(s) (${orderAnalysis.severity} severity)`);
        orderAnalysis.issues.forEach(issue => {
          console.log(`      - ${issue.type}: ${issue.message}`);
        });
      }

      analysis.summary.totalValue += order.totalAmount || 0;
      analysis.summary.totalCarryingCharges += order.totalCarryingCharges || 0;
      analysis.summary.totalWeight += order.totalWeight || 0;
      analysis.summary.totalCbm += order.totalCbm || 0;
      analysis.summary.totalCartons += order.totalCartons || 0;

      analysis.orderDetails.push(orderAnalysis);
    }

    // Calculate health scores
    const totalOrdersAnalyzed = analysis.orderDetails.length;
    if (totalOrdersAnalyzed > 0) {
      analysis.systemHealth.dataIntegrityScore = Math.round(
        (analysis.summary.validOrders / totalOrdersAnalyzed) * 100
      );
      
      const totalIssues = analysis.summary.criticalIssues + analysis.summary.warningIssues;
      analysis.systemHealth.calculationAccuracy = Math.round(
        Math.max(0, 100 - (totalIssues / totalOrdersAnalyzed * 20))
      );
      
      analysis.systemHealth.qcTrackingHealth = Math.round(
        (analysis.orderDetails.filter(o => 
          !o.issues.some(i => i.type.includes('QC') || i.type.includes('CARTON'))
        ).length / totalOrdersAnalyzed) * 100
      );
    }

    // Generate recommendations
    if (analysis.summary.criticalIssues > 0) {
      analysis.recommendations.push('🚨 CRITICAL: Fix carton overflow and allocation issues immediately');
      analysis.recommendations.push('🔧 Run data consistency repair script');
    }
    
    if (analysis.summary.warningIssues > 0) {
      analysis.recommendations.push('⚠️  Review and fix calculation mismatches');
      analysis.recommendations.push('🔍 Audit order total calculation logic');
    }
    
    if (analysis.summary.validOrders === totalOrdersAnalyzed) {
      analysis.recommendations.push('✅ All analyzed orders are healthy');
    }

    analysis.recommendations.push('📊 Run full system validation with all orders');
    analysis.recommendations.push('🔄 Consider implementing automated data validation');

    return analysis;

  } catch (error) {
    console.error('❌ Analysis failed:', error.message);
    return {
      error: error.message,
      summary: { totalOrders: 0, issues: [error.message] },
      recommendations: ['Check database connection and model imports']
    };
  }
};

// Generate detailed report
const generateReport = (analysis) => {
  console.log('\n' + '='.repeat(60));
  console.log('📋 ORDER VALUES ANALYSIS REPORT');
  console.log('='.repeat(60));
  
  console.log(`\n📊 SUMMARY:`);
  console.log(`   Database: ${analysis.summary.database || 'Unknown'}`);
  console.log(`   Total Orders Analyzed: ${analysis.summary.totalOrders || 0}`);
  console.log(`   Valid Orders: ${analysis.summary.validOrders || 0}`);
  console.log(`   Orders with Issues: ${analysis.summary.ordersWithIssues || 0}`);
  console.log(`   Critical Issues: ${analysis.summary.criticalIssues || 0}`);
  console.log(`   Warning Issues: ${analysis.summary.warningIssues || 0}`);
  
  console.log(`\n💰 FINANCIAL TOTALS:`);
  console.log(`   Total Order Value: ₹${(analysis.summary.totalValue || 0).toLocaleString()}`);
  console.log(`   Total Carrying Charges: ₹${(analysis.summary.totalCarryingCharges || 0).toLocaleString()}`);
  console.log(`   Total Weight: ${(analysis.summary.totalWeight || 0).toFixed(2)} kg`);
  console.log(`   Total CBM: ${(analysis.summary.totalCbm || 0).toFixed(2)} m³`);
  console.log(`   Total Cartons: ${analysis.summary.totalCartons || 0}`);
  
  if (analysis.systemHealth) {
    console.log(`\n🏥 SYSTEM HEALTH:`);
    console.log(`   Data Integrity Score: ${analysis.systemHealth.dataIntegrityScore}%`);
    console.log(`   Calculation Accuracy: ${analysis.systemHealth.calculationAccuracy}%`);
    console.log(`   QC Tracking Health: ${analysis.systemHealth.qcTrackingHealth}%`);
  }
  
  if (analysis.recommendations && analysis.recommendations.length > 0) {
    console.log(`\n💡 RECOMMENDATIONS:`);
    analysis.recommendations.forEach(rec => {
      console.log(`   ${rec}`);
    });
  }
  
  console.log('\n' + '='.repeat(60));
  console.log('📄 End of Report');
  console.log('='.repeat(60));
};

// Main execution
const main = async () => {
  console.log('🚀 Starting Order Values Analysis...');
  
  const connected = await connectDB();
  if (!connected) {
    console.log('❌ Cannot proceed without database connection');
    process.exit(1);
  }
  
  const analysis = await analyzeOrderValues();
  generateReport(analysis);
  
  // Write detailed results to file
  const fs = require('fs');
  const reportData = {
    timestamp: new Date().toISOString(),
    analysis: analysis,
    metadata: {
      nodeVersion: process.version,
      mongooseVersion: mongoose.version,
      databaseName: mongoose.connection.db?.databaseName
    }
  };
  
  fs.writeFileSync('order-analysis-report.json', JSON.stringify(reportData, null, 2));
  console.log('\n💾 Detailed report saved to: order-analysis-report.json');
  
  await mongoose.disconnect();
  console.log('\n🔌 Disconnected from MongoDB');
  console.log('✅ Analysis complete!');
};

// Run the script
if (require.main === module) {
  main().catch(error => {
    console.error('💥 Script failed:', error);
    process.exit(1);
  });
}

module.exports = { analyzeOrderValues, generateReport };