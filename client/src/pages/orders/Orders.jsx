import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Download,
  RefreshCw,
  Package,
  Clock,
  CheckCircle,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate, getPriorityColor } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Orders = () => {
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [orders, setOrders] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case 'in_progress':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'confirmed':
        return <Package className="h-4 w-4 text-amber-500" />
      default:
        return <AlertTriangle className="h-4 w-4 text-stone-500" />
    }
  }

  // Fetch orders
  const fetchOrders = async () => {
    try {
      setLoading(true)
      const params = new URLSearchParams()
      if (searchTerm) params.append('search', searchTerm)
      if (statusFilter !== 'all') params.append('status', statusFilter)

      const response = await axios.get(`/api/orders?${params}`)
      setOrders(response.data.orders || [])
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

  // Filter orders
  const filteredOrders = orders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNumber?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesStatus = statusFilter === 'all' || order.status === statusFilter
    return matchesSearch && matchesStatus
  })

  if (loading) {
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
            <h1 className="text-3xl font-bold text-stone-900">Orders</h1>
            <p className="text-stone-600 mt-2">Manage and track all your orders</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchOrders}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline">
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
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
                  <Input
                    placeholder="Search orders..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
              </div>
              <div className="w-full sm:w-48">
                <Select value={statusFilter} onValueChange={setStatusFilter}>
                  <SelectTrigger>
                    <SelectValue placeholder="Filter by status" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="all">All Status</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                    <SelectItem value="submitted">Submitted</SelectItem>
                    <SelectItem value="confirmed">Confirmed</SelectItem>
                    <SelectItem value="in_progress">In Progress</SelectItem>
                    <SelectItem value="completed">Completed</SelectItem>
                    <SelectItem value="cancelled">Cancelled</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Orders Table */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-stone-300" />
                <p className="text-stone-500">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Order #</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Client</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Priority</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Amount</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Date</th>
                      <th className="text-left py-3 px-4 font-medium text-stone-700">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.map((order) => (
                      <tr key={order._id} className="border-b border-stone-100 hover:bg-stone-50">
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            <Link
                              to={`/orders/${order._id}`}
                              className="font-medium text-amber-600 hover:text-amber-800"
                            >
                              {order.orderNumber}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-stone-900">{order.clientName}</div>
                          <div className="text-sm text-stone-500">{order.items?.length || 0} items</div>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(order.status)}`}>
                            {order.status?.replace('_', ' ')}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getPriorityColor(order.priority)}`}>
                            {order.priority}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span className="font-medium">{formatCurrency(order.totalAmount)}</span>
                        </td>
                        <td className="py-3 px-4">
                          <div className="text-sm text-stone-500">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
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
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

export default Orders
