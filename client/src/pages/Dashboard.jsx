import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import axios from 'axios'
import toast from 'react-hot-toast'
import {
  Package,
  Container,
  DollarSign,
  TrendingUp,
  Clock,
  AlertTriangle,
  CheckCircle,
  Truck,
  Sparkles,
  BarChart3,
  PieChart,
  RefreshCw,
  Eye,
  MoreHorizontal,
  ExternalLink,
  Edit,
  Trash2
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

// All data is now fetched from real-time API endpoints

const Dashboard = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedClient, setSelectedClient] = useState('All')
  const [selectedSupplier, setSelectedSupplier] = useState('All')
  const [shipmentData, setShipmentData] = useState([])
  const [filteredShipmentData, setFilteredShipmentData] = useState([])
  const [availableClients, setAvailableClients] = useState([])
  const [availableSuppliers, setAvailableSuppliers] = useState([])
  const [shipmentLoading, setShipmentLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [itemToDelete, setItemToDelete] = useState(null)

  // Fetch dashboard data with enhanced error handling
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/dashboard')
      
      // Validate and clean container data
      const containerUpdates = response.data.containerUpdates || []
      const cleanedContainerUpdates = containerUpdates.map(container => ({
        ...container,
        id: container.id || container.clientId || container.realId || 'N/A',
        displayId: container.clientId || container.id || `CONT-${Math.random().toString(36).substr(2, 6).toUpperCase()}`,
        status: container.status || 'unknown',
        location: container.location || 'Location not available',
        eta: container.eta || null,
        type: container.type || null
      }))
      
      setDashboardData({
        ...response.data,
        containerUpdates: cleanedContainerUpdates
      })
      
      toast.success('Dashboard data refreshed')
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      const errorMessage = error.response?.data?.message || 'Failed to load dashboard data'
      toast.error(errorMessage)
      // Set empty data to prevent UI crashes
      setDashboardData({
        metrics: [],
        recentOrders: [],
        containerUpdates: []
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch real shipment data with enhanced filtering
  const fetchShipmentData = async () => {
    try {
      setShipmentLoading(true)
      const params = new URLSearchParams()
      if (selectedClient !== 'All') {
        params.append('client', selectedClient)
      }
      if (selectedSupplier !== 'All') {
        params.append('supplier', selectedSupplier)
      }
      
      const response = await axios.get(`/api/dashboard/shipments?${params.toString()}`)
      setShipmentData(response.data.shipmentData)
      setFilteredShipmentData(response.data.shipmentData)
      setAvailableClients(response.data.filters.clients)
      setAvailableSuppliers(response.data.filters.suppliers)
    } catch (error) {
      console.error('Error fetching shipment data:', error)
      const errorMessage = error.response?.data?.message || 'Failed to load shipment data'
      toast.error(errorMessage)
      // Use empty data with proper error handling fallbacks
      setShipmentData([])
      setFilteredShipmentData([])
      setAvailableClients([])
      setAvailableSuppliers([])
    } finally {
      setShipmentLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
    fetchShipmentData()
  }, [])

  // Refetch shipment data when filters change
  useEffect(() => {
    fetchShipmentData()
  }, [selectedClient, selectedSupplier])

  // Update filtered data when shipment data changes
  useEffect(() => {
    setFilteredShipmentData(shipmentData)
  }, [shipmentData])

  // Helper function to get container capacity info
  const getContainerCapacity = (type) => {
    switch (type) {
      case '20ft': return '33 CBM • 28T'
      case '40ft': return '67 CBM • 30T'
      case '40ft_hc': return '76 CBM • 30T'
      case '45ft': return '86 CBM • 30T'
      default: return null
    }
  }

  // Enhanced dashboard actions
  const handleRefreshAll = async () => {
    setRefreshing(true)
    try {
      await Promise.all([fetchDashboardData(), fetchShipmentData()])
      toast.success('All data refreshed successfully')
    } catch (error) {
      toast.error('Failed to refresh data')
    } finally {
      setRefreshing(false)
    }
  }

  const handleViewAllOrders = () => {
    navigate('/orders')
  }

  const handleTrackAllContainers = () => {
    navigate('/containers')
  }

  const handleCreateNewOrder = () => {
    navigate('/orders/create')
  }

  const handleViewReports = () => {
    navigate('/financials')
  }

  const handleEditOrder = (orderId) => {
    navigate(`/orders/${orderId}/edit`)
  }

  const handleDeleteOrder = (orderId) => {
    setItemToDelete({ type: 'order', id: orderId })
    confirmDelete()
  }

  const handleTrackContainer = (containerId) => {
    navigate(`/containers/${containerId}`)
  }

  const confirmDelete = async () => {
    if (!itemToDelete) return
    
    const confirmed = window.confirm(
      `Are you sure you want to delete this ${itemToDelete.type}? This action cannot be undone.`
    )
    
    if (!confirmed) {
      setItemToDelete(null)
      return
    }
    
    try {
      await axios.delete(`/api/${itemToDelete.type}s/${itemToDelete.id}`)
      toast.success(`${itemToDelete.type} deleted successfully`)
      // Refresh data
      if (itemToDelete.type === 'order') {
        fetchDashboardData()
      }
    } catch (error) {
      console.error('Error deleting item:', error)
      toast.error(`Failed to delete ${itemToDelete.type}`)
    } finally {
      setItemToDelete(null)
    }
  }

  // Use real data for filters

  // Calculate shipment KPIs with better handling for real-time data
  const shipmentKPIs = filteredShipmentData.reduce((acc, item) => ({
    totalValue: acc.totalValue + (item.AMOUNT || 0),
    totalItems: acc.totalItems + (item['T.QTY'] || 0),
    totalVolume: acc.totalVolume + (item['T.CBM'] || 0),
    totalWeight: acc.totalWeight + (item['T.WT'] || 0),
    totalCarrying: acc.totalCarrying + (item.CARRYING || 0),
    itemCount: acc.itemCount + 1,
    uniqueClients: acc.uniqueClients.add(item.CLIENT),
    uniqueSuppliers: acc.uniqueSuppliers.add(item.SUPPLIER)
  }), { 
    totalValue: 0, 
    totalItems: 0, 
    totalVolume: 0, 
    totalWeight: 0, 
    totalCarrying: 0,
    itemCount: 0,
    uniqueClients: new Set(),
    uniqueSuppliers: new Set()
  })

  // Prepare chart data with empty state handling
  const getClientChartData = () => {
    if (filteredShipmentData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: ['#e5e7eb'],
          borderColor: '#f5f5f4',
          borderWidth: 4,
        }],
      }
    }

    const clientData = filteredShipmentData.reduce((acc, item) => {
      const client = item.CLIENT || 'Unknown'
      acc[client] = (acc[client] || 0) + (item.AMOUNT || 0)
      return acc
    }, {})

    const sortedClients = Object.entries(clientData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)

    return {
      labels: sortedClients.map(([client]) => client),
      datasets: [{
        data: sortedClients.map(([, value]) => value),
        backgroundColor: ['#d97706', '#f59e0b', '#fbbf24', '#fcd34d', '#fef3c7'],
        borderColor: '#f5f5f4',
        borderWidth: 4,
      }],
    }
  }

  const getSupplierChartData = () => {
    if (filteredShipmentData.length === 0) {
      return {
        labels: ['No Data'],
        datasets: [{
          data: [1],
          backgroundColor: '#e5e7eb',
          borderColor: '#d1d5db',
          borderWidth: 1,
        }],
      }
    }

    const supplierData = filteredShipmentData.reduce((acc, item) => {
      const supplier = item.SUPPLIER || 'Unknown'
      acc[supplier] = (acc[supplier] || 0) + (item['T.CBM'] || 0)
      return acc
    }, {})

    const sortedSuppliers = Object.entries(supplierData)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6)

    return {
      labels: sortedSuppliers.map(([supplier]) => supplier),
      datasets: [{
        data: sortedSuppliers.map(([, volume]) => volume),
        backgroundColor: '#f59e0b',
        borderColor: '#b45309',
        borderWidth: 1,
      }],
    }
  }

  // Default metrics with icons
  const getMetricsWithIcons = (metrics) => {
    const iconMap = {
      'Total Orders': Package,
      'Active Containers': Container,
      'Revenue': DollarSign,
      'Profit Margin': TrendingUp
    }

    return metrics?.map(metric => ({
      ...metric,
      icon: iconMap[metric.title] || Package,
      value: metric.title === 'Revenue' ? formatCurrency(metric.value) : metric.value
    })) || []
  }

  // Using real data from backend API with proper error handling
  const metrics = getMetricsWithIcons(dashboardData?.metrics)
  const recentOrders = dashboardData?.recentOrders || []
  const containerUpdates = dashboardData?.containerUpdates || []

  if (loading) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-600 mx-auto mb-4"></div>
              <h2 className="text-lg font-medium text-foreground mb-2">Loading Dashboard</h2>
              <p className="text-muted-foreground">Fetching your logistics data...</p>
            </div>
          </div>
        </div>
      </div>
    )
  }

  if (!dashboardData) {
    return (
      <div className="min-h-screen bg-background">
        <div className="px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-center h-96">
            <div className="text-center">
              <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
              <h2 className="text-lg font-medium text-foreground mb-2">Unable to Load Dashboard</h2>
              <p className="text-muted-foreground mb-4">There was a problem loading your dashboard data.</p>
              <Button 
                onClick={handleRefreshAll} 
                className="bg-amber-600 hover:bg-amber-700 text-white"
                disabled={refreshing}
              >
                <RefreshCw className={`h-4 w-4 mr-2 ${refreshing ? 'animate-spin' : ''}`} />
                {refreshing ? 'Retrying...' : 'Try Again'}
              </Button>
            </div>
          </div>
        </div>
      </div>
    )
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
      case 'delivered':
      case 'arrived':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
      case 'in_transit':
      case 'loading':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Package className="h-4 w-4 text-stone-500" />
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-foreground">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-muted-foreground mt-2">
              Here's what's happening with your logistics operations today.
            </p>
          </motion.div>
        </div>

        {/* Shipment Analysis Section */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
          className="mb-8"
        >
          <div className="bg-card rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-foreground flex items-center">
                  <Container className="h-6 w-6 mr-2 text-amber-600" />
                  Kolkata DTD Container Shipment
                </h2>
                <p className="text-muted-foreground mt-1">
                  Interactive Dashboard with AI Insights | {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-muted-foreground">AI-Powered Analytics</span>
              </div>
            </div>

            {/* Shipment KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="kpi-card">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Value</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {filteredShipmentData.length > 0 ? formatCurrency(shipmentKPIs.totalValue) : '$0'}
                </p>
                <p className="text-xs text-stone-400 mt-1">
                  {shipmentKPIs.itemCount} items • {shipmentKPIs.uniqueClients.size} clients
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Items</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalItems.toLocaleString()}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Across {shipmentKPIs.uniqueSuppliers.size} suppliers
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Volume (CBM)</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalVolume.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Container capacity
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-muted-foreground mb-2">Total Weight (WT)</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalWeight.toFixed(2)}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Kg • {formatCurrency(shipmentKPIs.totalCarrying)} carrying
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-muted/30 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Filter by Client
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full border-border focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Clients</SelectItem>
                    {availableClients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-muted-foreground mb-2">
                  Filter by Supplier
                </label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="w-full border-border focus:ring-primary focus:border-primary">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Suppliers</SelectItem>
                    {availableSuppliers.map(supplier => (
                      <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Charts */}
            {shipmentLoading ? (
              <div className="flex items-center justify-center h-64 text-muted-foreground">
                <div className="loading-spinner mr-2" />
                <span>Loading shipment data...</span>
              </div>
            ) : filteredShipmentData.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Container className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                <h3 className="text-lg font-medium text-foreground mb-2">No Shipment Data</h3>
                <p className="text-sm text-muted-foreground mb-4">
                  No shipment data found. Create some orders to see analytics.
                </p>
                <Link to="/orders/create">
                  <Button className="bg-amber-600 hover:bg-amber-700 text-white">
                    Create Your First Order
                  </Button>
                </Link>
              </div>
            ) : (
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-amber-600" />
                  Value by Client
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  Distribution of container value by client
                </p>
                <div className="h-64">
                  <Doughnut
                    data={getClientChartData()}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: { position: 'bottom' },
                        tooltip: {
                          callbacks: {
                            label: (context) => {
                              const value = context.parsed
                              return `${context.label}: ${formatCurrency(value)}`
                            }
                          }
                        }
                      }
                    }}
                  />
                </div>
              </div>
              <div className="p-4 bg-muted/30 rounded-lg">
                <h3 className="text-lg font-semibold text-foreground mb-2 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-amber-600" />
                  Volume by Supplier
                </h3>
                <p className="text-sm text-muted-foreground mb-4">
                  CBM distribution by supplier
                </p>
                <div className="h-64">
                  <Bar
                    data={getSupplierChartData()}
                    options={{
                      indexAxis: 'y',
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: { legend: { display: false } },
                      scales: {
                        x: {
                          beginAtZero: true,
                          title: { display: true, text: 'Total CBM' }
                        }
                      }
                    }}
                  />
                </div>
              </div>
            </div>
            )}
          </div>
        </motion.div>

        {/* Traditional Metrics Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          {metrics.map((metric, index) => (
            <motion.div
              key={metric.title}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: index * 0.1 }}
            >
              <div className="bg-card rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-muted-foreground mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-foreground">{metric.value}</p>
                    {metric.change && (
                      <p className={`text-sm font-medium ${
                        metric.changeType === 'positive' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {metric.change}
                      </p>
                    )}
                  </div>
                  <div className="p-3 rounded-lg amber-gradient">
                    <metric.icon className="h-6 w-6 text-white" />
                  </div>
                </div>
              </div>
            </motion.div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Recent Orders */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <div className="bg-card rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Recent Orders</h3>
                  <p className="text-sm text-muted-foreground">Latest order activities</p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    Refresh
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleViewAllOrders}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <Eye className="h-4 w-4 mr-1" />
                    View All
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium text-foreground">{order.id}</p>
                        <p className="text-sm text-muted-foreground">{order.client}</p>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <div className="text-right">
                        <p className="font-medium text-foreground">
                          {formatCurrency(order.value)}
                        </p>
                        <p className="text-sm text-muted-foreground capitalize">
                          {order.status.replace('_', ' ')}
                        </p>
                      </div>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem onClick={() => navigate(`/orders/${order.id}`)}>
                            <Eye className="h-4 w-4 mr-2" />
                            View Details
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => handleEditOrder(order.id)}>
                            <Edit className="h-4 w-4 mr-2" />
                            Edit Order
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem 
                            onClick={() => handleDeleteOrder(order.id)}
                            className="text-red-600"
                          >
                            <Trash2 className="h-4 w-4 mr-2" />
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p>No recent orders found</p>
                    <Button 
                      onClick={handleCreateNewOrder}
                      className="mt-3 bg-amber-600 hover:bg-amber-700 text-white"
                      size="sm"
                    >
                      Create Your First Order
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>

          {/* Container Updates */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <div className="bg-card rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-foreground">Container Updates</h3>
                  <p className="text-sm text-muted-foreground">
                    Real-time container tracking 
                    {containerUpdates.length > 0 && (
                      <span className="text-primary font-medium">• {containerUpdates.length} active</span>
                    )}
                  </p>
                </div>
                <div className="flex gap-2">
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleRefreshAll}
                    disabled={refreshing}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                    {refreshing ? 'Refreshing...' : 'Refresh'}
                  </Button>
                  <Button 
                    variant="outline" 
                    size="sm" 
                    onClick={handleTrackAllContainers}
                    className="border-primary/30 text-primary hover:bg-primary/10"
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Track All
                  </Button>
                </div>
              </div>
              <div className="space-y-4">
                {containerUpdates.length > 0 ? containerUpdates.map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-4 border border-border rounded-lg hover:bg-muted/50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <div className="p-2 rounded-lg bg-primary/10">
                        <Truck className="h-5 w-5 text-primary" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <p className="font-medium text-foreground">
                            {container.displayId || container.id || 'Container ID Pending'}
                          </p>
                          {container.type && (
                            <span className="px-2 py-0.5 text-xs bg-muted text-muted-foreground rounded font-medium">
                              {container.type.toUpperCase()}
                            </span>
                          )}
                          <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                            container.status === 'arrived' ? 'bg-green-100 text-green-700' :
                            container.status === 'in_transit' ? 'bg-blue-100 text-blue-700' :
                            container.status === 'sealed' ? 'bg-amber-100 text-amber-700' :
                            container.status === 'loading' ? 'bg-orange-100 text-orange-700' :
                            container.status === 'shipped' ? 'bg-purple-100 text-purple-700' :
                            container.status === 'delivered' ? 'bg-green-100 text-green-700' :
                            'bg-stone-100 text-stone-700'
                          }`}>
                            {container.status ? container.status.replace('_', ' ').toUpperCase() : 'UNKNOWN'}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 mt-1">
                          <p className="text-sm text-muted-foreground">
                            📍 {container.location && container.location !== 'Location not available' ? container.location : 'Location pending'}
                          </p>
                          {container.type && getContainerCapacity(container.type) && (
                            <p className="text-xs text-muted-foreground">
                              📦 {getContainerCapacity(container.type)}
                            </p>
                          )}
                          {container.eta && (
                            <p className="text-sm text-muted-foreground">
                              🕒 ETA: {(() => {
                                try {
                                  const date = new Date(container.eta)
                                  if (isNaN(date.getTime())) return 'TBD'
                                  return date.toLocaleDateString('en-US', {
                                    month: 'short',
                                    day: 'numeric',
                                    year: 'numeric'
                                  })
                                } catch {
                                  return 'TBD'
                                }
                              })()}
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => handleTrackContainer(container.id)}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="View container details"
                      >
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button 
                        variant="ghost" 
                        size="sm"
                        onClick={() => window.open(`/containers/${container.id}/track`, '_blank')}
                        className="hover:bg-primary/10 hover:text-primary"
                        title="Open tracking in new tab"
                      >
                        <ExternalLink className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-muted-foreground">
                    <Container className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <h4 className="font-medium text-foreground mb-2">No container updates available</h4>
                    <p className="text-sm text-muted-foreground mb-4">
                      Container tracking data will appear here once containers are created and shipments begin.
                    </p>
                    <Button 
                      onClick={() => navigate('/containers/create')}
                      className="bg-amber-600 hover:bg-amber-700 text-white"
                      size="sm"
                    >
                      <Container className="h-4 w-4 mr-2" />
                      Create New Container
                    </Button>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        </div>

        {/* Quick Actions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.6 }}
          className="mt-8"
        >
          <div className="bg-white rounded-xl shadow-lg p-6">
            <div className="mb-6">
              <h3 className="text-lg font-semibold text-foreground">Quick Actions</h3>
              <p className="text-sm text-muted-foreground">Common tasks and shortcuts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                variant="outline" 
                onClick={handleCreateNewOrder}
                className="h-20 flex flex-col w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
              >
                <Package className="h-6 w-6 mb-2" />
                <span>Create New Order</span>
                <span className="text-xs text-muted-foreground mt-1">Start order process</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleTrackAllContainers}
                className="h-20 flex flex-col w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
              >
                <Container className="h-6 w-6 mb-2" />
                <span>Track Containers</span>
                <span className="text-xs text-muted-foreground mt-1">View all shipments</span>
              </Button>
              <Button 
                variant="outline" 
                onClick={handleViewReports}
                className="h-20 flex flex-col w-full border-primary/30 text-primary hover:bg-primary/10 hover:border-primary/30 transition-all duration-200 hover:shadow-md"
              >
                <TrendingUp className="h-6 w-6 mb-2" />
                <span>View Reports</span>
                <span className="text-xs text-muted-foreground mt-1">Financial analytics</span>
              </Button>
            </div>
            <div className="mt-4 pt-4 border-t border-border">
              <div className="flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Last updated: {new Date().toLocaleTimeString()}</span>
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={handleRefreshAll}
                  disabled={refreshing}
                  className="text-muted-foreground hover:text-primary"
                >
                  <RefreshCw className={`h-4 w-4 mr-1 ${refreshing ? 'animate-spin' : ''}`} />
                  {refreshing ? 'Refreshing...' : 'Refresh All'}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
