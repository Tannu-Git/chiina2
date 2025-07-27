import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  RotateCcw,
  AlertTriangle,
  Clock,
  CheckCircle,
  XCircle,
  Package,
  Truck,
  Factory,
  Eye,
  Edit,
  Trash2,
  Plus,
  Filter,
  Search,
  Calendar,
  TrendingUp,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, formatDate } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const LoopBackMonitor = ({ onCreateLoopback }) => {
  const { user } = useAuthStore()
  const [loopbackOrders, setLoopbackOrders] = useState([])
  const [loading, setLoading] = useState(true)
  const [filters, setFilters] = useState({
    status: 'all',
    reason: 'all',
    priority: 'all',
    search: ''
  })
  const [stats, setStats] = useState({
    total: 0,
    pending: 0,
    inProgress: 0,
    completed: 0,
    avgResolutionTime: 0
  })

  // Fetch loop-back orders
  const fetchLoopbackOrders = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/warehouse/loopback', {
        params: filters
      })
      setLoopbackOrders(response.data.loopbackOrders || [])
      setStats(response.data.stats || stats)
    } catch (error) {
      console.error('Error fetching loop-back orders:', error)
      toast.error('Failed to load loop-back orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchLoopbackOrders()
  }, [filters])

  const handleStatusUpdate = async (loopbackId, newStatus) => {
    try {
      await axios.patch(`/api/warehouse/loopback/${loopbackId}`, {
        status: newStatus
      })
      toast.success('Loop-back status updated')
      fetchLoopbackOrders()
    } catch (error) {
      console.error('Error updating loop-back status:', error)
      toast.error('Failed to update status')
    }
  }

  const handleDeleteLoopback = async (loopbackId) => {
    if (!confirm('Are you sure you want to delete this loop-back order?')) return
    
    try {
      await axios.delete(`/api/warehouse/loopback/${loopbackId}`)
      toast.success('Loop-back order deleted')
      fetchLoopbackOrders()
    } catch (error) {
      console.error('Error deleting loop-back:', error)
      toast.error('Failed to delete loop-back order')
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending': return 'bg-yellow-100 text-yellow-800'
      case 'in_progress': return 'bg-blue-100 text-blue-800'
      case 'completed': return 'bg-green-100 text-green-800'
      case 'cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getReasonColor = (reason) => {
    switch (reason) {
      case 'SHORTAGE': return 'bg-orange-100 text-orange-800'
      case 'DAMAGE': return 'bg-red-100 text-red-800'
      case 'QUALITY_ISSUE': return 'bg-purple-100 text-purple-800'
      case 'PARTIAL_ALLOCATION': return 'bg-blue-100 text-blue-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getPriorityColor = (priority) => {
    switch (priority) {
      case 'high': return 'bg-red-100 text-red-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-green-100 text-green-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending': return <Clock className="h-4 w-4" />
      case 'in_progress': return <Truck className="h-4 w-4" />
      case 'completed': return <CheckCircle className="h-4 w-4" />
      case 'cancelled': return <XCircle className="h-4 w-4" />
      default: return <AlertCircle className="h-4 w-4" />
    }
  }

  const filteredOrders = loopbackOrders.filter(order => {
    if (filters.status !== 'all' && order.status !== filters.status) return false
    if (filters.reason !== 'all' && order.reason !== filters.reason) return false
    if (filters.priority !== 'all' && order.priority !== filters.priority) return false
    if (filters.search && !order.orderNumber.toLowerCase().includes(filters.search.toLowerCase()) &&
        !order.originalOrderNumber.toLowerCase().includes(filters.search.toLowerCase())) return false
    return true
  })

  return (
    <div className="space-y-6">
      {/* Header with Stats */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Loop-Back Monitor</h2>
          <p className="text-gray-600">Track and manage shortage and defect orders</p>
        </div>
        <Button 
          onClick={onCreateLoopback}
          className="bg-gradient-to-r from-blue-600 to-purple-600"
        >
          <Plus className="h-4 w-4 mr-2" />
          Create Loop-back
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <RotateCcw className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Total Loop-backs</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.total}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.1 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Clock className="h-8 w-8 text-yellow-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Pending</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.pending}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.2 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <Truck className="h-8 w-8 text-blue-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">In Progress</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.inProgress}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6, delay: 0.3 }}
        >
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-green-600" />
                <div className="ml-4">
                  <p className="text-sm font-medium text-gray-600">Avg Resolution</p>
                  <p className="text-2xl font-bold text-gray-900">{stats.avgResolutionTime}d</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Filter className="h-5 w-5 mr-2" />
            Filters
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Search</label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search orders..."
                  value={filters.search}
                  onChange={(e) => setFilters(prev => ({ ...prev, search: e.target.value }))}
                  className="pl-10"
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Status</label>
              <Select value={filters.status} onValueChange={(value) => setFilters(prev => ({ ...prev, status: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="in_progress">In Progress</SelectItem>
                  <SelectItem value="completed">Completed</SelectItem>
                  <SelectItem value="cancelled">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Reason</label>
              <Select value={filters.reason} onValueChange={(value) => setFilters(prev => ({ ...prev, reason: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Reasons</SelectItem>
                  <SelectItem value="SHORTAGE">Shortage</SelectItem>
                  <SelectItem value="DAMAGE">Damage</SelectItem>
                  <SelectItem value="QUALITY_ISSUE">Quality Issue</SelectItem>
                  <SelectItem value="PARTIAL_ALLOCATION">Partial Allocation</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Priority</label>
              <Select value={filters.priority} onValueChange={(value) => setFilters(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Priorities</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                  <SelectItem value="medium">Medium</SelectItem>
                  <SelectItem value="low">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Loop-back Orders List */}
      <Card>
        <CardHeader>
          <CardTitle>Loop-back Orders ({filteredOrders.length})</CardTitle>
          <CardDescription>
            Orders created to handle shortages, damages, and quality issues
          </CardDescription>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            </div>
          ) : filteredOrders.length === 0 ? (
            <div className="text-center py-12">
              <RotateCcw className="h-16 w-16 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Loop-back Orders</h3>
              <p className="text-gray-500">No loop-back orders found matching your criteria.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {filteredOrders.map((order, index) => (
                <motion.div
                  key={order._id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  className="border rounded-lg p-4 hover:shadow-md transition-shadow"
                >
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center space-x-3">
                      {getStatusIcon(order.status)}
                      <div>
                        <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                        <p className="text-sm text-gray-500">
                          Original: {order.originalOrderNumber} • Created {formatDate(order.createdAt)}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Badge className={getStatusColor(order.status)}>
                        {order.status.replace('_', ' ')}
                      </Badge>
                      <Badge className={getReasonColor(order.reason)}>
                        {order.reason.replace('_', ' ')}
                      </Badge>
                      <Badge className={getPriorityColor(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                    <div>
                      <p className="text-sm text-gray-600">Client</p>
                      <p className="font-medium">{order.clientName}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Items</p>
                      <p className="font-medium">{order.items?.length || 0} items</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Value</p>
                      <p className="font-medium">{formatCurrency(order.totalAmount || 0)}</p>
                    </div>
                  </div>

                  {order.deadline && (
                    <div className="mb-4">
                      <div className="flex items-center text-sm">
                        <Calendar className="h-4 w-4 mr-1 text-gray-400" />
                        <span className="text-gray-600">Deadline: </span>
                        <span className={`ml-1 ${
                          new Date(order.deadline) < new Date() ? 'text-red-600 font-medium' : 'text-gray-900'
                        }`}>
                          {formatDate(order.deadline)}
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <Select
                        value={order.status}
                        onValueChange={(value) => handleStatusUpdate(order._id, value)}
                      >
                        <SelectTrigger className="w-40">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="pending">Pending</SelectItem>
                          <SelectItem value="in_progress">In Progress</SelectItem>
                          <SelectItem value="completed">Completed</SelectItem>
                          <SelectItem value="cancelled">Cancelled</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    
                    <div className="flex space-x-2">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => handleDeleteLoopback(order._id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-4 w-4 mr-1" />
                        Delete
                      </Button>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default LoopBackMonitor
