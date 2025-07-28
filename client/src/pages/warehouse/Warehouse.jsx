import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Package,
  Container,
  AlertTriangle,
  CheckCircle,
  Clock,
  TrendingUp,
  Truck,
  BarChart3,
  Plus,
  Search,
  Filter,
  RefreshCw,
  Eye,
  Edit,
  RotateCcw
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input, SearchInput } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils'
import QCInspector from '@/components/warehouse/QCInspector'
import LoopBackMonitor from '@/components/warehouse/LoopBackMonitor'
import ContainerPlanner3D from '@/components/warehouse/ContainerPlanner3D'
import axios from 'axios'
import toast from 'react-hot-toast'

const Warehouse = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedOrder, setSelectedOrder] = useState(null)
  const [showLoopbackModal, setShowLoopbackModal] = useState(false)
  const [showQCInspector, setShowQCInspector] = useState(false)
  const [qcOrder, setQcOrder] = useState(null)
  const [containers, setContainers] = useState([])
  const [availableItems, setAvailableItems] = useState([])

  // Fetch warehouse dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/warehouse/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching warehouse data:', error)
      toast.error('Failed to load warehouse data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Mock data for demonstration (replace with real API data)
  const mockMetrics = {
    ordersInWarehouse: 12,
    containersLoading: 3,
    containersPending: 5,
    totalCbmUtilization: 245.8
  }



  const metrics = dashboardData?.metrics || { totalOrders: 0, readyOrders: 0, activeContainers: 0, totalCbmUtilization: 0 }
  const readyOrders = dashboardData?.readyOrders || [] // Remove mock data fallback
  const activeContainers = dashboardData?.activeContainers || [] // Remove mock data fallback

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ready':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_production':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'confirmed':
        return <Package className="h-4 w-4 text-amber-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const handleQCInspection = (order) => {
    setQcOrder(order)
    setShowQCInspector(true)
  }

  const handleQCResult = async (result) => {
    try {
      if (result.success) {
        toast.success('QC inspection completed successfully!')

        // If loop-back is needed, automatically create it
        if (result.needsLoopback) {
          toast.info('Creating loop-back order for shortages/damages...')
          // The loop-back creation is handled by the QC backend
        }

        fetchDashboardData() // Refresh data
      }
    } catch (error) {
      console.error('QC result handling error:', error)
      toast.error('Failed to process QC results')
    }
  }

  const handleCreateLoopback = async (order) => {
    try {
      setSelectedOrder(order)
      // This would typically open a loop-back creation modal
      // For now, we'll simulate creating a loop-back for the first item
      const loopbackData = {
        originalOrderId: order._id,
        items: [order.items[0]], // First item as example
        reason: 'SHORTAGE',
        priority: 'high'
      }

      await axios.post('/api/warehouse/loopback', loopbackData)
      toast.success('Loop-back order created for ' + order.orderNumber)
      setShowLoopbackModal(false)
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Loop-back creation error:', error)
      toast.error('Failed to create loop-back order')
    }
  }

  const handleAllocateToContainer = async (order) => {
    try {
      // This would typically open a container allocation modal
      // For now, we'll simulate allocation to an available container
      const allocationData = {
        orderId: order._id,
        containerId: 'auto', // Auto-assign to best fit container
        allocatedCbm: order.totalCbm,
        allocatedWeight: order.totalWeight,
        allocatedCartons: order.totalCartons
      }

      await axios.post('/api/warehouse/allocate-container', allocationData)
      toast.success('Container allocation started for ' + order.orderNumber)
      fetchDashboardData() // Refresh data
    } catch (error) {
      console.error('Container allocation error:', error)
      toast.error('Failed to allocate container')
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading warehouse data...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="flex justify-between items-center mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-stone-900">Warehouse Management</h1>
          <p className="text-stone-600 mt-2">
            Manage inventory, quality control, and container allocation
          </p>
        </motion.div>
        <div className="flex space-x-3">
          <Button variant="outline" onClick={fetchDashboardData}>
            <RefreshCw className="h-4 w-4 mr-2" />
            Refresh
          </Button>
          <Button variant="gradient">
            <Plus className="h-4 w-4 mr-2" />
            New Inspection
          </Button>
        </div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <MetricCard
            title="Orders in Warehouse"
            value={metrics.ordersInWarehouse}
            icon={Package}
            change="+3 from yesterday"
            changeType="positive"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <MetricCard
            title="Containers Loading"
            value={metrics.containersLoading}
            icon={Container}
            change="2 ready to ship"
            changeType="neutral"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <MetricCard
            title="Pending Allocation"
            value={metrics.containersPending}
            icon={Clock}
            change="Priority: 2 urgent"
            changeType="negative"
          />
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.4 }}
        >
          <MetricCard
            title="CBM Utilization"
            value={`${metrics.totalCbmUtilization} m³`}
            icon={BarChart3}
            change="85% capacity used"
            changeType="positive"
          />
        </motion.div>
      </div>

      {/* Tab Navigation */}
      <div className="mb-6">
        <div className="border-b border-stone-200">
          <nav className="-mb-px flex space-x-8">
            {[
              { id: 'overview', name: 'Overview', icon: BarChart3 },
              { id: 'orders', name: 'Ready Orders', icon: Package },
              { id: 'containers', name: 'Active Containers', icon: Container },
              { id: 'qc', name: 'Quality Control', icon: CheckCircle },
              { id: 'loopback', name: 'Loop-back Monitor', icon: RotateCcw },
              { id: 'planner', name: 'Container Planner', icon: Container }
            ].map((tab) => (
              <button
                key={tab.id}
                onClick={() => setSelectedTab(tab.id)}
                className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                  selectedTab === tab.id
                    ? 'border-amber-500 text-amber-600'
                    : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
                }`}
              >
                <tab.icon className="h-4 w-4 mr-2" />
                {tab.name}
              </button>
            ))}
          </nav>
        </div>
      </div>

      {/* Tab Content */}
      {selectedTab === 'overview' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Activity */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Recent Activity</CardTitle>
                <CardDescription>Latest warehouse operations</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {[
                    { action: 'QC Passed', order: 'ORD-001234', time: '2 hours ago', status: 'success' },
                    { action: 'Container Loading', order: 'SHIP-ABC123', time: '4 hours ago', status: 'progress' },
                    { action: 'Loop-back Created', order: 'ORD-001235', time: '6 hours ago', status: 'warning' },
                    { action: 'Allocation Complete', order: 'ORD-001236', time: '8 hours ago', status: 'success' }
                  ].map((activity, index) => (
                    <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        {activity.status === 'success' && <CheckCircle className="h-4 w-4 text-green-500" />}
                        {activity.status === 'progress' && <Clock className="h-4 w-4 text-amber-500" />}
                        {activity.status === 'warning' && <AlertTriangle className="h-4 w-4 text-yellow-500" />}
                        <div>
                          <p className="font-medium text-stone-900">{activity.action}</p>
                          <p className="text-sm text-stone-500">{activity.order}</p>
                        </div>
                      </div>
                      <span className="text-sm text-stone-500">{activity.time}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>

          {/* Container Utilization */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Container Utilization</CardTitle>
                <CardDescription>Current loading status</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {activeContainers.slice(0, 3).map((container) => (
                    <div key={container._id} className="p-4 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-medium">{container.clientFacingId}</span>
                        <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusColor(container.status)}`}>
                          {container.status}
                        </span>
                      </div>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>CBM Utilization</span>
                            <span>{((container.currentCbm / container.maxCbm) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2">
                            <div
                              className="bg-amber-600 h-2 rounded-full"
                              style={{ width: `${(container.currentCbm / container.maxCbm) * 100}%` }}
                            />
                          </div>
                        </div>
                        <div>
                          <div className="flex justify-between text-sm">
                            <span>Weight Utilization</span>
                            <span>{((container.currentWeight / container.maxWeight) * 100).toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-stone-200 rounded-full h-2">
                            <div
                              className="bg-green-600 h-2 rounded-full"
                              style={{ width: `${(container.currentWeight / container.maxWeight) * 100}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>
      )}

      {/* Orders Tab */}
      {selectedTab === 'orders' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Ready Orders</CardTitle>
                <CardDescription>Orders ready for warehouse processing</CardDescription>
              </div>
              <div className="flex space-x-2">
                <SearchInput
                  placeholder="Search orders..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-64"
                />
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  Filter
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {readyOrders.map((order) => (
                  <div key={order._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-3">
                      <div className="flex items-center space-x-3">
                        {getStatusIcon(order.status)}
                        <div>
                          <h3 className="font-semibold text-stone-900">{order.orderNumber}</h3>
                          <p className="text-sm text-stone-500">{order.clientName}</p>
                        </div>
                      </div>
                      <div className="flex space-x-2">
                        <Button variant="outline" size="sm" onClick={() => handleQCInspection(order)}>
                          <CheckCircle className="h-4 w-4 mr-1" />
                          QC
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleCreateLoopback(order)}>
                          <RotateCcw className="h-4 w-4 mr-1" />
                          Loop-back
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => handleAllocateToContainer(order)}>
                          <Container className="h-4 w-4 mr-1" />
                          Allocate
                        </Button>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4 text-sm">
                      <div>
                        <span className="text-stone-500">Cartons:</span>
                        <span className="ml-1 font-medium">{order.totalCartons}</span>
                      </div>
                      <div>
                        <span className="text-stone-500">CBM:</span>
                        <span className="ml-1 font-medium">{order.totalCbm} m³</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Weight:</span>
                        <span className="ml-1 font-medium">{order.totalWeight} kg</span>
                      </div>
                      <div>
                        <span className="text-stone-500">Deadline:</span>
                        <span className="ml-1 font-medium">{formatDate(order.deadline)}</span>
                      </div>
                    </div>

                    {order.items && (
                      <div className="mt-3 pt-3 border-t">
                        <p className="text-sm font-medium text-stone-700 mb-2">Items:</p>
                        <div className="space-y-1">
                          {order.items.slice(0, 2).map((item, index) => (
                            <div key={index} className="text-sm text-stone-600">
                              {item.itemCode} - {item.description} (Qty: {item.quantity})
                            </div>
                          ))}
                          {order.items.length > 2 && (
                            <div className="text-sm text-stone-500">
                              +{order.items.length - 2} more items
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Containers Tab */}
      {selectedTab === 'containers' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Active Containers</CardTitle>
              <CardDescription>Containers in planning and loading phase</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {activeContainers.map((container) => (
                  <div key={container._id} className="border rounded-lg p-6 hover:shadow-md transition-shadow">
                    <div className="flex items-center justify-between mb-4">
                      <div>
                        <h3 className="font-semibold text-stone-900">{container.clientFacingId}</h3>
                        <p className="text-sm text-stone-500">{container.type} Container</p>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(container.status)}`}>
                        {container.status}
                      </span>
                    </div>

                    <div className="space-y-3 mb-4">
                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>CBM Capacity</span>
                          <span>{container.currentCbm}/{container.maxCbm} m³</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-amber-600 h-2 rounded-full"
                            style={{ width: `${Math.min((container.currentCbm / container.maxCbm) * 100, 100)}%` }}
                          />
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between text-sm mb-1">
                          <span>Weight Capacity</span>
                          <span>{container.currentWeight}/{container.maxWeight} kg</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-2">
                          <div
                            className="bg-green-600 h-2 rounded-full"
                            style={{ width: `${Math.min((container.currentWeight / container.maxWeight) * 100, 100)}%` }}
                          />
                        </div>
                      </div>
                    </div>

                    <div className="text-sm text-stone-600 mb-3">
                      <span className="font-medium">Location:</span> {container.location?.current}
                    </div>

                    {container.orders && container.orders.length > 0 && (
                      <div>
                        <p className="text-sm font-medium text-stone-700 mb-2">Allocated Orders:</p>
                        <div className="space-y-1">
                          {container.orders.map((order, index) => (
                            <div key={index} className="text-sm text-stone-600">
                              {order.orderId?.orderNumber} - {order.orderId?.clientName}
                            </div>
                          ))}
                        </div>
                      </div>
                    )}

                    <div className="mt-4 pt-3 border-t flex space-x-2">
                      <Link to={`/containers/${container._id}`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </Link>
                      <Link to={`/containers/${container._id}/edit`} className="flex-1">
                        <Button variant="outline" size="sm" className="w-full">
                          <Edit className="h-4 w-4 mr-1" />
                          Manage
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* QC Tab */}
      {selectedTab === 'qc' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardHeader>
              <CardTitle>Quality Control Dashboard</CardTitle>
              <CardDescription>Manage quality inspections and approvals</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                {/* QC Orders List */}
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {readyOrders.map((order) => (
                    <div key={order._id} className="border rounded-lg p-4 hover:shadow-md transition-shadow">
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <div>
                            <h3 className="font-semibold text-sm">{order.orderNumber}</h3>
                            <p className="text-xs text-stone-500">{order.clientName}</p>
                          </div>
                        </div>
                      </div>
                      <div className="space-y-2 mb-4">
                        <div className="text-xs text-stone-600">
                          Items: {order.items?.length || 0}
                        </div>
                        <div className="text-xs text-stone-600">
                          Total: {formatCurrency(order.totalAmount || 0)}
                        </div>
                      </div>
                      <Button
                        size="sm"
                        className="w-full"
                        onClick={() => handleQCInspection(order)}
                      >
                        <CheckCircle className="h-4 w-4 mr-2" />
                        Start QC Inspection
                      </Button>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Loop-back Monitor Tab */}
      {selectedTab === 'loopback' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <LoopBackMonitor onCreateLoopback={() => setShowLoopbackModal(true)} />
        </motion.div>
      )}

      {/* Container Planner Tab */}
      {selectedTab === 'planner' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <ContainerPlanner3D
            items={availableItems}
            containers={containers}
            onAllocationChange={(item, newQty) => {
              console.log('Allocation changed:', item, newQty)
              // Handle allocation change
            }}
            onOptimize={(plan) => {
              console.log('Optimization plan:', plan)
              toast.success('Container allocation optimized!')
            }}
          />
        </motion.div>
      )}

      {/* QC Inspector Modal */}
      {showQCInspector && qcOrder && (
        <QCInspector
          order={qcOrder}
          onResult={handleQCResult}
          onClose={() => {
            setShowQCInspector(false)
            setQcOrder(null)
          }}
        />
      )}
    </div>
  )
}

export default Warehouse