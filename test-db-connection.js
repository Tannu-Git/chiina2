#!/usr/bin/env node

/**
 * Simple Database Connection Test
 * Tests basic MongoDB connectivity and order data
 */

const mongoose = require('mongoose');

async function testDatabaseConnection() {
  console.log('🔍 Testing Database Connection...\n');
  
  try {
    // Test with shorter timeout
    console.log('Connecting to MongoDB...');
    await mongoose.connect('mongodb://localhost:27017/chinadb', {
      serverSelectionTimeoutMS: 3000,
      socketTimeoutMS: 3000,
    });
    
    console.log('✅ Database Connected Successfully!\n');
    
    // Test basic query
    const db = mongoose.connection.db;
    const collections = await db.listCollections().toArray();
    console.log(`📊 Found ${collections.length} collections:`);
    collections.forEach(col => console.log(`   - ${col.name}`));
    
    // Quick order count (with timeout)
    const Order = require('./server/models/Order');
    const orderCount = await Order.countDocuments().maxTimeMS(2000);
    console.log(`\n📦 Total Orders: ${orderCount}`);
    
    if (orderCount === 0) {
      console.log('❌ No orders found in database');
      console.log('💡 Need to create test orders');
    } else {
      console.log('✅ Orders exist in database');
    }
    
  } catch (error) {
    console.log('❌ Database Connection Failed!');
    console.log(`Error: ${error.message}\n`);
    
    if (error.message.includes('timeout') || error.message.includes('ECONNREFUSED')) {
      console.log('💡 MongoDB Issues:');
      console.log('1. MongoDB service may not be running');
      console.log('2. MongoDB may not be on port 27017');
      console.log('3. Database "chinadb" may not exist');
      console.log('\n🔧 Quick Fixes:');
      console.log('- Windows: Start MongoDB service');
      console.log('- Check: mongod --version');
      console.log('- Manual: mongod --dbpath C:\\data\\db');
    }
  } finally {
    await mongoose.disconnect();
    console.log('\n✅ Disconnected');
  }
}

testDatabaseConnection().catch(console.error);