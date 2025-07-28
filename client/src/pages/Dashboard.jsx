import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
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
  PieChart
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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

// Sample shipment data from design.html
const sampleShipmentData = [
  {"ITEM NO.": "KV-101", "DESCRIPTION": "FILE BAG", "PRICE": 0.3, "QTY": 480, "CTNS": 17, "T.QTY": 8160, "AMOUNT": 2448, "CBM": 0.095, "T.CBM": 1.615, "WT": 19.5, "T.WT": 331.5, "SUPPLIER": "SUJI STOCK", "CLIENT": "YOGESH", "CARRYING": 23094.5},
  {"ITEM NO.": "KI-5", "DESCRIPTION": "BELT", "PRICE": 2.1, "QTY": 360, "CTNS": 10, "T.QTY": 3600, "AMOUNT": 7560, "CBM": 0.09, "T.CBM": 0.9, "WT": 45, "T.WT": 450, "SUPPLIER": "45908", "CLIENT": "RAJESH ARORA", "CARRYING": 18000},
  {"ITEM NO.": "CH-212F", "DESCRIPTION": "16CC FOLDER DOUBLE POCKET", "PRICE": 0.81, "QTY": 600, "CTNS": 20, "T.QTY": 12000, "AMOUNT": 9720, "CBM": 0.11, "T.CBM": 2.2, "WT": 34, "T.WT": 680, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 32560},
  {"ITEM NO.": "CH-T112F WHITE", "DESCRIPTION": "25CC FOLDER SINGLE POCKET", "PRICE": 0.82, "QTY": 480, "CTNS": 20, "T.QTY": 9600, "AMOUNT": 7872, "CBM": 0.1, "T.CBM": 2, "WT": 25.5, "T.WT": 510, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 29600},
  {"ITEM NO.": "CRYSTAL-106", "DESCRIPTION": "8\" White Hex RUBBER BALL", "PRICE": 1.2, "QTY": 500, "CTNS": 25, "T.QTY": 12500, "AMOUNT": 15000, "CBM": 0.081, "T.CBM": 2.025, "WT": 34, "T.WT": 850, "SUPPLIER": "CRYSTAL", "CLIENT": "DEEPAK KOL", "CARRYING": 36550},
  {"ITEM NO.": "CRYSTAL-107", "DESCRIPTION": "9\" White Hex RUBBER BALL", "PRICE": 1.28, "QTY": 500, "CTNS": 24, "T.QTY": 12000, "AMOUNT": 15360, "CBM": 0.081, "T.CBM": 1.944, "WT": 39, "T.WT": 936, "SUPPLIER": "CRYSTAL", "CLIENT": "DEEPAK KOL", "CARRYING": 40248},
  {"ITEM NO.": null, "DESCRIPTION": "04 FLINT 2.2*7MM Black", "PRICE": 2.8, "QTY": 600, "CTNS": 24, "T.QTY": 14400, "AMOUNT": 40320, "CBM": 0.013, "T.CBM": 0.312, "WT": 25.5, "T.WT": 612, "SUPPLIER": "JAMES", "CLIENT": "DEEPAK KOL", "CARRYING": 24480},
  {"ITEM NO.": null, "DESCRIPTION": "lighter ACCESSORIES 8.3MM WHEEL", "PRICE": 180, "QTY": 2, "CTNS": 48, "T.QTY": 96, "AMOUNT": 17280, "CBM": 0.013, "T.CBM": 0.624, "WT": 20.5, "T.WT": 984, "SUPPLIER": "JAMES", "CLIENT": "YOGESH", "CARRYING": 39360}
]

const Dashboard = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)
  const [selectedClient, setSelectedClient] = useState('All')
  const [selectedSupplier, setSelectedSupplier] = useState('All')
  const [filteredShipmentData, setFilteredShipmentData] = useState(sampleShipmentData)

  // Fetch dashboard data
  const fetchDashboardData = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/dashboard')
      setDashboardData(response.data)
    } catch (error) {
      console.error('Error fetching dashboard data:', error)
      toast.error('Failed to load dashboard data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchDashboardData()
  }, [])

  // Filter shipment data based on selected client and supplier
  useEffect(() => {
    let filtered = sampleShipmentData

    if (selectedClient !== 'All') {
      filtered = filtered.filter(item => item.CLIENT === selectedClient)
    }

    if (selectedSupplier !== 'All') {
      filtered = filtered.filter(item => item.SUPPLIER === selectedSupplier)
    }

    setFilteredShipmentData(filtered)
  }, [selectedClient, selectedSupplier])

  // Get unique clients and suppliers for filters
  const clients = [...new Set(sampleShipmentData.map(item => item.CLIENT).filter(Boolean))].sort()
  const suppliers = [...new Set(sampleShipmentData.map(item => item.SUPPLIER).filter(Boolean))].sort()

  // Calculate shipment KPIs
  const shipmentKPIs = filteredShipmentData.reduce((acc, item) => ({
    totalValue: acc.totalValue + (item.AMOUNT || 0),
    totalItems: acc.totalItems + (item['T.QTY'] || 0),
    totalVolume: acc.totalVolume + (item['T.CBM'] || 0),
    totalWeight: acc.totalWeight + (item['T.WT'] || 0)
  }), { totalValue: 0, totalItems: 0, totalVolume: 0, totalWeight: 0 })

  // Prepare chart data
  const getClientChartData = () => {
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

  // Use real data or fallback to mock data
  const metrics = getMetricsWithIcons(dashboardData?.metrics)
  const recentOrders = dashboardData?.recentOrders || []
  const containerUpdates = dashboardData?.containerUpdates || []

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading dashboard...</span>
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
    <div className="min-h-screen">
      <div className="px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <h1 className="text-3xl font-bold text-stone-900">
              Welcome back, {user?.name}! 👋
            </h1>
            <p className="text-stone-600 mt-2">
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
          <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-2xl font-semibold text-stone-800 flex items-center">
                  <Container className="h-6 w-6 mr-2 text-amber-600" />
                  Kolkata DTD Container Shipment
                </h2>
                <p className="text-stone-500 mt-1">
                  Interactive Dashboard with AI Insights | {new Date().toLocaleDateString('en-US', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric'
                  })}
                </p>
              </div>
              <div className="flex items-center space-x-4">
                <Sparkles className="h-5 w-5 text-amber-500" />
                <span className="text-sm text-stone-600">AI-Powered Analytics</span>
              </div>
            </div>

            {/* Shipment KPIs */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
              <div className="kpi-card">
                <p className="text-sm font-medium text-stone-500 mb-2">Total Value</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {formatCurrency(shipmentKPIs.totalValue)}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-stone-500 mb-2">Total Items</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalItems.toLocaleString()}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-stone-500 mb-2">Total Volume (CBM)</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalVolume.toFixed(2)}
                </p>
              </div>
              <div className="kpi-card">
                <p className="text-sm font-medium text-stone-500 mb-2">Total Weight (WT)</p>
                <p className="text-2xl md:text-3xl font-bold text-amber-600">
                  {shipmentKPIs.totalWeight.toFixed(2)}
                </p>
              </div>
            </div>

            {/* Filters */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6 p-4 bg-stone-50 rounded-lg">
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Filter by Client
                </label>
                <Select value={selectedClient} onValueChange={setSelectedClient}>
                  <SelectTrigger className="w-full border-stone-300 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue placeholder="All Clients" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Clients</SelectItem>
                    {clients.map(client => (
                      <SelectItem key={client} value={client}>{client}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <label className="block text-sm font-medium text-stone-700 mb-2">
                  Filter by Supplier
                </label>
                <Select value={selectedSupplier} onValueChange={setSelectedSupplier}>
                  <SelectTrigger className="w-full border-stone-300 focus:ring-amber-500 focus:border-amber-500">
                    <SelectValue placeholder="All Suppliers" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="All">All Suppliers</SelectItem>
                    {suppliers.map(supplier => (
                      <SelectItem key={supplier} value={supplier}>{supplier}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Charts */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="p-4 bg-stone-50 rounded-lg">
                <h3 className="text-lg font-semibold text-stone-800 mb-2 flex items-center">
                  <PieChart className="h-5 w-5 mr-2 text-amber-600" />
                  Value by Client
                </h3>
                <p className="text-sm text-stone-500 mb-4">
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
              <div className="p-4 bg-stone-50 rounded-lg">
                <h3 className="text-lg font-semibold text-stone-800 mb-2 flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2 text-amber-600" />
                  Volume by Supplier
                </h3>
                <p className="text-sm text-stone-500 mb-4">
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
              <div className="bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium text-stone-500 mb-1">{metric.title}</p>
                    <p className="text-2xl font-bold text-stone-900">{metric.value}</p>
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800">Recent Orders</h3>
                  <p className="text-sm text-stone-500">Latest order activities</p>
                </div>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  View All
                </Button>
              </div>
              <div className="space-y-4">
                {recentOrders.length > 0 ? recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium text-stone-900">{order.id}</p>
                        <p className="text-sm text-stone-500">{order.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-stone-900">
                        {formatCurrency(order.value)}
                      </p>
                      <p className="text-sm text-stone-500 capitalize">
                        {order.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-stone-500">
                    <Package className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                    <p>No recent orders found</p>
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
            <div className="bg-white rounded-xl shadow-lg p-6">
              <div className="flex items-center justify-between mb-4">
                <div>
                  <h3 className="text-lg font-semibold text-stone-800">Container Updates</h3>
                  <p className="text-sm text-stone-500">Real-time container tracking</p>
                </div>
                <Button variant="outline" size="sm" className="border-amber-300 text-amber-700 hover:bg-amber-50">
                  Track All
                </Button>
              </div>
              <div className="space-y-4">
                {containerUpdates.length > 0 ? containerUpdates.map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-4 border border-stone-200 rounded-lg hover:bg-stone-50 transition-colors">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-5 w-5 text-amber-600" />
                      <div>
                        <p className="font-medium text-stone-900">{container.id}</p>
                        <p className="text-sm text-stone-500">{container.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-stone-900 capitalize">
                        {container.status.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-stone-500">
                        ETA: {container.eta}
                      </p>
                    </div>
                  </div>
                )) : (
                  <div className="text-center py-8 text-stone-500">
                    <Container className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                    <p>No container updates available</p>
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
              <h3 className="text-lg font-semibold text-stone-800">Quick Actions</h3>
              <p className="text-sm text-stone-500">Common tasks and shortcuts</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/orders/create">
                <Button variant="outline" className="h-20 flex flex-col w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-300">
                  <Package className="h-6 w-6 mb-2" />
                  Create New Order
                </Button>
              </Link>
              <Link to="/containers">
                <Button variant="outline" className="h-20 flex flex-col w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-300">
                  <Container className="h-6 w-6 mb-2" />
                  Track Container
                </Button>
              </Link>
              <Link to="/financials">
                <Button variant="outline" className="h-20 flex flex-col w-full border-amber-300 text-amber-700 hover:bg-amber-50 hover:border-amber-300">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  View Reports
                </Button>
              </Link>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  )
}

export default Dashboard
