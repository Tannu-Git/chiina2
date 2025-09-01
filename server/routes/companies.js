const express = require('express');
const ShippingCompany = require('../models/ShippingCompany');
const { auth, authorize } = require('../middleware/auth');

const router = express.Router();

// ============ TRANSPORT COMPANIES (SHIPPING COMPANIES) ============

// @route   GET /api/companies/transport
// @desc    Get all transport companies with pagination and filtering
// @access  Private
router.get('/transport', auth, async (req, res) => {
  try {
    const { page = 1, limit = 10, search, status } = req.query;
    
    let query = {};
    
    // Search filter
    if (search) {
      query.$or = [
        { companyName: { $regex: search, $options: 'i' } },
        { shortName: { $regex: search, $options: 'i' } },
        { companyId: { $regex: search, $options: 'i' } }
      ];
    }
    
    // Status filter
    if (status === 'active') {
      query.isActive = true;
    } else if (status === 'inactive') {
      query.isActive = false;
    } else if (status === 'preferred') {
      query['contractDetails.preferredPartner'] = true;
    }
    
    const options = {
      page: parseInt(page),
      limit: parseInt(limit),
      sort: { companyName: 1 }
    };
    
    const companies = await ShippingCompany.find(query)
      .sort(options.sort)
      .limit(options.limit * 1)
      .skip((options.page - 1) * options.limit);
    
    const total = await ShippingCompany.countDocuments(query);
    
    res.json({
      companies,
      pagination: {
        current: options.page,
        pages: Math.ceil(total / options.limit),
        total
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transport companies fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/companies/transport
// @desc    Create new transport company
// @access  Private (Admin/Staff only)
router.post('/transport', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { 
      companyId, 
      companyName, 
      shortName, 
      contactInfo, 
      rates,
      serviceAreas,
      contractDetails,
      chargeStructure,
      performanceMetrics 
    } = req.body;
    
    // Check if company ID already exists
    const existingCompany = await ShippingCompany.findOne({ companyId });
    if (existingCompany) {
      return res.status(400).json({ message: 'Company ID already exists' });
    }
    
    const newCompany = new ShippingCompany({
      companyId,
      companyName,
      shortName,
      contactInfo,
      rates: rates || [],
      serviceAreas: serviceAreas || [],
      contractDetails: contractDetails || {},
      chargeStructure: chargeStructure || {
        baseCharges: { documentationFee: 0, handlingFee: 0, securityFee: 0 },
        additionalServices: {
          tracking: { available: true, fee: 0 },
          insurance: { available: true, ratePercentage: 0.5 },
          expeditedShipping: { available: false, surchargePercentage: 25 }
        }
      },
      performanceMetrics: performanceMetrics || {
        onTimeDelivery: 95,
        customerRating: 4.5,
        totalShipments: 0
      },
      createdBy: req.user.id
    });
    
    await newCompany.save();
    
    console.log('New transport company created:', {
      companyId: newCompany.companyId,
      companyName: newCompany.companyName,
      createdBy: req.user.name
    });
    
    res.status(201).json({
      message: 'Transport company created successfully',
      company: newCompany
    });
  } catch (error) {
    console.error('Transport company creation error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/companies/transport/:id
// @desc    Update transport company
// @access  Private (Admin/Staff only)
router.put('/transport/:id', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    const updateFields = { ...req.body };
    delete updateFields._id;
    delete updateFields.__v;
    
    // Add updated by info
    updateFields.updatedBy = req.user.id;
    
    const updatedCompany = await ShippingCompany.findByIdAndUpdate(
      req.params.id,
      updateFields,
      { new: true, runValidators: true }
    );
    
    console.log('Transport company updated:', {
      companyId: updatedCompany.companyId,
      companyName: updatedCompany.companyName,
      updatedBy: req.user.name
    });
    
    res.json({
      message: 'Transport company updated successfully',
      company: updatedCompany
    });
  } catch (error) {
    console.error('Transport company update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/companies/transport/:id
// @desc    Delete transport company (soft delete by setting isActive to false)
// @access  Private (Admin only)
router.delete('/transport/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    // Soft delete by setting isActive to false
    company.isActive = false;
    company.updatedBy = req.user.id;
    await company.save();
    
    console.log('Transport company deactivated:', {
      companyId: company.companyId,
      companyName: company.companyName,
      deactivatedBy: req.user.name
    });
    
    res.json({
      message: 'Transport company deactivated successfully',
      company: { id: company._id, companyName: company.companyName, isActive: false }
    });
  } catch (error) {
    console.error('Transport company deletion error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/companies/transport/:id
// @desc    Get single transport company details
// @access  Private
router.get('/transport/:id', auth, async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    res.json({
      company,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Transport company details fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/companies/transport/:id/rates
// @desc    Update rates for transport company
// @access  Private (Admin/Staff only)
router.put('/transport/:id/rates', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { rates } = req.body;
    
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    company.rates = rates;
    company.updatedBy = req.user.id;
    await company.save();
    
    console.log('Transport company rates updated:', {
      companyId: company.companyId,
      ratesCount: rates.length,
      updatedBy: req.user.name
    });
    
    res.json({
      message: 'Transport company rates updated successfully',
      company: {
        id: company._id,
        companyName: company.companyName,
        rates: company.rates
      }
    });
  } catch (error) {
    console.error('Transport company rates update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   PUT /api/companies/transport/:id/contract
// @desc    Update contract details for transport company
// @access  Private (Admin only)
router.put('/transport/:id/contract', auth, authorize('admin'), async (req, res) => {
  try {
    const { contractDetails } = req.body;
    
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    company.contractDetails = { ...company.contractDetails, ...contractDetails };
    company.updatedBy = req.user.id;
    await company.save();
    
    console.log('Transport company contract updated:', {
      companyId: company.companyId,
      preferredPartner: company.contractDetails.preferredPartner,
      updatedBy: req.user.name
    });
    
    res.json({
      message: 'Transport company contract updated successfully',
      company: {
        id: company._id,
        companyName: company.companyName,
        contractDetails: company.contractDetails
      }
    });
  } catch (error) {
    console.error('Transport company contract update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   POST /api/companies/transport/:id/performance
// @desc    Update performance metrics for transport company
// @access  Private (Admin/Staff only)
router.post('/transport/:id/performance', auth, authorize('admin', 'staff'), async (req, res) => {
  try {
    const { performanceData } = req.body;
    
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    // Update performance metrics
    if (performanceData.onTimeDelivery !== undefined) {
      company.performanceMetrics.onTimeDelivery = performanceData.onTimeDelivery;
    }
    if (performanceData.customerRating !== undefined) {
      company.performanceMetrics.customerRating = performanceData.customerRating;
    }
    if (performanceData.totalShipments !== undefined) {
      company.performanceMetrics.totalShipments = performanceData.totalShipments;
    }
    
    company.updatedBy = req.user.id;
    await company.save();
    
    console.log('Transport company performance updated:', {
      companyId: company.companyId,
      performanceMetrics: company.performanceMetrics,
      updatedBy: req.user.name
    });
    
    res.json({
      message: 'Transport company performance updated successfully',
      company: {
        id: company._id,
        companyName: company.companyName,
        performanceMetrics: company.performanceMetrics
      }
    });
  } catch (error) {
    console.error('Transport company performance update error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ SERVICE PROVIDERS ============
// Note: These are mock implementations. In a real scenario, you'd create a ServiceProvider model

// @route   GET /api/companies/service-providers
// @desc    Get all service providers
// @access  Private
router.get('/service-providers', auth, async (req, res) => {
  try {
    // Mock service providers data - in real implementation, use ServiceProvider model
    const serviceProviders = [
      {
        _id: 'sp_001',
        companyName: 'Global Warehouse Solutions',
        shortName: 'GWS',
        serviceType: 'Warehousing',
        contactInfo: {
          email: 'operations@gws.com',
          phone: '+91-22-2345-6789',
          address: { city: 'Mumbai', country: 'India' }
        },
        rates: { storagePerCBM: 150, currency: 'INR' },
        isActive: true,
        performanceMetrics: { accuracyRate: 99.2, customerRating: 4.6 }
      },
      {
        _id: 'sp_002',
        companyName: 'Express Customs Clearance',
        shortName: 'ECC',
        serviceType: 'Customs Brokerage',
        contactInfo: {
          email: 'clearance@ecc.in',
          phone: '+91-11-3456-7890',
          address: { city: 'New Delhi', country: 'India' }
        },
        rates: { clearanceFee: 5000, currency: 'INR' },
        isActive: true,
        performanceMetrics: { successRate: 98.5, customerRating: 4.8 }
      },
      {
        _id: 'sp_003',
        companyName: 'Fast Track Logistics',
        shortName: 'FTL',
        serviceType: 'Last Mile Delivery',
        contactInfo: {
          email: 'delivery@ftl.com',
          phone: '+91-80-9876-5432',
          address: { city: 'Bangalore', country: 'India' }
        },
        rates: { deliveryPerKm: 12, currency: 'INR' },
        isActive: true,
        performanceMetrics: { deliverySpeed: 96.8, customerRating: 4.4 }
      }
    ];
    
    res.json({
      serviceProviders,
      total: serviceProviders.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Service providers fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// ============ BUSINESS PARTNERS ============
// Note: These are mock implementations. In a real scenario, you'd create a BusinessPartner model

// @route   GET /api/companies/business-partners
// @desc    Get all business partners
// @access  Private
router.get('/business-partners', auth, async (req, res) => {
  try {
    // Mock business partners data - in real implementation, use BusinessPartner model
    const businessPartners = [
      {
        _id: 'bp_001',
        companyName: 'Asia Freight Forwarders',
        shortName: 'AFF',
        partnerType: 'Freight Forwarder',
        contactInfo: {
          email: 'bookings@aff.com',
          phone: '+86-21-5678-9012',
          address: { city: 'Shanghai', country: 'China' }
        },
        businessVolume: { totalOrders: 245, totalValue: 2450000 },
        partnershipLevel: 'Premium',
        isActive: true,
        performanceMetrics: { reliabilityScore: 96, customerRating: 4.5 }
      },
      {
        _id: 'bp_002',
        companyName: 'Port Operations Ltd',
        shortName: 'POL',
        partnerType: 'Port Operator',
        contactInfo: {
          email: 'operations@pol.in',
          phone: '+91-22-1234-5678',
          address: { city: 'Mumbai', country: 'India' }
        },
        businessVolume: { totalOrders: 189, totalValue: 1890000 },
        partnershipLevel: 'Standard',
        isActive: true,
        performanceMetrics: { reliabilityScore: 94, customerRating: 4.3 }
      },
      {
        _id: 'bp_003',
        companyName: 'Inland Transport Co.',
        shortName: 'ITC',
        partnerType: 'Trucking Company',
        contactInfo: {
          email: 'dispatch@itc.com',
          phone: '+91-11-8765-4321',
          address: { city: 'Delhi', country: 'India' }
        },
        businessVolume: { totalOrders: 156, totalValue: 1560000 },
        partnershipLevel: 'Standard',
        isActive: true,
        performanceMetrics: { reliabilityScore: 92, customerRating: 4.2 }
      }
    ];
    
    res.json({
      businessPartners,
      total: businessPartners.length,
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Business partners fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   GET /api/companies/summary
// @desc    Get companies summary statistics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const transportCount = await ShippingCompany.countDocuments({ isActive: true });
    const preferredCount = await ShippingCompany.countDocuments({ 
      isActive: true, 
      'contractDetails.preferredPartner': true 
    });
    
    // Mock counts for service providers and business partners
    const serviceProvidersCount = 3; // In real implementation, count from ServiceProvider model
    const businessPartnersCount = 3; // In real implementation, count from BusinessPartner model
    
    const totalBusinessValue = 5900000; // Mock value - calculate from actual business partner data
    
    res.json({
      summary: {
        totalTransport: transportCount,
        totalServiceProviders: serviceProvidersCount,
        totalBusinessPartners: businessPartnersCount,
        activeCompanies: transportCount + serviceProvidersCount + businessPartnersCount,
        preferredPartners: preferredCount,
        totalBusinessValue
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Companies summary fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;