import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Download,
  Share2,
  Package,
  User,
  Calendar,
  DollarSign,
  Truck,
  MapPin,
  Clock,
  CheckCircle,
  AlertTriangle,
  FileText,
  Phone,
  Mail,
  Building,
  RotateCcw,
  Container as ContainerIcon,
  Plus,
  Eye
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, getPriorityColor, formatDate, formatDateTime } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const OrderDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [order, setOrder] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch order details
  const fetchOrder = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/orders/${id}`)
      setOrder(response.data.order)
    } catch (error) {
      console.error('Error fetching order:', error)

      let errorMessage = 'Failed to load order details'
      if (error.response?.status === 404) {
        errorMessage = 'Order not found'
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to view this order'
      }

      toast.error(errorMessage)
      navigate('/orders')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchOrder()
    }
  }, [id])

  // Use real order data from API
  const orderData = {
    _id: id,
    orderNumber: 'ORD-001234',
    clientName: 'ABC Trading Co.',
    clientContact: {
      name: 'John Smith',
      email: 'john@abctrading.com',
      phone: '+1-555-0123',
      company: 'ABC Trading Co.',
      address: '123 Business St, New York, NY 10001'
    },
    status: 'confirmed',
    priority: 'high',
    totalAmount: 125000,
    totalCarryingCharges: 8500,
    totalCartons: 45,
    totalCbm: 23.5,
    totalWeight: 1250,
    deadline: '2024-01-25',
    createdAt: '2024-01-15T10:30:00Z',
    updatedAt: '2024-01-16T14:20:00Z',
    notes: 'Urgent delivery required. Handle with care - fragile electronics.',
    items: [
      {
        _id: '1',
        itemCode: 'ELEC-001',
        description: 'High-end Electronics Components',
        quantity: 100,
        unitPrice: 850,
        totalPrice: 85000,
        unitWeight: 2.5,
        unitCbm: 0.15,
        cartons: 20,
        supplier: {
          name: 'TechSupply Inc.',
          contact: 'Mike Johnson',
          email: 'mike@techsupply.com',
          phone: '+1-555-0456'
        },
        paymentType: 'CLIENT_DIRECT',
        carryingCharge: {
          basis: 'carton',
          rate: 150,
          amount: 3000
        }
      },
      {
        _id: '2',
        itemCode: 'TEXT-002',
        description: 'Premium Textile Products',
        quantity: 50,
        unitPrice: 800,
        totalPrice: 40000,
        unitWeight: 1.8,
        unitCbm: 0.12,
        cartons: 25,
        supplier: {
          name: 'Fabric World Ltd.',
          contact: 'Sarah Wilson',
          email: 'sarah@fabricworld.com',
          phone: '+1-555-0789'
        },
        paymentType: 'THROUGH_ME',
        carryingCharge: {
          basis: 'cbm',
          rate: 200,
          amount: 1200
        }
      }
    ],
    containers: [
      {
        _id: 'cont1',
        clientFacingId: 'SHIP-ABC123',
        status: 'loading',
        allocatedCbm: 15.2,
        allocatedWeight: 800
      }
    ],
    timeline: [
      {
        date: '2024-01-15T10:30:00Z',
        action: 'Order Created',
        description: 'Order created by John Smith',
        user: 'John Smith',
        status: 'draft'
      },
      {
        date: '2024-01-15T11:45:00Z',
        action: 'Order Submitted',
        description: 'Order submitted for review',
        user: 'John Smith',
        status: 'submitted'
      },
      {
        date: '2024-01-16T09:15:00Z',
        action: 'Order Confirmed',
        description: 'Order confirmed by admin',
        user: 'Admin User',
        status: 'confirmed'
      },
      {
        date: '2024-01-16T14:20:00Z',
        action: 'Container Allocated',
        description: 'Allocated to container SHIP-ABC123',
        user: 'Warehouse Staff',
        status: 'confirmed'
      }
    ]
  }

  const displayOrder = order || null

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'confirmed':
      case 'in_progress':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'draft':
        return <Package className="h-5 w-5 text-gray-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  const handleStatusUpdate = async (newStatus) => {
    try {
      await axios.patch(`/api/orders/${id}`, { status: newStatus })
      toast.success('Order status updated successfully')
      fetchOrder()
    } catch (error) {
      console.error('Error updating order status:', error)

      let errorMessage = 'Failed to update order status'
      if (error.response?.status === 404) {
        errorMessage = 'Order not found'
        // Redirect to orders list since the order doesn't exist
        navigate('/orders')
      } else if (error.response?.status === 403) {
        errorMessage = 'You do not have permission to update this order'
      } else if (error.response?.status === 400) {
        errorMessage = error.response.data?.message || 'Invalid status update'
      }

      toast.error(errorMessage)
    }
  }

  const handleCreateLoopback = () => {
    navigate(`/orders/create?loopback=${id}`)
  }

  const handleExportOrder = () => {
    toast.success('Export functionality will be implemented')
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading order details...</span>
        </div>
      </div>
    )
  }

  if (!displayOrder) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Order not found</h3>
          <p className="text-gray-500 mb-6">The order you're looking for doesn't exist.</p>
          <Link to="/orders">
            <Button variant="gradient">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
          </Link>
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
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center space-x-4">
            <Button variant="ghost" onClick={() => navigate('/orders')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Orders
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                {getStatusIcon(displayOrder.status)}
                <h1 className="text-3xl font-bold text-gray-900">{displayOrder.orderNumber}</h1>
                <span className={`status-badge ${getStatusColor(displayOrder.status)}`}>
                  {displayOrder.status.replace('_', ' ')}
                </span>
                <span className={`status-badge ${getPriorityColor(displayOrder.priority)}`}>
                  {displayOrder.priority} priority
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                Created {formatDateTime(displayOrder.createdAt)} • Last updated {formatDateTime(displayOrder.updatedAt)}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleExportOrder}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <Button variant="outline" onClick={handleCreateLoopback}>
                <RotateCcw className="h-4 w-4 mr-2" />
                Create Loop-back
              </Button>
            )}
            <Link to={`/orders/${id}/edit`}>
              <Button variant="gradient">
                <Edit className="h-4 w-4 mr-2" />
                Edit Order
              </Button>
            </Link>
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: Package },
                { id: 'items', name: 'Items', icon: FileText },
                { id: 'containers', name: 'Containers', icon: ContainerIcon },
                { id: 'timeline', name: 'Timeline', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <tab.icon className="h-4 w-4 mr-2" />
                  {tab.name}
                </button>
              ))}
            </nav>
          </div>
        </div>

        {/* Tab Content */}
        {selectedTab === 'overview' && (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Order Summary */}
            <div className="lg:col-span-2 space-y-6">
              {/* Client Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <User className="h-5 w-5 mr-2" />
                    Client Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">{displayOrder.clientName}</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <User className="h-4 w-4 mr-2" />
                          <span>{displayOrder.clientContact?.name}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Mail className="h-4 w-4 mr-2" />
                          <a href={`mailto:${displayOrder.clientContact?.email}`} className="text-blue-600 hover:underline">
                            {displayOrder.clientContact?.email}
                          </a>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Phone className="h-4 w-4 mr-2" />
                          <a href={`tel:${displayOrder.clientContact?.phone}`} className="text-blue-600 hover:underline">
                            {displayOrder.clientContact?.phone}
                          </a>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Building className="h-4 w-4 mr-2" />
                          <span>{displayOrder.clientContact?.company}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-gray-900 mb-2">Address</h4>
                      <p className="text-sm text-gray-600">
                        {displayOrder.clientContact?.address}
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Order Details */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Order Details
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Cartons</p>
                      <p className="text-2xl font-bold text-gray-900">{displayOrder.totalCartons}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total CBM</p>
                      <p className="text-2xl font-bold text-gray-900">{displayOrder.totalCbm} m³</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Total Weight</p>
                      <p className="text-2xl font-bold text-gray-900">{displayOrder.totalWeight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-500">Deadline</p>
                      <p className="text-lg font-semibold text-gray-900">{formatDate(displayOrder.deadline)}</p>
                      <p className="text-sm text-gray-500">
                        {new Date(displayOrder.deadline) < new Date() ? (
                          <span className="text-red-500">Overdue</span>
                        ) : (
                          `${Math.ceil((new Date(displayOrder.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days left`
                        )}
                      </p>
                    </div>
                  </div>

                  {displayOrder.notes && (
                    <div className="mt-6 pt-6 border-t">
                      <h4 className="font-medium text-gray-900 mb-2">Notes</h4>
                      <p className="text-sm text-gray-600 bg-gray-50 p-3 rounded-lg">
                        {displayOrder.notes}
                      </p>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>

            {/* Financial Summary */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Financial Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="space-y-3">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Order Amount:</span>
                      <span className="font-semibold">{formatCurrency(displayOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Carrying Charges:</span>
                      <span className="font-semibold">{formatCurrency(displayOrder.totalCarryingCharges)}</span>
                    </div>
                    <div className="border-t pt-3">
                      <div className="flex justify-between text-lg font-bold">
                        <span>Grand Total:</span>
                        <span className="text-green-600">
                          {formatCurrency(displayOrder.totalAmount + displayOrder.totalCarryingCharges)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Payment Breakdown */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">Payment Types</h4>
                    <div className="space-y-2">
                      {displayOrder.items?.reduce((acc, item) => {
                        const existing = acc.find(p => p.type === item.paymentType)
                        if (existing) {
                          existing.amount += item.totalPrice
                        } else {
                          acc.push({
                            type: item.paymentType,
                            amount: item.totalPrice
                          })
                        }
                        return acc
                      }, []).map((payment, index) => (
                        <div key={index} className="flex justify-between text-sm">
                          <span className="text-gray-600">
                            {payment.type === 'CLIENT_DIRECT' ? 'Client Direct' : 'Through Me'}:
                          </span>
                          <span className="font-medium">{formatCurrency(payment.amount)}</span>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Status Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div className="pt-4 border-t">
                      <h4 className="font-medium text-gray-900 mb-3">Status Actions</h4>
                      <div className="space-y-2">
                        {displayOrder.status === 'submitted' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleStatusUpdate('confirmed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Confirm Order
                          </Button>
                        )}
                        {displayOrder.status === 'confirmed' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleStatusUpdate('in_progress')}
                          >
                            <Clock className="h-4 w-4 mr-2" />
                            Start Processing
                          </Button>
                        )}
                        {displayOrder.status === 'in_progress' && (
                          <Button
                            variant="outline"
                            size="sm"
                            className="w-full"
                            onClick={() => handleStatusUpdate('completed')}
                          >
                            <CheckCircle className="h-4 w-4 mr-2" />
                            Mark Complete
                          </Button>
                        )}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Items Tab */}
        {selectedTab === 'items' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Order Items ({displayOrder.items?.length || 0})
              </CardTitle>
              <CardDescription>Detailed breakdown of all items in this order</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-gray-200">
                      <th className="excel-header text-left">Item Code</th>
                      <th className="excel-header text-left">Description</th>
                      <th className="excel-header text-center">Qty</th>
                      <th className="excel-header text-right">Unit Price</th>
                      <th className="excel-header text-right">Total Price</th>
                      <th className="excel-header text-center">Weight</th>
                      <th className="excel-header text-center">CBM</th>
                      <th className="excel-header text-center">Cartons</th>
                      <th className="excel-header text-left">Supplier</th>
                      <th className="excel-header text-center">Payment</th>
                      <th className="excel-header text-right">Carrying Charge</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrder.items?.map((item, index) => (
                      <tr key={item._id || index} className="border-b border-gray-100 hover:bg-gray-50">
                        <td className="excel-cell font-medium">{item.itemCode}</td>
                        <td className="excel-cell">{item.description}</td>
                        <td className="excel-cell text-center">{item.quantity}</td>
                        <td className="excel-cell text-right">{formatCurrency(item.unitPrice)}</td>
                        <td className="excel-cell text-right font-semibold">{formatCurrency(item.totalPrice)}</td>
                        <td className="excel-cell text-center">{item.unitWeight} kg</td>
                        <td className="excel-cell text-center">{item.unitCbm} m³</td>
                        <td className="excel-cell text-center">{item.cartons}</td>
                        <td className="excel-cell">
                          <div>
                            <div className="font-medium">{item.supplier?.name}</div>
                            <div className="text-sm text-gray-500">
                              {item.supplier?.contact?.name || item.supplier?.contact || ''}
                            </div>
                          </div>
                        </td>
                        <td className="excel-cell text-center">
                          <span className={`status-badge ${item.paymentType === 'CLIENT_DIRECT' ? 'bg-blue-100 text-blue-800' : 'bg-green-100 text-green-800'}`}>
                            {item.paymentType === 'CLIENT_DIRECT' ? 'Client Direct' : 'Through Me'}
                          </span>
                        </td>
                        <td className="excel-cell text-right">
                          <div>
                            <div className="font-medium">{formatCurrency(item.carryingCharge?.amount || 0)}</div>
                            <div className="text-xs text-gray-500">
                              {item.carryingCharge?.rate} per {item.carryingCharge?.basis}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-50 font-semibold">
                      <td className="excel-cell" colSpan="4">TOTALS</td>
                      <td className="excel-cell text-right">{formatCurrency(displayOrder.totalAmount)}</td>
                      <td className="excel-cell text-center">{displayOrder.totalWeight} kg</td>
                      <td className="excel-cell text-center">{displayOrder.totalCbm} m³</td>
                      <td className="excel-cell text-center">{displayOrder.totalCartons}</td>
                      <td className="excel-cell" colSpan="2"></td>
                      <td className="excel-cell text-right">{formatCurrency(displayOrder.totalCarryingCharges)}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>

              {/* Supplier Summary */}
              <div className="mt-6 pt-6 border-t">
                <h4 className="font-medium text-gray-900 mb-4">Supplier Summary</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  {displayOrder.items?.reduce((acc, item) => {
                    const existing = acc.find(s => s.name === item.supplier?.name)
                    if (existing) {
                      existing.items += 1
                      existing.totalValue += item.totalPrice
                    } else {
                      acc.push({
                        name: item.supplier?.name,
                        contact: item.supplier?.contact,
                        email: item.supplier?.email,
                        phone: item.supplier?.phone,
                        items: 1,
                        totalValue: item.totalPrice
                      })
                    }
                    return acc
                  }, []).map((supplier, index) => (
                    <Card key={index} className="p-4">
                      <div className="space-y-2">
                        <h5 className="font-medium text-gray-900">{supplier.name}</h5>
                        <div className="text-sm text-gray-600">
                          <div>
                            {typeof supplier.contact === 'string'
                              ? supplier.contact
                              : supplier.contact?.name || ''}
                          </div>
                          <div>{supplier.email}</div>
                          <div>{supplier.phone}</div>
                        </div>
                        <div className="pt-2 border-t">
                          <div className="text-sm">
                            <span className="text-gray-500">{supplier.items} items • </span>
                            <span className="font-semibold">{formatCurrency(supplier.totalValue)}</span>
                          </div>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Containers Tab */}
        {selectedTab === 'containers' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <ContainerIcon className="h-5 w-5 mr-2" />
                Container Allocation
              </CardTitle>
              <CardDescription>Containers assigned to this order</CardDescription>
            </CardHeader>
            <CardContent>
              {displayOrder.containers && displayOrder.containers.length > 0 ? (
                <div className="space-y-4">
                  {displayOrder.containers.map((container, index) => (
                    <Card key={container._id || index} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <ContainerIcon className="h-6 w-6 text-blue-500" />
                          <div>
                            <h3 className="font-semibold text-gray-900">{container.clientFacingId}</h3>
                            <p className="text-sm text-gray-500">Container ID</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <span className={`status-badge ${getStatusColor(container.status)}`}>
                            {container.status}
                          </span>
                          <Link to={`/containers/${container._id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Container
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocated CBM</p>
                          <p className="text-lg font-semibold text-gray-900">{container.allocatedCbm} m³</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocated Weight</p>
                          <p className="text-lg font-semibold text-gray-900">{container.allocatedWeight} kg</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">CBM Utilization</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {((container.allocatedCbm / displayOrder.totalCbm) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Weight Utilization</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {((container.allocatedWeight / displayOrder.totalWeight) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ContainerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No containers allocated</h3>
                  <p className="text-gray-500 mb-6">This order hasn't been allocated to any containers yet.</p>
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <Button variant="gradient">
                      <Plus className="h-4 w-4 mr-2" />
                      Allocate to Container
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Timeline Tab */}
        {selectedTab === 'timeline' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Order Timeline
              </CardTitle>
              <CardDescription>Complete history of order activities and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  {displayOrder.timeline?.map((event, index) => (
                    <li key={index}>
                      <div className="relative pb-8">
                        {index !== displayOrder.timeline.length - 1 && (
                          <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-gray-200" aria-hidden="true" />
                        )}
                        <div className="relative flex space-x-3">
                          <div>
                            <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(event.status)}`}>
                              {getStatusIcon(event.status)}
                            </span>
                          </div>
                          <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                              <p className="text-sm font-medium text-gray-900">{event.action}</p>
                              <p className="text-sm text-gray-500">{event.description}</p>
                              <p className="text-xs text-gray-400 mt-1">by {event.user}</p>
                            </div>
                            <div className="whitespace-nowrap text-right text-sm text-gray-500">
                              <time dateTime={event.date}>
                                {formatDateTime(event.date)}
                              </time>
                            </div>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Add Timeline Entry (Admin/Staff only) */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-gray-900 mb-4">Add Timeline Entry</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Action
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Quality Check Completed"
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Description
                      </label>
                      <textarea
                        placeholder="Additional details about this action..."
                        rows={3}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                      />
                    </div>
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Add Entry
                    </Button>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </motion.div>
    </div>
  )
}

export default OrderDetails