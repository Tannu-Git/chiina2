import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Calculator,
  Package,
  User,
  Calendar,
  AlertCircle,
  CheckCircle,
  Grid,
  List
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { ExcelInput } from '@/components/ui/ExcelInput'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import SimpleOrderGrid from '@/components/orders/SimpleOrderGrid'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, calculateCarryingCharge } from '@/lib/utils'
import { validateOrder, displayValidationErrors } from '@/lib/validation'
import axios from 'axios'
import toast from 'react-hot-toast'

const OrderCreate = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid', 'form', or 'cards'
  const [orderData, setOrderData] = useState({
    clientName: '',
    deadline: '',
    priority: 'medium',
    notes: '',
    items: [
      {
        itemCode: '',
        description: '',
        quantity: 1,
        unitPrice: 0,
        unitWeight: 0,
        unitCbm: 0,
        cartons: 1,
        supplier: '',
        paymentType: 'CLIENT_DIRECT',
        carryingCharge: {
          basis: 'carton',
          rate: 0,
          amount: 0
        }
      }
    ]
  })

  // Calculate totals
  const calculateTotals = () => {
    const totals = orderData.items.reduce((acc, item) => {
      const totalPrice = item.quantity * item.unitPrice
      const carryingChargeAmount = calculateCarryingCharge(item.carryingCharge.basis, item.carryingCharge.rate, item)

      return {
        totalAmount: acc.totalAmount + totalPrice,
        totalCarryingCharges: acc.totalCarryingCharges + carryingChargeAmount,
        totalWeight: acc.totalWeight + (item.unitWeight * item.quantity),
        totalCbm: acc.totalCbm + (item.unitCbm * item.quantity),
        totalCartons: acc.totalCartons + item.cartons
      }
    }, {
      totalAmount: 0,
      totalCarryingCharges: 0,
      totalWeight: 0,
      totalCbm: 0,
      totalCartons: 0
    })

    return totals
  }

  const totals = calculateTotals()

  // Load existing order data when in edit mode
  useEffect(() => {
    if (id) {
      setIsEditMode(true)
      fetchOrderData()
    }
  }, [id])

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/orders/${id}`)
      const order = response.data.order

      if (!order) {
        throw new Error('Order not found')
      }

      setOrderData({
        clientName: order.clientName || '',
        deadline: order.deadline ? order.deadline.split('T')[0] : '',
        priority: order.priority || 'medium',
        paymentType: order.paymentType || 'advance',
        supplierName: order.supplierName || '',
        notes: order.notes || '',
        items: order.items?.map(item => ({
          itemCode: item.itemCode || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          unitWeight: item.unitWeight || 0,
          unitCbm: item.unitCbm || 0,
          cartons: item.cartons || 1,
          supplier: item.supplier?.name || '',
          paymentType: item.paymentType || 'CLIENT_DIRECT',
          carryingCharge: {
            basis: item.carryingCharge?.basis || 'carton',
            rate: item.carryingCharge?.rate || 0,
            amount: item.carryingCharge?.amount || 0
          }
        })) || [{
          itemCode: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          unitWeight: 0,
          unitCbm: 0,
          cartons: 1,
          supplier: '',
          paymentType: 'CLIENT_DIRECT',
          carryingCharge: {
            basis: 'carton',
            rate: 0,
            amount: 0
          }
        }]
      })
    } catch (error) {
      console.error('Error fetching order:', error)

      let errorMessage = 'Failed to load order data'
      let shouldRedirect = true

      if (error.response?.status === 404 || error.message === 'Order not found') {
        errorMessage = 'Order not found. You can create a new order instead.'
        setIsEditMode(false)
        shouldRedirect = false
        // Update URL to remove the invalid order ID
        window.history.replaceState({}, '', '/orders/create')
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this order'
      }

      toast.error(errorMessage)

      if (shouldRedirect) {
        navigate('/orders')
      }
    } finally {
      setLoading(false)
    }
  }

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...orderData.items]

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      if (!newItems[index][parent]) {
        newItems[index][parent] = {}
      }
      newItems[index][parent][child] = value
    } else {
      newItems[index][field] = value
    }

    // Recalculate carrying charge amount when basis, rate, or related fields change
    if (field === 'carryingCharge.basis' || field === 'carryingCharge.rate' ||
        field === 'cartons' || field === 'unitWeight' || field === 'unitCbm' || field === 'quantity') {
      const item = newItems[index]
      if (item.carryingCharge) {
        item.carryingCharge.amount = calculateCarryingCharge(
          item.carryingCharge.basis || 'carton',
          parseFloat(item.carryingCharge.rate) || 0,
          item
        )
      }
    }

    // Recalculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const item = newItems[index]
      item.totalPrice = (parseFloat(item.quantity) || 0) * (parseFloat(item.unitPrice) || 0)
    }

    setOrderData({ ...orderData, items: newItems })
  }

  // Add new item row
  const addItem = () => {
    setOrderData({
      ...orderData,
      items: [
        ...orderData.items,
        {
          itemCode: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          unitWeight: 0,
          unitCbm: 0,
          cartons: 1,
          supplier: '',
          paymentType: 'TO_AGENT',
          carryingCharge: {
            basis: 'carton',
            rate: 0,
            amount: 0
          }
        }
      ]
    })
  }

  // Remove item
  const removeItem = (index) => {
    if (orderData.items.length > 1) {
      const newItems = orderData.items.filter((_, i) => i !== index)
      setOrderData({ ...orderData, items: newItems })
    }
  }

  // Save order
  const handleSave = async (status = 'draft') => {
    try {
      setLoading(true)

      // Comprehensive validation using utility
      const validationErrors = validateOrder(orderData)
      if (!displayValidationErrors(validationErrors, toast)) {
        return
      }

      const orderPayload = {
        ...orderData,
        status,
        items: orderData.items.map(item => ({
          ...item,
          totalPrice: item.quantity * item.unitPrice,
          carryingCharge: {
            ...item.carryingCharge,
            amount: calculateCarryingCharge(item.carryingCharge.basis, item.carryingCharge.rate, item)
          }
        }))
      }

      // Create axios instance with proper configuration
      const axiosInstance = axios.create({
        timeout: 10000, // 10 second timeout
        baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5001'
      })

      // Add auth token if available
      const token = localStorage.getItem('token')
      if (token) {
        axiosInstance.defaults.headers.common['Authorization'] = `Bearer ${token}`
      }

      let response
      if (isEditMode) {
        response = await axiosInstance.patch(`/api/orders/${id}`, orderPayload)
        toast.success(`Order updated successfully!`)
      } else {
        response = await axiosInstance.post('/api/orders', orderPayload)
        toast.success(`Order ${status === 'draft' ? 'saved as draft' : 'submitted'} successfully!`)
      }

      navigate(`/orders/${response.data.order._id}`)
    } catch (error) {
      console.error('Error saving order:', error)

      // Enhanced error handling
      let errorMessage = 'Failed to save order'

      if (error.response) {
        // Server responded with error status
        const status = error.response.status
        const data = error.response.data

        if (status === 400) {
          errorMessage = data.message || 'Invalid order data'
          if (data.errors && Array.isArray(data.errors)) {
            errorMessage = data.errors.map(err => err.msg).join(', ')
          }
        } else if (status === 401) {
          errorMessage = 'Authentication required. Please login again.'
        } else if (status === 403) {
          errorMessage = 'You do not have permission to perform this action'
        } else if (status === 404 && isEditMode) {
          errorMessage = 'Order not found. It may have been deleted.'
          setIsEditMode(false)
          window.history.replaceState({}, '', '/orders/create')
        } else if (status === 500) {
          errorMessage = 'Server error. Please try again later.'
        } else {
          errorMessage = data.message || `Server error (${status})`
        }
      } else if (error.request) {
        // Network error
        errorMessage = 'Network error. Please check your connection and try again.'
      } else {
        // Other error
        errorMessage = error.message || 'An unexpected error occurred'
      }

      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen bg-gray-50 px-4 sm:px-6 lg:px-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-gray-900">
                {isEditMode ? 'Edit Order' : 'Create New Order'}
              </h1>
              <p className="text-gray-600 mt-2">
                {isEditMode ? 'Update order details and items' : 'Excel-like interface for order creation'}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={loading}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}
            <Button
              variant="gradient"
              onClick={() => handleSave(isEditMode ? 'updated' : 'submitted')}
              disabled={loading}
            >
              {loading ? (
                <div className="loading-spinner mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isEditMode ? 'Update Order' : 'Submit Order'}
            </Button>
          </div>
        </div>

        {/* Order Details */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
          <div className="lg:col-span-2">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <User className="h-5 w-5 mr-2" />
                  Order Information
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="clientName" className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name *
                    </label>
                    <Input
                      id="clientName"
                      value={orderData.clientName}
                      onChange={(e) => setOrderData({ ...orderData, clientName: e.target.value })}
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  <div>
                    <label htmlFor="deadline" className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline
                    </label>
                    <Input
                      id="deadline"
                      type="date"
                      role="textbox"
                      value={orderData.deadline}
                      onChange={(e) => setOrderData({ ...orderData, deadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
                      id="priority"
                      value={orderData.priority}
                      onChange={(e) => setOrderData({ ...orderData, priority: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="low">Low</option>
                      <option value="medium">Medium</option>
                      <option value="high">High</option>
                      <option value="urgent">Urgent</option>
                    </select>
                  </div>
                </div>
                <div>
                  <label htmlFor="notes" className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
                    id="notes"
                    value={orderData.notes}
                    onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                    placeholder="Additional notes or instructions"
                    rows={3}
                    className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>
              </CardContent>
            </Card>
          </div>

          <div>
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Calculator className="h-5 w-5 mr-2" />
                  Order Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Total Amount:</span>
                    <span className="font-semibold">{formatCurrency(totals.totalAmount)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Carrying Charges:</span>
                    <span className="font-semibold">{formatCurrency(totals.totalCarryingCharges)}</span>
                  </div>
                  <div className="border-t pt-2">
                    <div className="flex justify-between text-lg font-bold">
                      <span>Grand Total:</span>
                      <span>{formatCurrency(totals.totalAmount + totals.totalCarryingCharges)}</span>
                    </div>
                  </div>
                </div>

                <div className="border-t pt-4 space-y-2">
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Cartons:</span>
                    <span>{totals.totalCartons}</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total CBM:</span>
                    <span>{totals.totalCbm.toFixed(2)} m³</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-600">Total Weight:</span>
                    <span>{totals.totalWeight.toFixed(2)} kg</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

        {/* Items Section with Tabs */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items
              </CardTitle>
              <CardDescription>Choose between Excel-like grid or traditional form view</CardDescription>
            </div>
            <div className="flex items-center space-x-2">
              <Button
                variant={viewMode === 'grid' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('grid')}
              >
                <Grid className="h-4 w-4 mr-2" />
                Excel Grid
              </Button>
              <Button
                variant={viewMode === 'cards' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('cards')}
              >
                <Package className="h-4 w-4 mr-2" />
                Card View
              </Button>
              <Button
                variant={viewMode === 'form' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setViewMode('form')}
              >
                <List className="h-4 w-4 mr-2" />
                Form View
              </Button>
              {viewMode === 'form' && (
                <Button onClick={addItem} variant="outline">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Item
                </Button>
              )}
            </div>
          </CardHeader>
          <CardContent>
            {viewMode === 'grid' ? (
              <SimpleOrderGrid
                initialData={orderData.items}
                onSave={(items) => {
                  setOrderData(prev => ({ ...prev, items }))
                  toast.success('Items updated successfully!')
                }}
              />
            ) : viewMode === 'cards' ? (
              <div className="space-y-6">
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6 max-h-[70vh] overflow-y-auto pr-2">
                  {orderData.items.map((item, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.2, delay: index * 0.05 }}
                    >
                      <Card className="hover:shadow-lg transition-all duration-200">
                        <CardHeader className="pb-3">
                          <div className="flex items-center justify-between">
                            <CardTitle className="text-lg">Item Details</CardTitle>
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => removeItem(index)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Item Code *
                              </label>
                              <Input
                                value={item.itemCode}
                                onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                                placeholder="Enter item code"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Quantity *
                              </label>
                              <Input
                                type="number"
                                value={item.quantity || ''}
                                onChange={(e) => updateItem(index, 'quantity', e.target.value)}
                                placeholder="1"
                                min="1"
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Description *
                            </label>
                            <Input
                              value={item.description}
                              onChange={(e) => updateItem(index, 'description', e.target.value)}
                              placeholder="Product description"
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Unit Price {item.paymentType === 'TO_FACTORY' ? '(Optional)' : '*'}
                              </label>
                              <Input
                                type="number"
                                value={item.unitPrice || ''}
                                onChange={(e) => updateItem(index, 'unitPrice', e.target.value)}
                                placeholder={item.paymentType === 'TO_FACTORY' ? 'Price unknown' : '0.00'}
                                min="0"
                                step="0.01"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Total Price
                              </label>
                              <div className="h-10 px-3 py-2 bg-gray-50 border rounded-md flex items-center text-sm font-medium">
                                {item.paymentType === 'TO_FACTORY' && !item.unitPrice
                                  ? 'Price TBD'
                                  : formatCurrency((item.quantity || 0) * (item.unitPrice || 0))
                                }
                              </div>
                            </div>
                          </div>

                          <div className="grid grid-cols-3 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Weight (kg)
                              </label>
                              <Input
                                type="number"
                                value={item.unitWeight || ''}
                                onChange={(e) => updateItem(index, 'unitWeight', e.target.value)}
                                placeholder="0.0"
                                min="0"
                                step="0.1"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                CBM
                              </label>
                              <Input
                                type="number"
                                value={item.unitCbm || ''}
                                onChange={(e) => updateItem(index, 'unitCbm', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Cartons
                              </label>
                              <Input
                                type="number"
                                value={item.cartons || ''}
                                onChange={(e) => updateItem(index, 'cartons', e.target.value)}
                                placeholder="1"
                                min="1"
                                className="w-full"
                              />
                            </div>
                          </div>

                          <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">
                              Supplier
                            </label>
                            <Input
                              value={item.supplier || ''}
                              onChange={(e) => updateItem(index, 'supplier', e.target.value)}
                              placeholder="Supplier name"
                              className="w-full"
                            />
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Payment Type
                              </label>
                              <Select
                                value={item.paymentType}
                                onValueChange={(value) => updateItem(index, 'paymentType', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="TO_AGENT">To Me (Agent)</SelectItem>
                                  <SelectItem value="TO_FACTORY">To Factory (Direct)</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Carrying Basis
                              </label>
                              <Select
                                value={item.carryingCharge?.basis || 'carton'}
                                onValueChange={(value) => updateItem(index, 'carryingCharge.basis', value)}
                              >
                                <SelectTrigger>
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="carton">Per Carton</SelectItem>
                                  <SelectItem value="weight">Per KG</SelectItem>
                                  <SelectItem value="cbm">Per CBM</SelectItem>
                                </SelectContent>
                              </Select>
                            </div>
                          </div>

                          <div className="grid grid-cols-2 gap-3">
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Carrying Rate
                              </label>
                              <Input
                                type="number"
                                value={item.carryingCharge?.rate || ''}
                                onChange={(e) => updateItem(index, 'carryingCharge.rate', e.target.value)}
                                placeholder="0.00"
                                min="0"
                                step="0.01"
                                className="w-full"
                              />
                            </div>
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">
                                Charge Amount
                              </label>
                              <div className="h-10 px-3 py-2 bg-gray-50 border rounded-md flex items-center text-sm font-medium">
                                {formatCurrency(calculateCarryingCharge(
                                  item.carryingCharge?.basis || 'carton',
                                  item.carryingCharge?.rate || 0,
                                  item
                                ))}
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>

                <div className="flex justify-center">
                  <Button onClick={addItem} variant="outline" size="lg">
                    <Plus className="h-4 w-4 mr-2" />
                    Add New Item
                  </Button>
                </div>
              </div>
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="excel-grid w-full">
                  <thead>
                    <tr>

                      <th className="excel-header min-w-32">Item Code *</th>
                      <th className="excel-header min-w-48">Description *</th>
                      <th className="excel-header w-20">Qty</th>
                      <th className="excel-header w-24">Unit Price</th>
                      <th className="excel-header w-24">Total Price</th>
                      <th className="excel-header w-20">Weight (kg)</th>
                      <th className="excel-header w-20">CBM</th>
                      <th className="excel-header w-20">Cartons</th>
                      <th className="excel-header min-w-32">Supplier</th>
                      <th className="excel-header w-32">Payment</th>
                      <th className="excel-header w-24">Charge Basis</th>
                      <th className="excel-header w-20">Rate</th>
                      <th className="excel-header w-24">Charge Amount</th>
                      <th className="excel-header w-16">Actions</th>
                    </tr>
                  </thead>
                <tbody>
                  {orderData.items.map((item, index) => (
                    <tr key={index} className="excel-row">

                      <td className="excel-cell p-0">
                        <ExcelInput
                          value={item.itemCode}
                          onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                          placeholder="ITEM-001"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          value={item.description}
                          onChange={(e) => updateItem(index, 'description', e.target.value)}
                          placeholder="Product description"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.unitPrice}
                          onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="excel-cell text-right font-medium">
                        {formatCurrency(item.quantity * item.unitPrice)}
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.unitWeight}
                          onChange={(e) => updateItem(index, 'unitWeight', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.1"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.unitCbm}
                          onChange={(e) => updateItem(index, 'unitCbm', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.cartons}
                          onChange={(e) => updateItem(index, 'cartons', parseInt(e.target.value) || 0)}
                          min="1"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          value={item.supplier.name}
                          onChange={(e) => updateItem(index, 'supplier.name', e.target.value)}
                          placeholder="Supplier name"
                        />
                      </td>
                      <td className="excel-cell p-0">
                        <select
                          value={item.paymentType}
                          onChange={(e) => updateItem(index, 'paymentType', e.target.value)}
                          className="excel-cell w-full border-0 bg-transparent"
                        >
                          <option value="CLIENT_DIRECT">Client Direct</option>
                          <option value="THROUGH_ME">Through Me</option>
                        </select>
                      </td>
                      <td className="excel-cell p-0">
                        <select
                          value={item.carryingCharge.basis}
                          onChange={(e) => updateItem(index, 'carryingCharge.basis', e.target.value)}
                          className="excel-cell w-full border-0 bg-transparent"
                        >
                          <option value="carton">Per Carton</option>
                          <option value="cbm">Per CBM</option>
                          <option value="weight">Per KG</option>
                        </select>
                      </td>
                      <td className="excel-cell p-0">
                        <ExcelInput
                          type="number"
                          value={item.carryingCharge.rate}
                          onChange={(e) => updateItem(index, 'carryingCharge.rate', parseFloat(e.target.value) || 0)}
                          min="0"
                          step="0.01"
                        />
                      </td>
                      <td className="excel-cell text-right font-medium">
                        {formatCurrency(calculateCarryingCharge(item.carryingCharge.basis, item.carryingCharge.rate, item))}
                      </td>
                      <td className="excel-cell text-center">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeItem(index)}
                          disabled={orderData.items.length === 1}
                          className="text-red-600 hover:text-red-800"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
                <tfoot>
                  <tr className="bg-gray-50 font-semibold">
                    <td className="excel-cell" colSpan="5">TOTALS</td>
                    <td className="excel-cell text-right">{formatCurrency(totals.totalAmount)}</td>
                    <td className="excel-cell text-center">{totals.totalWeight.toFixed(2)}</td>
                    <td className="excel-cell text-center">{totals.totalCbm.toFixed(2)}</td>
                    <td className="excel-cell text-center">{totals.totalCartons}</td>
                    <td className="excel-cell" colSpan="4"></td>
                    <td className="excel-cell text-right">{formatCurrency(totals.totalCarryingCharges)}</td>
                    <td className="excel-cell"></td>
                  </tr>
                </tfoot>
              </table>
            </div>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default OrderCreate