import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Container as ContainerIcon,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Truck,
  Package,
  MapPin,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Containers = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [containers, setContainers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedView, setSelectedView] = useState('grid')

  // Fetch containers
  const fetchContainers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/containers')
      setContainers(response.data.containers || [])
    } catch (error) {
      console.error('Error fetching containers:', error)
      toast.error('Failed to load containers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [])

  // Mock data for demonstration
  const mockContainers = [
    {
      _id: '1',
      clientFacingId: 'SHIP-ABC123',
      realContainerId: 'MSKU1234567',
      type: '40ft',
      status: 'loading',
      currentCbm: 45.2,
      maxCbm: 67,
      currentWeight: 15000,
      maxWeight: 30000,
      location: { current: 'Warehouse A', port: 'Mumbai Port' },
      billNo: 'BILL-001234',
      sealNo: 'SEAL-567890',
      estimatedDeparture: '2024-01-25',
      estimatedArrival: '2024-02-15',
      orders: [
        { orderId: { orderNumber: 'ORD-001234', clientName: 'ABC Trading' } },
        { orderId: { orderNumber: 'ORD-001235', clientName: 'XYZ Imports' } }
      ],
      charges: [
        { name: 'Freight', value: 2500, currency: 'USD' },
        { name: 'Documentation', value: 150, currency: 'USD' }
      ]
    },
    {
      _id: '2',
      clientFacingId: 'SHIP-DEF456',
      realContainerId: 'TCLU9876543',
      type: '20ft',
      status: 'planning',
      currentCbm: 0,
      maxCbm: 33,
      currentWeight: 0,
      maxWeight: 28000,
      location: { current: 'Planning Stage', port: 'Chennai Port' },
      billNo: '',
      sealNo: '',
      estimatedDeparture: '2024-02-05',
      estimatedArrival: '2024-02-25',
      orders: [],
      charges: []
    },
    {
      _id: '3',
      clientFacingId: 'SHIP-GHI789',
      realContainerId: 'HLBU5555555',
      type: '40ft',
      status: 'shipped',
      currentCbm: 65.8,
      maxCbm: 67,
      currentWeight: 28500,
      maxWeight: 30000,
      location: { current: 'In Transit', port: 'Singapore Port' },
      billNo: 'BILL-001236',
      sealNo: 'SEAL-111222',
      estimatedDeparture: '2024-01-15',
      estimatedArrival: '2024-02-05',
      orders: [
        { orderId: { orderNumber: 'ORD-001236', clientName: 'Global Logistics' } }
      ],
      charges: [
        { name: 'Freight', value: 2800, currency: 'USD' },
        { name: 'Insurance', value: 200, currency: 'USD' }
      ]
    }
  ]

  const displayContainers = containers.length > 0 ? containers : mockContainers

  // Filter containers
  const filteredContainers = displayContainers.filter(container => {
    const matchesSearch = container.clientFacingId.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         container.realContainerId?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter
    return matchesSearch && matchesStatus
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'planning':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'loading':
        return <Package className="h-4 w-4 text-yellow-500" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-green-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-gray-500" />
    }
  }

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Calculate metrics
  const metrics = {
    totalContainers: filteredContainers.length,
    activeContainers: filteredContainers.filter(c => ['loading', 'shipped'].includes(c.status)).length,
    plannedContainers: filteredContainers.filter(c => c.status === 'planning').length,
    avgUtilization: filteredContainers.reduce((acc, c) => acc + (c.currentCbm / c.maxCbm * 100), 0) / filteredContainers.length || 0
  }

  if (loading && containers.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading containers...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">Container Management</h1>
            <p className="text-gray-600 mt-2">Track and manage shipping containers</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchContainers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/containers/create">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                New Container
              </Button>
            </Link>
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MetricCard
              title="Total Containers"
              value={metrics.totalContainers}
              icon={ContainerIcon}
              change="+2 this week"
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MetricCard
              title="Active Containers"
              value={metrics.activeContainers}
              icon={Truck}
              change="In transit/loading"
              changeType="neutral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MetricCard
              title="Planned Containers"
              value={metrics.plannedContainers}
              icon={Clock}
              change="Awaiting allocation"
              changeType="neutral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MetricCard
              title="Avg Utilization"
              value={`${metrics.avgUtilization.toFixed(1)}%`}
              icon={BarChart3}
              change={metrics.avgUtilization > 80 ? "Excellent" : "Good"}
              changeType={metrics.avgUtilization > 80 ? "positive" : "neutral"}
            />
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  placeholder="Search containers..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="planning">Planning</option>
                  <option value="loading">Loading</option>
                  <option value="shipped">Shipped</option>
                  <option value="delivered">Delivered</option>
                </select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Container Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
          {filteredContainers.map((container, index) => (
            <motion.div
              key={container._id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: index * 0.1 }}
            >
              <Card className="hover:shadow-lg transition-shadow">
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      {getStatusIcon(container.status)}
                      <CardTitle className="text-lg">{container.clientFacingId}</CardTitle>
                    </div>
                    <span className={`status-badge ${getStatusColor(container.status)}`}>
                      {container.status}
                    </span>
                  </div>
                  <CardDescription>
                    {container.type} • {container.realContainerId}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                  {/* Utilization Bars */}
                  <div className="space-y-3">
                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>CBM Utilization</span>
                        <span>{((container.currentCbm / container.maxCbm) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUtilizationColor((container.currentCbm / container.maxCbm) * 100)}`}
                          style={{ width: `${Math.min((container.currentCbm / container.maxCbm) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {container.currentCbm} / {container.maxCbm} m³
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-sm mb-1">
                        <span>Weight Utilization</span>
                        <span>{((container.currentWeight / container.maxWeight) * 100).toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-2">
                        <div
                          className={`h-2 rounded-full ${getUtilizationColor((container.currentWeight / container.maxWeight) * 100)}`}
                          style={{ width: `${Math.min((container.currentWeight / container.maxWeight) * 100, 100)}%` }}
                        />
                      </div>
                      <div className="text-xs text-gray-500 mt-1">
                        {container.currentWeight.toLocaleString()} / {container.maxWeight.toLocaleString()} kg
                      </div>
                    </div>
                  </div>

                  {/* Location & Dates */}
                  <div className="space-y-2 text-sm">
                    <div className="flex items-center text-gray-600">
                      <MapPin className="h-4 w-4 mr-2" />
                      <span>{container.location?.current}</span>
                    </div>
                    {container.estimatedDeparture && (
                      <div className="flex items-center text-gray-600">
                        <Calendar className="h-4 w-4 mr-2" />
                        <span>Departs: {formatDate(container.estimatedDeparture)}</span>
                      </div>
                    )}
                  </div>

                  {/* Orders */}
                  {container.orders && container.orders.length > 0 && (
                    <div>
                      <p className="text-sm font-medium text-gray-700 mb-2">
                        Allocated Orders ({container.orders.length}):
                      </p>
                      <div className="space-y-1">
                        {container.orders.slice(0, 2).map((order, idx) => (
                          <div key={idx} className="text-sm text-gray-600">
                            {order.orderId?.orderNumber} - {order.orderId?.clientName}
                          </div>
                        ))}
                        {container.orders.length > 2 && (
                          <div className="text-sm text-gray-500">
                            +{container.orders.length - 2} more orders
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Financial Summary */}
                  {container.charges && container.charges.length > 0 && (
                    <div className="pt-3 border-t">
                      <p className="text-sm font-medium text-gray-700 mb-1">Total Charges:</p>
                      <p className="text-lg font-bold text-green-600">
                        {formatCurrency(container.charges.reduce((sum, charge) => sum + charge.value, 0))}
                      </p>
                    </div>
                  )}

                  {/* Actions */}
                  <div className="flex space-x-2 pt-3 border-t">
                    <Link to={`/containers/${container._id}`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link to={`/containers/${container._id}/edit`} className="flex-1">
                      <Button variant="outline" size="sm" className="w-full">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>

        {/* Empty State */}
        {filteredContainers.length === 0 && !loading && (
          <div className="text-center py-12">
            <ContainerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No containers found</h3>
            <p className="text-gray-500 mb-6">
              {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first container'}
            </p>
            <Link to="/containers/create">
              <Button variant="gradient">
                <Plus className="h-4 w-4 mr-2" />
                Create First Container
              </Button>
            </Link>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default Containers