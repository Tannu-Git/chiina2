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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
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
  const [timeline, setTimeline] = useState([])
  const [loadingTimeline, setLoadingTimeline] = useState(false)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch order timeline
  const fetchTimeline = async () => {
    try {
      setLoadingTimeline(true)
      const response = await axios.get(`/api/orders/${id}/timeline`)
      setTimeline(response.data.timeline || [])
    } catch (error) {
      console.error('Error fetching timeline:', error)
      // Don't show error toast for timeline - it's not critical
      setTimeline([])
    } finally {
      setLoadingTimeline(false)
    }
  }

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

  // Fetch timeline when timeline tab is selected
  useEffect(() => {
    if (selectedTab === 'timeline' && id && timeline.length === 0 && !loadingTimeline) {
      fetchTimeline()
    }
  }, [selectedTab, id])

  // Use real order data from API, fallback to safe defaults
  const displayOrder = order || {
    _id: id,
    orderNumber: 'Loading...',
    clientName: 'Loading...',
    status: 'draft',
    priority: 'medium',
    totalAmount: 0,
    totalCarryingCharges: 0,
    totalCartons: 0,
    totalCbm: 0,
    totalWeight: 0,
    items: [],
    containers: [],
    timeline: []
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'confirmed':
      case 'in_progress':
        return <Clock className="h-5 w-5 text-amber-500" />
      case 'draft':
        return <Package className="h-5 w-5 text-stone-500" />
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
          <Package className="h-16 w-16 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">Order not found</h3>
          <p className="text-stone-500 mb-6">The order you're looking for doesn't exist.</p>
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
                <h1 className="text-3xl font-bold text-stone-900">{displayOrder.orderNumber}</h1>
                <span className={`status-badge ${getStatusColor(displayOrder.status)}`}>
                  {displayOrder.status.replace('_', ' ')}
                </span>
                <span className={`status-badge ${getPriorityColor(displayOrder.priority)}`}>
                  {displayOrder.priority} priority
                </span>
              </div>
              <p className="text-stone-600 mt-2">
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
          <div className="border-b border-stone-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: Package },
                { id: 'items', name: 'Items', icon: FileText },
                { id: 'qc', name: 'QC Status', icon: CheckCircle },
                { id: 'containers', name: 'Containers', icon: ContainerIcon },
                { id: 'timeline', name: 'Timeline', icon: Clock }
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setSelectedTab(tab.id)}
                  className={`flex items-center py-2 px-1 border-b-2 font-medium text-sm ${
                    selectedTab === tab.id
                      ? 'border-amber-500 text-amber-600'
                      : 'border-transparent text-stone-500 hover:text-stone-700 hover:border-stone-300'
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
                      <h3 className="font-semibold text-stone-900 mb-3">{displayOrder.clientName || 'No client name'}</h3>
                      <div className="space-y-2 text-sm">
                        {displayOrder.clientContact?.name && (
                          <div className="flex items-center text-stone-600">
                            <User className="h-4 w-4 mr-2" />
                            <span>{displayOrder.clientContact.name}</span>
                          </div>
                        )}
                        {displayOrder.clientContact?.email && (
                          <div className="flex items-center text-stone-600">
                            <Mail className="h-4 w-4 mr-2" />
                            <a href={`mailto:${displayOrder.clientContact.email}`} className="text-amber-600 hover:underline">
                              {displayOrder.clientContact.email}
                            </a>
                          </div>
                        )}
                        {displayOrder.clientContact?.phone && (
                          <div className="flex items-center text-stone-600">
                            <Phone className="h-4 w-4 mr-2" />
                            <a href={`tel:${displayOrder.clientContact.phone}`} className="text-amber-600 hover:underline">
                              {displayOrder.clientContact.phone}
                            </a>
                          </div>
                        )}
                        {displayOrder.clientContact?.company && (
                          <div className="flex items-center text-stone-600">
                            <Building className="h-4 w-4 mr-2" />
                            <span>{displayOrder.clientContact.company}</span>
                          </div>
                        )}
                        {displayOrder.clientId && (
                          <div className="flex items-center text-stone-600">
                            <Package className="h-4 w-4 mr-2" />
                            <span className="text-xs bg-stone-100 px-2 py-1 rounded">ID: {displayOrder.clientId}</span>
                          </div>
                        )}
                        {!displayOrder.clientContact?.name && !displayOrder.clientContact?.email && !displayOrder.clientContact?.phone && (
                          <div className="text-stone-500 text-sm italic">
                            No additional client details available
                          </div>
                        )}
                      </div>
                    </div>
                    <div>
                      <h4 className="font-medium text-stone-900 mb-2">Contact Details</h4>
                      {displayOrder.clientContact?.address ? (
                        <p className="text-sm text-stone-600">
                          {displayOrder.clientContact.address}
                        </p>
                      ) : (
                        <p className="text-sm text-stone-500 italic">
                          No address information available
                        </p>
                      )}
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
                      <p className="text-sm font-medium text-stone-500">Total Cartons</p>
                      <p className="text-2xl font-bold text-stone-900">{displayOrder.totalCartons}</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-500">Total CBM</p>
                      <p className="text-2xl font-bold text-stone-900">{displayOrder.totalCbm} m³</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-500">Total Weight</p>
                      <p className="text-2xl font-bold text-stone-900">{displayOrder.totalWeight} kg</p>
                    </div>
                    <div>
                      <p className="text-sm font-medium text-stone-500">Deadline</p>
                      <p className="text-lg font-semibold text-stone-900">{formatDate(displayOrder.deadline)}</p>
                      <p className="text-sm text-stone-500">
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
                      <h4 className="font-medium text-stone-900 mb-2">Notes</h4>
                      <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
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
                      <span className="text-stone-600">Order Amount:</span>
                      <span className="font-semibold">{formatCurrency(displayOrder.totalAmount)}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-stone-600">Carrying Charges:</span>
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
                    <h4 className="font-medium text-stone-900 mb-3">Payment Types</h4>
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
                          <span className="text-stone-600">
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
                      <h4 className="font-medium text-stone-900 mb-3">Status Management</h4>
                      <div className="space-y-3">
                        <div>
                          <label className="block text-sm font-medium text-stone-700 mb-2">
                            Change Status
                          </label>
                          <Select 
                            value={displayOrder.status} 
                            onValueChange={(newStatus) => {
                              if (newStatus !== displayOrder.status) {
                                handleStatusUpdate(newStatus)
                              }
                            }}
                          >
                            <SelectTrigger className="w-full">
                              <SelectValue placeholder="Select status" />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="draft">Draft</SelectItem>
                              <SelectItem value="submitted">Submitted</SelectItem>
                              <SelectItem value="confirmed">Confirmed</SelectItem>
                              <SelectItem value="in_progress">In Progress</SelectItem>
                              <SelectItem value="completed">Completed</SelectItem>
                              <SelectItem value="cancelled">Cancelled</SelectItem>
                              <SelectItem value="pending">Pending</SelectItem>
                              <SelectItem value="ready">Ready</SelectItem>
                              <SelectItem value="qc_failed">QC Failed</SelectItem>
                              <SelectItem value="partial_ready">Partial Ready</SelectItem>
                              <SelectItem value="qc_partial">QC Partial</SelectItem>
                              <SelectItem value="qc_completed">QC Completed</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                        <div className="text-xs text-stone-500">
                          Current status: <span className="font-medium">{displayOrder.status.replace('_', ' ')}</span>
                        </div>
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
                    <tr className="border-b border-stone-200">
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
                      <tr key={item._id || index} className="border-b border-stone-100 hover:bg-stone-50">
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
                            <div className="text-sm text-stone-500">
                              {item.supplier?.contact?.name || item.supplier?.contact || ''}
                            </div>
                          </div>
                        </td>
                        <td className="excel-cell text-center">
                          <span className={`status-badge ${item.paymentType === 'CLIENT_DIRECT' ? 'bg-amber-100 text-amber-800' : 'bg-green-100 text-green-800'}`}>
                            {item.paymentType === 'CLIENT_DIRECT' ? 'Client Direct' : 'Through Me'}
                          </span>
                        </td>
                        <td className="excel-cell text-right">
                          <div>
                            <div className="font-medium">{formatCurrency(item.carryingCharge?.amount || 0)}</div>
                            <div className="text-xs text-stone-500">
                              {item.carryingCharge?.rate} per {item.carryingCharge?.basis}
                            </div>
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-stone-50 font-semibold">
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
                <h4 className="font-medium text-stone-900 mb-4">Supplier Summary</h4>
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
                        <h5 className="font-medium text-stone-900">{supplier.name}</h5>
                        <div className="text-sm text-stone-600">
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
                            <span className="text-stone-500">{supplier.items} items • </span>
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

        {/* QC Status Tab */}
        {selectedTab === 'qc' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <CheckCircle className="h-5 w-5 mr-2" />
                Quality Control Status
              </CardTitle>
              <CardDescription>Carton-based QC tracking and loop-back information</CardDescription>
            </CardHeader>
            <CardContent>
              {/* QC Summary */}
              <div className="mb-6">
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  {(() => {
                    const totalCartons = displayOrder.items?.reduce((sum, item) => sum + (item.cartons || 0), 0) || 0
                    const qcPassedCartons = displayOrder.items?.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0) || 0
                    const loopBackCartons = displayOrder.items?.reduce((sum, item) => sum + (item.loopBackCartons || 0), 0) || 0
                    const pendingCartons = Math.max(0, totalCartons - qcPassedCartons - loopBackCartons)
                    const qcPercentage = totalCartons > 0 ? (qcPassedCartons / totalCartons) * 100 : 0
                    
                    return (
                      <>
                        <div className="text-center p-4 border rounded-lg bg-stone-50">
                          <div className="text-2xl font-bold text-stone-900">{totalCartons}</div>
                          <div className="text-sm text-stone-600">Total Cartons</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-green-50 border-green-200">
                          <div className="text-2xl font-bold text-green-700">{qcPassedCartons}</div>
                          <div className="text-sm text-green-600">QC Passed</div>
                          <div className="text-xs text-green-500">{qcPercentage.toFixed(1)}%</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-orange-50 border-orange-200">
                          <div className="text-2xl font-bold text-orange-700">{loopBackCartons}</div>
                          <div className="text-sm text-orange-600">Loop-back</div>
                          <div className="text-xs text-orange-500">{totalCartons > 0 ? ((loopBackCartons / totalCartons) * 100).toFixed(1) : 0}%</div>
                        </div>
                        <div className="text-center p-4 border rounded-lg bg-amber-50 border-amber-200">
                          <div className="text-2xl font-bold text-amber-700">{pendingCartons}</div>
                          <div className="text-sm text-amber-600">Pending QC</div>
                          <div className="text-xs text-amber-500">{totalCartons > 0 ? ((pendingCartons / totalCartons) * 100).toFixed(1) : 0}%</div>
                        </div>
                      </>
                    )
                  })()}
                </div>
              </div>

              {/* QC Progress Bar */}
              <div className="mb-6">
                <div className="flex justify-between text-sm text-stone-600 mb-2">
                  <span>Overall QC Progress</span>
                  <span>
                    {(() => {
                      const totalCartons = displayOrder.items?.reduce((sum, item) => sum + (item.cartons || 0), 0) || 0
                      const qcPassedCartons = displayOrder.items?.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0) || 0
                      const loopBackCartons = displayOrder.items?.reduce((sum, item) => sum + (item.loopBackCartons || 0), 0) || 0
                      const processedCartons = qcPassedCartons + loopBackCartons
                      return `${processedCartons} / ${totalCartons} cartons processed`
                    })()}
                  </span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                  <div className="h-full flex">
                    {(() => {
                      const totalCartons = displayOrder.items?.reduce((sum, item) => sum + (item.cartons || 0), 0) || 0
                      const qcPassedCartons = displayOrder.items?.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0) || 0
                      const loopBackCartons = displayOrder.items?.reduce((sum, item) => sum + (item.loopBackCartons || 0), 0) || 0
                      const qcPercentage = totalCartons > 0 ? (qcPassedCartons / totalCartons) * 100 : 0
                      const loopBackPercentage = totalCartons > 0 ? (loopBackCartons / totalCartons) * 100 : 0
                      
                      return (
                        <>
                          <div 
                            className="bg-green-500 transition-all duration-300"
                            style={{ width: `${qcPercentage}%` }}
                          ></div>
                          <div 
                            className="bg-orange-500 transition-all duration-300"
                            style={{ width: `${loopBackPercentage}%` }}
                          ></div>
                        </>
                      )
                    })()}
                  </div>
                </div>
                <div className="flex justify-between text-xs mt-1">
                  <span className="text-green-600">✓ QC Passed</span>
                  <span className="text-orange-600">⚠ Loop-back</span>
                  <span className="text-stone-500">⏳ Pending</span>
                </div>
              </div>

              {/* Item-level QC Details */}
              <div className="overflow-x-auto">
                <h4 className="font-medium text-stone-900 mb-4">Item-level QC Details</h4>
                <table className="w-full border-collapse">
                  <thead>
                    <tr className="border-b border-stone-200">
                      <th className="excel-header text-left">Item Code</th>
                      <th className="excel-header text-left">Description</th>
                      <th className="excel-header text-center">Total Cartons</th>
                      <th className="excel-header text-center">QC Passed</th>
                      <th className="excel-header text-center">Loop-back</th>
                      <th className="excel-header text-center">Pending</th>
                      <th className="excel-header text-center">QC Status</th>
                      <th className="excel-header text-center">Progress</th>
                    </tr>
                  </thead>
                  <tbody>
                    {displayOrder.items?.map((item, index) => {
                      const totalCartons = item.cartons || 0
                      const qcPassedCartons = item.qcPassedCartons || 0
                      const loopBackCartons = item.loopBackCartons || 0
                      const pendingCartons = Math.max(0, totalCartons - qcPassedCartons - loopBackCartons)
                      const qcPercentage = totalCartons > 0 ? (qcPassedCartons / totalCartons) * 100 : 0
                      const loopBackPercentage = totalCartons > 0 ? (loopBackCartons / totalCartons) * 100 : 0
                      
                      // Determine QC status based on carton progress
                      let qcStatus = 'pending'
                      let statusColor = 'bg-stone-100 text-stone-800'
                      
                      if (qcPassedCartons === totalCartons) {
                        qcStatus = 'completed'
                        statusColor = 'bg-green-100 text-green-800'
                      } else if (qcPassedCartons > 0 || loopBackCartons > 0) {
                        qcStatus = 'partial'
                        statusColor = 'bg-amber-100 text-amber-800'
                      }
                      
                      return (
                        <tr key={item._id || index} className="border-b border-stone-100 hover:bg-stone-50">
                          <td className="excel-cell font-medium">{item.itemCode}</td>
                          <td className="excel-cell max-w-xs truncate" title={item.description}>{item.description}</td>
                          <td className="excel-cell text-center">{totalCartons}</td>
                          <td className="excel-cell text-center">
                            <span className="text-green-700 font-medium">{qcPassedCartons}</span>
                            <div className="text-xs text-green-600">{qcPercentage.toFixed(1)}%</div>
                          </td>
                          <td className="excel-cell text-center">
                            <span className="text-orange-700 font-medium">{loopBackCartons}</span>
                            <div className="text-xs text-orange-600">{loopBackPercentage.toFixed(1)}%</div>
                          </td>
                          <td className="excel-cell text-center">
                            <span className="text-stone-700 font-medium">{pendingCartons}</span>
                          </td>
                          <td className="excel-cell text-center">
                            <span className={`status-badge ${statusColor}`}>
                              {qcStatus.toUpperCase()}
                            </span>
                          </td>
                          <td className="excel-cell text-center">
                            <div className="w-full bg-stone-200 rounded-full h-2 overflow-hidden">
                              <div className="h-full flex">
                                <div 
                                  className="bg-green-500 transition-all duration-300"
                                  style={{ width: `${qcPercentage}%` }}
                                ></div>
                                <div 
                                  className="bg-orange-500 transition-all duration-300"
                                  style={{ width: `${loopBackPercentage}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="text-xs text-stone-500 mt-1">
                              {(qcPassedCartons + loopBackCartons)} / {totalCartons}
                            </div>
                          </td>
                        </tr>
                      )
                    }) || (
                      <tr>
                        <td colSpan="8" className="excel-cell text-center text-stone-500 py-8">
                          No items available for QC tracking
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              {/* QC Notes and Timeline */}
              {(displayOrder.qcCompletedAt || displayOrder.qcNotes) && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-stone-900 mb-4">QC Information</h4>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {displayOrder.qcCompletedAt && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                        <div className="flex items-center text-green-800 mb-2">
                          <CheckCircle className="h-5 w-5 mr-2" />
                          <span className="font-medium">QC Completed</span>
                        </div>
                        <p className="text-sm text-green-700">
                          {formatDateTime(displayOrder.qcCompletedAt)}
                        </p>
                        {displayOrder.qcInspectorName && (
                          <p className="text-xs text-green-600 mt-1">
                            Inspector: {displayOrder.qcInspectorName}
                          </p>
                        )}
                      </div>
                    )}
                    {displayOrder.qcNotes && (
                      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
                        <div className="flex items-center text-amber-800 mb-2">
                          <FileText className="h-5 w-5 mr-2" />
                          <span className="font-medium">QC Notes</span>
                        </div>
                        <p className="text-sm text-amber-700">
                          {displayOrder.qcNotes}
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Loop-back Summary */}
              {(() => {
                const loopBackItems = displayOrder.items?.filter(item => (item.loopBackCartons || 0) > 0) || []
                if (loopBackItems.length === 0) return null
                
                return (
                  <div className="mt-6 pt-6 border-t">
                    <h4 className="font-medium text-stone-900 mb-4 flex items-center">
                      <RotateCcw className="h-5 w-5 mr-2 text-orange-600" />
                      Loop-back Items ({loopBackItems.length})
                    </h4>
                    <div className="bg-orange-50 border border-orange-200 rounded-lg p-4">
                      <p className="text-sm text-orange-800 mb-3">
                        The following items have cartons allocated for loop-back delivery:
                      </p>
                      <div className="space-y-2">
                        {loopBackItems.map((item, index) => (
                          <div key={index} className="flex justify-between items-center text-sm">
                            <span className="text-orange-700 font-medium">{item.itemCode}</span>
                            <div className="text-orange-600">
                              {item.loopBackCartons} cartons
                              {item.loopBackReason && (
                                <span className="text-xs text-orange-500 ml-2">({item.loopBackReason})</span>
                              )}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-3 pt-3 border-t border-orange-200">
                        <p className="text-xs text-orange-600">
                          Total loop-back cartons: {loopBackItems.reduce((sum, item) => sum + (item.loopBackCartons || 0), 0)}
                        </p>
                      </div>
                    </div>
                  </div>
                )
              })()}
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
                          <ContainerIcon className="h-6 w-6 text-amber-500" />
                          <div>
                            <h3 className="font-semibold text-stone-900">{container.clientFacingId}</h3>
                            <p className="text-sm text-stone-500">Container ID</p>
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
                          <p className="text-sm font-medium text-stone-500">Allocated CBM</p>
                          <p className="text-lg font-semibold text-stone-900">{container.allocatedCbm} m³</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-500">Allocated Weight</p>
                          <p className="text-lg font-semibold text-stone-900">{container.allocatedWeight} kg</p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-500">CBM Utilization</p>
                          <p className="text-lg font-semibold text-stone-900">
                            {((container.allocatedCbm / displayOrder.totalCbm) * 100).toFixed(1)}%
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-stone-500">Weight Utilization</p>
                          <p className="text-lg font-semibold text-stone-900">
                            {((container.allocatedWeight / displayOrder.totalWeight) * 100).toFixed(1)}%
                          </p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <ContainerIcon className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-2">No containers allocated</h3>
                  <p className="text-stone-500 mb-6">This order hasn't been allocated to any containers yet.</p>
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
              {loadingTimeline ? (
                <div className="flex items-center justify-center py-8">
                  <div className="animate-spin h-6 w-6 border-2 border-amber-500 border-t-transparent rounded-full mr-3"></div>
                  <span className="text-stone-600">Loading timeline...</span>
                </div>
              ) : timeline && timeline.length > 0 ? (
                <div className="flow-root">
                  <ul className="-mb-8">
                    {timeline.map((event, index) => (
                      <li key={index}>
                        <div className="relative pb-8">
                          {index !== timeline.length - 1 && (
                            <span className="absolute top-4 left-4 -ml-px h-full w-0.5 bg-stone-200" aria-hidden="true" />
                          )}
                          <div className="relative flex space-x-3">
                            <div>
                              <span className={`h-8 w-8 rounded-full flex items-center justify-center ring-8 ring-white ${getStatusColor(event.status || 'draft')}`}>
                                {getStatusIcon(event.status || 'draft')}
                              </span>
                            </div>
                            <div className="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                              <div>
                                <p className="text-sm font-medium text-stone-900">{event.action || event.description}</p>
                                <p className="text-sm text-stone-500">{event.description}</p>
                                <p className="text-xs text-stone-400 mt-1">by {event.user || event.performedByName || 'System'}</p>
                              </div>
                              <div className="whitespace-nowrap text-right text-sm text-stone-500">
                                <time dateTime={event.date || event.createdAt}>
                                  {formatDateTime(event.date || event.createdAt)}
                                </time>
                              </div>
                            </div>
                          </div>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              ) : (
                <div className="text-center py-12">
                  <Clock className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-2">No timeline available</h3>
                  <p className="text-stone-500">Timeline tracking will appear here as order progresses</p>
                </div>
              )}

              {/* Add Timeline Entry (Admin/Staff only) */}
              {(user?.role === 'admin' || user?.role === 'staff') && (
                <div className="mt-6 pt-6 border-t">
                  <h4 className="font-medium text-stone-900 mb-4">Add Timeline Entry</h4>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Action
                      </label>
                      <input
                        type="text"
                        placeholder="e.g., Quality Check Completed"
                        className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-stone-700 mb-2">
                        Description
                      </label>
                      <textarea
                        placeholder="Additional details about this action..."
                        rows={3}
                        className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
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