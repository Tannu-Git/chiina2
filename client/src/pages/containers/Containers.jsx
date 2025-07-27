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
  Clock,
  Ship,
  Anchor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
import UniversalDataDisplay from '@/components/ui/UniversalDataDisplay'
import DataLoopManager from '@/components/ui/DataLoopManager'
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
  const [currentDisplayData, setCurrentDisplayData] = useState([])

  // Data sources for looping
  const dataSources = [
    {
      name: 'All Containers',
      icon: ContainerIcon,
      description: 'Complete container list',
      getData: () => filteredContainers,
      color: 'blue'
    },
    {
      name: 'Active Containers',
      icon: Ship,
      description: 'In transit or loading',
      getData: () => filteredContainers.filter(c => ['loading', 'shipped', 'in_transit'].includes(c.status)),
      color: 'green'
    },
    {
      name: 'High Utilization',
      icon: BarChart3,
      description: 'Above 80% capacity',
      getData: () => filteredContainers.filter(c => (c.currentCbm / c.maxCbm) > 0.8),
      color: 'yellow'
    },
    {
      name: 'Planning Stage',
      icon: Clock,
      description: 'Awaiting allocation',
      getData: () => filteredContainers.filter(c => c.status === 'planning'),
      color: 'purple'
    },
    {
      name: 'Delivered',
      icon: Anchor,
      description: 'Completed shipments',
      getData: () => filteredContainers.filter(c => c.status === 'delivered'),
      color: 'gray'
    }
  ]

  // Column configuration for containers
  const containerColumns = [
    {
      key: 'clientFacingId',
      label: 'Container ID',
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(item.status)}
          <Link
            to={`/containers/${item._id}`}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {value}
          </Link>
        </div>
      )
    },
    {
      key: 'type',
      label: 'Type',
      render: (value) => (
        <span className="px-2 py-1 bg-gray-100 text-gray-800 rounded text-sm">
          {value}
        </span>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`status-badge ${getStatusColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'utilization',
      label: 'CBM Utilization',
      render: (_, item) => {
        const percentage = ((item.currentCbm / item.maxCbm) * 100).toFixed(1)
        return (
          <div className="w-full">
            <div className="flex justify-between text-sm mb-1">
              <span>{percentage}%</span>
              <span>{item.currentCbm}/{item.maxCbm} m³</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <div
                className={`h-2 rounded-full ${getUtilizationColor(percentage)}`}
                style={{ width: `${Math.min(percentage, 100)}%` }}
              />
            </div>
          </div>
        )
      }
    },
    {
      key: 'location',
      label: 'Location',
      render: (value) => (
        <div className="flex items-center text-sm">
          <MapPin className="h-4 w-4 mr-1 text-gray-500" />
          {value?.current || 'Unknown'}
        </div>
      )
    },
    {
      key: 'estimatedDeparture',
      label: 'Departure',
      render: (value) => value ? formatDate(value) : 'TBD'
    },
    {
      key: 'orders',
      label: 'Orders',
      render: (value) => (
        <span className="text-sm text-gray-600">
          {value?.length || 0} orders
        </span>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex space-x-1">
          <Link to={`/containers/${item._id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/containers/${item._id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
        </div>
      )
    }
  ]

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



  const displayContainers = containers // Remove mock data fallback

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

        {/* Data Loop Manager */}
        <DataLoopManager
          dataSources={dataSources}
          onDataChange={(data, source) => setCurrentDisplayData(data)}
          className="mb-6"
        />

        {/* Universal Data Display */}
        <UniversalDataDisplay
          data={currentDisplayData.length > 0 ? currentDisplayData : filteredContainers}
          title="Container Management"
          columns={containerColumns}
          onItemClick={(container) => window.location.href = `/containers/${container._id}`}
          enableLoop={true}
          enableAutoSwitch={true}
          className="mb-8"
        />

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