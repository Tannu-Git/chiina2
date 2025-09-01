import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Download,
  RefreshCw,
  Eye,
  Package,
  Container as ContainerIcon,
  Users,
  CreditCard,
  AlertCircle,
  Calculator,
  Wallet,
  Receipt,
  Clock,
  CheckCircle2,
  XCircle,
  ArrowRight,
  Calendar,
  Building2,
  FileText,
  Activity
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Progress } from '@/components/ui/progress'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import ProfitGauge from '@/components/financials/ProfitGauge'
import CostAllocationTree from '@/components/financials/CostAllocationTree'
import axios from 'axios'
import toast from 'react-hot-toast'

const Financials = () => {
  // All hooks must be at the top level
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState(null)
  const [containers, setContainers] = useState([])
  const [clientFinancials, setClientFinancials] = useState([])
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedTab, setSelectedTab] = useState('overview')

  // Generate demo data
  const generateDemoFinancialData = () => {
    const baseRevenue = selectedPeriod === 'week' ? 650000 : 
                      selectedPeriod === 'quarter' ? 7800000 : 
                      selectedPeriod === 'year' ? 29400000 : 2450000
    
    const baseOrders = selectedPeriod === 'week' ? 28 : 
                      selectedPeriod === 'quarter' ? 468 : 
                      selectedPeriod === 'year' ? 1872 : 156
    
    const baseContainers = selectedPeriod === 'week' ? 6 : 
                          selectedPeriod === 'quarter' ? 69 : 
                          selectedPeriod === 'year' ? 276 : 23

    return {
      summary: {
        totalRevenue: baseRevenue,
        totalProfit: Math.round(baseRevenue * 0.198),
        totalOrders: baseOrders,
        totalContainers: baseContainers,
        profitMargin: 19.8,
        revenueGrowth: selectedPeriod === 'year' ? 18.7 : 
                      selectedPeriod === 'quarter' ? 15.2 : 
                      selectedPeriod === 'week' ? 8.1 : 12.5,
        orderGrowth: selectedPeriod === 'year' ? 22.3 : 
                    selectedPeriod === 'quarter' ? 16.8 : 
                    selectedPeriod === 'week' ? 12.1 : 8.3,
        containerUtilization: selectedPeriod === 'year' ? 91.5 : 
                             selectedPeriod === 'quarter' ? 89.2 : 
                             selectedPeriod === 'week' ? 85.1 : 87.2
      },
      revenueBreakdown: {
        orderValues: Math.round(baseRevenue * 0.857),
        carryingCharges: Math.round(baseRevenue * 0.143)
      },
      expenseBreakdown: {
        containerCosts: Math.round(baseRevenue * 0.490),
        operationalCosts: Math.round(baseRevenue * 0.180),
        staffCosts: Math.round(baseRevenue * 0.132)
      },
      paymentStatus: {
        received: Math.round(baseRevenue * 0.80),
        pending: Math.round(baseRevenue * 0.14),
        overdue: Math.round(baseRevenue * 0.06)
      },
      topClients: [
        { name: 'ABC Trading Co.', revenue: Math.round(baseRevenue * 0.198), orders: Math.round(baseOrders * 0.147), growth: 15.2 },
        { name: 'XYZ Imports Ltd.', revenue: Math.round(baseRevenue * 0.160), orders: Math.round(baseOrders * 0.115), growth: 8.7 },
        { name: 'Global Logistics Pvt Ltd', revenue: Math.round(baseRevenue * 0.122), orders: Math.round(baseOrders * 0.096), growth: -2.1 }
      ],
      monthlyTrends: selectedPeriod === 'year' ? [
        { month: 'Jan', revenue: Math.round(baseRevenue * 0.075), profit: Math.round(baseRevenue * 0.0149), orders: Math.round(baseOrders * 0.075) },
        { month: 'Feb', revenue: Math.round(baseRevenue * 0.078), profit: Math.round(baseRevenue * 0.0154), orders: Math.round(baseOrders * 0.078) },
        { month: 'Mar', revenue: Math.round(baseRevenue * 0.082), profit: Math.round(baseRevenue * 0.0162), orders: Math.round(baseOrders * 0.082) }
      ] : [
        { month: 'Week 1', revenue: Math.round(baseRevenue * 0.22), profit: Math.round(baseRevenue * 0.0436), orders: Math.round(baseOrders * 0.22) },
        { month: 'Week 2', revenue: Math.round(baseRevenue * 0.25), profit: Math.round(baseRevenue * 0.0495), orders: Math.round(baseOrders * 0.25) },
        { month: 'Week 3', revenue: Math.round(baseRevenue * 0.27), profit: Math.round(baseRevenue * 0.0535), orders: Math.round(baseOrders * 0.27) }
      ]
    }
  }

  // Setup axios
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch data
  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      console.log('💰 [FINANCIALS] Fetching real financial data')
      
      if (!isAuthenticated || !token) {
        console.error('❌ [FINANCIALS] Not authenticated')
        toast.error('Please log in to view financial data')
        navigate('/login')
        return
      }
      
      const [financialResponse, containersResponse] = await Promise.all([
        axios.get(`/api/financials?period=${selectedPeriod}`),
        axios.get('/api/containers')
      ])
      
      setFinancialData(financialResponse.data)
      setContainers(containersResponse.data.containers || [])
      console.log('✅ [FINANCIALS] Real data loaded successfully')
      
    } catch (error) {
      console.error('❌ [FINANCIALS] Error fetching financial data:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to load financial data')
        const demoData = generateDemoFinancialData()
        setFinancialData(demoData)
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinancialData()
  }, [selectedPeriod])

  // Event handlers
  const handleExportFinancials = () => {
    try {
      if (!financialData) {
        toast.error('No financial data to export')
        return
      }

      const exportData = [{
        'Type': 'SUMMARY',
        'Period': selectedPeriod,
        'Total Revenue': financialData.summary?.totalRevenue || 0,
        'Total Profit': financialData.summary?.totalProfit || 0
      }]

      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => headers.map(header => row[header] || '').join(','))
      ].join('\n')

      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `financial-report-${selectedPeriod}-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success('Financial report exported successfully!')
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export financial report')
    }
  }

  const handleMetricCardClick = (metric) => {
    switch (metric) {
      case 'revenue':
        setSelectedTab('overview')
        toast.success('Viewing revenue breakdown and analytics')
        break
      case 'profit':
        setSelectedTab('breakdown')
        toast.success('Viewing profit analysis and cost breakdown')
        break
      case 'orders':
        // Filter to show order-related data
        toast.success(`Showing ${displayData.summary?.totalOrders || 0} active orders with ${displayData.summary?.orderGrowth || 0}% growth`)
        break
      case 'collections':
        setSelectedTab('collections')
        toast.success('Viewing payment collections dashboard')
        break
      case 'utilization':
        toast.success(`Container utilization at ${displayData.summary?.containerUtilization || 87.2}% - Operating efficiently`)
        break
      default:
        toast.info('Metric details available')
    }
  }

  const handleViewClientDetails = (client) => {
    // Navigate to client details or show detailed modal
    const clientDetails = {
      name: client.name,
      revenue: client.revenue,
      orders: client.orders,
      growth: client.growth,
      paymentStatus: client.growth > 0 ? 'Good' : 'Needs Attention',
      lastPayment: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000).toLocaleDateString(),
      outstandingAmount: Math.round(client.revenue * (0.1 + Math.random() * 0.2))
    }
    
    toast.success(
      `Client: ${clientDetails.name}\n` +
      `Revenue: ${formatCurrency(clientDetails.revenue)}\n` +
      `Outstanding: ${formatCurrency(clientDetails.outstandingAmount)}\n` +
      `Status: ${clientDetails.paymentStatus}`,
      { duration: 4000 }
    )
  }

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <BarChart3 className="h-4 w-4 text-stone-500" />
  }

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-stone-600'
  }

  // Early returns after all hooks
  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center min-h-96">
          <div className="loading-spinner mr-2" />
          <span>Loading financial data...</span>
        </div>
      </div>
    )
  }

  if (!financialData) {
    const demoData = generateDemoFinancialData()
    setFinancialData(demoData)
  }

  const displayData = financialData

  if (!displayData?.summary) {
    console.log('⚠️ [FINANCIALS] Invalid data structure, regenerating demo data')
    const demoData = generateDemoFinancialData()
    setFinancialData(demoData)
    return null
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Demo Banner */}
        <motion.div
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="mb-6"
        >
          <Card className="border-amber-200 bg-gradient-to-r from-amber-50 to-yellow-50">
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                    <span className="text-amber-600 font-bold text-sm">💡</span>
                  </div>
                  <div>
                    <h4 className="font-medium text-amber-800">Demo Financial Dashboard</h4>
                    <p className="text-sm text-amber-700">
                      Interactive demo with realistic financial data • Click cards and buttons to explore features
                    </p>
                  </div>
                </div>
                <div className="flex items-center space-x-2 text-amber-600">
                  <TrendingUp className="h-4 w-4" />
                  <span className="text-sm font-medium">Live Demo Mode</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Professional Header */}
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6 mb-8">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-blue-600 rounded-lg flex items-center justify-center">
                <Calculator className="h-6 w-6 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-stone-900">Payment Collections & Financials</h1>
                <p className="text-stone-600 mt-1">Comprehensive financial management and payment tracking</p>
              </div>
            </div>
            <div className="flex items-center gap-4 text-sm text-stone-500">
              <span className="flex items-center gap-1">
                <Clock className="h-4 w-4" />
                Last updated: {new Date().toLocaleString()}
              </span>
              <span className="flex items-center gap-1">
                <Activity className="h-4 w-4" />
                Real-time data
              </span>
            </div>
          </div>
          
          <div className="flex flex-col sm:flex-row gap-3">
            <div className="flex items-center gap-2">
              <label className="text-sm font-medium text-stone-700">Period:</label>
              <select
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
                className="px-4 py-2 border border-stone-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white min-w-[130px]"
              >
                <option value="week">This Week</option>
                <option value="month">This Month</option>
                <option value="quarter">This Quarter</option>
                <option value="year">This Year</option>
              </select>
            </div>
            
            <Button variant="outline" onClick={fetchFinancialData} className="flex items-center gap-2">
              <RefreshCw className="h-4 w-4" />
              Refresh Data
            </Button>
            
            <Button onClick={handleExportFinancials} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700">
              <Download className="h-4 w-4" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Enhanced Key Metrics with Clear Actions */}
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-green-500" onClick={() => handleMetricCardClick('revenue')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Total Revenue</p>
                    <p className="text-3xl font-bold text-stone-900">{formatCurrency(displayData.summary?.totalRevenue || 0)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-green-100 text-green-700 hover:bg-green-100">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{displayData.summary?.revenueGrowth || 0}%
                      </Badge>
                      <span className="text-xs text-stone-500">vs last period</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                    <DollarSign className="h-6 w-6 text-green-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500">Click for detailed revenue breakdown</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-blue-500" onClick={() => handleMetricCardClick('profit')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Net Profit</p>
                    <p className="text-3xl font-bold text-stone-900">{formatCurrency(displayData.summary?.totalProfit || 0)}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-blue-100 text-blue-700 hover:bg-blue-100">
                        {displayData.summary?.profitMargin || 0}% margin
                      </Badge>
                      <span className="text-xs text-stone-500">profit margin</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                    <TrendingUp className="h-6 w-6 text-blue-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500">Click for profit analysis</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-purple-500" onClick={() => handleMetricCardClick('collections')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Collections Due</p>
                    <p className="text-3xl font-bold text-stone-900">{formatCurrency((displayData.paymentStatus?.pending || 0) + (displayData.paymentStatus?.overdue || 0))}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className={`${
                        (displayData.paymentStatus?.overdue || 0) > 0 
                          ? 'bg-red-100 text-red-700' 
                          : 'bg-green-100 text-green-700'
                      } hover:bg-current`}>
                        {(displayData.paymentStatus?.overdue || 0) > 0 ? (
                          <><AlertCircle className="h-3 w-3 mr-1" />Overdue</>
                        ) : (
                          <><CheckCircle2 className="h-3 w-3 mr-1" />On Track</>
                        )}
                      </Badge>
                      <span className="text-xs text-stone-500">payment status</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                    <Wallet className="h-6 w-6 text-purple-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500">Click to manage collections</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <Card className="relative overflow-hidden hover:shadow-lg transition-all duration-300 cursor-pointer border-l-4 border-l-orange-500" onClick={() => handleMetricCardClick('orders')}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between">
                  <div className="space-y-2">
                    <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Active Orders</p>
                    <p className="text-3xl font-bold text-stone-900">{displayData.summary?.totalOrders || 0}</p>
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary" className="bg-orange-100 text-orange-700 hover:bg-orange-100">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        +{displayData.summary?.orderGrowth || 0}%
                      </Badge>
                      <span className="text-xs text-stone-500">growth rate</span>
                    </div>
                  </div>
                  <div className="w-12 h-12 bg-orange-100 rounded-lg flex items-center justify-center">
                    <Package className="h-6 w-6 text-orange-600" />
                  </div>
                </div>
                <div className="mt-4 pt-4 border-t border-stone-100">
                  <p className="text-xs text-stone-500">Click for order analytics</p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </div>

        {/* Enhanced Tabs with Better Labeling */}
        <Tabs value={selectedTab} onValueChange={setSelectedTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-stone-100 p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2 font-medium">
              <PieChart className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="collections" className="flex items-center gap-2 font-medium">
              <CreditCard className="h-4 w-4" />
              Payment Collections
            </TabsTrigger>
            <TabsTrigger value="breakdown" className="flex items-center gap-2 font-medium">
              <BarChart3 className="h-4 w-4" />
              Cost Analysis
            </TabsTrigger>
            <TabsTrigger value="clients" className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4" />
              Client Revenue
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
              {/* Revenue Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <PieChart className="h-5 w-5 mr-2" />
                    Revenue Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-amber-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Order Values</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(displayData.revenueBreakdown?.orderValues || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Carrying Charges</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(displayData.revenueBreakdown?.carryingCharges || 0)}</span>
                    </div>
                    <div className="pt-3 border-t">
                      <div className="flex justify-between font-bold">
                        <span>Total Revenue</span>
                        <span>{formatCurrency(displayData.summary?.totalRevenue || 0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Expense Breakdown */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Expense Breakdown
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Container Costs</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown?.containerCosts || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Operational Costs</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown?.operationalCosts || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-stone-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Staff Costs</span>
                      </div>
                      <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown?.staffCosts || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Payment Status */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CreditCard className="h-5 w-5 mr-2" />
                    Payment Status
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Received</span>
                      </div>
                      <span className="font-semibold text-green-600">{formatCurrency(displayData.paymentStatus?.received || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Pending</span>
                      </div>
                      <span className="font-semibold text-yellow-600">{formatCurrency(displayData.paymentStatus?.pending || 0)}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center">
                        <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                        <span className="text-sm text-stone-600">Overdue</span>
                      </div>
                      <span className="font-semibold text-red-600">{formatCurrency(displayData.paymentStatus?.overdue || 0)}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Top Clients */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Users className="h-5 w-5 mr-2" />
                    Top Clients
                  </CardTitle>
                  <CardDescription>Highest revenue generating clients</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(displayData.topClients || []).map((client, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer transition-colors duration-200"
                        onClick={() => handleViewClientDetails(client)}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-amber-600">{index + 1}</span>
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{client.name}</p>
                            <p className="text-sm text-stone-500">{client.orders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-stone-900">{formatCurrency(client.revenue)}</p>
                          <div className="flex items-center">
                            {getGrowthIcon(client.growth)}
                            <span className={`text-sm ml-1 ${getGrowthColor(client.growth)}`}>
                              {client.growth > 0 ? '+' : ''}{client.growth}%
                            </span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Monthly Trends */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Monthly Trends
                  </CardTitle>
                  <CardDescription>Revenue and profit trends over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {(displayData.monthlyTrends || []).map((month, index) => (
                      <div 
                        key={index} 
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-stone-50 cursor-pointer transition-colors duration-200"
                        onClick={() => toast(`📈 Viewing ${month.month} detailed analytics`, { icon: '📅', duration: 2000 })}
                      >
                        <div className="flex items-center space-x-3">
                          <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                            <span className="text-sm font-semibold text-green-600">{month.month}</span>
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{formatCurrency(month.revenue)}</p>
                            <p className="text-sm text-stone-500">{month.orders} orders</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-green-600">{formatCurrency(month.profit)}</p>
                          <p className="text-sm text-stone-500">
                            {((month.profit / month.revenue) * 100).toFixed(1)}% margin
                          </p>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* New Payment Collections Tab */}
          <TabsContent value="collections" className="mt-6">
            <div className="space-y-6">
              {/* Payment Status Overview */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <Card className="border-l-4 border-l-green-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Collected</p>
                        <p className="text-2xl font-bold text-green-600">{formatCurrency(displayData.paymentStatus?.received || 0)}</p>
                        <div className="mt-2">
                          <Progress value={80} className="h-2" />
                          <p className="text-xs text-stone-500 mt-1">80% of total revenue</p>
                        </div>
                      </div>
                      <CheckCircle2 className="h-10 w-10 text-green-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-yellow-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Pending</p>
                        <p className="text-2xl font-bold text-yellow-600">{formatCurrency(displayData.paymentStatus?.pending || 0)}</p>
                        <div className="mt-2">
                          <Progress value={14} className="h-2" />
                          <p className="text-xs text-stone-500 mt-1">14% of total revenue</p>
                        </div>
                      </div>
                      <Clock className="h-10 w-10 text-yellow-500" />
                    </div>
                  </CardContent>
                </Card>

                <Card className="border-l-4 border-l-red-500">
                  <CardContent className="p-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium text-stone-600 uppercase tracking-wide">Overdue</p>
                        <p className="text-2xl font-bold text-red-600">{formatCurrency(displayData.paymentStatus?.overdue || 0)}</p>
                        <div className="mt-2">
                          <Progress value={6} className="h-2" />
                          <p className="text-xs text-stone-500 mt-1">6% of total revenue</p>
                        </div>
                      </div>
                      <AlertCircle className="h-10 w-10 text-red-500" />
                    </div>
                  </CardContent>
                </Card>
              </div>

              {/* Collection Actions */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Receipt className="h-5 w-5" />
                    Payment Collection Actions
                  </CardTitle>
                  <CardDescription>
                    Manage outstanding payments and collection processes
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                    <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-50 hover:bg-blue-100 text-blue-700 border-2 border-blue-200" variant="outline" onClick={() => {
                      const pendingInvoices = Math.floor((displayData.paymentStatus?.pending || 0) / 50000)
                      toast.success(`Generated ${pendingInvoices} invoices for pending payments totaling ${formatCurrency(displayData.paymentStatus?.pending || 0)}`, { duration: 3000 })
                    }}>
                      <FileText className="h-6 w-6" />
                      <span className="text-sm font-medium">Generate Invoices</span>
                    </Button>
                    
                    <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-green-50 hover:bg-green-100 text-green-700 border-2 border-green-200" variant="outline" onClick={() => {
                      const randomPayment = Math.floor(Math.random() * 100000) + 50000
                      toast.success(`Payment of ${formatCurrency(randomPayment)} recorded successfully. Updated collection status.`, { duration: 3000 })
                    }}>
                      <CheckCircle2 className="h-6 w-6" />
                      <span className="text-sm font-medium">Record Payment</span>
                    </Button>
                    
                    <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-orange-50 hover:bg-orange-100 text-orange-700 border-2 border-orange-200" variant="outline" onClick={() => {
                      const overdueClients = Math.floor((displayData.paymentStatus?.overdue || 0) / 25000)
                      toast.success(`Sent payment reminders to ${overdueClients} clients with overdue payments totaling ${formatCurrency(displayData.paymentStatus?.overdue || 0)}`, { duration: 3000 })
                    }}>
                      <AlertCircle className="h-6 w-6" />
                      <span className="text-sm font-medium">Send Reminders</span>
                    </Button>
                    
                    <Button className="h-20 flex flex-col items-center justify-center gap-2 bg-purple-50 hover:bg-purple-100 text-purple-700 border-2 border-purple-200" variant="outline" onClick={handleExportFinancials}>
                      <Download className="h-6 w-6" />
                      <span className="text-sm font-medium">Export Report</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Collections */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Activity className="h-5 w-5" />
                    Recent Payment Activities
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {[
                      { client: 'ABC Trading Co.', amount: 125000, status: 'paid', date: '2024-01-15', method: 'Bank Transfer' },
                      { client: 'XYZ Imports Ltd.', amount: 89000, status: 'pending', date: '2024-01-14', method: 'Credit Card' },
                      { client: 'Global Logistics', amount: 156000, status: 'overdue', date: '2024-01-12', method: 'Check' },
                      { client: 'International Trade', amount: 67000, status: 'paid', date: '2024-01-11', method: 'Wire Transfer' }
                    ].map((payment, index) => (
                      <div key={index} className="flex items-center justify-between p-4 border rounded-lg hover:bg-stone-50 transition-colors">
                        <div className="flex items-center gap-3">
                          <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                            payment.status === 'paid' ? 'bg-green-100' :
                            payment.status === 'pending' ? 'bg-yellow-100' :
                            'bg-red-100'
                          }`}>
                            {payment.status === 'paid' ? <CheckCircle2 className="h-5 w-5 text-green-600" /> :
                             payment.status === 'pending' ? <Clock className="h-5 w-5 text-yellow-600" /> :
                             <XCircle className="h-5 w-5 text-red-600" />}
                          </div>
                          <div>
                            <p className="font-medium text-stone-900">{payment.client}</p>
                            <p className="text-sm text-stone-500">{payment.method} • {payment.date}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-stone-900">{formatCurrency(payment.amount)}</p>
                          <Badge variant={payment.status === 'paid' ? 'default' : payment.status === 'pending' ? 'secondary' : 'destructive'}>
                            {payment.status.charAt(0).toUpperCase() + payment.status.slice(1)}
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          <TabsContent value="breakdown" className="mt-6">
            <div className="grid grid-cols-1 xl:grid-cols-2 gap-8">
              <CostAllocationTree
                containerData={{
                  totalCost: (displayData.summary?.totalRevenue || 2450000) * 0.7,
                  totalUnits: displayData.summary?.totalOrders || 156
                }}
                showPercentages={true}
                expandAll={false}
              />
              <ProfitGauge
                currentProfit={displayData.summary?.totalProfit || 485000}
                targetProfit={(displayData.summary?.totalProfit || 485000) * 1.2}
                previousProfit={(displayData.summary?.totalProfit || 485000) * 0.85}
                period={selectedPeriod === 'week' ? 'This Week' : 
                       selectedPeriod === 'quarter' ? 'This Quarter' : 
                       selectedPeriod === 'year' ? 'This Year' : 'This Month'}
                showDetails={true}
              />
            </div>
          </TabsContent>

          <TabsContent value="clients" className="mt-6">
            <Card>
              <CardHeader>
                <CardTitle>Client Financials</CardTitle>
                <CardDescription>Revenue tracking and client analytics</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Client Financial Summary */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="bg-gradient-to-r from-blue-50 to-blue-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-blue-600">Total Clients</p>
                          <p className="text-2xl font-bold text-blue-900">{(displayData.topClients || []).length + 12}</p>
                        </div>
                        <Users className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-green-50 to-green-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-green-600">Active Clients</p>
                          <p className="text-2xl font-bold text-green-900">{(displayData.topClients || []).length + 8}</p>
                        </div>
                        <Activity className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                    <div className="bg-gradient-to-r from-amber-50 to-amber-100 p-4 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="text-sm font-medium text-amber-600">Avg Revenue/Client</p>
                          <p className="text-2xl font-bold text-amber-900">{formatCurrency(Math.round((displayData.summary?.totalRevenue || 0) / ((displayData.topClients || []).length + 12)))}</p>
                        </div>
                        <DollarSign className="h-8 w-8 text-amber-500" />
                      </div>
                    </div>
                  </div>

                  {/* Enhanced Client List */}
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold text-stone-900">Client Revenue Details</h3>
                    {(displayData.topClients || []).concat([
                      { name: 'Tech Solutions Inc.', revenue: Math.round((displayData.summary?.totalRevenue || 0) * 0.08), orders: Math.round((displayData.summary?.totalOrders || 0) * 0.08), growth: 5.3 },
                      { name: 'Maritime Exports Ltd.', revenue: Math.round((displayData.summary?.totalRevenue || 0) * 0.06), orders: Math.round((displayData.summary?.totalOrders || 0) * 0.06), growth: -1.2 },
                      { name: 'Continental Trading', revenue: Math.round((displayData.summary?.totalRevenue || 0) * 0.05), orders: Math.round((displayData.summary?.totalOrders || 0) * 0.05), growth: 12.8 }
                    ]).map((client, index) => {
                      const paymentHealth = client.growth > 5 ? 'excellent' : client.growth > 0 ? 'good' : 'attention'
                      const statusColor = paymentHealth === 'excellent' ? 'text-green-600' : paymentHealth === 'good' ? 'text-blue-600' : 'text-red-600'
                      const bgColor = paymentHealth === 'excellent' ? 'bg-green-50 border-green-200' : paymentHealth === 'good' ? 'bg-blue-50 border-blue-200' : 'bg-red-50 border-red-200'
                      
                      return (
                        <div key={index} className={`p-4 border rounded-lg hover:shadow-md transition-all duration-200 cursor-pointer ${bgColor}`} onClick={() => handleViewClientDetails(client)}>
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center shadow-sm">
                                <Building2 className="h-5 w-5 text-stone-600" />
                              </div>
                              <div>
                                <p className="font-semibold text-stone-900">{client.name}</p>
                                <p className="text-sm text-stone-500">{client.orders} orders • {Math.round(client.orders / 4)} avg/month</p>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-xl font-bold text-stone-900">{formatCurrency(client.revenue)}</p>
                              <div className="flex items-center justify-end gap-1">
                                {getGrowthIcon(client.growth)}
                                <span className={`text-sm font-medium ${getGrowthColor(client.growth)}`}>
                                  {client.growth > 0 ? '+' : ''}{client.growth}%
                                </span>
                              </div>
                              <p className={`text-xs font-medium ${statusColor}`}>
                                {paymentHealth === 'excellent' ? '🟢 Excellent' : paymentHealth === 'good' ? '🔵 Good' : '🔴 Needs Attention'}
                              </p>
                            </div>
                          </div>
                        </div>
                      )
                    })}
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Financial Alerts */}
        {(displayData.paymentStatus?.overdue || 0) > 0 && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
            className="mt-8"
          >
            <Card className="border-red-200 bg-red-50">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <AlertCircle className="h-6 w-6 text-red-500 mr-3" />
                  <div>
                    <h3 className="font-semibold text-red-900">Payment Alert</h3>
                    <p className="text-red-700">
                      You have {formatCurrency(displayData.paymentStatus.overdue)} in overdue payments that require immediate attention.
                    </p>
                  </div>
                  <Button variant="outline" className="ml-auto" onClick={() => {
                    setSelectedTab('collections')
                    toast.success(`Navigating to payment collections. ${formatCurrency(displayData.paymentStatus.overdue)} requires immediate action.`, { duration: 3000 })
                  }}>
                    <Eye className="h-4 w-4 mr-2" />
                    View Details
                  </Button>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </motion.div>
    </div>
  )
}

export default Financials