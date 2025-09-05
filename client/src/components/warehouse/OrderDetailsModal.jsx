import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  X,
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
  Container as ContainerIcon,
  Edit,
  Eye,
  Download,
  RotateCcw
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency, getStatusColor, getPriorityColor, formatDate, formatDateTime } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const OrderDetailsModal = ({ orderId, isOpen, onClose, onStartQC, onCreateLoopback, onAllocateContainer }) => {
  const [loading, setLoading] = useState(false)
  const [order, setOrder] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch order details
  const fetchOrder = async () => {
    if (!orderId || !isOpen) return
    
    try {
      setLoading(true)
      const response = await axios.get(`/api/orders/${orderId}`)
      setOrder(response.data.order)
    } catch (error) {
      console.error('Error fetching order:', error)
      toast.error('Failed to load order details')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (isOpen && orderId) {
      fetchOrder()
    }
  }, [isOpen, orderId])

  // Reset state when modal closes
  useEffect(() => {
    if (!isOpen) {
      setOrder(null)
      setSelectedTab('overview')
    }
  }, [isOpen])

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="h-5 w-5 text-green-500" />
      case 'confirmed':
      case 'in_progress':
      case 'ready':
        return <Clock className="h-5 w-5 text-amber-500" />
      case 'draft':
        return <Package className="h-5 w-5 text-stone-500" />
      default:
        return <AlertTriangle className="h-5 w-5 text-yellow-500" />
    }
  }

  if (!isOpen) return null

  return (
    <AnimatePresence>
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
        <motion.div
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.95 }}
          className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
        >
          {/* Header */}
          <div className="bg-gradient-to-r from-slate-700 to-slate-800 text-white p-6">
            <div className="flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-3">
                  {order && getStatusIcon(order.status)}
                  <h2 className="text-2xl font-bold">
                    {order ? order.orderNumber : 'Loading...'}
                  </h2>
                  {order && (
                    <>
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {order.status.replace('_', ' ').toUpperCase()}
                      </Badge>
                      {order.isLoopBack && (
                        <Badge variant="outline" className="bg-orange-100 text-orange-800 border-orange-300">
                          Loop-back ({order.loopBackReason})
                        </Badge>
                      )}
                      <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                        {order.priority.toUpperCase()} priority
                      </Badge>
                    </>
                  )}
                </div>
                <p className="text-slate-200 mt-2">
                  {order ? (
                    <>
                      {order.clientName}
                      {order.isLoopBack && order.parentOrderId && (
                        <span className="text-orange-200"> • Return/Replacement Order</span>
                      )}
                    </>
                  ) : (
                    'Loading order details...'
                  )}
                </p>
              </div>
              <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20 p-2 rounded-lg">
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>

          {loading ? (
            <div className="p-8 flex items-center justify-center">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-600 mr-3"></div>
              <span>Loading order details...</span>
            </div>
          ) : order ? (
            <div className="flex-1 overflow-hidden">
              {/* Tab Navigation */}
              <div className="border-b border-stone-200 px-6">
                <nav className="-mb-px flex space-x-8">
                  {[
                    { id: 'overview', name: 'Overview', icon: Package },
                    { id: 'items', name: 'Items', icon: FileText },
                    { id: 'logistics', name: 'Logistics', icon: Truck }
                  ].map((tab) => (
                    <button
                      key={tab.id}
                      onClick={() => setSelectedTab(tab.id)}
                      className={`flex items-center py-3 px-1 border-b-2 font-medium text-sm transition-all duration-200 ${
                        selectedTab === tab.id
                          ? 'border-slate-500 text-slate-700'
                          : 'border-transparent text-stone-500 hover:text-slate-600 hover:border-slate-300'
                      }`}
                    >
                      <tab.icon className="h-4 w-4 mr-2" />
                      {tab.name}
                    </button>
                  ))}
                </nav>
              </div>

              {/* Tab Content */}
              <div className="p-6 h-[60vh] overflow-y-auto">
                {selectedTab === 'overview' && (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {/* Order Summary */}
                    <div className="space-y-4">
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <Package className="h-5 w-5 mr-2" />
                            Order Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                          <div className="grid grid-cols-2 gap-4">
                            <div>
                              <p className="text-sm font-medium text-stone-500">Total Cartons</p>
                              <p className="text-xl font-bold text-stone-900">{order.totalCartons}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-500">Total CBM</p>
                              <p className="text-xl font-bold text-stone-900">{order.totalCbm} m³</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-500">Total Weight</p>
                              <p className="text-xl font-bold text-stone-900">{order.totalWeight} kg</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-500">Items Count</p>
                              <p className="text-xl font-bold text-stone-900">{order.items?.length || 0}</p>
                            </div>
                          </div>
                          
                          <div className="pt-3 border-t">
                            <p className="text-sm font-medium text-stone-500">Deadline</p>
                            <p className="text-lg font-semibold text-stone-900">{formatDate(order.deadline)}</p>
                            <p className="text-sm text-stone-500">
                              {new Date(order.deadline) < new Date() ? (
                                <span className="text-red-500">⚠️ Overdue</span>
                              ) : (
                                `${Math.ceil((new Date(order.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days remaining`
                              )}
                            </p>
                          </div>

                          {order.notes && (
                            <div className="pt-3 border-t">
                              <p className="text-sm font-medium text-stone-700 mb-2">Order Notes</p>
                              <p className="text-sm text-stone-600 bg-stone-50 p-3 rounded-lg">
                                {order.notes}
                              </p>
                            </div>
                          )}
                        </CardContent>
                      </Card>

                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <DollarSign className="h-5 w-5 mr-2" />
                            Financial Summary
                          </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-3">
                          <div className="flex justify-between">
                            <span className="text-stone-600">Order Amount:</span>
                            <span className="font-semibold">{formatCurrency(order.totalAmount)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-600">Carrying Charges:</span>
                            <span className="font-semibold">{formatCurrency(order.totalCarryingCharges)}</span>
                          </div>
                          <div className="border-t pt-3">
                            <div className="flex justify-between text-lg font-bold">
                              <span>Grand Total:</span>
                              <span className="text-green-600">
                                {formatCurrency(order.totalAmount + order.totalCarryingCharges)}
                              </span>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Loop-back Information */}
                      {order.isLoopBack && (
                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                          <CardHeader>
                            <CardTitle className="flex items-center text-lg text-orange-800">
                              <RotateCcw className="h-5 w-5 mr-2" />
                              Loop-back Order Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-orange-700">Reason</p>
                                <p className="text-base font-semibold text-orange-900">{order.loopBackReason}</p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-orange-700">Priority</p>
                                <Badge className="bg-orange-200 text-orange-800 border-orange-300">
                                  {order.priority?.toUpperCase() || 'MEDIUM'}
                                </Badge>
                              </div>
                            </div>
                            
                            {/* Remaining Quantities Summary */}
                            <div className="pt-3 border-t border-orange-200">
                              <p className="text-sm font-medium text-orange-700 mb-2">Items Summary</p>
                              <div className="grid grid-cols-3 gap-3 text-xs">
                                <div className="bg-orange-100 p-2 rounded border border-orange-300">
                                  <div className="font-medium text-orange-800">Total Units</div>
                                  <div className="text-lg font-bold text-orange-900">
                                    {order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                                  </div>
                                </div>
                                <div className="bg-orange-100 p-2 rounded border border-orange-300">
                                  <div className="font-medium text-orange-800">Total Cartons</div>
                                  <div className="text-lg font-bold text-orange-900">{order.totalCartons || 0}</div>
                                </div>
                                <div className="bg-orange-100 p-2 rounded border border-orange-300">
                                  <div className="font-medium text-orange-800">Total CBM</div>
                                  <div className="text-lg font-bold text-orange-900">{order.totalCbm || 0} m³</div>
                                </div>
                              </div>
                            </div>
                            
                            {order.parentOrderId && (
                              <div className="pt-3 border-t border-orange-200">
                                <p className="text-sm font-medium text-orange-700 mb-1">Original Order Reference</p>
                                <p className="text-sm text-orange-800 bg-orange-100 px-3 py-2 rounded-lg border border-orange-200">
                                  ↳ This is a replacement order generated from QC inspection issues in the original order
                                </p>
                              </div>
                            )}
                            
                            {order.deadline && (
                              <div className="pt-3 border-t border-orange-200">
                                <p className="text-sm font-medium text-orange-700">Target Resolution</p>
                                <p className="text-base font-semibold text-orange-900">{formatDate(order.deadline)}</p>
                                <p className="text-xs text-orange-600">
                                  {new Date(order.deadline) < new Date() ? (
                                    <span className="text-red-600">⚠️ Resolution overdue</span>
                                  ) : (
                                    `${Math.ceil((new Date(order.deadline) - new Date()) / (1000 * 60 * 60 * 24))} days to resolve`
                                  )}
                                </p>
                              </div>
                            )}
                            
                            {/* Loop-back Update History */}
                            {order.notes && order.notes.includes('Updated via re-QC') && (
                              <div className="pt-3 border-t border-orange-200">
                                <p className="text-sm font-medium text-orange-700 mb-1">Update History</p>
                                <div className="text-xs text-orange-800 bg-orange-100 px-3 py-2 rounded-lg border border-orange-200">
                                  <div className="flex items-center mb-1">
                                    <div className="w-2 h-2 bg-orange-500 rounded-full mr-2"></div>
                                    <span className="font-medium">Recent Update</span>
                                  </div>
                                  <p className="text-orange-700">{order.notes}</p>
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* QC Information */}
                      {order.qcCompletedAt && (
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                          <CardHeader>
                            <CardTitle className="flex items-center text-lg text-green-800">
                              <CheckCircle className="h-5 w-5 mr-2" />
                              QC Inspection Details
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="grid grid-cols-2 gap-4">
                              <div>
                                <p className="text-sm font-medium text-green-700">Completed Date</p>
                                <p className="text-base font-semibold text-green-900">
                                  {new Date(order.qcCompletedAt).toLocaleDateString()}
                                </p>
                              </div>
                              <div>
                                <p className="text-sm font-medium text-green-700">QC Status</p>
                                <Badge className={`${
                                  order.status === 'ready' ? 'bg-green-200 text-green-800 border-green-300' :
                                  order.status === 'partial_ready' ? 'bg-yellow-200 text-yellow-800 border-yellow-300' :
                                  'bg-red-200 text-red-800 border-red-300'
                                }`}>
                                  {order.status === 'ready' ? 'PASSED' :
                                   order.status === 'partial_ready' ? 'PARTIAL' : 'FAILED'}
                                </Badge>
                              </div>
                            </div>
                            {order.qcReInspectionCount > 0 && (
                              <div className="pt-3 border-t border-green-200">
                                <p className="text-sm font-medium text-green-700">Re-inspections</p>
                                <p className="text-sm text-green-800 bg-green-100 px-3 py-2 rounded-lg border border-green-200">
                                  This order has been re-inspected {order.qcReInspectionCount} time(s)
                                </p>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      )}

                      {/* Related Loop-backs for Regular Orders */}
                      {!order.isLoopBack && order.qcCompletedAt && (
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                          <CardHeader>
                            <CardTitle className="flex items-center text-lg text-blue-800">
                              <RotateCcw className="h-5 w-5 mr-2" />
                              Related Loop-backs
                            </CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="text-sm text-blue-700">
                              <p className="mb-2">Track any loop-back orders created from this order's QC inspections:</p>
                              <div className="bg-blue-100 p-3 rounded-lg border border-blue-200">
                                <div className="flex items-center justify-between">
                                  <span>Check Loop-backs tab for related orders</span>
                                  <Badge variant="outline" className="bg-blue-50 text-blue-700 border-blue-300">
                                    → Loop-backs Tab
                                  </Badge>
                                </div>
                                <p className="text-xs text-blue-600 mt-1">
                                  Loop-back orders will show this order as their parent reference
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>

                    {/* Client Information */}
                    <div>
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center text-lg">
                            <User className="h-5 w-5 mr-2" />
                            Client Information
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div>
                              <h3 className="font-semibold text-stone-900 text-lg mb-2">{order.clientName}</h3>
                              <div className="space-y-2 text-sm">
                                {order.clientContact?.name && (
                                  <div className="flex items-center text-stone-600">
                                    <User className="h-4 w-4 mr-2" />
                                    <span>{order.clientContact.name}</span>
                                  </div>
                                )}
                                {order.clientContact?.email && (
                                  <div className="flex items-center text-stone-600">
                                    <Mail className="h-4 w-4 mr-2" />
                                    <a href={`mailto:${order.clientContact.email}`} className="text-amber-600 hover:underline">
                                      {order.clientContact.email}
                                    </a>
                                  </div>
                                )}
                                {order.clientContact?.phone && (
                                  <div className="flex items-center text-stone-600">
                                    <Phone className="h-4 w-4 mr-2" />
                                    <a href={`tel:${order.clientContact.phone}`} className="text-amber-600 hover:underline">
                                      {order.clientContact.phone}
                                    </a>
                                  </div>
                                )}
                                {order.clientContact?.company && (
                                  <div className="flex items-center text-stone-600">
                                    <Building className="h-4 w-4 mr-2" />
                                    <span>{order.clientContact.company}</span>
                                  </div>
                                )}
                              </div>
                            </div>
                            
                            {order.clientContact?.address && (
                              <div className="pt-3 border-t">
                                <h4 className="font-medium text-stone-900 mb-2">Address</h4>
                                <p className="text-sm text-stone-600">{order.clientContact.address}</p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </div>
                )}

                {selectedTab === 'items' && (
                  <div className="space-y-6">
                    {/* Quantity Summary Cards */}
                    {order.qcCompletedAt && (
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                        <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-blue-700">Total Expected</p>
                                <p className="text-2xl font-bold text-blue-900">
                                  {order.items?.reduce((sum, item) => sum + (item.quantity || 0), 0) || 0}
                                </p>
                              </div>
                              <Package className="h-8 w-8 text-blue-600" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-green-700">Total Received</p>
                                <p className="text-2xl font-bold text-green-900">
                                  {order.items?.reduce((sum, item) => sum + (item.qcPassedQuantity || 0), 0) || 0}
                                </p>
                              </div>
                              <CheckCircle className="h-8 w-8 text-green-600" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-orange-50 to-orange-100 border-orange-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-orange-700">Loop-back Quantity</p>
                                <p className="text-2xl font-bold text-orange-900">
                                  {order.items?.reduce((sum, item) => sum + (item.loopBackQuantity || 0), 0) || 0}
                                </p>
                              </div>
                              <AlertTriangle className="h-8 w-8 text-orange-600" />
                            </div>
                          </CardContent>
                        </Card>
                        
                        <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 border-yellow-200">
                          <CardContent className="p-4">
                            <div className="flex items-center justify-between">
                              <div>
                                <p className="text-sm font-medium text-yellow-700">Pending Quantity</p>
                                <p className="text-2xl font-bold text-yellow-900">
                                  {order.items?.reduce((sum, item) => {
                                    const expected = item.quantity || 0
                                    const received = item.qcPassedQuantity || 0
                                    const loopBack = item.loopBackQuantity || 0
                                    return sum + Math.max(0, expected - received - loopBack)
                                  }, 0) || 0}
                                </p>
                              </div>
                              <Clock className="h-8 w-8 text-yellow-600" />
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    )}

                    {/* Items Detail Table */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <FileText className="h-5 w-5 mr-2" />
                          Order Items ({order.items?.length || 0})
                          {order.qcCompletedAt && (
                            <Badge variant="outline" className="ml-3 bg-green-50 text-green-700 border-green-300">
                              QC Completed
                            </Badge>
                          )}
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          {order.items?.map((item, index) => {
                            const expectedQty = item.quantity || 0
                            const receivedQty = item.qcPassedQuantity || 0
                            const loopBackQty = item.loopBackQuantity || 0
                            const pendingQty = Math.max(0, expectedQty - receivedQty - loopBackQty)
                            const completionPercentage = expectedQty > 0 ? (receivedQty / expectedQty) * 100 : 0
                            const loopBackPercentage = expectedQty > 0 ? (loopBackQty / expectedQty) * 100 : 0
                            
                            return (
                              <div key={item._id || index} className="border rounded-lg p-4 hover:bg-stone-50 transition-colors">
                                {/* Item Header */}
                                <div className="flex items-start justify-between mb-3">
                                  <div className="flex-1">
                                    <h4 className="font-semibold text-stone-900 text-lg">{item.itemCode}</h4>
                                    <p className="text-stone-600 text-sm mt-1">{item.description}</p>
                                    {item.qcStatus && item.qcStatus !== 'pending' && (
                                      <div className="mt-2 flex items-center space-x-2">
                                        <Badge className={`text-xs ${
                                          item.qcStatus === 'completed' ? 'bg-green-200 text-green-800 border-green-300' :
                                          item.qcStatus === 'partial' ? 'bg-yellow-200 text-yellow-800 border-yellow-300' :
                                          'bg-red-200 text-red-800 border-red-300'
                                        }`}>
                                          QC: {item.qcStatus.toUpperCase()}
                                        </Badge>
                                        {item.loopBackStatus && item.loopBackStatus !== 'none' && (
                                          <Badge className="text-xs bg-orange-200 text-orange-800 border-orange-300">
                                            Loop-back: {item.loopBackStatus.toUpperCase()}
                                          </Badge>
                                        )}
                                      </div>
                                    )}
                                  </div>
                                  <div className="text-right">
                                    <p className="text-sm text-stone-500">Unit Price</p>
                                    <p className="font-semibold text-lg">{formatCurrency(item.unitPrice)}</p>
                                  </div>
                                </div>

                                {/* Quantity Breakdown */}
                                {order.qcCompletedAt ? (
                                  <div className="space-y-3">
                                    {/* Visual Progress Bar */}
                                    <div className="relative">
                                      <div className="flex items-center justify-between text-sm font-medium mb-2">
                                        <span className="text-stone-700">Quantity Status</span>
                                        <div className="flex items-center space-x-3">
                                          <span className={`${
                                            completionPercentage === 100 ? 'text-green-600' :
                                            completionPercentage > 0 ? 'text-amber-600' :
                                            'text-red-600'
                                          }`}>
                                            {completionPercentage.toFixed(0)}% Received
                                          </span>
                                          {loopBackQty > 0 && (
                                            <span className="text-orange-600 text-xs">
                                              {loopBackPercentage.toFixed(0)}% Loop-back
                                            </span>
                                          )}
                                        </div>
                                      </div>
                                      <div className="w-full bg-stone-200 rounded-full h-3 relative overflow-hidden">
                                        {/* QC Passed (Green) */}
                                        <div 
                                          className="h-3 bg-gradient-to-r from-green-500 to-green-600 rounded-l-full transition-all duration-500" 
                                          style={{ width: `${completionPercentage}%` }}
                                        ></div>
                                        {/* Loop-back (Orange) */}
                                        {loopBackQty > 0 && (
                                          <div 
                                            className="absolute top-0 h-3 bg-gradient-to-r from-orange-400 to-orange-500" 
                                            style={{ 
                                              left: `${completionPercentage}%`,
                                              width: `${loopBackPercentage}%`
                                            }}
                                          ></div>
                                        )}
                                        {/* Pending (Light gray) - remaining space */}
                                      </div>
                                    </div>

                                    {/* Quantity Details Grid */}
                                    <div className="grid grid-cols-4 gap-3">
                                      <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Expected</p>
                                            <p className="text-xl font-bold text-blue-900">{expectedQty}</p>
                                          </div>
                                          <Package className="h-5 w-5 text-blue-600" />
                                        </div>
                                      </div>
                                      
                                      <div className="bg-green-50 p-3 rounded-lg border border-green-200">
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className="text-xs font-medium text-green-700 uppercase tracking-wide">Received</p>
                                            <p className="text-xl font-bold text-green-900">{receivedQty}</p>
                                          </div>
                                          <CheckCircle className="h-5 w-5 text-green-600" />
                                        </div>
                                      </div>
                                      
                                      <div className={`${loopBackQty > 0 ? 'bg-orange-50 border-orange-200' : 'bg-stone-50 border-stone-200'} p-3 rounded-lg border`}>
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className={`text-xs font-medium uppercase tracking-wide ${
                                              loopBackQty > 0 ? 'text-orange-700' : 'text-stone-600'
                                            }`}>Loop-back</p>
                                            <p className={`text-xl font-bold ${
                                              loopBackQty > 0 ? 'text-orange-900' : 'text-stone-700'
                                            }`}>{loopBackQty}</p>
                                          </div>
                                          {loopBackQty > 0 ? (
                                            <AlertTriangle className="h-5 w-5 text-orange-600" />
                                          ) : (
                                            <CheckCircle className="h-5 w-5 text-stone-500" />
                                          )}
                                        </div>
                                        {loopBackQty > 0 && item.loopBackReason && (
                                          <div className="mt-2">
                                            <Badge className="bg-orange-200 text-orange-800 border-orange-300 text-xs">
                                              {item.loopBackReason}
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                      
                                      <div className={`${pendingQty > 0 ? 'bg-yellow-50 border-yellow-200' : 'bg-stone-50 border-stone-200'} p-3 rounded-lg border`}>
                                        <div className="flex items-center justify-between">
                                          <div>
                                            <p className={`text-xs font-medium uppercase tracking-wide ${
                                              pendingQty > 0 ? 'text-yellow-700' : 'text-stone-600'
                                            }`}>Pending</p>
                                            <p className={`text-xl font-bold ${
                                              pendingQty > 0 ? 'text-yellow-900' : 'text-stone-700'
                                            }`}>{pendingQty}</p>
                                          </div>
                                          {pendingQty > 0 ? (
                                            <Clock className="h-5 w-5 text-yellow-600" />
                                          ) : (
                                            <CheckCircle className="h-5 w-5 text-green-600" />
                                          )}
                                        </div>
                                        {pendingQty > 0 && (
                                          <div className="mt-2">
                                            <Badge className="bg-yellow-200 text-yellow-800 border-yellow-300 text-xs">
                                              Not Received
                                            </Badge>
                                          </div>
                                        )}
                                      </div>
                                    </div>

                                    {/* Formula Display */}
                                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                                      <div className="flex items-center justify-center text-sm font-mono text-stone-600">
                                        <span className="text-blue-600 font-semibold">{expectedQty}</span>
                                        <span className="mx-2">=</span>
                                        <span className="text-green-600 font-semibold">{receivedQty}</span>
                                        <span className="mx-2">+</span>
                                        <span className="text-orange-600 font-semibold">{loopBackQty}</span>
                                        <span className="mx-2">+</span>
                                        <span className="text-yellow-600 font-semibold">{pendingQty}</span>
                                        <span className="ml-3 text-xs text-stone-500">(Expected = Received + Loop-back + Pending)</span>
                                      </div>
                                    </div>

                                    {/* Loop-back Details */}
                                    {loopBackQty > 0 && (
                                      <div className="bg-orange-50 p-3 rounded-lg border border-orange-200">
                                        <div className="flex items-center justify-between mb-2">
                                          <h5 className="text-sm font-medium text-orange-800">Loop-back Information</h5>
                                          {item.loopBackStatus && (
                                            <Badge className={`text-xs ${
                                              item.loopBackStatus === 'resolved' ? 'bg-green-200 text-green-800 border-green-300' :
                                              item.loopBackStatus === 'pending' ? 'bg-orange-200 text-orange-800 border-orange-300' :
                                              'bg-yellow-200 text-yellow-800 border-yellow-300'
                                            }`}>
                                              {item.loopBackStatus.toUpperCase()}
                                            </Badge>
                                          )}
                                        </div>
                                        <div className="grid grid-cols-2 gap-3 text-xs text-orange-700">
                                          {item.loopBackReason && (
                                            <div>
                                              <span className="font-medium">Reason:</span>
                                              <div className="mt-1 text-orange-800">{item.loopBackReason}</div>
                                            </div>
                                          )}
                                          {item.loopBackCreatedAt && (
                                            <div>
                                              <span className="font-medium">Created:</span>
                                              <div className="mt-1 text-orange-800">
                                                {new Date(item.loopBackCreatedAt).toLocaleDateString()}
                                              </div>
                                            </div>
                                          )}
                                          {item.loopBackNotes && (
                                            <div className="col-span-2">
                                              <span className="font-medium">Notes:</span>
                                              <div className="mt-1 text-orange-800 italic">{item.loopBackNotes}</div>
                                            </div>
                                          )}
                                        </div>
                                      </div>
                                    )}
                                  </div>
                                ) : (
                                  <div className="grid grid-cols-2 gap-4">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-medium text-blue-700 uppercase tracking-wide">Expected Quantity</p>
                                          <p className="text-xl font-bold text-blue-900">{expectedQty}</p>
                                        </div>
                                        <Package className="h-5 w-5 text-blue-600" />
                                      </div>
                                    </div>
                                    <div className="bg-stone-50 p-3 rounded-lg border border-stone-200">
                                      <div className="flex items-center justify-between">
                                        <div>
                                          <p className="text-xs font-medium text-stone-600 uppercase tracking-wide">Status</p>
                                          <p className="text-sm font-semibold text-stone-700">Pending QC</p>
                                        </div>
                                        <Clock className="h-5 w-5 text-stone-500" />
                                      </div>
                                    </div>
                                  </div>
                                )}

                                {/* Additional Item Details */}
                                <div className="grid grid-cols-4 gap-4 mt-4 pt-3 border-t border-stone-200">
                                  <div className="text-center">
                                    <p className="text-xs text-stone-500 font-medium">Total Value</p>
                                    <p className="text-sm font-semibold text-stone-900">{formatCurrency(item.totalPrice)}</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-stone-500 font-medium">Weight</p>
                                    <p className="text-sm font-semibold text-stone-900">{item.unitWeight} kg</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-stone-500 font-medium">CBM</p>
                                    <p className="text-sm font-semibold text-stone-900">{item.unitCbm} m³</p>
                                  </div>
                                  <div className="text-center">
                                    <p className="text-xs text-stone-500 font-medium">Cartons</p>
                                    <p className="text-sm font-semibold text-stone-900">{item.cartons}</p>
                                  </div>
                                </div>
                              </div>
                            )
                          })}
                        </div>

                        {/* Summary Footer */}
                        <div className="mt-6 pt-4 border-t border-stone-200 bg-stone-50 rounded-lg p-4">
                          <div className="grid grid-cols-4 gap-4 text-center">
                            <div>
                              <p className="text-sm font-medium text-stone-600">Total Value</p>
                              <p className="text-lg font-bold text-stone-900">{formatCurrency(order.totalAmount)}</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-600">Total Weight</p>
                              <p className="text-lg font-bold text-stone-900">{order.totalWeight} kg</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-600">Total CBM</p>
                              <p className="text-lg font-bold text-stone-900">{order.totalCbm} m³</p>
                            </div>
                            <div>
                              <p className="text-sm font-medium text-stone-600">Total Cartons</p>
                              <p className="text-lg font-bold text-stone-900">{order.totalCartons}</p>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}

                {selectedTab === 'logistics' && (
                  <div className="space-y-6">
                    {/* Suppliers */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <Truck className="h-5 w-5 mr-2" />
                          Suppliers Summary
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {order.items?.reduce((acc, item) => {
                            const existing = acc.find(s => s.name === item.supplier?.name)
                            if (existing) {
                              existing.items += 1
                              existing.totalValue += item.totalPrice
                            } else {
                              acc.push({
                                name: item.supplier?.name || 'Unknown Supplier',
                                contact: item.supplier?.contact,
                                email: item.supplier?.email,
                                phone: item.supplier?.phone,
                                items: 1,
                                totalValue: item.totalPrice
                              })
                            }
                            return acc
                          }, []).map((supplier, index) => (
                            <div key={index} className="p-4 border rounded-lg">
                              <h5 className="font-medium text-stone-900 mb-2">{supplier.name}</h5>
                              <div className="text-sm text-stone-600 space-y-1">
                                {supplier.contact && <div>Contact: {typeof supplier.contact === 'string' ? supplier.contact : supplier.contact.name}</div>}
                                {supplier.email && <div>Email: {supplier.email}</div>}
                                {supplier.phone && <div>Phone: {supplier.phone}</div>}
                                <div className="pt-2 border-t">
                                  <span className="text-stone-500">{supplier.items} items • </span>
                                  <span className="font-semibold">{formatCurrency(supplier.totalValue)}</span>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Container Allocation */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center">
                          <ContainerIcon className="h-5 w-5 mr-2" />
                          Container Status
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {order.containers && order.containers.length > 0 ? (
                          <div className="space-y-3">
                            {order.containers.map((container, index) => (
                              <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                                <div>
                                  <h5 className="font-medium">{container.clientFacingId}</h5>
                                  <p className="text-sm text-stone-500">{container.status}</p>
                                </div>
                                <div className="text-right text-sm">
                                  <div>{container.allocatedCbm} m³ • {container.allocatedWeight} kg</div>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <div className="text-center py-6 text-stone-500">
                            <ContainerIcon className="h-12 w-12 mx-auto mb-2 text-stone-400" />
                            <p>No containers allocated yet</p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="p-8 text-center">
              <p className="text-stone-500">Failed to load order details</p>
            </div>
          )}

          {/* Footer Actions */}
          {order && (
            <div className="border-t bg-stone-50 p-4 flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-stone-600">
                <Calendar className="h-4 w-4" />
                <span>Created {formatDateTime(order.createdAt)}</span>
              </div>
              <div className="flex space-x-3">
                <Button variant="outline" onClick={onClose}>
                  Close
                </Button>
                {onCreateLoopback && (
                  <Button variant="outline" onClick={() => { onCreateLoopback(order); onClose(); }}>
                    Create Loop-back
                  </Button>
                )}
                {onAllocateContainer && (
                  <Button variant="outline" onClick={() => { onAllocateContainer(order); onClose(); }}>
                    Allocate Container
                  </Button>
                )}
                {onStartQC && (
                  <Button 
                    className="bg-gradient-to-r amber-gradient"
                    onClick={() => { onStartQC(order); onClose(); }}
                  >
                    Start QC Inspection
                  </Button>
                )}
              </div>
            </div>
          )}
        </motion.div>
      </div>
    </AnimatePresence>
  )
}

export default OrderDetailsModal