import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate, useParams } from 'react-router-dom'
import {
  Save,
  Plus,
  Trash2,
  ArrowLeft,
  Package,
  User,
  Calendar,
  CheckCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [saving, setSaving] = useState(false)
  const [autoSaving, setAutoSaving] = useState(false)
  const [isEditMode, setIsEditMode] = useState(!!id)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)

  const [orderData, setOrderData] = useState({
    clientName: '',
    deadline: '',
    priority: 'medium',
    notes: '',
    items: [{
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

  // Load existing order if editing
  useEffect(() => {
    if (id) {
      fetchOrderData()
    }
  }, [id])

  // Auto-save functionality
  useEffect(() => {
    if (!hasUnsavedChanges || !isEditMode) return

    const autoSaveTimer = setTimeout(async () => {
      try {
        setAutoSaving(true)
        const validationErrors = validateOrder(orderData)
        if (validationErrors.length === 0) {
          await handleSave('draft', true) // Silent save
        }
      } catch (error) {
        console.error('Auto-save failed:', error)
      } finally {
        setAutoSaving(false)
      }
    }, 30000) // Auto-save every 30 seconds

    return () => clearTimeout(autoSaveTimer)
  }, [orderData, hasUnsavedChanges, isEditMode])

  // Warn user about unsaved changes
  useEffect(() => {
    const handleBeforeUnload = (e) => {
      if (hasUnsavedChanges) {
        e.preventDefault()
        e.returnValue = ''
      }
    }

    window.addEventListener('beforeunload', handleBeforeUnload)
    return () => window.removeEventListener('beforeunload', handleBeforeUnload)
  }, [hasUnsavedChanges])

  const fetchOrderData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/orders/${id}`)
      const order = response.data.order

      setOrderData({
        clientName: order.clientName || '',
        deadline: order.deadline ? order.deadline.split('T')[0] : '',
        priority: order.priority || 'medium',
        notes: order.notes || '',
        items: order.items?.map(item => ({
          itemCode: item.itemCode || '',
          description: item.description || '',
          quantity: item.quantity || 1,
          unitPrice: item.unitPrice || 0,
          unitWeight: item.unitWeight || 0,
          unitCbm: item.unitCbm || 0,
          cartons: item.cartons || 1,
          supplier: item.supplier || '',
          paymentType: item.paymentType || 'CLIENT_DIRECT',
          carryingCharge: {
            basis: item.carryingCharge?.basis || 'carton',
            rate: item.carryingCharge?.rate || 0,
            amount: item.carryingCharge?.amount || 0
          }
        })) || [orderData.items[0]]
      })
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order data')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  // Add new item
  const addItem = () => {
    setOrderData(prev => ({
      ...prev,
      items: [...prev.items, {
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
    }))
  }

  // Remove item
  const removeItem = (index) => {
    if (orderData.items.length > 1) {
      setOrderData(prev => ({
        ...prev,
        items: prev.items.filter((_, i) => i !== index)
      }))
    }
  }

  // Update item
  const updateItem = (index, field, value) => {
    setOrderData(prev => {
      const newItems = [...prev.items]
      const item = { ...newItems[index] }

      if (field.includes('.')) {
        const [parent, child] = field.split('.')
        item[parent] = { ...item[parent], [child]: value }
      } else {
        item[field] = value
      }

      // Recalculate carrying charge when relevant fields change
      if (['carryingCharge.basis', 'carryingCharge.rate', 'cartons', 'unitWeight', 'unitCbm', 'quantity'].includes(field)) {
        item.carryingCharge.amount = calculateCarryingCharge(
          item.carryingCharge.basis,
          item.carryingCharge.rate,
          item
        )
      }

      newItems[index] = item
      return { ...prev, items: newItems }
    })
  }

  // Calculate totals
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

  // Save order
  const handleSave = async (status = 'draft', silent = false) => {
    try {
      setSaving(true)

      // Comprehensive validation
      const validationErrors = validateOrder(orderData)
      if (!displayValidationErrors(validationErrors, toast)) {
        setSaving(false)
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

      let response
      if (isEditMode) {
        response = await axios.patch(`/api/orders/${id}`, orderPayload)
        if (!silent) {
          toast.success('Order updated successfully!')
          setHasUnsavedChanges(false)
        }
      } else {
        response = await axios.post('/api/orders', orderPayload)
        if (!silent) {
          toast.success(`Order ${status === 'draft' ? 'saved as draft' : 'submitted'} successfully!`)
          setHasUnsavedChanges(false)
        }
      }

      if (!silent) {
        navigate(`/orders/${response.data.order._id}`)
      }
    } catch (error) {
      console.error('Error saving order:', error)
      toast.error(error.response?.data?.message || 'Failed to save order')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="min-h-screen bg-stone-50 px-4 sm:px-6 lg:px-8 py-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-6xl mx-auto"
      >
        {/* Header */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">
                {isEditMode ? 'Edit Order' : 'Create New Order'}
              </h1>
              <p className="text-stone-600 mt-2">
                {isEditMode ? 'Update order details and items' : 'Create a new order with items'}
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            {autoSaving && (
              <div className="flex items-center text-sm text-stone-500">
                <div className="loading-spinner mr-2" />
                Auto-saving...
              </div>
            )}
            {hasUnsavedChanges && !autoSaving && (
              <div className="text-sm text-amber-600">
                Unsaved changes
              </div>
            )}
            {!isEditMode && (
              <Button
                variant="outline"
                onClick={() => handleSave('draft')}
                disabled={saving}
              >
                <Save className="h-4 w-4 mr-2" />
                Save Draft
              </Button>
            )}
            <Button
              variant="gradient"
              onClick={() => handleSave(isEditMode ? 'updated' : 'submitted')}
              disabled={saving}
            >
              {saving ? (
                <div className="loading-spinner mr-2" />
              ) : (
                <CheckCircle className="h-4 w-4 mr-2" />
              )}
              {isEditMode ? 'Update Order' : 'Submit Order'}
            </Button>
          </div>
        </div>

        {/* Order Information */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="flex items-center">
              <User className="h-5 w-5 mr-2" />
              Order Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Client Name *
                </label>
                <Input
                  value={orderData.clientName}
                  onChange={(e) => {
                    setOrderData({ ...orderData, clientName: e.target.value })
                    setHasUnsavedChanges(true)
                  }}
                  placeholder="Enter client name"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Priority
                </label>
                <Select
                  value={orderData.priority}
                  onValueChange={(value) => setOrderData({ ...orderData, priority: value })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="low">Low</SelectItem>
                    <SelectItem value="medium">Medium</SelectItem>
                    <SelectItem value="high">High</SelectItem>
                    <SelectItem value="urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Deadline
                </label>
                <Input
                  type="date"
                  value={orderData.deadline}
                  onChange={(e) => setOrderData({ ...orderData, deadline: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Notes
                </label>
                <Input
                  value={orderData.notes}
                  onChange={(e) => setOrderData({ ...orderData, notes: e.target.value })}
                  placeholder="Optional notes"
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Order Items */}
        <Card className="mb-8">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Order Items
              </CardTitle>
              <Button onClick={addItem} variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                Add Item
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {orderData.items.map((item, index) => (
                <div key={index} className="border border-stone-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-4">
                    <h4 className="font-medium text-stone-900">Item {index + 1}</h4>
                    {orderData.items.length > 1 && (
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeItem(index)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Item Code *
                      </label>
                      <Input
                        value={item.itemCode}
                        onChange={(e) => updateItem(index, 'itemCode', e.target.value)}
                        placeholder="Enter item code"
                      />
                    </div>
                    <div className="md:col-span-2">
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Description *
                      </label>
                      <Input
                        value={item.description}
                        onChange={(e) => updateItem(index, 'description', e.target.value)}
                        placeholder="Enter description"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Quantity
                      </label>
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateItem(index, 'quantity', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Unit Price
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitPrice}
                        onChange={(e) => updateItem(index, 'unitPrice', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Cartons
                      </label>
                      <Input
                        type="number"
                        value={item.cartons}
                        onChange={(e) => updateItem(index, 'cartons', parseInt(e.target.value) || 0)}
                        min="1"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Unit Weight (kg)
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.unitWeight}
                        onChange={(e) => updateItem(index, 'unitWeight', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Unit CBM
                      </label>
                      <Input
                        type="number"
                        step="0.001"
                        value={item.unitCbm}
                        onChange={(e) => updateItem(index, 'unitCbm', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Supplier
                      </label>
                      <Input
                        value={item.supplier}
                        onChange={(e) => updateItem(index, 'supplier', e.target.value)}
                        placeholder="Supplier name"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
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
                          <SelectItem value="CLIENT_DIRECT">Client Direct</SelectItem>
                          <SelectItem value="THROUGH_ME">Through Me</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Carrying Basis
                      </label>
                      <Select
                        value={item.carryingCharge.basis}
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
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-1">
                        Carrying Rate
                      </label>
                      <Input
                        type="number"
                        step="0.01"
                        value={item.carryingCharge.rate}
                        onChange={(e) => updateItem(index, 'carryingCharge.rate', parseFloat(e.target.value) || 0)}
                        min="0"
                      />
                    </div>
                  </div>

                  <div className="mt-4 pt-4 border-t border-stone-200">
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-stone-500">Total Price:</span>
                        <div className="font-medium">{formatCurrency(item.quantity * item.unitPrice)}</div>
                      </div>
                      <div>
                        <span className="text-stone-500">Total Weight:</span>
                        <div className="font-medium">{(item.unitWeight * item.quantity).toFixed(2)} kg</div>
                      </div>
                      <div>
                        <span className="text-stone-500">Total CBM:</span>
                        <div className="font-medium">{(item.unitCbm * item.quantity).toFixed(3)} m³</div>
                      </div>
                      <div>
                        <span className="text-stone-500">Carrying Charge:</span>
                        <div className="font-medium">{formatCurrency(item.carryingCharge.amount)}</div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Order Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Order Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(totals.totalAmount)}</div>
                <div className="text-sm text-stone-500">Total Amount</div>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{formatCurrency(totals.totalCarryingCharges)}</div>
                <div className="text-sm text-stone-500">Carrying Charges</div>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{totals.totalCartons}</div>
                <div className="text-sm text-stone-500">Total Cartons</div>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{totals.totalWeight.toFixed(2)} kg</div>
                <div className="text-sm text-stone-500">Total Weight</div>
              </div>
              <div className="text-center p-4 bg-stone-50 rounded-lg">
                <div className="text-2xl font-bold text-amber-600">{totals.totalCbm.toFixed(3)} m³</div>
                <div className="text-sm text-stone-500">Total CBM</div>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default OrderCreate
