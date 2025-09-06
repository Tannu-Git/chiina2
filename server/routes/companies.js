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
    
    // Validate required fields
    if (!companyId || !companyName || !shortName) {
      return res.status(400).json({ 
        message: 'Missing required fields: companyId, companyName, and shortName are required' 
      });
    }
    
    if (!contactInfo || !contactInfo.email || !contactInfo.phone) {
      return res.status(400).json({ 
        message: 'Contact information (email and phone) is required' 
      });
    }
    
    // Check if company ID already exists
    const existingCompany = await ShippingCompany.findOne({ companyId });
    if (existingCompany) {
      return res.status(400).json({ message: 'Company ID already exists' });
    }
    
    // Check if company name already exists
    const existingName = await ShippingCompany.findOne({ companyName });
    if (existingName) {
      return res.status(400).json({ message: 'Company name already exists' });
    }
    
    const newCompany = new ShippingCompany({
      companyId: companyId.trim(),
      companyName: companyName.trim(),
      shortName: shortName.trim(),
      contactInfo: {
        email: contactInfo.email.trim().toLowerCase(),
        phone: contactInfo.phone.trim(),
        address: contactInfo.address || {},
        website: contactInfo.website || ''
      },
      rates: rates || [],
      serviceAreas: serviceAreas || [],
      contractDetails: contractDetails || {
        preferredPartner: false
      },
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
      isActive: true,
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
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: messages 
      });
    }
    
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
    delete updateFields.createdAt;
    delete updateFields.updatedAt;
    
    // Validate if companyId is being changed and doesn't conflict
    if (updateFields.companyId && updateFields.companyId !== company.companyId) {
      const existingCompany = await ShippingCompany.findOne({ 
        companyId: updateFields.companyId,
        _id: { $ne: req.params.id }
      });
      if (existingCompany) {
        return res.status(400).json({ message: 'Company ID already exists' });
      }
    }
    
    // Validate if companyName is being changed and doesn't conflict
    if (updateFields.companyName && updateFields.companyName !== company.companyName) {
      const existingName = await ShippingCompany.findOne({ 
        companyName: updateFields.companyName,
        _id: { $ne: req.params.id }
      });
      if (existingName) {
        return res.status(400).json({ message: 'Company name already exists' });
      }
    }
    
    // Clean and validate contact info if provided
    if (updateFields.contactInfo) {
      if (updateFields.contactInfo.email) {
        updateFields.contactInfo.email = updateFields.contactInfo.email.trim().toLowerCase();
      }
      if (updateFields.contactInfo.phone) {
        updateFields.contactInfo.phone = updateFields.contactInfo.phone.trim();
      }
    }
    
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
    
    // Handle mongoose validation errors
    if (error.name === 'ValidationError') {
      const messages = Object.values(error.errors).map(err => err.message);
      return res.status(400).json({ 
        message: 'Validation failed', 
        errors: messages 
      });
    }
    
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

// @route   DELETE /api/companies/transport/:id
// @desc    Delete transport company (hard delete)
// @access  Private (Admin only)
router.delete('/transport/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    // Store company info for logging before deletion
    const companyInfo = {
      companyId: company.companyId,
      companyName: company.companyName,
      deletedBy: req.user.name
    };
    
    // Hard delete the company
    await ShippingCompany.findByIdAndDelete(req.params.id);
    
    console.log('Transport company permanently deleted:', companyInfo);
    
    res.json({
      message: 'Transport company deleted successfully',
      deletedCompany: {
        id: req.params.id,
        companyName: companyInfo.companyName,
        companyId: companyInfo.companyId
      }
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
    
    if (!rates || !Array.isArray(rates)) {
      return res.status(400).json({ message: 'Rates must be provided as an array' });
    }
    
    const company = await ShippingCompany.findById(req.params.id);
    if (!company) {
      return res.status(404).json({ message: 'Transport company not found' });
    }
    
    // Validate rate structure
    for (const rate of rates) {
      if (!rate.containerType || !rate.oceanFreight || !rate.localCharges) {
        return res.status(400).json({ 
          message: 'Each rate must have containerType, oceanFreight, and localCharges' 
        });
      }
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





// @route   GET /api/companies/summary
// @desc    Get transport companies summary statistics
// @access  Private
router.get('/summary', auth, async (req, res) => {
  try {
    const totalTransport = await ShippingCompany.countDocuments({});
    const activeTransport = await ShippingCompany.countDocuments({ isActive: true });
    const inactiveTransport = await ShippingCompany.countDocuments({ isActive: false });
    const preferredPartners = await ShippingCompany.countDocuments({ 
      'contractDetails.preferredPartner': true 
    });
    
    // Calculate average performance metrics from all companies
    const performanceAggregation = await ShippingCompany.aggregate([
      {
        $group: {
          _id: null,
          avgOnTimeDelivery: { $avg: '$performanceMetrics.onTimeDelivery' },
          avgCustomerRating: { $avg: '$performanceMetrics.customerRating' },
          totalShipments: { $sum: '$performanceMetrics.totalShipments' }
        }
      }
    ]);
    
    const performanceData = performanceAggregation[0] || {
      avgOnTimeDelivery: 0,
      avgCustomerRating: 0,
      totalShipments: 0
    };
    
    res.json({
      summary: {
        totalTransport,
        activeTransport,
        inactiveTransport,
        preferredPartners,
        averageOnTimeDelivery: Math.round(performanceData.avgOnTimeDelivery * 10) / 10 || 0,
        averageCustomerRating: Math.round(performanceData.avgCustomerRating * 10) / 10 || 0,
        totalShipments: performanceData.totalShipments || 0
      },
      timestamp: new Date().toISOString()
    });
  } catch (error) {
    console.error('Companies summary fetch error:', error);
    res.status(500).json({ message: 'Server error', error: error.message });
  }
});

module.exports = router;