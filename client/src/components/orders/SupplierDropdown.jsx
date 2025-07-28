import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Search,
  Building,
  MapPin,
  Phone,
  Mail,
  Star,
  Clock,
  TrendingUp,
  Plus,
  Check,
  AlertTriangle,
  Globe
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const SupplierDropdown = ({ value, onChange, itemCode, category }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suppliers, setSuppliers] = useState([])
  const [filteredSuppliers, setFilteredSuppliers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [loading, setLoading] = useState(false)
  const [selectedSupplier, setSelectedSupplier] = useState(null)
  const [showAddForm, setShowAddForm] = useState(false)
  const dropdownRef = useRef(null)

  // Fetch suppliers
  const fetchSuppliers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/suppliers', {
        params: {
          itemCode,
          category,
          includeRatings: true,
          includeHistory: true
        }
      })

      const suppliersData = response.data.suppliers || []

      // Add AI-powered supplier matching
      if (itemCode) {
        const aiMatches = await getAISupplierMatches(itemCode)
        suppliersData.push(...aiMatches)
      }

      setSuppliers(suppliersData)
      setFilteredSuppliers(suppliersData)

      // Find selected supplier
      const selected = suppliersData.find(s => s.id === value || s.name === value)
      setSelectedSupplier(selected)
    } catch (error) {
      console.error('Error fetching suppliers:', error)
      toast.error('Failed to load suppliers')
    } finally {
      setLoading(false)
    }
  }

  // AI-powered supplier matching
  const getAISupplierMatches = async (itemCode) => {
    try {
      const response = await axios.post('/api/suppliers/ai-match', {
        itemCode,
        category,
        context: 'order_creation'
      })

      return response.data.matches?.map(supplier => ({
        ...supplier,
        isAI: true,
        matchScore: supplier.confidence || 0.8
      })) || []
    } catch (error) {
      return []
    }
  }

  // Filter suppliers based on search
  useEffect(() => {
    if (!searchTerm) {
      setFilteredSuppliers(suppliers)
    } else {
      const filtered = suppliers.filter(supplier =>
        supplier.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.location?.toLowerCase().includes(searchTerm.toLowerCase()) ||
        supplier.specialties?.some(s => s.toLowerCase().includes(searchTerm.toLowerCase()))
      )
      setFilteredSuppliers(filtered)
    }
  }, [searchTerm, suppliers])

  // Load suppliers on mount
  useEffect(() => {
    fetchSuppliers()
  }, [itemCode, category])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  // Select supplier
  const selectSupplier = (supplier) => {
    setSelectedSupplier(supplier)
    onChange(supplier.name)
    setIsOpen(false)
    setSearchTerm('')
  }

  // Add new supplier
  const addNewSupplier = async (supplierData) => {
    try {
      const response = await axios.post('/api/suppliers', supplierData)
      const newSupplier = response.data.supplier

      setSuppliers(prev => [newSupplier, ...prev])
      selectSupplier(newSupplier)
      setShowAddForm(false)
      toast.success('Supplier added successfully')
    } catch (error) {
      console.error('Error adding supplier:', error)
      toast.error('Failed to add supplier')
    }
  }

  const SupplierItem = ({ supplier, index }) => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className="p-3 cursor-pointer border-b border-stone-100 hover:bg-amber-50"
      onClick={() => selectSupplier(supplier)}
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2 mb-1">
            <Building className="h-4 w-4 text-stone-400" />
            <span className="font-medium text-stone-900">{supplier.name}</span>

            {supplier.isAI && (
              <Badge variant="outline" className="text-xs bg-stone-50 text-stone-700">
                AI Match {Math.round(supplier.matchScore * 100)}%
              </Badge>
            )}

            {supplier.isPreferred && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                <Star className="h-3 w-3 mr-1" />
                Preferred
              </Badge>
            )}

            {supplier.verified && (
              <Badge variant="outline" className="text-xs bg-green-50 text-green-700">
                <Check className="h-3 w-3 mr-1" />
                Verified
              </Badge>
            )}
          </div>

          <div className="space-y-1 text-sm text-stone-600">
            {supplier.location && (
              <div className="flex items-center">
                <MapPin className="h-3 w-3 mr-1" />
                {supplier.location}
              </div>
            )}

            {supplier.contact && (
              <div className="flex items-center space-x-3">
                {supplier.contact.phone && (
                  <div className="flex items-center">
                    <Phone className="h-3 w-3 mr-1" />
                    {supplier.contact.phone}
                  </div>
                )}
                {supplier.contact.email && (
                  <div className="flex items-center">
                    <Mail className="h-3 w-3 mr-1" />
                    {supplier.contact.email}
                  </div>
                )}
              </div>
            )}

            {supplier.specialties && supplier.specialties.length > 0 && (
              <div className="flex flex-wrap gap-1 mt-2">
                {supplier.specialties.slice(0, 3).map((specialty, i) => (
                  <Badge key={i} variant="outline" className="text-xs">
                    {specialty}
                  </Badge>
                ))}
                {supplier.specialties.length > 3 && (
                  <Badge variant="outline" className="text-xs">
                    +{supplier.specialties.length - 3} more
                  </Badge>
                )}
              </div>
            )}
          </div>
        </div>

        <div className="flex flex-col items-end space-y-1 ml-4">
          {supplier.rating && (
            <div className="flex items-center">
              <Star className="h-3 w-3 text-yellow-500 mr-1" />
              <span className="text-sm font-medium">{supplier.rating.toFixed(1)}</span>
            </div>
          )}

          {supplier.lastOrderDate && (
            <div className="flex items-center text-xs text-stone-500">
              <Clock className="h-3 w-3 mr-1" />
              {new Date(supplier.lastOrderDate).toLocaleDateString()}
            </div>
          )}

          {supplier.averagePrice && (
            <div className="flex items-center text-xs text-stone-600">
              <TrendingUp className="h-3 w-3 mr-1" />
              Avg: {formatCurrency(supplier.averagePrice)}
            </div>
          )}

          {supplier.leadTime && (
            <div className="text-xs text-stone-500">
              Lead: {supplier.leadTime} days
            </div>
          )}

          {supplier.paymentTerms && (
            <div className="text-xs text-stone-500">
              Terms: {supplier.paymentTerms}
            </div>
          )}
        </div>
      </div>

      {supplier.riskLevel && supplier.riskLevel !== 'low' && (
        <div className="mt-2 flex items-center text-xs">
          <AlertTriangle className={`h-3 w-3 mr-1 ${
            supplier.riskLevel === 'high' ? 'text-red-500' : 'text-yellow-500'
          }`} />
          <span className={supplier.riskLevel === 'high' ? 'text-red-600' : 'text-yellow-600'}>
            {supplier.riskLevel.charAt(0).toUpperCase() + supplier.riskLevel.slice(1)} Risk
          </span>
        </div>
      )}
    </motion.div>
  )

  const AddSupplierForm = () => {
    const [formData, setFormData] = useState({
      name: '',
      location: '',
      contact: { phone: '', email: '', website: '' },
      specialties: [],
      paymentTerms: '',
      leadTime: ''
    })

    const handleSubmit = (e) => {
      e.preventDefault()
      if (!formData.name.trim()) {
        toast.error('Supplier name is required')
        return
      }
      addNewSupplier(formData)
    }

    return (
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ opacity: 1, height: 'auto' }}
        exit={{ opacity: 0, height: 0 }}
        className="border-b border-stone-200 p-4 bg-stone-50"
      >
        <h4 className="font-medium text-stone-900 mb-3">Add New Supplier</h4>
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Supplier Name *"
              value={formData.name}
              onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
              required
            />
            <Input
              placeholder="Location"
              value={formData.location}
              onChange={(e) => setFormData(prev => ({ ...prev, location: e.target.value }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Phone"
              value={formData.contact.phone}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                contact: { ...prev.contact, phone: e.target.value }
              }))}
            />
            <Input
              placeholder="Email"
              type="email"
              value={formData.contact.email}
              onChange={(e) => setFormData(prev => ({
                ...prev,
                contact: { ...prev.contact, email: e.target.value }
              }))}
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Input
              placeholder="Payment Terms"
              value={formData.paymentTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
            />
            <Input
              placeholder="Lead Time (days)"
              type="number"
              value={formData.leadTime}
              onChange={(e) => setFormData(prev => ({ ...prev, leadTime: e.target.value }))}
            />
          </div>

          <div className="flex justify-end space-x-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setShowAddForm(false)}
            >
              Cancel
            </Button>
            <Button type="submit" size="sm">
              Add Supplier
            </Button>
          </div>
        </form>
      </motion.div>
    )
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left"
      >
        <span className="truncate">
          {selectedSupplier ? selectedSupplier.name : value || 'Select Supplier'}
        </span>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-lg shadow-lg max-h-80 overflow-hidden"
          >
            {/* Search */}
            <div className="p-3 border-b border-stone-200">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search suppliers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>

              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setShowAddForm(!showAddForm)}
                className="w-full mt-2"
              >
                <Plus className="h-3 w-3 mr-1" />
                Add New Supplier
              </Button>
            </div>

            {/* Add Supplier Form */}
            <AnimatePresence>
              {showAddForm && <AddSupplierForm />}
            </AnimatePresence>

            {/* Suppliers List */}
            <div className="max-h-60 overflow-y-auto">
              {loading ? (
                <div className="p-4 text-center">
                  <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-amber-600 mx-auto"></div>
                  <p className="text-sm text-stone-500 mt-2">Loading suppliers...</p>
                </div>
              ) : filteredSuppliers.length === 0 ? (
                <div className="p-4 text-center text-stone-500">
                  <Building className="h-8 w-8 mx-auto mb-2 text-stone-300" />
                  <p className="text-sm">No suppliers found</p>
                  {searchTerm && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setShowAddForm(true)}
                      className="mt-2"
                    >
                      Add "{searchTerm}" as new supplier
                    </Button>
                  )}
                </div>
              ) : (
                filteredSuppliers.map((supplier, index) => (
                  <SupplierItem key={supplier.id} supplier={supplier} index={index} />
                ))
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default SupplierDropdown
