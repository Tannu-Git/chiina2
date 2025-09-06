import React, { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
  Building2,
  Save,
  Plus,
  DollarSign,
  Trash2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import toast from 'react-hot-toast'

const TransportCompanyModal = ({ 
  isOpen, 
  onClose, 
  company = null, 
  onSave, 
  mode = 'add' // 'add' or 'edit'
}) => {
  const [formData, setFormData] = useState({
    companyId: '',
    companyName: '',
    shortName: '',
    contactInfo: {
      email: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      website: ''
    },
    rates: [],
    serviceAreas: [],
    contractDetails: {
      contractNumber: '',
      validFrom: '',
      validTo: '',
      preferredPartner: false
    },
    performanceMetrics: {
      onTimeDelivery: 95,
      customerRating: 4.5,
      totalShipments: 0
    },
    isActive: true
  })

  const [loading, setLoading] = useState(false)

  // Initialize form data when company changes
  useEffect(() => {
    if (company && mode === 'edit') {
      setFormData({
        companyId: company.companyId || '',
        companyName: company.companyName || '',
        shortName: company.shortName || '',
        contactInfo: {
          email: company.contactInfo?.email || '',
          phone: company.contactInfo?.phone || '',
          address: {
            street: company.contactInfo?.address?.street || '',
            city: company.contactInfo?.address?.city || '',
            state: company.contactInfo?.address?.state || '',
            country: company.contactInfo?.address?.country || '',
            zipCode: company.contactInfo?.address?.zipCode || ''
          },
          website: company.contactInfo?.website || ''
        },
        rates: company.rates || [],
        serviceAreas: company.serviceAreas || [],
        contractDetails: {
          contractNumber: company.contractDetails?.contractNumber || '',
          validFrom: company.contractDetails?.validFrom || '',
          validTo: company.contractDetails?.validTo || '',
          preferredPartner: company.contractDetails?.preferredPartner || false
        },
        performanceMetrics: {
          onTimeDelivery: company.performanceMetrics?.onTimeDelivery || 95,
          customerRating: company.performanceMetrics?.customerRating || 4.5,
          totalShipments: company.performanceMetrics?.totalShipments || 0
        },
        isActive: company.isActive !== undefined ? company.isActive : true
      })
    } else {
      // Reset form for add mode
      setFormData({
        companyId: '',
        companyName: '',
        shortName: '',
        contactInfo: {
          email: '',
          phone: '',
          address: {
            street: '',
            city: '',
            state: '',
            country: '',
            zipCode: ''
          },
          website: ''
        },
        rates: [],
        serviceAreas: [],
        contractDetails: {
          contractNumber: '',
          validFrom: '',
          validTo: '',
          preferredPartner: false
        },
        performanceMetrics: {
          onTimeDelivery: 95,
          customerRating: 4.5,
          totalShipments: 0
        },
        isActive: true
      })
    }
  }, [company, mode, isOpen])

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  const handleNestedInputChange = (parentField, childField, value) => {
    setFormData(prev => ({
      ...prev,
      [parentField]: {
        ...prev[parentField],
        [childField]: value
      }
    }))
  }

  // Rate management functions
  const addNewRate = useCallback(() => {
    setFormData(prev => ({
      ...prev,
      rates: [...prev.rates, {
        containerType: '',
        oceanFreight: 0,
        localCharges: 0,
        currency: 'USD'
      }]
    }))
  }, [])

  const updateRate = useCallback((index, field, value) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.map((rate, i) => 
        i === index ? { ...rate, [field]: value } : rate
      )
    }))
  }, [])

  const removeRate = useCallback((index) => {
    setFormData(prev => ({
      ...prev,
      rates: prev.rates.filter((_, i) => i !== index)
    }))
  }, [])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Basic validation
      if (!formData.companyName || !formData.shortName || !formData.contactInfo.email) {
        toast.error('Please fill in all required fields')
        return
      }

      await onSave(formData)
      onClose()
    } catch (error) {
      console.error('Error saving company:', error)
      toast.error('Failed to save company')
    } finally {
      setLoading(false)
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"
        onClick={onClose}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          className="bg-card rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
          onClick={(e) => e.stopPropagation()}
        >
          <Card className="border-0 shadow-none">
            <CardHeader className="border-b border-border">
              <div className="flex items-center justify-between">
                <CardTitle className="flex items-center text-foreground">
                  <Building2 className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                  {mode === 'add' ? 'Add Transport Company' : 'Edit Transport Company'}
                </CardTitle>
                <Button variant="ghost" size="icon" onClick={onClose}>
                  <X className="h-4 w-4" />
                </Button>
              </div>
            </CardHeader>
            
            <CardContent className="p-6">
              <form onSubmit={handleSubmit} className="space-y-6">
                {/* Basic Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Basic Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Company ID *
                      </label>
                      <Input
                        value={formData.companyId}
                        onChange={(e) => handleInputChange('companyId', e.target.value)}
                        placeholder="e.g., maersk"
                        disabled={mode === 'edit'}
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Short Name *
                      </label>
                      <Input
                        value={formData.shortName}
                        onChange={(e) => handleInputChange('shortName', e.target.value)}
                        placeholder="e.g., MSK"
                        required
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Company Name *
                    </label>
                    <Input
                      value={formData.companyName}
                      onChange={(e) => handleInputChange('companyName', e.target.value)}
                      placeholder="e.g., Maersk Line"
                      required
                    />
                  </div>
                </div>

                {/* Contact Information */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Contact Information</h3>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Email *
                      </label>
                      <Input
                        type="email"
                        value={formData.contactInfo.email}
                        onChange={(e) => handleNestedInputChange('contactInfo', 'email', e.target.value)}
                        placeholder="contact@company.com"
                        required
                      />
                    </div>
                    
                    <div>
                      <label className="block text-sm font-medium text-foreground mb-1">
                        Phone
                      </label>
                      <Input
                        value={formData.contactInfo.phone}
                        onChange={(e) => handleNestedInputChange('contactInfo', 'phone', e.target.value)}
                        placeholder="+1-234-567-8900"
                      />
                    </div>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-medium text-foreground mb-1">
                      Website
                    </label>
                    <Input
                      value={formData.contactInfo.website}
                      onChange={(e) => handleNestedInputChange('contactInfo', 'website', e.target.value)}
                      placeholder="https://www.company.com"
                    />
                  </div>
                </div>

                {/* Status and Contract */}
                <div className="space-y-4">
                  <h3 className="text-lg font-medium text-foreground">Status & Contract</h3>
                  
                  <div className="flex items-center space-x-4">
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.isActive}
                        onChange={(e) => handleInputChange('isActive', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-foreground">Active Company</span>
                    </label>
                    
                    <label className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        checked={formData.contractDetails.preferredPartner}
                        onChange={(e) => handleNestedInputChange('contractDetails', 'preferredPartner', e.target.checked)}
                        className="rounded"
                      />
                      <span className="text-sm font-medium text-foreground">Preferred Partner</span>
                    </label>
                  </div>
                </div>

                {/* Shipping Rates */}
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-lg font-medium text-foreground">Shipping Rates</h3>
                    <Button
                      type="button"
                      variant="outline"
                      size="sm"
                      onClick={addNewRate}
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Rate
                    </Button>
                  </div>
                  
                  {formData.rates.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <DollarSign className="h-8 w-8 mx-auto mb-2 opacity-50" />
                      <p>No rates configured. Add rates for different container types.</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {formData.rates.map((rate, index) => (
                        <div key={index} className="p-4 border border-border rounded-lg bg-muted/50">
                          <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                Container Type
                              </label>
                              <Select
                                value={rate.containerType}
                                onValueChange={(value) => updateRate(index, 'containerType', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue placeholder="Select type" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="20ft">20ft Container</SelectItem>
                                  <SelectItem value="40ft">40ft Container</SelectItem>
                                  <SelectItem value="40ft_hc">40ft High Cube</SelectItem>
                                  <SelectItem value="45ft">45ft Container</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                Ocean Freight
                              </label>
                              <Input
                                type="number"
                                value={rate.oceanFreight || ''}
                                onChange={(e) => updateRate(index, 'oceanFreight', parseFloat(e.target.value) || 0)}
                                placeholder="1500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                Local Charges
                              </label>
                              <Input
                                type="number"
                                value={rate.localCharges || ''}
                                onChange={(e) => updateRate(index, 'localCharges', parseFloat(e.target.value) || 0)}
                                placeholder="500"
                              />
                            </div>
                            
                            <div>
                              <label className="block text-sm font-medium text-foreground mb-1">
                                Currency
                              </label>
                              <Select
                                value={rate.currency || 'USD'}
                                onValueChange={(value) => updateRate(index, 'currency', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="USD">USD</SelectItem>
                                  <SelectItem value="INR">INR</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            
                            <div className="flex items-end">
                              <Button
                                type="button"
                                variant="destructive"
                                size="sm"
                                onClick={() => removeRate(index)}
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Submit Buttons */}
                <div className="flex justify-end space-x-3 pt-6 border-t border-border">
                  <Button type="button" variant="outline" onClick={onClose}>
                    Cancel
                  </Button>
                  <Button type="submit" disabled={loading} className="amber-gradient hover:from-amber-600 hover:to-orange-600 text-white">
                    {loading ? (
                      <div className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full mr-2" />
                    ) : mode === 'add' ? (
                      <Plus className="h-4 w-4 mr-2" />
                    ) : (
                      <Save className="h-4 w-4 mr-2" />
                    )}
                    {loading ? 'Saving...' : mode === 'add' ? 'Add Company' : 'Save Changes'}
                  </Button>
                </div>
              </form>
            </CardContent>
          </Card>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}

export default TransportCompanyModal