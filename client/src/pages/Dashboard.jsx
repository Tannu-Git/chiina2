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
  Truck
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'

const Dashboard = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [dashboardData, setDashboardData] = useState(null)

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
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'pending':
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
      default:
        return <Package className="h-4 w-4 text-gray-500" />
    }
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      {/* Header */}
      <div className="mb-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <h1 className="text-3xl font-bold text-gray-900">
            Welcome back, {user?.name}! 👋
          </h1>
          <p className="text-gray-600 mt-2">
            Here's what's happening with your logistics operations today.
          </p>
        </motion.div>
      </div>

      {/* Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
        {metrics.map((metric, index) => (
          <motion.div
            key={metric.title}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: index * 0.1 }}
          >
            <MetricCard
              title={metric.title}
              value={metric.value}
              change={metric.change}
              changeType={metric.changeType}
              icon={metric.icon}
            />
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
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Recent Orders</CardTitle>
                <CardDescription>Latest order activities</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                View All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <p className="font-medium text-gray-900">{order.id}</p>
                        <p className="text-sm text-gray-500">{order.client}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="font-medium text-gray-900">
                        {formatCurrency(order.value)}
                      </p>
                      <p className="text-sm text-gray-500 capitalize">
                        {order.status.replace('_', ' ')}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Container Updates */}
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.6, delay: 0.5 }}
        >
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Container Updates</CardTitle>
                <CardDescription>Real-time container tracking</CardDescription>
              </div>
              <Button variant="outline" size="sm">
                Track All
              </Button>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {containerUpdates.map((container) => (
                  <div key={container.id} className="flex items-center justify-between p-4 border rounded-lg">
                    <div className="flex items-center space-x-3">
                      <Truck className="h-5 w-5 text-blue-500" />
                      <div>
                        <p className="font-medium text-gray-900">{container.id}</p>
                        <p className="text-sm text-gray-500">{container.location}</p>
                      </div>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-medium text-gray-900 capitalize">
                        {container.status.replace('_', ' ')}
                      </p>
                      <p className="text-sm text-gray-500">
                        ETA: {container.eta}
                      </p>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Quick Actions */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6, delay: 0.6 }}
        className="mt-8"
      >
        <Card>
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription>Common tasks and shortcuts</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Link to="/orders/create">
                <Button variant="outline" className="h-20 flex flex-col w-full">
                  <Package className="h-6 w-6 mb-2" />
                  Create New Order
                </Button>
              </Link>
              <Link to="/containers">
                <Button variant="outline" className="h-20 flex flex-col w-full">
                  <Container className="h-6 w-6 mb-2" />
                  Track Container
                </Button>
              </Link>
              <Link to="/financials">
                <Button variant="outline" className="h-20 flex flex-col w-full">
                  <TrendingUp className="h-6 w-6 mb-2" />
                  View Reports
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default Dashboard
