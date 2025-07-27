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
import { Input, ExcelInput } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import OrderCreationGrid from '@/components/orders/OrderCreationGrid'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, calculateCarryingCharge } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const OrderCreate = () => {
  const navigate = useNavigate()
  const { id } = useParams()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(false)
  const [isEditMode, setIsEditMode] = useState(false)
  const [viewMode, setViewMode] = useState('grid') // 'grid' or 'form'
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
        supplier: {
          name: '',
          contact: '',
          email: ''
        },
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

      setOrderData({
        clientName: order.clientName || '',
        deadline: order.deadline ? order.deadline.split('T')[0] : '',
        priority: order.priority || 'medium',
        paymentType: order.paymentType || 'advance',
        supplierName: order.supplierName || '',
        items: order.items || [{
          itemCode: '',
          description: '',
          quantity: 1,
          unitPrice: 0,
          unitWeight: 0,
          cartons: 1,
          cbmPerCarton: 0,
          carryingCharge: {
            basis: 'carton',
            rate: 0,
            amount: 0
          }
        }]
      })
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order data')
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  // Update item
  const updateItem = (index, field, value) => {
    const newItems = [...orderData.items]

    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      newItems[index][parent][child] = value
    } else {
      newItems[index][field] = value
    }

    // Recalculate carrying charge amount when basis or rate changes
    if (field === 'carryingCharge.basis' || field === 'carryingCharge.rate') {
      const item = newItems[index]
      item.carryingCharge.amount = calculateCarryingCharge(
        item.carryingCharge.basis,
        item.carryingCharge.rate,
        item
      )
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
          supplier: {
            name: '',
            contact: '',
            email: ''
          },
          paymentType: 'CLIENT_DIRECT',
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

      // Validation
      if (!orderData.clientName.trim()) {
        toast.error('Client name is required')
        return
      }

      if (orderData.items.some(item => !item.itemCode.trim() || !item.description.trim())) {
        toast.error('All items must have item code and description')
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
        toast.success(`Order updated successfully!`)
      } else {
        response = await axios.post('/api/orders', orderPayload)
        toast.success(`Order ${status === 'draft' ? 'saved as draft' : 'submitted'} successfully!`)
      }

      navigate(`/orders/${response.data.order._id}`)
    } catch (error) {
      console.error('Error saving order:', error)
      toast.error('Failed to save order')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
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
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Client Name *
                    </label>
                    <Input
                      value={orderData.clientName}
                      onChange={(e) => setOrderData({ ...orderData, clientName: e.target.value })}
                      placeholder="Enter client name"
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Deadline
                    </label>
                    <Input
                      type="date"
                      value={orderData.deadline}
                      onChange={(e) => setOrderData({ ...orderData, deadline: e.target.value })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Priority
                    </label>
                    <select
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
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Notes
                  </label>
                  <textarea
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
              <OrderCreationGrid
                initialData={orderData.items}
                onSave={(items) => {
                  setOrderData(prev => ({ ...prev, items }))
                  toast.success('Items updated successfully!')
                }}
              />
            ) : (
              <div>
              <div className="overflow-x-auto">
                <table className="excel-grid w-full">
                  <thead>
                    <tr>
                      <th className="excel-header w-4">#</th>
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
                    <tr key={index} className="hover:bg-gray-50">
                      <td className="excel-cell text-center font-medium text-gray-500">
                        {index + 1}
                      </td>
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