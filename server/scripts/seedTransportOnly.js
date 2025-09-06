const mongoose = require('mongoose');
const { seedShippingCompanies } = require('./seedShippingCompanies');
const User = require('../models/User');

// Simple script to seed just shipping companies
const seedTransportCompanies = async () => {
  try {
    // Connect to MongoDB
    await mongoose.connect(process.env.MONGODB_URI || 'mongodb://localhost:27017/logistics-oms');
    console.log('✅ Connected to MongoDB');

    // Find admin user to use as creator
    const admin = await User.findOne({ role: 'admin' });
    if (!admin) {
      console.error('❌ No admin user found. Please run the main seed script first.');
      process.exit(1);
    }

    // Seed shipping companies
    console.log('🚢 Seeding transport companies...');
    await seedShippingCompanies([admin]);
    
    console.log('✅ Transport companies seeding completed!');
    process.exit(0);
  } catch (error) {
    console.error('❌ Error seeding transport companies:', error);
    process.exit(1);
  }
};

// Run if called directly
if (require.main === module) {
  seedTransportCompanies();
}

module.exports = seedTransportCompanies;