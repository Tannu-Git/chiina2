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
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
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
  const [pagination, setPagination] = useState({
    currentPage: 1,
    totalPages: 1,
    total: 0
  })

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

  // Mock data for demonstration
  const mockOrders = [
    {
      _id: '1',
      orderNumber: 'ORD-001234',
      clientName: 'ABC Trading Co.',
      status: 'confirmed',
      priority: 'high',
      totalAmount: 125000,
      totalCarryingCharges: 8500,
      totalCartons: 45,
      totalCbm: 23.5,
      totalWeight: 1250,
      deadline: '2024-01-25',
      createdAt: '2024-01-15',
      items: [
        { itemCode: 'ITEM-001', description: 'Electronics Components', quantity: 100 },
        { itemCode: 'ITEM-002', description: 'Textile Products', quantity: 50 }
      ]
    },
    {
      _id: '2',
      orderNumber: 'ORD-001235',
      clientName: 'XYZ Imports Ltd.',
      status: 'in_progress',
      priority: 'medium',
      totalAmount: 89000,
      totalCarryingCharges: 6200,
      totalCartons: 32,
      totalCbm: 18.2,
      totalWeight: 890,
      deadline: '2024-01-28',
      createdAt: '2024-01-14',
      items: [
        { itemCode: 'ITEM-003', description: 'Fashion Accessories', quantity: 75 }
      ]
    },
    {
      _id: '3',
      orderNumber: 'ORD-001236',
      clientName: 'Global Logistics Pvt Ltd',
      status: 'draft',
      priority: 'low',
      totalAmount: 156000,
      totalCarryingCharges: 11200,
      totalCartons: 67,
      totalCbm: 34.8,
      totalWeight: 1890,
      deadline: '2024-02-05',
      createdAt: '2024-01-13',
      items: [
        { itemCode: 'ITEM-004', description: 'Industrial Equipment', quantity: 25 },
        { itemCode: 'ITEM-005', description: 'Raw Materials', quantity: 150 }
      ]
    }
  ]

  const displayOrders = orders.length > 0 ? orders : mockOrders

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
        toast.error('Failed to delete order')
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

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Orders ({pagination.total || displayOrders.length})</CardTitle>
            <CardDescription>Excel-like grid for order management</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="excel-header text-left">Order #</th>
                    <th className="excel-header text-left">Client</th>
                    <th className="excel-header text-center">Status</th>
                    <th className="excel-header text-center">Priority</th>
                    <th className="excel-header text-right">Amount</th>
                    <th className="excel-header text-right">Charges</th>
                    <th className="excel-header text-center">Cartons</th>
                    <th className="excel-header text-center">CBM</th>
                    <th className="excel-header text-center">Weight</th>
                    <th className="excel-header text-center">Deadline</th>
                    <th className="excel-header text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {displayOrders.map((order, index) => (
                    <motion.tr
                      key={order._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="excel-cell">
                        <div className="flex items-center space-x-2">
                          {getStatusIcon(order.status)}
                          <Link
                            to={`/orders/${order._id}`}
                            className="font-medium text-blue-600 hover:text-blue-800"
                          >
                            {order.orderNumber}
                          </Link>
                        </div>
                      </td>
                      <td className="excel-cell">
                        <div>
                          <div className="font-medium text-gray-900">{order.clientName}</div>
                          <div className="text-sm text-gray-500">
                            {order.items?.length || 0} items
                          </div>
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <span className={`status-badge ${getStatusColor(order.status)}`}>
                          {order.status.replace('_', ' ')}
                        </span>
                      </td>
                      <td className="excel-cell text-center">
                        <span className={`status-badge ${getPriorityColor(order.priority)}`}>
                          {order.priority}
                        </span>
                      </td>
                      <td className="excel-cell text-right font-medium">
                        {formatCurrency(order.totalAmount)}
                      </td>
                      <td className="excel-cell text-right">
                        {formatCurrency(order.totalCarryingCharges)}
                      </td>
                      <td className="excel-cell text-center">
                        {order.totalCartons}
                      </td>
                      <td className="excel-cell text-center">
                        {order.totalCbm} m³
                      </td>
                      <td className="excel-cell text-center">
                        {order.totalWeight} kg
                      </td>
                      <td className="excel-cell text-center">
                        <div className="text-sm">
                          {formatDate(order.deadline)}
                        </div>
                        <div className="text-xs text-gray-500">
                          {new Date(order.deadline) < new Date() ? (
                            <span className="text-red-500">Overdue</span>
                          ) : (
                            `${Math.ceil((new Date(order.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days`
                          )}
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Link to={`/orders/${order._id}`}>
                            <Button variant="ghost" size="sm">
                              <Eye className="h-4 w-4" />
                            </Button>
                          </Link>
                          <Link to={`/orders/${order._id}/edit`}>
                            <Button variant="ghost" size="sm">
                              <Edit className="h-4 w-4" />
                            </Button>
                          </Link>
                          {(user?.role === 'admin' || user?.role === 'staff') && (
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={() => handleDeleteOrder(order._id)}
                              className="text-red-600 hover:text-red-800"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
                        </div>
                      </td>
                    </motion.tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            {pagination.totalPages > 1 && (
              <div className="flex items-center justify-between mt-6 pt-4 border-t">
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
            )}

            {/* Empty State */}
            {displayOrders.length === 0 && !loading && (
              <div className="text-center py-12">
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
            )}
          </CardContent>
        </Card>

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