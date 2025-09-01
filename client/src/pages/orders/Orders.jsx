import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Plus,
  Search,
  Eye,
  Edit,
  Trash2,
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
  const [selectedOrders, setSelectedOrders] = useState([])
  const [selectAllChecked, setSelectAllChecked] = useState(false)

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
    // Reset selections when filters change
    setSelectedOrders([])
    setSelectAllChecked(false)
  }, [searchTerm, statusFilter])

  // Delete order
  const handleDeleteOrder = async (orderId, orderNumber) => {
    // Check if user has permission to delete
    if (user.role !== 'admin' && user.role !== 'staff') {
      toast.error('You do not have permission to delete orders')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete order ${orderNumber}? This action cannot be undone.`
    )

    if (!confirmDelete) return

    try {
      await axios.delete(`/api/orders/${orderId}`)
      toast.success(`Order ${orderNumber} deleted successfully`)
      // Refresh the orders list
      fetchOrders()
    } catch (error) {
      console.error('Error deleting order:', error)
      
      let errorMessage = 'Failed to delete order'
      if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to delete this order'
      } else if (error.response?.status === 404) {
        errorMessage = 'Order not found'
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast.error(errorMessage)
    }
  }

  // Bulk delete orders
  const handleBulkDelete = async () => {
    if (selectedOrders.length === 0) {
      toast.error('Please select orders to delete')
      return
    }

    if (user.role !== 'admin' && user.role !== 'staff') {
      toast.error('You do not have permission to delete orders')
      return
    }

    const confirmDelete = window.confirm(
      `Are you sure you want to delete ${selectedOrders.length} order(s)? This action cannot be undone.`
    )

    if (!confirmDelete) return

    try {
      // Delete orders in parallel
      const deletePromises = selectedOrders.map(orderId => 
        axios.delete(`/api/orders/${orderId}`)
      )
      
      await Promise.all(deletePromises)
      
      toast.success(`${selectedOrders.length} order(s) deleted successfully`)
      setSelectedOrders([])
      setSelectAllChecked(false)
      fetchOrders()
    } catch (error) {
      console.error('Error deleting orders:', error)
      toast.error('Failed to delete some orders. Please try again.')
    }
  }

  // Handle individual checkbox change
  const handleOrderSelect = (orderId, checked) => {
    if (checked) {
      setSelectedOrders(prev => [...prev, orderId])
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId))
      setSelectAllChecked(false)
    }
  }

  // Handle select all checkbox
  const handleSelectAll = (checked) => {
    setSelectAllChecked(checked)
    if (checked) {
      setSelectedOrders(filteredOrders.map(order => order._id))
    } else {
      setSelectedOrders([])
    }
  }

  // Export orders to CSV
  const handleExportOrders = () => {
    try {
      // Prepare CSV data
      const csvData = filteredOrders.map(order => ({
        'Order Number': order.orderNumber,
        'Client Name': order.clientName,
        'Status': order.status?.replace('_', ' '),
        'Priority': order.priority,
        'Total Amount': order.totalAmount || 0,
        'Items Count': order.items?.length || 0,
        'Total CBM': order.totalCbm || 0,
        'Total Weight': order.totalWeight || 0,
        'Container ID': order.containerId?.clientFacingId || order.containerId?.realContainerId || 'Unassigned',
        'Created Date': new Date(order.createdAt).toLocaleDateString(),
        'Updated Date': new Date(order.updatedAt).toLocaleDateString(),
        'Payment Type': order.paymentType || 'N/A',
        'Deadline': order.deadline ? new Date(order.deadline).toLocaleDateString() : 'N/A',
        'Notes': order.notes || ''
      }))

      // Convert to CSV
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header] || ''
            // Escape commas and quotes in CSV
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `orders-export-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported ${filteredOrders.length} orders to CSV`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export orders')
    }
  }

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
      <div className="px-4 sm:px-6 lg:px-8 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span className="text-muted-foreground">Loading orders...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8 bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Orders</h1>
            <p className="text-muted-foreground mt-2">Manage and track all your orders</p>
          </div>
          <div className="flex space-x-3">
            {selectedOrders.length > 0 && (user.role === 'admin' || user.role === 'staff') && (
              <Button 
                variant="outline" 
                onClick={handleBulkDelete}
                className="text-red-600 border-red-300 hover:bg-red-500/10 dark:hover:bg-red-500/10"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete Selected ({selectedOrders.length})
              </Button>
            )}
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
        <Card className="mb-6 bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground h-4 w-4" />
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
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center text-foreground">
              <Package className="h-5 w-5 mr-2" />
              Orders ({filteredOrders.length})
            </CardTitle>
          </CardHeader>
          <CardContent>
            {filteredOrders.length === 0 ? (
              <div className="text-center py-8">
                <Package className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                <p className="text-muted-foreground">No orders found</p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {(user.role === 'admin' || user.role === 'staff') && (
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground">
                          <input
                            type="checkbox"
                            checked={selectAllChecked}
                            onChange={(e) => handleSelectAll(e.target.checked)}
                            className="rounded border-border text-primary focus:ring-primary"
                          />
                        </th>
                      )}
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
                      <tr key={order._id} className="border-b border-border hover:bg-muted/50">
                        {(user.role === 'admin' || user.role === 'staff') && (
                          <td className="py-3 px-4">
                            <input
                              type="checkbox"
                              checked={selectedOrders.includes(order._id)}
                              onChange={(e) => handleOrderSelect(order._id, e.target.checked)}
                              className="rounded border-border text-primary focus:ring-primary"
                            />
                          </td>
                        )}
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            {getStatusIcon(order.status)}
                            <Link
                              to={`/orders/${order._id}`}
                              className="font-medium text-primary hover:text-primary/80"
                            >
                              {order.orderNumber}
                            </Link>
                          </div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="font-medium text-foreground">{order.clientName}</div>
                          <div className="text-sm text-muted-foreground">{order.items?.length || 0} items</div>
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
                          <div className="text-sm text-muted-foreground">{formatDate(order.createdAt)}</div>
                        </td>
                        <td className="py-3 px-4">
                          <div className="flex items-center space-x-2">
                            <Link to={`/orders/${order._id}`}>
                              <Button variant="ghost" size="sm" title="View order">
                                <Eye className="h-4 w-4" />
                              </Button>
                            </Link>
                            <Link to={`/orders/${order._id}/edit`}>
                              <Button variant="ghost" size="sm" title="Edit order">
                                <Edit className="h-4 w-4" />
                              </Button>
                            </Link>
                            {(user.role === 'admin' || user.role === 'staff') && (
                              <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={() => handleDeleteOrder(order._id, order.orderNumber)}
                                className="text-red-600 hover:text-red-800 hover:bg-red-500/10"
                                title="Delete order"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            )}
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
