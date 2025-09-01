const mongoose = require('mongoose');
const ShippingCompany = require('../models/ShippingCompany');
const User = require('../models/User');

// Sample shipping companies data
const createSampleShippingCompanies = async (users) => {
  const admin = users.find(user => user.role === 'admin');
  
  const companies = [
    {
      companyId: 'MAERSK_001',
      companyName: 'Maersk Line',
      shortName: 'Maersk',
      contactInfo: {
        email: 'booking@maersk.com',
        phone: '+1-800-MAERSK',
        address: {
          street: '100 Maersk Plaza',
          city: 'Norfolk',
          state: 'Virginia',
          country: 'United States',
          zipCode: '23510'
        },
        website: 'https://www.maersk.com'
      },
      rates: [
        {
          containerType: '20ft',
          oceanFreight: 1200,
          localCharges: 350,
          fuelSurcharge: 150,
          currency: 'USD'
        },
        {
          containerType: '40ft',
          oceanFreight: 1800,
          localCharges: 450,
          fuelSurcharge: 200,
          currency: 'USD'
        },
        {
          containerType: '40ft_hc',
          oceanFreight: 1950,
          localCharges: 480,
          fuelSurcharge: 220,
          currency: 'USD'
        }
      ],
      chargeStructure: {
        baseCharges: {
          documentationFee: 75,
          handlingFee: 100,
          securityFee: 50
        },
        additionalServices: {
          tracking: {
            available: true,
            fee: 25
          },
          insurance: {
            available: true,
            ratePercentage: 0.5
          },
          expeditedShipping: {
            available: true,
            surchargePercentage: 30
          }
        }
      },
      serviceAreas: [
        { port: 'Mumbai', country: 'India', transitDays: 18 },
        { port: 'Chennai', country: 'India', transitDays: 20 },
        { port: 'JNPT', country: 'India', transitDays: 16 }
      ],
      performanceMetrics: {
        onTimeDelivery: 96,
        customerRating: 4.7,
        totalShipments: 15420
      },
      contractDetails: {
        contractNumber: 'MAERSK-2024-001',
        validFrom: new Date('2024-01-01'),
        validTo: new Date('2024-12-31'),
        preferredPartner: true
      },
      createdBy: admin._id
    },
    {
      companyId: 'MSC_002',
      companyName: 'Mediterranean Shipping Company',
      shortName: 'MSC',
      contactInfo: {
        email: 'india@msc.com',
        phone: '+91-22-6112-5000',
        address: {
          street: 'MSC House, Bandra Kurla Complex',
          city: 'Mumbai',
          state: 'Maharashtra',
          country: 'India',
          zipCode: '400051'
        },
        website: 'https://www.msc.com'
      },
      rates: [
        {
          containerType: '20ft',
          oceanFreight: 1150,
          localCharges: 320,
          fuelSurcharge: 140,
          currency: 'USD'
        },
        {
          containerType: '40ft',
          oceanFreight: 1750,
          localCharges: 420,
          fuelSurcharge: 180,
          currency: 'USD'
        },
        {
          containerType: '40ft_hc',
          oceanFreight: 1890,
          localCharges: 450,
          fuelSurcharge: 200,
          currency: 'USD'
        }
      ],
      chargeStructure: {
        baseCharges: {
          documentationFee: 65,
          handlingFee: 85,
          securityFee: 45
        },
        additionalServices: {
          tracking: {
            available: true,
            fee: 20
          },
          insurance: {
            available: true,
            ratePercentage: 0.4
          },
          expeditedShipping: {
            available: false,
            surchargePercentage: 0
          }
        }
      },
      serviceAreas: [
        { port: 'Mumbai', country: 'India', transitDays: 19 },
        { port: 'Chennai', country: 'India', transitDays: 21 },
        { port: 'Kolkata', country: 'India', transitDays: 22 }
      ],
      performanceMetrics: {
        onTimeDelivery: 94,
        customerRating: 4.5,
        totalShipments: 12800
      },
      contractDetails: {
        contractNumber: 'MSC-2024-002',
        validFrom: new Date('2024-01-15'),
        validTo: new Date('2024-12-31'),
        preferredPartner: true
      },
      createdBy: admin._id
    },
    {
      companyId: 'COSCO_003',
      companyName: 'COSCO Shipping Lines',
      shortName: 'COSCO',
      contactInfo: {
        email: 'booking.india@cosco.com',
        phone: '+91-11-4154-7000',
        address: {
          street: 'COSCO Tower, Connaught Place',
          city: 'New Delhi',
          state: 'Delhi',
          country: 'India',
          zipCode: '110001'
        },
        website: 'https://www.cosco-shipping.com'
      },
      rates: [
        {
          containerType: '20ft',
          oceanFreight: 1100,
          localCharges: 300,
          fuelSurcharge: 130,
          currency: 'USD'
        },
        {
          containerType: '40ft',
          oceanFreight: 1650,
          localCharges: 400,
          fuelSurcharge: 170,
          currency: 'USD'
        },
        {
          containerType: '40ft_hc',
          oceanFreight: 1780,
          localCharges: 430,
          fuelSurcharge: 190,
          currency: 'USD'
        },
        {
          containerType: '45ft',
          oceanFreight: 1950,
          localCharges: 480,
          fuelSurcharge: 210,
          currency: 'USD'
        }
      ],
      chargeStructure: {
        baseCharges: {
          documentationFee: 60,
          handlingFee: 80,
          securityFee: 40
        },
        additionalServices: {
          tracking: {
            available: true,
            fee: 15
          },
          insurance: {
            available: true,
            ratePercentage: 0.6
          },
          expeditedShipping: {
            available: true,
            surchargePercentage: 25
          }
        }
      },
      serviceAreas: [
        { port: 'Mumbai', country: 'India', transitDays: 17 },
        { port: 'Chennai', country: 'India', transitDays: 19 },
        { port: 'JNPT', country: 'India', transitDays: 15 },
        { port: 'Kolkata', country: 'India', transitDays: 20 }
      ],
      performanceMetrics: {
        onTimeDelivery: 92,
        customerRating: 4.3,
        totalShipments: 9650
      },
      contractDetails: {
        contractNumber: 'COSCO-2024-003',
        validFrom: new Date('2024-02-01'),
        validTo: new Date('2024-12-31'),
        preferredPartner: false
      },
      createdBy: admin._id
    }
  ];
  
  return companies;
};

// Seed shipping companies
const seedShippingCompanies = async (users) => {
  try {
    // Clear existing shipping companies
    await ShippingCompany.deleteMany({});
    console.log('🗑️  Cleared existing shipping companies');
    
    // Create sample shipping companies
    const sampleCompanies = await createSampleShippingCompanies(users);
    
    // Insert shipping companies
    const companies = await ShippingCompany.insertMany(sampleCompanies);
    
    console.log(`✅ Created ${companies.length} shipping companies`);
    
    // Display company summary
    for (const company of companies) {
      console.log(`   📦 ${company.companyName} (${company.shortName})`);
      console.log(`      - ${company.rates.length} container types`);
      console.log(`      - ${company.serviceAreas.length} service areas`);
      console.log(`      - On-time delivery: ${company.performanceMetrics.onTimeDelivery}%`);
      console.log(`      - Customer rating: ${company.performanceMetrics.customerRating}/5`);
      console.log(`      - Preferred partner: ${company.contractDetails.preferredPartner ? 'Yes' : 'No'}`);
      console.log('');
    }
    
    return companies;
  } catch (error) {
    console.error('❌ Error seeding shipping companies:', error);
    throw error;
  }
};

module.exports = {
  createSampleShippingCompanies,
  seedShippingCompanies
};