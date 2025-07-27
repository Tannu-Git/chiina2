import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, useNavigate } from 'react-router-dom'
import {
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Trash2,
  Download,
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle,
  MoreHorizontal,
  DollarSign,
  TrendingUp,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
import UniversalDataDisplay from '@/components/ui/UniversalDataDisplay'
import DataLoopManager from '@/components/ui/DataLoopManager'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate, getPriorityColor } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Orders = () => {
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [priorityFilter, setPriorityFilter] = useState('all')
  const [currentDisplayData, setCurrentDisplayData] = useState([])
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  })

  // Data sources for looping
  const dataSources = [
    {
      name: 'All Orders',
      icon: Package,
      description: 'Complete order list',
      getData: () => displayOrders,
      color: 'blue'
    },
    {
      name: 'High Value Orders',
      icon: DollarSign,
      description: 'Orders above average value',
      getData: () => {
        const avgValue = displayOrders.reduce((sum, order) => sum + order.totalAmount, 0) / displayOrders.length
        return displayOrders.filter(order => order.totalAmount > avgValue)
      },
      color: 'yellow'
    },
    {
      name: 'Recent Orders',
      icon: TrendingUp,
      description: 'Latest 10 orders',
      getData: () => displayOrders.slice(0, 10),
      color: 'green'
    },
    {
      name: 'Priority Orders',
      icon: AlertTriangle,
      description: 'High priority orders',
      getData: () => displayOrders.filter(order => order.priority === 'high' || order.priority === 'urgent'),
      color: 'red'
    },
    {
      name: 'In Progress',
      icon: Clock,
      description: 'Active orders',
      getData: () => displayOrders.filter(order => order.status === 'in_progress' || order.status === 'confirmed'),
      color: 'purple'
    }
  ]

  // Column configuration for the universal display
  const orderColumns = [
    {
      key: 'orderNumber',
      label: 'Order #',
      render: (value, item) => (
        <div className="flex items-center space-x-2">
          {getStatusIcon(item.status)}
          <Link
            to={`/orders/${item._id}`}
            className="font-medium text-blue-600 hover:text-blue-800"
          >
            {value}
          </Link>
        </div>
      )
    },
    {
      key: 'clientName',
      label: 'Client',
      render: (value, item) => (
        <div>
          <div className="font-medium text-gray-900">{value}</div>
          <div className="text-sm text-gray-500">
            {item.items?.length || 0} items
          </div>
        </div>
      )
    },
    {
      key: 'status',
      label: 'Status',
      render: (value) => (
        <span className={`status-badge ${getStatusColor(value)}`}>
          {value.replace('_', ' ')}
        </span>
      )
    },
    {
      key: 'priority',
      label: 'Priority',
      render: (value) => (
        <span className={`status-badge ${getPriorityColor(value)}`}>
          {value}
        </span>
      )
    },
    {
      key: 'totalAmount',
      label: 'Amount',
      render: (value) => (
        <span className="font-medium">{formatCurrency(value)}</span>
      )
    },
    {
      key: 'totalCarryingCharges',
      label: 'Charges',
      render: (value) => formatCurrency(value)
    },
    {
      key: 'deadline',
      label: 'Deadline',
      render: (value) => (
        <div className="text-sm">
          {formatDate(value)}
          <div className="text-xs text-gray-500">
            {new Date(value) < new Date() ? (
              <span className="text-red-500">Overdue</span>
            ) : (
              `${Math.ceil((new Date(value) - new Date()) / (1000 * 60 * 60 * 24))} days`
            )}
          </div>
        </div>
      )
    },
    {
      key: 'actions',
      label: 'Actions',
      render: (_, item) => (
        <div className="flex items-center justify-center space-x-1">
          <Link to={`/orders/${item._id}`}>
            <Button variant="ghost" size="sm">
              <Eye className="h-4 w-4" />
            </Button>
          </Link>
          <Link to={`/orders/${item._id}/edit`}>
            <Button variant="ghost" size="sm">
              <Edit className="h-4 w-4" />
            </Button>
          </Link>
          {(user?.role === 'admin' || user?.role === 'staff') && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleDeleteOrder(item._id)}
              className="text-red-600 hover:text-red-800"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          )}
        </div>
      )
    }
  ]

  // Fetch orders
  const fetchOrders = async (page = 1) => {
    try {
      setLoading(true)
      const params = new URLSearchParams({
        page: page.toString(),
        limit: '10'
      })

      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await axios.get(`/api/orders?${params}`)
      setOrders(response.data.orders)
      setPagination({
        currentPage: response.data.currentPage,
        totalPages: response.data.totalPages,
        total: response.data.total
      })
    } catch (error) {
      console.error('Error fetching orders:', error)
      toast.error('Failed to load orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchOrders()
  }, [searchTerm, statusFilter])



  const displayOrders = orders // Remove mock data fallback

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
      case 'confirmed':
        return <Clock className="h-4 w-4 text-blue-500" />
      case 'draft':
        return <Package className="h-4 w-4 text-gray-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-yellow-500" />
    }
  }

  const handleDeleteOrder = async (orderId) => {
    if (window.confirm('Are you sure you want to delete this order?')) {
      try {
        await axios.delete(`/api/orders/${orderId}`)
        toast.success('Order deleted successfully')
        fetchOrders()
      } catch (error) {
        console.error('Error deleting order:', error)

        let errorMessage = 'Failed to delete order'
        if (error.response?.status === 404) {
          errorMessage = 'Order not found. It may have already been deleted.'
          // Refresh the orders list to reflect current state
          fetchOrders()
        } else if (error.response?.status === 403) {
          errorMessage = 'You do not have permission to delete this order'
        }

        toast.error(errorMessage)
      }
    }
  }

  const handleExportOrders = () => {
    toast.success('Export functionality will be implemented')
  }

  if (loading && orders.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading orders...</span>
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
            <h1 className="text-3xl font-bold text-gray-900">Orders</h1>
            <p className="text-gray-600 mt-2">Manage and track all your orders</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportOrders}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Link to="/orders/create">
              <Button variant="gradient" size="lg">
                <Plus className="h-5 w-5 mr-2" />
                Create Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  placeholder="Search orders..."
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
                  <option value="draft">Draft</option>
                  <option value="submitted">Submitted</option>
                  <option value="confirmed">Confirmed</option>
                  <option value="in_progress">In Progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
                <select
                  value={priorityFilter}
                  onChange={(e) => setPriorityFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Priority</option>
                  <option value="low">Low</option>
                  <option value="medium">Medium</option>
                  <option value="high">High</option>
                  <option value="urgent">Urgent</option>
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
          data={currentDisplayData.length > 0 ? currentDisplayData : displayOrders}
          title="Orders Management"
          columns={orderColumns}
          onItemClick={(order) => navigate(`/orders/${order._id}`)}
          enableLoop={true}
          enableAutoSwitch={true}
          className="mb-8"
        />

        {/* Pagination */}
        {pagination.totalPages > 1 && (
          <Card className="mb-6">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="text-sm text-gray-500">
                  Showing {((pagination.currentPage - 1) * 10) + 1} to {Math.min(pagination.currentPage * 10, pagination.total)} of {pagination.total} orders
                </div>
                <div className="flex space-x-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOrders(pagination.currentPage - 1)}
                    disabled={pagination.currentPage === 1}
                  >
                    Previous
                  </Button>
                  {Array.from({ length: pagination.totalPages }, (_, i) => i + 1)
                    .filter(page =>
                      page === 1 ||
                      page === pagination.totalPages ||
                      Math.abs(page - pagination.currentPage) <= 1
                    )
                    .map((page, index, array) => (
                      <React.Fragment key={page}>
                        {index > 0 && array[index - 1] !== page - 1 && (
                          <span className="px-2 py-1 text-gray-500">...</span>
                        )}
                        <Button
                          variant={page === pagination.currentPage ? "default" : "outline"}
                          size="sm"
                          onClick={() => fetchOrders(page)}
                        >
                          {page}
                        </Button>
                      </React.Fragment>
                    ))}
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => fetchOrders(pagination.currentPage + 1)}
                    disabled={pagination.currentPage === pagination.totalPages}
                  >
                    Next
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Empty State */}
        {displayOrders.length === 0 && !loading && (
          <Card>
            <CardContent className="p-12">
              <div className="text-center">
                <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No orders found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first order'}
                </p>
                <Link to="/orders/create">
                  <Button variant="gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Create First Order
                  </Button>
                </Link>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Quick Stats */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mt-8">
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{displayOrders.length}</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayOrders.filter(o => o.status === 'in_progress').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <CheckCircle className="h-8 w-8 text-green-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Completed</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayOrders.filter(o => o.status === 'completed').length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <AlertTriangle className="h-8 w-8 text-red-500" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-500">Overdue</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {displayOrders.filter(o => new Date(o.deadline) < new Date()).length}
                  </p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

export default Orders