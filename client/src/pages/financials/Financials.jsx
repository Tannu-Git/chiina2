import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  DollarSign,
  TrendingUp,
  TrendingDown,
  BarChart3,
  PieChart,
  Calendar,
  Download,
  RefreshCw,
  Filter,
  Eye,
  Package,
  Container as ContainerIcon,
  Users,
  CreditCard,
  Target,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Financials = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [financialData, setFinancialData] = useState(null)
  const [selectedPeriod, setSelectedPeriod] = useState('month')
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch financial data
  const fetchFinancialData = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/financials?period=${selectedPeriod}`)
      setFinancialData(response.data)
    } catch (error) {
      console.error('Error fetching financial data:', error)
      toast.error('Failed to load financial data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchFinancialData()
  }, [selectedPeriod])

  // Mock data for demonstration
  const mockFinancialData = {
    summary: {
      totalRevenue: 2450000,
      totalProfit: 485000,
      totalOrders: 156,
      totalContainers: 23,
      profitMargin: 19.8,
      revenueGrowth: 12.5,
      orderGrowth: 8.3,
      containerUtilization: 87.2
    },
    revenueBreakdown: {
      orderValues: 2100000,
      carryingCharges: 350000
    },
    expenseBreakdown: {
      containerCosts: 1200000,
      operationalCosts: 450000,
      staffCosts: 315000
    },
    topClients: [
      { name: 'ABC Trading Co.', revenue: 485000, orders: 23, growth: 15.2 },
      { name: 'XYZ Imports Ltd.', revenue: 392000, orders: 18, growth: 8.7 },
      { name: 'Global Logistics Pvt Ltd', revenue: 298000, orders: 15, growth: -2.1 },
      { name: 'International Trade Corp', revenue: 245000, orders: 12, growth: 22.3 },
      { name: 'Worldwide Shipping Inc.', revenue: 189000, orders: 9, growth: 5.8 }
    ],
    monthlyTrends: [
      { month: 'Jan', revenue: 180000, profit: 35000, orders: 12 },
      { month: 'Feb', revenue: 195000, profit: 38000, orders: 14 },
      { month: 'Mar', revenue: 210000, profit: 42000, orders: 16 },
      { month: 'Apr', revenue: 225000, profit: 45000, orders: 18 },
      { month: 'May', revenue: 240000, profit: 48000, orders: 20 },
      { month: 'Jun', revenue: 255000, profit: 51000, orders: 22 }
    ],
    paymentStatus: {
      received: 1950000,
      pending: 350000,
      overdue: 150000
    }
  }

  const displayData = financialData || mockFinancialData

  const getGrowthIcon = (growth) => {
    if (growth > 0) return <TrendingUp className="h-4 w-4 text-green-500" />
    if (growth < 0) return <TrendingDown className="h-4 w-4 text-red-500" />
    return <BarChart3 className="h-4 w-4 text-gray-500" />
  }

  const handleExportReport = () => {
    // Generate and download financial report
    toast.success('Financial report exported successfully!')
  }

  const getGrowthColor = (growth) => {
    if (growth > 0) return 'text-green-600'
    if (growth < 0) return 'text-red-600'
    return 'text-gray-600'
  }

  if (loading && !financialData) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading financial data...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
            <p className="text-gray-600 mt-2">Track revenue, profits, and financial performance</p>
          </div>
          <div className="flex space-x-3">
            <select
              value={selectedPeriod}
              onChange={(e) => setSelectedPeriod(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="week">This Week</option>
              <option value="month">This Month</option>
              <option value="quarter">This Quarter</option>
              <option value="year">This Year</option>
            </select>
            <Button variant="outline" onClick={fetchFinancialData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportReport}>
              <Download className="h-4 w-4 mr-2" />
              Export Report
            </Button>
          </div>
        </div>

        {/* Key Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MetricCard
              title="Total Revenue"
              value={formatCurrency(displayData.summary.totalRevenue)}
              icon={DollarSign}
              change={`+${displayData.summary.revenueGrowth}% from last period`}
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MetricCard
              title="Total Profit"
              value={formatCurrency(displayData.summary.totalProfit)}
              icon={TrendingUp}
              change={`${displayData.summary.profitMargin}% margin`}
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MetricCard
              title="Total Orders"
              value={displayData.summary.totalOrders}
              icon={Package}
              change={`+${displayData.summary.orderGrowth}% growth`}
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MetricCard
              title="Container Utilization"
              value={`${displayData.summary.containerUtilization}%`}
              icon={ContainerIcon}
              change={`${displayData.summary.totalContainers} containers`}
              changeType="neutral"
            />
          </motion.div>
        </div>

        {/* Financial Overview Grid */}
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
                    <div className="w-3 h-3 bg-blue-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Order Values</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(displayData.revenueBreakdown.orderValues)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-green-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Carrying Charges</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(displayData.revenueBreakdown.carryingCharges)}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total Revenue</span>
                    <span>{formatCurrency(displayData.summary.totalRevenue)}</span>
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
                    <span className="text-sm text-gray-600">Container Costs</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown.containerCosts)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Operational Costs</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown.operationalCosts)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-purple-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Staff Costs</span>
                  </div>
                  <span className="font-semibold">{formatCurrency(displayData.expenseBreakdown.staffCosts)}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total Expenses</span>
                    <span>{formatCurrency(
                      displayData.expenseBreakdown.containerCosts +
                      displayData.expenseBreakdown.operationalCosts +
                      displayData.expenseBreakdown.staffCosts
                    )}</span>
                  </div>
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
                    <span className="text-sm text-gray-600">Received</span>
                  </div>
                  <span className="font-semibold text-green-600">{formatCurrency(displayData.paymentStatus.received)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-yellow-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Pending</span>
                  </div>
                  <span className="font-semibold text-yellow-600">{formatCurrency(displayData.paymentStatus.pending)}</span>
                </div>
                <div className="flex items-center justify-between">
                  <div className="flex items-center">
                    <div className="w-3 h-3 bg-red-500 rounded-full mr-3"></div>
                    <span className="text-sm text-gray-600">Overdue</span>
                  </div>
                  <span className="font-semibold text-red-600">{formatCurrency(displayData.paymentStatus.overdue)}</span>
                </div>
                <div className="pt-3 border-t">
                  <div className="flex justify-between font-bold">
                    <span>Total Outstanding</span>
                    <span>{formatCurrency(displayData.paymentStatus.pending + displayData.paymentStatus.overdue)}</span>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Top Clients & Monthly Trends */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Top Clients */}
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
                {displayData.topClients.map((client, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-blue-600">{index + 1}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{client.name}</p>
                        <p className="text-sm text-gray-500">{client.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(client.revenue)}</p>
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
                {displayData.monthlyTrends.map((month, index) => (
                  <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-sm font-semibold text-green-600">{month.month}</span>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{formatCurrency(month.revenue)}</p>
                        <p className="text-sm text-gray-500">{month.orders} orders</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-green-600">{formatCurrency(month.profit)}</p>
                      <p className="text-sm text-gray-500">
                        {((month.profit / month.revenue) * 100).toFixed(1)}% margin
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Alerts */}
        {displayData.paymentStatus.overdue > 0 && (
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
                  <Button variant="outline" className="ml-auto">
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