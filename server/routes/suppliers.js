const express = require('express');
const { auth, authorize } = require('../middleware/auth');
const AuditLogger = require('../services/AuditLogger');

const router = express.Router();

// Mock supplier data (in real app, this would be a database)
const suppliers = [
  {
    id: '1',
    name: 'Global Electronics Ltd',
    location: 'Shenzhen, China',
    contact: {
      phone: '+86-755-1234567',
      email: 'sales@globalelectronics.com',
      website: 'www.globalelectronics.com'
    },
    specialties: ['Electronics', 'Components', 'Semiconductors'],
    rating: 4.8,
    verified: true,
    isPreferred: true,
    lastOrderDate: '2024-01-15',
    averagePrice: 25.50,
    leadTime: 15,
    paymentTerms: 'T/T 30 days',
    riskLevel: 'low'
  },
  {
    id: '2',
    name: 'Pacific Manufacturing Co',
    location: 'Guangzhou, China',
    contact: {
      phone: '+86-20-9876543',
      email: 'info@pacificmfg.com'
    },
    specialties: ['Textiles', 'Apparel', 'Home Goods'],
    rating: 4.5,
    verified: true,
    isPreferred: false,
    lastOrderDate: '2024-01-10',
    averagePrice: 18.75,
    leadTime: 20,
    paymentTerms: 'L/C at sight',
    riskLevel: 'low'
  },
  {
    id: '3',
    name: 'Industrial Parts Supply',
    location: 'Shanghai, China',
    contact: {
      phone: '+86-21-5555666',
      email: 'orders@industrialparts.com'
    },
    specialties: ['Machinery', 'Industrial Equipment', 'Tools'],
    rating: 4.2,
    verified: true,
    isPreferred: false,
    lastOrderDate: '2023-12-20',
    averagePrice: 45.20,
    leadTime: 25,
    paymentTerms: 'T/T 45 days',
    riskLevel: 'medium'
  },
  {
    id: '4',
    name: 'Quality Plastics Inc',
    location: 'Dongguan, China',
    contact: {
      phone: '+86-769-3333444',
      email: 'sales@qualityplastics.com'
    },
    specialties: ['Plastics', 'Injection Molding', 'Packaging'],
    rating: 4.0,
    verified: false,
    isPreferred: false,
    lastOrderDate: '2023-11-30',
    averagePrice: 12.30,
    leadTime: 18,
    paymentTerms: 'T/T 15 days',
    riskLevel: 'medium'
  },
  {
    id: '5',
    name: 'Premium Metals Trading',
    location: 'Ningbo, China',
    contact: {
      phone: '+86-574-7777888',
      email: 'contact@premiummetals.com'
    },
    specialties: ['Metals', 'Alloys', 'Raw Materials'],
    rating: 3.8,
    verified: true,
    isPreferred: false,
    lastOrderDate: '2023-10-15',
    averagePrice: 85.60,
    leadTime: 30,
    paymentTerms: 'L/C 60 days',
    riskLevel: 'high'
  }
];

// @route   GET /api/suppliers
// @desc    Get suppliers with filtering and AI matching
// @access  Private
router.get('/', auth, async (req, res) => {
  try {
    const { 
      itemCode, 
      category, 
      includeRatings = false, 
      includeHistory = false,
      search,
      verified,
      preferred,
      riskLevel
    } = req.query;

    let filteredSuppliers = [...suppliers];

    // Apply filters
    if (search) {
      filteredSuppliers = filteredSuppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(search.toLowerCase()) ||
        supplier.location.toLowerCase().includes(search.toLowerCase()) ||
        supplier.specialties.some(s => s.toLowerCase().includes(search.toLowerCase()))
      );
    }

    if (verified === 'true') {
      filteredSuppliers = filteredSuppliers.filter(s => s.verified);
    }

    if (preferred === 'true') {
      filteredSuppliers = filteredSuppliers.filter(s => s.isPreferred);
    }

    if (riskLevel) {
      filteredSuppliers = filteredSuppliers.filter(s => s.riskLevel === riskLevel);
    }

    // Category-based filtering
    if (category) {
      filteredSuppliers = filteredSuppliers.filter(supplier =>
        supplier.specialties.some(specialty =>
          specialty.toLowerCase().includes(category.toLowerCase())
        )
      );
    }

    // Sort by preference and rating
    filteredSuppliers.sort((a, b) => {
      if (a.isPreferred && !b.isPreferred) return -1;
      if (!a.isPreferred && b.isPreferred) return 1;
      return b.rating - a.rating;
    });

    // Log supplier access
    await AuditLogger.logDataAccess(
      req.user,
      req,
      'supplier',
      null,
      'SUPPLIERS_ACCESSED'
    );

    res.json({
      suppliers: filteredSuppliers,
      total: filteredSuppliers.length,
      filters: { itemCode, category, search, verified, preferred, riskLevel }
    });
  } catch (error) {
    console.error('Get suppliers error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/suppliers
// @desc    Add new supplier
// @access  Private (Staff/Admin)
router.post('/', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const {
      name,
      location,
      contact,
      specialties,
      paymentTerms,
      leadTime
    } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({ message: 'Supplier name is required' });
    }

    // Check for duplicate supplier
    const existingSupplier = suppliers.find(s => 
      s.name.toLowerCase() === name.toLowerCase()
    );

    if (existingSupplier) {
      return res.status(400).json({ message: 'Supplier already exists' });
    }

    const newSupplier = {
      id: (suppliers.length + 1).toString(),
      name: name.trim(),
      location: location || '',
      contact: contact || {},
      specialties: Array.isArray(specialties) ? specialties : [],
      rating: 0,
      verified: false,
      isPreferred: false,
      lastOrderDate: null,
      averagePrice: 0,
      leadTime: parseInt(leadTime) || 30,
      paymentTerms: paymentTerms || 'T/T 30 days',
      riskLevel: 'medium',
      createdAt: new Date().toISOString(),
      createdBy: req.user.id
    };

    suppliers.push(newSupplier);

    // Log supplier creation
    await AuditLogger.log(
      'SUPPLIER_CREATED',
      req.user,
      req,
      {
        resourceType: 'supplier',
        resourceId: newSupplier.id,
        severity: 'medium',
        details: {
          supplierName: newSupplier.name,
          location: newSupplier.location
        }
      }
    );

    res.status(201).json({
      message: 'Supplier created successfully',
      supplier: newSupplier
    });
  } catch (error) {
    console.error('Create supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   PUT /api/suppliers/:id
// @desc    Update supplier
// @access  Private (Staff/Admin)
router.put('/:id', auth, authorize(['admin', 'staff']), async (req, res) => {
  try {
    const { id } = req.params;
    const updates = req.body;

    const supplierIndex = suppliers.findIndex(s => s.id === id);
    if (supplierIndex === -1) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const oldSupplier = { ...suppliers[supplierIndex] };
    suppliers[supplierIndex] = {
      ...suppliers[supplierIndex],
      ...updates,
      updatedAt: new Date().toISOString(),
      updatedBy: req.user.id
    };

    // Log supplier update
    await AuditLogger.logOrderChange(
      'SUPPLIER_UPDATED',
      req.user,
      req,
      id,
      oldSupplier,
      suppliers[supplierIndex]
    );

    res.json({
      message: 'Supplier updated successfully',
      supplier: suppliers[supplierIndex]
    });
  } catch (error) {
    console.error('Update supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   DELETE /api/suppliers/:id
// @desc    Delete supplier
// @access  Private (Admin only)
router.delete('/:id', auth, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params;

    const supplierIndex = suppliers.findIndex(s => s.id === id);
    if (supplierIndex === -1) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    const deletedSupplier = suppliers[supplierIndex];
    suppliers.splice(supplierIndex, 1);

    // Log supplier deletion
    await AuditLogger.log(
      'SUPPLIER_DELETED',
      req.user,
      req,
      {
        resourceType: 'supplier',
        resourceId: id,
        severity: 'high',
        details: {
          supplierName: deletedSupplier.name,
          deletedData: deletedSupplier
        }
      }
    );

    res.json({ message: 'Supplier deleted successfully' });
  } catch (error) {
    console.error('Delete supplier error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   POST /api/suppliers/ai-match
// @desc    AI-powered supplier matching
// @access  Private
router.post('/ai-match', auth, async (req, res) => {
  try {
    const { itemCode, category, context } = req.body;

    // Simulate AI-powered supplier matching
    const matches = suppliers
      .filter(supplier => {
        if (category) {
          return supplier.specialties.some(specialty =>
            specialty.toLowerCase().includes(category.toLowerCase())
          );
        }
        return true;
      })
      .map(supplier => ({
        ...supplier,
        confidence: Math.random() * 0.4 + 0.6, // 60-100% confidence
        matchReasons: [
          'Specialty alignment',
          'Historical performance',
          'Geographic proximity',
          'Price competitiveness'
        ].slice(0, Math.floor(Math.random() * 3) + 1)
      }))
      .sort((a, b) => b.confidence - a.confidence)
      .slice(0, 3);

    // Log AI matching usage
    await AuditLogger.log(
      'AI_SUPPLIER_MATCHING',
      req.user,
      req,
      {
        resourceType: 'supplier',
        severity: 'low',
        details: {
          itemCode,
          category,
          context,
          matchCount: matches.length
        }
      }
    );

    res.json({ matches });
  } catch (error) {
    console.error('AI supplier matching error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /api/suppliers/:id/performance
// @desc    Get supplier performance metrics
// @access  Private
router.get('/:id/performance', auth, async (req, res) => {
  try {
    const { id } = req.params;

    const supplier = suppliers.find(s => s.id === id);
    if (!supplier) {
      return res.status(404).json({ message: 'Supplier not found' });
    }

    // Simulate performance metrics
    const performance = {
      supplierId: id,
      supplierName: supplier.name,
      metrics: {
        onTimeDelivery: Math.random() * 20 + 80, // 80-100%
        qualityScore: Math.random() * 15 + 85, // 85-100%
        priceCompetitiveness: Math.random() * 25 + 75, // 75-100%
        communicationRating: Math.random() * 20 + 80, // 80-100%
        overallRating: supplier.rating
      },
      recentOrders: Math.floor(Math.random() * 50) + 10,
      totalValue: Math.random() * 500000 + 100000,
      averageOrderValue: Math.random() * 10000 + 5000,
      riskFactors: supplier.riskLevel === 'high' ? [
        'Payment delays',
        'Quality issues',
        'Communication problems'
      ] : supplier.riskLevel === 'medium' ? [
        'Occasional delays'
      ] : [],
      recommendations: [
        'Consider for preferred supplier status',
        'Negotiate better payment terms',
        'Increase order frequency for better pricing'
      ].slice(0, Math.floor(Math.random() * 3) + 1)
    };

    res.json({ performance });
  } catch (error) {
    console.error('Supplier performance error:', error);
    res.status(500).json({ message: 'Server error' });
  }
});

module.exports = router;
