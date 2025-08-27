import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Package,
  CheckCircle,
  Clock,
  AlertTriangle,
  RefreshCw,
  Eye,
  Edit,
  RotateCcw,
  Container,
  Search,
  Filter,
  XCircle
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils'
import QCInspector from '@/components/warehouse/QCInspector'
import OrderDetailsModal from '@/components/warehouse/OrderDetailsModal'
import axios from 'axios'
import toast from 'react-hot-toast'

const Warehouse = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [qcCompletedOrders, setQcCompletedOrders] = useState([])
  const [loopBackOrders, setLoopBackOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedView, setSelectedView] = useState('orders') // 'orders', 'completed', or 'loopback'
  
  // Dynamic update state
  const [lastUpdateTimestamp, setLastUpdateTimestamp] = useState(null)
  const [autoRefresh, setAutoRefresh] = useState(true)
  const [refreshInterval, setRefreshInterval] = useState(null)
  
  // Modals
  const [showQCInspector, setShowQCInspector] = useState(false)
  const [showOrderDetails, setShowOrderDetails] = useState(false)
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [selectedOrderId, setSelectedOrderId] = useState(null)
  
  // Loop-back editing state
  const [editingLoopBack, setEditingLoopBack] = useState(null) // { orderId, itemIndex }

  // Enhanced fetch with dynamic update tracking
  const fetchData = async (forceRefresh = false) => {
    try {
      if (forceRefresh) {
        setLoading(true)
      }
      
      const [dashboardResponse, loopBackResponse] = await Promise.all([
        axios.get('/api/warehouse/dashboard'),
        axios.get('/api/warehouse/loopback')
      ])
      
      setOrders(dashboardResponse.data.readyOrders || [])
      setQcCompletedOrders(dashboardResponse.data.completedOrders || [])
      setLoopBackOrders(loopBackResponse.data.loopbackData || []) // Fixed: backend returns 'loopbackData' not 'loopbackOrders'
      
      // Track last update timestamp for dynamic refresh decisions
      const newTimestamp = loopBackResponse.data.timestamp || new Date().toISOString()
      setLastUpdateTimestamp(newTimestamp)
      
      console.log('Fetched data with enhanced tracking:', {
        pendingOrders: dashboardResponse.data.readyOrders?.length || 0,
        completedOrders: dashboardResponse.data.completedOrders?.length || 0,
        loopBacks: loopBackResponse.data.loopbackData?.length || 0, // Fixed: use loopbackData
        loopBackStats: loopBackResponse.data.stats, // Added: show loop-back stats
        activeQuantity: loopBackResponse.data.stats?.totalActiveQuantity || 0,
        timestamp: newTimestamp,
        recentlyUpdated: loopBackResponse.data.stats?.recentlyUpdated || 0
      })
    } catch (error) {
      console.error('Error fetching warehouse data:', error)
      toast.error('Failed to load warehouse data')
    } finally {
      if (forceRefresh) {
        setLoading(false)
      }
    }
  }

  useEffect(() => {
    fetchData(true) // Initial load with loading state
  }, [])

  // Auto-refresh mechanism for dynamic updates
  useEffect(() => {
    if (!autoRefresh) return

    const setupAutoRefresh = () => {
      // More frequent refresh for loop-back section (every 30 seconds)
      // Less frequent for other sections (every 60 seconds)
      const interval = selectedView === 'loopback' ? 30000 : 60000
      
      const refreshTimer = setInterval(() => {
        console.log(`Auto-refreshing ${selectedView} data...`)
        fetchData(false) // Background refresh without loading state
      }, interval)
      
      setRefreshInterval(refreshTimer)
      return refreshTimer
    }

    const timer = setupAutoRefresh()
    
    return () => {
      if (timer) {
        clearInterval(timer)
      }
    }
  }, [selectedView, autoRefresh])

  // Cleanup interval on unmount
  useEffect(() => {
    return () => {
      if (refreshInterval) {
        clearInterval(refreshInterval)
      }
    }
  }, [])

  // Quick stats
  const stats = {
    totalOrders: orders.length,
    pendingQC: orders.filter(o => ['confirmed', 'in_production'].includes(o.status)).length,
    completedQC: qcCompletedOrders.length,
    loopBacks: loopBackOrders.length, // Fixed: loopBackOrders contains the actual count from API
    totalCBM: orders.reduce((sum, o) => sum + (o.totalCbm || 0), 0)
  }

  // Filter function
  const filteredData = selectedView === 'orders' 
    ? orders.filter(order => 
        !searchTerm || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : selectedView === 'completed'
    ? qcCompletedOrders.filter(order => 
        !searchTerm || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )
    : loopBackOrders.filter(order => 
        !searchTerm || 
        order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
        order.clientName.toLowerCase().includes(searchTerm.toLowerCase())
      )

  // Action handlers
  const handleQCInspection = (order) => {
    setSelectedOrder(order)
    setShowQCInspector(true)
  }

  const handleReQCInspection = (order) => {
    // Show confirmation dialog for re-inspection
    const confirmReInspection = window.confirm(
      `⚠️ Re-QC Inspection Confirmation\n\n` +
      `Order: ${order.orderNumber}\n` +
      `Current Status: ${order.status?.toUpperCase()}\n` +
      `Last QC: ${order.qcCompletedAt ? new Date(order.qcCompletedAt).toLocaleDateString() : 'N/A'}\n\n` +
      `Re-inspecting this order will:\n` +
      `• Override existing QC results\n` +
      `• May cancel related pending loop-back orders\n` +
      `• Create new loop-backs if needed\n` +
      `• Update order status based on new results\n\n` +
      `Are you sure you want to proceed?`
    )
    
    if (confirmReInspection) {
      setSelectedOrder(order)
      setShowQCInspector(true)
    }
  }

  const handleViewDetails = (order) => {
    setSelectedOrderId(order._id)
    setShowOrderDetails(true)
  }

  const handleQCResult = async (result) => {
    if (result.success) {
      // Enhanced success message with loop-back updates
      if (result.summary && result.summary.loopBackDetails && result.summary.loopBackDetails.length > 0) {
        const updateDetails = result.summary.loopBackDetails.map(detail => 
          `${detail.action}: ${detail.orderNumber} - ${detail.details}`
        ).join(', ')
        toast.success(
          `QC inspection completed! ${updateDetails}`,
          { duration: 6000 }
        )
      } else {
        toast.success('QC inspection completed successfully!')
      }
      
      // Force refresh all data to get latest quantities
      console.log('Forcing data refresh after QC completion...')
      await fetchData()
      
      // Additional refresh specifically for loop-backs if they were updated
      if (result.summary && (result.summary.loopBacksCreated > 0 || result.summary.loopBacksUpdated > 0)) {
        console.log('Loop-backs were modified, ensuring data consistency...')
        setTimeout(() => fetchData(), 1000) // Secondary refresh after 1 second
      }
    }
  }

  const handleLoopBackQuantityUpdate = async (orderId, itemIndex, newQuantities) => {
    try {
      const { qcPassedQuantity, loopBackQuantity } = newQuantities
      
      await axios.patch(`/api/warehouse/loopback/${orderId}/item/${itemIndex}`, {
        qcPassedQuantity,
        loopBackQuantity,
        notes: 'Updated via Warehouse Dashboard'
      })
      
      toast.success('Loop-back quantities updated successfully!')
      
      // Refresh data to show updated quantities
      await fetchData()
      
      // Clear editing state
      setEditingLoopBack(null)
    } catch (error) {
      console.error('Error updating loop-back quantities:', error)
      const errorMessage = error.response?.data?.message || 'Failed to update loop-back quantities'
      toast.error(errorMessage)
    }
  }

  const handleLoopBackStatusUpdate = async (loopBackId, newStatus) => {
    try {
      await axios.patch(`/api/warehouse/loopback/${loopBackId}`, { status: newStatus })
      toast.success('Loop-back status updated')
      fetchData()
    } catch (error) {
      toast.error('Failed to update status')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'partial_ready':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      case 'qc_failed':
        return <XCircle className="h-4 w-4 text-red-500" />
      case 'in_production':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'confirmed':
        return <Package className="h-4 w-4 text-amber-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const getQCStatusBadge = (order) => {
    if (order.status === 'ready') return { text: 'QC PASSED', color: 'bg-green-100 text-green-800' }
    if (order.status === 'partial_ready') return { text: 'PARTIAL QC', color: 'bg-yellow-100 text-yellow-800' }
    if (order.status === 'qc_failed') return { text: 'QC FAILED', color: 'bg-red-100 text-red-800' }
    return { text: 'PENDING', color: 'bg-gray-100 text-gray-800' }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3"></div>
          <span>Loading warehouse data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Simple Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-3xl font-bold text-stone-900">Warehouse</h1>
          <p className="text-stone-600">Quality control and order processing</p>
        </div>
        <div className="flex items-center space-x-2">
          {/* Auto-refresh toggle */}
          <Button 
            variant={autoRefresh ? "default" : "outline"}
            size="sm"
            onClick={() => {
              setAutoRefresh(!autoRefresh)
              toast.success(autoRefresh ? 'Auto-refresh disabled' : 'Auto-refresh enabled')
            }}
            className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
          >
            <RefreshCw className={`h-3 w-3 mr-1 ${autoRefresh ? 'animate-spin' : ''}`} />
            Auto
          </Button>
          
          {/* Manual refresh */}
          <Button 
            variant="outline" 
            onClick={() => {
              console.log('Manual refresh triggered...')
              fetchData(true)
              toast.success('Data refreshed!')
            }} 
            className="hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all duration-200 hover:shadow-md"
          >
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
        </div>
      </div>

      {/* Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-4 mb-6">
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-700">{stats.totalOrders}</div>
            <div className="text-sm text-blue-600">Ready Orders</div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-amber-50 to-amber-100 border-amber-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-700">{stats.pendingQC}</div>
            <div className="text-sm text-amber-600">Pending QC</div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-green-50 to-green-100 border-green-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-green-700">{stats.completedQC}</div>
            <div className="text-sm text-green-600">QC Completed</div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-orange-700">{stats.loopBacks}</div>
            <div className="text-sm text-orange-600">Loop-backs</div>
          </div>
        </Card>
        <Card className="p-4 hover:shadow-lg transition-shadow duration-200 bg-gradient-to-br from-emerald-50 to-emerald-100 border-emerald-200">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-700">{stats.totalCBM.toFixed(1)}</div>
            <div className="text-sm text-emerald-600">Total CBM</div>
          </div>
        </Card>
      </div>

      {/* Simple Toggle */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex space-x-2">
          <Button 
            variant={selectedView === 'orders' ? 'default' : 'outline'}
            onClick={() => setSelectedView('orders')}
            className="hover:shadow-md transition-all duration-200"
          >
            <Package className="h-4 w-4 mr-2" />
            Pending ({orders.length})
          </Button>
          <Button 
            variant={selectedView === 'completed' ? 'default' : 'outline'}
            onClick={() => setSelectedView('completed')}
            className="hover:shadow-md transition-all duration-200"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            QC Done ({qcCompletedOrders.length})
          </Button>
          <Button 
            variant={selectedView === 'loopback' ? 'default' : 'outline'}
            onClick={() => setSelectedView('loopback')}
            className="hover:shadow-md transition-all duration-200"
          >
            <RotateCcw className="h-4 w-4 mr-2" />
            Loop-backs ({stats.loopBacks}) {/* Fixed: use calculated stats */}
          </Button>
        </div>
        
        {/* Search */}
        <div className="flex items-center space-x-2">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
            <Input
              placeholder="Search..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-10 w-64 hover:border-amber-300 focus:border-amber-500 transition-colors duration-200"
            />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <Card>
        <CardContent className="p-6">
          {selectedView === 'orders' ? (
            <div className="space-y-4">
              <h3 className="font-semibold text-lg text-stone-800 mb-4">Orders Pending QC Inspection</h3>
              {filteredData.map((order) => (
                <div key={order._id} className="border border-stone-200 rounded-lg p-4 hover:border-amber-300 hover:shadow-lg hover:bg-amber-50/30 transition-all duration-300 cursor-pointer group">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-4">
                      {getStatusIcon(order.status)}
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="font-semibold text-stone-900 group-hover:text-amber-700 transition-colors duration-200">{order.orderNumber}</h3>
                          {order.isLoopBack && (
                            <Badge variant="outline" className="text-xs px-2 py-0 bg-orange-50 text-orange-600 border-orange-300">
                              <RotateCcw className="h-3 w-3 mr-1" />
                              Loop-back ({order.loopBackReason})
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-stone-500 group-hover:text-stone-600 transition-colors duration-200">{order.clientName}</p>
                        {order.isLoopBack && order.parentOrderId && (
                          <p className="text-xs text-orange-600">↳ From original order</p>
                        )}
                      </div>
                      <Badge variant="secondary" className="group-hover:bg-amber-100 group-hover:text-amber-800 transition-colors duration-200">
                        {order.items?.length || 0} items
                      </Badge>
                      <span className="text-sm text-stone-600 group-hover:text-stone-700 transition-colors duration-200">
                        {order.totalCbm} m³ • {order.totalCartons} cartons
                      </span>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleViewDetails(order)}
                        className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      
                      {(['confirmed', 'in_production'].includes(order.status)) && (
                        <Button 
                          size="sm"
                          onClick={() => handleQCInspection(order)}
                          className="bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:shadow-md"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Start QC
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <Package className="h-12 w-12 mx-auto mb-2 text-stone-400" />
                  <p className="text-stone-600">No pending orders found</p>
                  <p className="text-sm text-stone-500 mt-1">All orders have been processed or try adjusting your search</p>
                </div>
              )}
            </div>
          ) : selectedView === 'completed' ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-lg text-stone-800">QC Completed Orders</h3>
                {/* QC Progress Summary */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    <span className="text-blue-700 font-medium">
                      Total Items: {qcCompletedOrders.reduce((sum, order) => sum + (order.items?.length || 0), 0)}
                    </span>
                  </div>
                  <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">
                      Completed: {qcCompletedOrders.reduce((sum, order) => {
                        const totalItems = order.items?.length || 0
                        const processedItems = order.items?.filter(item => 
                          item.qcResult && ['ok', 'shortage', 'damaged', 'rejected'].includes(item.qcResult.status)
                        ).length || 0
                        return sum + processedItems
                      }, 0)} items
                    </span>
                  </div>
                  <div className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                    <span className="text-amber-700 font-medium">
                      Progress: {qcCompletedOrders.length > 0 ? 
                        Math.round((qcCompletedOrders.reduce((sum, order) => {
                          const totalItems = order.items?.length || 0
                          const processedItems = order.items?.filter(item => 
                            item.qcResult && ['ok', 'shortage', 'damaged', 'rejected'].includes(item.qcResult.status)
                          ).length || 0
                          return sum + (totalItems > 0 ? (processedItems / totalItems) : 0)
                        }, 0) / qcCompletedOrders.length) * 100) : 0}% avg
                    </span>
                  </div>
                </div>
              </div>
              {filteredData.map((order) => {
                const qcBadge = getQCStatusBadge(order)
                // Calculate QC progress for this order
                const totalItems = order.items?.length || 0
                const processedItems = order.items?.filter(item => 
                  item.qcResult && ['ok', 'shortage', 'damaged', 'rejected'].includes(item.qcResult.status)
                ).length || 0
                const approvedItems = order.items?.filter(item => 
                  item.qcResult && item.qcResult.status === 'ok'
                ).length || 0
                const shortageItems = order.items?.filter(item => 
                  item.qcResult && item.qcResult.status === 'shortage'
                ).length || 0
                const damagedItems = order.items?.filter(item => 
                  item.qcResult && item.qcResult.status === 'damaged'
                ).length || 0
                const rejectedItems = order.items?.filter(item => 
                  item.qcResult && item.qcResult.status === 'rejected'
                ).length || 0
                
                return (
                  <div key={order._id} className="border border-stone-200 rounded-lg p-4 hover:border-green-300 hover:shadow-lg hover:bg-green-50/30 transition-all duration-300 cursor-pointer group">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        {getStatusIcon(order.status)}
                        <div>
                          <div className="flex items-center space-x-2">
                            <h3 className="font-semibold text-stone-900 group-hover:text-green-700 transition-colors duration-200">{order.orderNumber}</h3>
                            {/* QC Progress Indicator */}
                            <Badge variant="outline" className="text-xs px-2 py-0 bg-blue-50 text-blue-600 border-blue-300">
                              QC: {processedItems}/{totalItems} items
                            </Badge>
                          </div>
                          <p className="text-sm text-stone-500 group-hover:text-stone-600 transition-colors duration-200">{order.clientName}</p>
                          <div className="flex items-center space-x-2 mt-1">
                            {order.qcCompletedAt && (
                              <p className="text-xs text-stone-400">QC: {new Date(order.qcCompletedAt).toLocaleDateString()}</p>
                            )}
                            {order.qcReInspectionCount > 0 && (
                              <Badge variant="outline" className="text-xs px-2 py-0 bg-orange-50 text-orange-600 border-orange-200">
                                Re-QC ({order.qcReInspectionCount}x)
                              </Badge>
                            )}
                            {/* Detailed QC breakdown */}
                            {processedItems > 0 && (
                              <div className="flex items-center space-x-1">
                                {approvedItems > 0 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-green-50 text-green-600 border-green-200">
                                    ✓{approvedItems}
                                  </Badge>
                                )}
                                {shortageItems > 0 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-yellow-50 text-yellow-600 border-yellow-200">
                                    ⚠{shortageItems}
                                  </Badge>
                                )}
                                {damagedItems > 0 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-orange-50 text-orange-600 border-orange-200">
                                    ⚠{damagedItems}
                                  </Badge>
                                )}
                                {rejectedItems > 0 && (
                                  <Badge variant="outline" className="text-xs px-1.5 py-0 bg-red-50 text-red-600 border-red-200">
                                    ✗{rejectedItems}
                                  </Badge>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                        <Badge className={`${qcBadge.color} transition-colors duration-200`}>
                          {qcBadge.text}
                        </Badge>
                        <span className="text-sm text-stone-600 group-hover:text-stone-700 transition-colors duration-200">
                          {order.totalCbm} m³ • {order.totalCartons} cartons
                        </span>
                      </div>
                      
                      <div className="flex space-x-2">
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleViewDetails(order)}
                          className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          Details
                        </Button>
                        
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => handleReQCInspection(order)}
                          className="hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all duration-200"
                        >
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Re-QC
                        </Button>
                        
                        {order.status === 'ready' && (
                          <Button 
                            size="sm"
                            onClick={() => {/* Handle container allocation */}}
                            className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-md"
                          >
                            <Container className="h-4 w-4 mr-1" />
                            Allocate Container
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <CheckCircle className="h-12 w-12 mx-auto mb-2 text-stone-400" />
                  <p className="text-stone-600">No completed QC orders found</p>
                  <p className="text-sm text-stone-500 mt-1">Complete some QC inspections to see them here</p>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-lg text-stone-800">Loop-back Orders</h3>
                {/* Enhanced Loop-back Summary with Real-time Quantities */}
                <div className="flex items-center space-x-4 text-sm">
                  <div className="bg-orange-50 px-3 py-1 rounded-lg border border-orange-200">
                    <span className="text-orange-700 font-medium">
                      Total Units: {loopBackOrders.reduce((sum, lb) => {
                        // Calculate ACTUAL remaining quantities by checking current item quantities
                        const activeUnits = lb.status !== 'cancelled' && lb.status !== 'completed' ? 
                          (lb.items?.reduce((itemSum, item) => itemSum + (item.quantity || 0), 0) || 0) : 0
                        return sum + activeUnits
                      }, 0)}
                    </span>
                  </div>
                  <div className="bg-amber-50 px-3 py-1 rounded-lg border border-amber-200">
                    <span className="text-amber-700 font-medium">
                      Pending QC: {loopBackOrders.filter(lb => ['confirmed', 'in_production'].includes(lb.status)).length}
                    </span>
                  </div>
                  <div className="bg-green-50 px-3 py-1 rounded-lg border border-green-200">
                    <span className="text-green-700 font-medium">
                      Ready: {loopBackOrders.filter(lb => lb.status === 'ready').length}
                    </span>
                  </div>
                  <div className="bg-blue-50 px-3 py-1 rounded-lg border border-blue-200">
                    <span className="text-blue-700 font-medium">
                      Active Orders: {loopBackOrders.filter(lb => !['cancelled', 'completed'].includes(lb.status)).length}
                    </span>
                  </div>
                  {/* Real-time Refresh Indicator */}
                  <Button 
                    variant="outline" 
                    size="sm"
                    onClick={() => {
                      console.log('Force refreshing loop-back data...')
                      fetchData(true) // Force refresh with loading state
                      toast.success('Loop-back data refreshed!', { duration: 2000 })
                    }}
                    className="hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200"
                  >
                    <RefreshCw className="h-3 w-3 mr-1" />
                    Update
                  </Button>
                </div>
              </div>
              {filteredData.map((loopBack) => {
                const qcBadge = loopBack.qcCompletedAt ? getQCStatusBadge(loopBack) : null
                const isEditingThis = editingLoopBack?.orderId === loopBack._id
                
                return (
                  <div key={loopBack._id} className="border border-stone-200 rounded-lg hover:border-orange-300 hover:shadow-lg transition-all duration-300">
                    {/* Main Loop-back Info */}
                    <div className="p-4 hover:bg-orange-50/30 cursor-pointer group">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-4">
                          <RotateCcw className="h-4 w-4 text-orange-500 group-hover:text-orange-600 transition-colors duration-200" />
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-semibold text-stone-900 group-hover:text-orange-700 transition-colors duration-200">{loopBack.orderNumber}</h3>
                              <Badge variant="outline" className="text-xs px-2 py-0 bg-orange-50 text-orange-600 border-orange-300">
                                Loop-back ({loopBack.loopBackReason})
                              </Badge>
                              {/* Enhanced quantity display with current status and last update info */}
                              {loopBack.totalLoopBackQuantity && (
                                <div className="flex items-center space-x-1">
                                  <Badge variant="outline" className="text-xs px-2 py-0 bg-blue-50 text-blue-600 border-blue-300">
                                    {loopBack.totalLoopBackQuantity} units loop-back
                                  </Badge>
                                  {/* Show updated indicator if recently modified */}
                                  {loopBack.updatedAt && new Date(loopBack.updatedAt) > new Date(Date.now() - 24*60*60*1000) && (
                                    <Badge variant="outline" className="text-xs px-1.5 py-0 bg-green-50 text-green-600 border-green-200">
                                      ↻
                                    </Badge>
                                  )}
                                </div>
                              )}
                            </div>
                            <p className="text-sm text-stone-500 group-hover:text-stone-600 transition-colors duration-200">{loopBack.clientName}</p>
                            {loopBack.parentOrderId && (
                              <p className="text-xs text-orange-600">
                                ↳ Replacement order
                                {loopBack.loopBackItems && loopBack.loopBackItems.length > 0 && (
                                  <span className="ml-2 text-blue-600">
                                    ({loopBack.loopBackItems.map(item => `${item.itemCode}: ${item.loopBackQuantity}`).join(', ')})
                                  </span>
                                )}
                              </p>
                            )}
                            <div className="flex items-center space-x-2 mt-1">
                              {loopBack.qcCompletedAt && (
                                <p className="text-xs text-stone-400">QC: {new Date(loopBack.qcCompletedAt).toLocaleDateString()}</p>
                              )}
                              {loopBack.qcReInspectionCount > 0 && (
                                <Badge variant="outline" className="text-xs px-2 py-0 bg-orange-50 text-orange-600 border-orange-200">
                                  Re-QC ({loopBack.qcReInspectionCount}x)
                                </Badge>
                              )}
                            </div>
                          </div>
                          <Badge variant={loopBack.status === 'confirmed' ? 'default' : loopBack.status === 'ready' ? 'secondary' : 'destructive'} className="transition-all duration-200">
                            {loopBack.status === 'confirmed' ? 'PENDING QC' : loopBack.status.toUpperCase()}
                          </Badge>
                          {qcBadge && (
                            <Badge className={`${qcBadge.color} transition-colors duration-200`}>
                              {qcBadge.text}
                            </Badge>
                          )}
                          <span className="text-sm text-stone-600 group-hover:text-stone-700 transition-colors duration-200">
                            {loopBack.totalCbm || 0} m³ • {loopBack.totalCartons || 0} cartons
                          </span>
                        </div>
                        
                        <div className="flex space-x-2">
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => handleViewDetails(loopBack)}
                            className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200"
                          >
                            <Eye className="h-4 w-4 mr-1" />
                            Details
                          </Button>
                          
                          {/* Edit Loop-back Quantities Button */}
                          {loopBack.loopBackItems && loopBack.loopBackItems.length > 0 && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => setEditingLoopBack(
                                isEditingThis ? null : { orderId: loopBack._id, orderData: loopBack }
                              )}
                              className="hover:bg-orange-50 hover:border-orange-300 hover:text-orange-700 transition-all duration-200"
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              {isEditingThis ? 'Cancel Edit' : 'Edit Quantities'}
                            </Button>
                          )}
                          
                          {/* QC Workflow Buttons for Loop-backs */}
                          {(['confirmed', 'in_production'].includes(loopBack.status)) && (
                            <Button 
                              size="sm"
                              onClick={() => handleQCInspection(loopBack)}
                              className="bg-green-600 hover:bg-green-700 text-white transition-all duration-200 hover:shadow-md"
                            >
                              <CheckCircle className="h-4 w-4 mr-1" />
                              Start QC
                            </Button>
                          )}
                          
                          {/* Re-QC for completed loop-backs */}
                          {loopBack.qcCompletedAt && (
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => handleReQCInspection(loopBack)}
                              className="hover:bg-amber-50 hover:border-amber-300 hover:text-amber-700 transition-all duration-200"
                            >
                              <RotateCcw className="h-4 w-4 mr-1" />
                              Re-QC
                            </Button>
                          )}
                          
                          {/* Container allocation for ready loop-backs */}
                          {loopBack.status === 'ready' && (
                            <Button 
                              size="sm"
                              onClick={() => {/* Handle container allocation */}}
                              className="bg-blue-600 hover:bg-blue-700 text-white transition-all duration-200 hover:shadow-md"
                            >
                              <Container className="h-4 w-4 mr-1" />
                              Allocate Container
                            </Button>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Expandable Edit Section */}
                    {isEditingThis && loopBack.loopBackItems && (
                      <div className="border-t bg-orange-50/50 p-4">
                        <h4 className="font-medium text-stone-900 mb-4 flex items-center">
                          <AlertTriangle className="h-4 w-4 mr-2 text-orange-600" />
                          Edit Loop-back Quantities
                        </h4>
                        
                        <div className="space-y-4">
                          {loopBack.loopBackItems.map((item, itemIndex) => {
                            const expectedQty = item.expectedQuantity || 0
                            const qcPassedQty = item.qcPassedQuantity || 0
                            const loopBackQty = item.loopBackQuantity || 0
                            
                            return (
                              <div key={itemIndex} className="bg-white border rounded-lg p-4">
                                <div className="flex items-center justify-between mb-3">
                                  <div>
                                    <h5 className="font-medium text-stone-900">{item.itemCode}</h5>
                                    <p className="text-sm text-stone-600">{item.description}</p>
                                  </div>
                                  <Badge className="bg-orange-100 text-orange-800">
                                    {item.loopBackStatus || 'pending'}
                                  </Badge>
                                </div>
                                
                                <div className="grid grid-cols-3 gap-4 mb-4">
                                  <div>
                                    <label className="block text-sm font-medium text-stone-700 mb-1">Expected Qty</label>
                                    <Input
                                      type="number"
                                      value={expectedQty}
                                      disabled
                                      className="bg-stone-100 font-medium text-center"
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-green-700 mb-1">QC Passed</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={expectedQty}
                                      defaultValue={qcPassedQty}
                                      id={`qc-passed-${loopBack._id}-${itemIndex}`}
                                      className="border-green-300 focus:border-green-500 font-medium text-center"
                                      onChange={(e) => {
                                        const newQcPassed = parseInt(e.target.value) || 0
                                        const newLoopBack = Math.max(0, expectedQty - newQcPassed)
                                        document.getElementById(`loop-back-${loopBack._id}-${itemIndex}`).value = newLoopBack
                                      }}
                                    />
                                  </div>
                                  <div>
                                    <label className="block text-sm font-medium text-orange-700 mb-1">Loop-back</label>
                                    <Input
                                      type="number"
                                      min="0"
                                      max={expectedQty}
                                      defaultValue={loopBackQty}
                                      id={`loop-back-${loopBack._id}-${itemIndex}`}
                                      className="border-orange-300 focus:border-orange-500 font-medium text-center"
                                      onChange={(e) => {
                                        const newLoopBack = parseInt(e.target.value) || 0
                                        const newQcPassed = Math.max(0, expectedQty - newLoopBack)
                                        document.getElementById(`qc-passed-${loopBack._id}-${itemIndex}`).value = newQcPassed
                                      }}
                                    />
                                  </div>
                                </div>
                                
                                {/* Progress Visualization */}
                                <div className="mb-3">
                                  <div className="flex justify-between text-sm text-stone-600 mb-1">
                                    <span>Progress: {Math.round(((qcPassedQty + loopBackQty) / expectedQty) * 100)}%</span>
                                    <span>{qcPassedQty + loopBackQty} / {expectedQty}</span>
                                  </div>
                                  <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                                    <div className="h-full flex">
                                      <div 
                                        className="bg-green-500 transition-all duration-300"
                                        style={{ width: `${(qcPassedQty / expectedQty) * 100}%` }}
                                      ></div>
                                      <div 
                                        className="bg-orange-500 transition-all duration-300"
                                        style={{ width: `${(loopBackQty / expectedQty) * 100}%` }}
                                      ></div>
                                    </div>
                                  </div>
                                </div>
                                
                                <div className="flex space-x-2">
                                  <Button
                                    size="sm"
                                    onClick={() => {
                                      const newQcPassed = parseInt(document.getElementById(`qc-passed-${loopBack._id}-${itemIndex}`).value) || 0
                                      const newLoopBack = parseInt(document.getElementById(`loop-back-${loopBack._id}-${itemIndex}`).value) || 0
                                      
                                      if (newQcPassed + newLoopBack !== expectedQty) {
                                        toast.error(`Total quantities must equal expected quantity (${expectedQty})`)
                                        return
                                      }
                                      
                                      handleLoopBackQuantityUpdate(loopBack._id, itemIndex, {
                                        qcPassedQuantity: newQcPassed,
                                        loopBackQuantity: newLoopBack
                                      })
                                    }}
                                    className="bg-green-600 hover:bg-green-700"
                                  >
                                    <CheckCircle className="h-4 w-4 mr-1" />
                                    Save Item
                                  </Button>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      // Reset to original values
                                      document.getElementById(`qc-passed-${loopBack._id}-${itemIndex}`).value = qcPassedQty
                                      document.getElementById(`loop-back-${loopBack._id}-${itemIndex}`).value = loopBackQty
                                    }}
                                  >
                                    <RotateCcw className="h-4 w-4 mr-1" />
                                    Reset
                                  </Button>
                                </div>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}
                  </div>
                )
              })}
              
              {filteredData.length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <RotateCcw className="h-12 w-12 mx-auto mb-2 text-stone-400" />
                  <p className="text-stone-600">No loop-back orders found</p>
                  <p className="text-sm text-stone-500 mt-1">Loop-back orders will appear here when created</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Modals */}
      {showQCInspector && selectedOrder && (
        <QCInspector
          order={selectedOrder}
          onResult={handleQCResult}
          onClose={() => {
            setShowQCInspector(false)
            setSelectedOrder(null)
          }}
        />
      )}

      <OrderDetailsModal
        orderId={selectedOrderId}
        isOpen={showOrderDetails}
        onClose={() => {
          setShowOrderDetails(false)
          setSelectedOrderId(null)
        }}
        onStartQC={handleQCInspection}
      />
    </div>
  )
}

export default Warehouse