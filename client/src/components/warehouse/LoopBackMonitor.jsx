import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Factory,
  Eye,
  Edit,
  Plus,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  AlertCircle,
  Minus,
  RefreshCw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const LoopBackMonitor = ({ onCreateLoopback, refreshTrigger }) => {
  const { user } = useAuthStore()
  const [loopbackData, setLoopbackData] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    search: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    totalLoopBackQuantity: 0,
    ordersWithLoopBack: 0,
    averageLoopBackPerOrder: 0
  })
  const [editingItem, setEditingItem] = useState(null)
  const [bulkEditMode, setBulkEditMode] = useState(false)
  const [selectedItems, setSelectedItems] = useState(new Set())

  // Fetch loop-back quantity data
  const fetchLoopbackData = async () => {
    try {
      setLoading(true)
      const queryParams = new URLSearchParams()
      
      if (filters.search) queryParams.append('search', filters.search)
      
      const response = await axios.get(`/api/warehouse/loopback?${queryParams.toString()}`)
      setLoopbackData(response.data.loopbackData || [])
      setStats(response.data.stats || {
        total: 0,
        totalLoopBackQuantity: 0,
        ordersWithLoopBack: 0,
        averageLoopBackPerOrder: 0
      })
    } catch (error) {
      console.error('Error fetching loop-back data:', error)
      toast.error('Failed to load loop-back data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoopbackData()
  }, [filters, refreshTrigger]) // Added refreshTrigger dependency

  const handleQuantityUpdate = async (orderId, itemIndex, qcPassedQuantity, loopBackQuantity) => {
    try {
      // Validate quantities
      const qcPassed = Math.max(0, parseInt(qcPassedQuantity) || 0)
      const loopBack = Math.max(0, parseInt(loopBackQuantity) || 0)
      
      // Find the expected quantity for validation
      const orderData = loopbackData.find(order => order._id === orderId)
      const item = orderData?.loopBackItems[itemIndex]
      const expectedQty = item?.expectedQuantity || 0
      
      if (qcPassed + loopBack > expectedQty) {
        toast.error(`Total quantities (${qcPassed + loopBack}) cannot exceed expected quantity (${expectedQty})`)
        return
      }
      
      await axios.patch(`/api/warehouse/loopback/${orderId}/item/${itemIndex}`, {
        qcPassedQuantity: qcPassed,
        loopBackQuantity: loopBack,
        notes: 'Updated via Loop-back Monitor'
      })
      
      toast.success(`Quantities updated successfully! QC: ${qcPassed}, Loop-back: ${loopBack}`)
      fetchLoopbackData()
      setEditingItem(null)
    } catch (error) {
      console.error('Error updating quantities:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update quantities'
      toast.error(errorMessage)
    }
  }

  const handleBulkQuantityUpdate = async (updates) => {
    try {
      const promises = updates.map(update => 
        axios.patch(`/api/warehouse/loopback/${update.orderId}/item/${update.itemIndex}`, {
          qcPassedQuantity: update.qcPassedQuantity,
          loopBackQuantity: update.loopBackQuantity,
          notes: 'Bulk updated via Loop-back Monitor'
        })
      )
      
      await Promise.all(promises)
      toast.success(`${updates.length} items updated successfully!`)
      fetchLoopbackData()
      setBulkEditMode(false)
      setSelectedItems(new Set())
    } catch (error) {
      console.error('Error bulk updating quantities:', error)
      const errorMessage = error.response?.data?.message || 'Failed to bulk update quantities'
      toast.error(errorMessage)
    }
  }

  const handleResolveLoopback = async (orderId, itemIndex, resolvedQuantity) => {
    try {
      await axios.post(`/api/warehouse/loopback/${orderId}/resolve`, {
        itemIndex,
        resolvedQuantity,
        notes: 'Resolved via Loop-back Monitor'
      })
      toast.success(`Resolved ${resolvedQuantity} units successfully`)
      fetchLoopbackData()
    } catch (error) {
      console.error('Error resolving loop-back:', error)
      const errorMessage = error.response?.data?.message || 'Failed to resolve loop-back'
      toast.error(errorMessage)
    }
  }

  const getLoopBackStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-orange-100 text-orange-800'
      case 'in_progress': return 'bg-amber-100 text-amber-800'
      case 'resolved': return 'bg-green-100 text-green-800'
      case 'none': return 'bg-stone-100 text-stone-800'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  const getQuantityPercentage = (qcPassed, loopBack, expected) => {
    const total = qcPassed + loopBack
    return expected > 0 ? Math.round((total / expected) * 100) : 0
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'in_progress': return <Truck className="h-4 w-4" />
      case 'resolved': return <CheckCircle className="h-4 w-4" />
      case 'none': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">Loop-Back Monitor</h2>
          <p className="text-stone-600">Track and manage shortage quantities within orders</p>
        </div>
        <div className="flex space-x-2">
          <Button 
            variant={bulkEditMode ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setBulkEditMode(!bulkEditMode)
              setSelectedItems(new Set())
              setEditingItem(null)
            }}
            className="hover:shadow-md transition-all duration-200"
          >
            <Edit className="h-4 w-4 mr-2" />
            {bulkEditMode ? 'Exit Bulk Edit' : 'Bulk Edit'}
          </Button>
          <Button 
            onClick={() => fetchLoopbackData()}
            variant="outline"
            className="ml-4"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-orange-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-stone-600">Orders with Loop-back</p>
                  <p className="text-2xl font-bold text-stone-900">{stats.ordersWithLoopBack}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <RotateCcw className="h-8 w-8 text-amber-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-stone-600">Total Loop-back Qty</p>
                  <p className="text-2xl font-bold text-stone-900">{stats.totalLoopBackQuantity}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-stone-600">Avg per Order</p>
                  <p className="text-2xl font-bold text-stone-900">{stats.averageLoopBackPerOrder}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-stone-600">Total Items</p>
                  <p className="text-2xl font-bold text-stone-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-stone-700 mb-2">Search Orders</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-stone-400" />
                <Input
                  placeholder="Search by order number or client..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div className="flex items-end">
              <Button 
                onClick={() => setFilters({ search: '' })}
                variant="outline"
                className="w-full"
              >
                Clear Filters
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loop-back Data List */}
      <Card>
        <CardHeader>
          <CardTitle>Orders with Loop-back Quantities ({loopbackData.length})</CardTitle>
          <CardDescription>
            Orders containing items with shortage quantities requiring attention
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600"></div>
            </div>
          ) : loopbackData.length === 0 ? (
            <div className="text-center py-12">
              <Package className="h-16 w-16 text-stone-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-stone-900 mb-2">No Loop-back Quantities</h3>
              <p className="text-stone-500">No orders found with loop-back quantities matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {loopbackData.map((orderData, orderIndex) => (
                <motion.div
                  key={orderData._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: orderIndex * 0.1 }}
                  className="border rounded-lg p-6 hover:shadow-md transition-shadow bg-gradient-to-r from-white to-orange-50"
                >
                  {/* Order Header */}
                  <div className="flex items-center justify-between mb-4">
                    <div className="flex items-center space-x-3">
                      <Package className="h-6 w-6 text-orange-600" />
                      <div>
                        <h3 className="text-lg font-semibold text-stone-900">{orderData.orderNumber}</h3>
                        <p className="text-sm text-stone-500">
                          {orderData.clientName} • Created {formatDate(orderData.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-3">
                      <Badge className="bg-orange-100 text-orange-800 px-3 py-1">
                        {orderData.totalLoopBackQuantity} units in loop-back
                      </Badge>
                      <Badge variant="outline" className="px-3 py-1">
                        {orderData.loopBackItems.length} items
                      </Badge>
                    </div>
                  </div>

                  {/* Summary Stats */}
                  <div className="grid grid-cols-3 gap-4 mb-6 p-4 bg-white rounded-lg border">
                    <div className="text-center">
                      <p className="text-2xl font-bold text-green-600">{orderData.totalQcPassedQuantity}</p>
                      <p className="text-sm text-stone-600">QC Passed</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-orange-600">{orderData.totalLoopBackQuantity}</p>
                      <p className="text-sm text-stone-600">Loop-back</p>
                    </div>
                    <div className="text-center">
                      <p className="text-2xl font-bold text-stone-600">{orderData.totalExpectedQuantity}</p>
                      <p className="text-sm text-stone-600">Expected</p>
                    </div>
                  </div>

                  {/* Loop-back Items */}
                  <div className="space-y-3">
                    <h4 className="font-medium text-stone-900 flex items-center">
                      <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                      Items with Loop-back Quantities
                    </h4>
                    
                    {orderData.loopBackItems.map((item, itemIndex) => {
                      const isEditing = editingItem?.orderId === orderData._id && editingItem?.itemIndex === itemIndex
                      const expectedQty = item.expectedQuantity
                      const qcPassedQty = item.qcPassedQuantity
                      const loopBackQty = item.loopBackQuantity
                      const pendingQty = Math.max(0, expectedQty - qcPassedQty - loopBackQty)
                      
                      return (
                        <div key={itemIndex} className="border rounded-lg p-4 bg-white">
                          <div className="flex items-center justify-between mb-3">
                            <div className="flex-1">
                              <h5 className="font-medium text-stone-900">{item.itemCode}</h5>
                              <p className="text-sm text-stone-600">{item.description}</p>
                              {item.loopBackNotes && (
                                <p className="text-xs text-orange-600 mt-1">{item.loopBackNotes}</p>
                              )}
                            </div>
                            <div className="flex items-center space-x-2">
                              <Badge className={getLoopBackStatusColor(item.loopBackStatus)}>
                                {item.loopBackStatus || 'none'}
                              </Badge>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => setEditingItem(
                                  isEditing ? null : { orderId: orderData._id, itemIndex }
                                )}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                            </div>
                          </div>

                          {/* Quantity Display/Edit */}
                          {isEditing ? (
                            <div className="space-y-4">
                              <div className="grid grid-cols-3 gap-4">
                                <div>
                                  <label className="block text-sm font-medium text-green-700 mb-1">QC Passed</label>
                                  <Input
                                    type="number"
                                    
                                    max={expectedQty}
                                    defaultValue={qcPassedQty}
                                    id={`qc-${orderIndex}-${itemIndex}`}
                                    className="border-green-300 focus:border-green-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-orange-700 mb-1">Loop-back</label>
                                  <Input
                                    type="number"
                                    
                                    max={expectedQty}
                                    defaultValue={loopBackQty}
                                    id={`loop-${orderIndex}-${itemIndex}`}
                                    className="border-orange-300 focus:border-orange-500"
                                  />
                                </div>
                                <div>
                                  <label className="block text-sm font-medium text-stone-700 mb-1">Expected</label>
                                  <Input
                                    type="number"
                                    value={expectedQty}
                                    disabled
                                    className="bg-stone-100"
                                  />
                                </div>
                              </div>
                              
                              <div className="flex space-x-2">
                                <Button
                                  size="sm"
                                  onClick={() => {
                                    const newQcPassed = parseInt(document.getElementById(`qc-${orderIndex}-${itemIndex}`).value) || 0
                                    const newLoopBack = parseInt(document.getElementById(`loop-${orderIndex}-${itemIndex}`).value) || 0
                                    handleQuantityUpdate(orderData._id, itemIndex, newQcPassed, newLoopBack)
                                  }}
                                  className="bg-green-600 hover:bg-green-700"
                                >
                                  <CheckCircle className="h-4 w-4 mr-1" />
                                  Save
                                </Button>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => setEditingItem(null)}
                                >
                                  <XCircle className="h-4 w-4 mr-1" />
                                  Cancel
                                </Button>
                              </div>
                            </div>
                          ) : (
                            <div>
                              {/* Quantity Progress Bar */}
                              <div className="mb-3">
                                <div className="flex justify-between text-sm text-stone-600 mb-1">
                                  <span>Progress: {getQuantityPercentage(qcPassedQty, loopBackQty, expectedQty)}%</span>
                                  <span>{qcPassedQty + loopBackQty} / {expectedQty}</span>
                                </div>
                                <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                                  <div className="h-full flex">
                                    {/* QC Passed portion */}
                                    <div 
                                      className="bg-green-500 transition-all duration-300"
                                      style={{ width: `${(qcPassedQty / expectedQty) * 100}%` }}
                                    ></div>
                                    {/* Loop-back portion */}
                                    <div 
                                      className="bg-orange-500 transition-all duration-300"
                                      style={{ width: `${(loopBackQty / expectedQty) * 100}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>

                              {/* Quantity Details */}
                              <div className="grid grid-cols-4 gap-4 text-center">
                                <div>
                                  <p className="text-lg font-bold text-green-600">{qcPassedQty}</p>
                                  <p className="text-xs text-stone-600">QC Passed</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-orange-600">{loopBackQty}</p>
                                  <p className="text-xs text-stone-600">Loop-back</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-stone-600">{pendingQty}</p>
                                  <p className="text-xs text-stone-600">Pending</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-blue-600">{expectedQty}</p>
                                  <p className="text-xs text-stone-600">Expected</p>
                                </div>
                              </div>

                              {/* Quick Actions */}
                              {loopBackQty > 0 && (
                                <div className="mt-4 flex space-x-2">
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      const resolveQty = prompt(`Resolve how many units? (Max: ${loopBackQty})`)
                                      if (resolveQty && resolveQty > 0 && resolveQty <= loopBackQty) {
                                        handleResolveLoopback(orderData._id, itemIndex, parseInt(resolveQty))
                                      }
                                    }}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <Plus className="h-4 w-4 mr-1" />
                                    Resolve {Math.min(10, loopBackQty)}
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleResolveLoopback(orderData._id, itemIndex, loopBackQty)}
                                    className="text-green-600 border-green-300 hover:bg-green-50"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Resolve All
                                  </Button>
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )
                    })}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoopBackMonitor
