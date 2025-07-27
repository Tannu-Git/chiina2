import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate, Link } from 'react-router-dom'
import {
  ArrowLeft,
  Edit,
  Download,
  Share2,
  Container as ContainerIcon,
  Package,
  MapPin,
  Calendar,
  DollarSign,
  Truck,
  Clock,
  CheckCircle,
  AlertTriangle,
  BarChart3,
  Eye,
  Plus,
  RefreshCw,
  FileText,
  Users
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate, formatDateTime } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const ContainerDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [container, setContainer] = useState(null)
  const [selectedTab, setSelectedTab] = useState('overview')

  // Fetch container details
  const fetchContainer = async () => {
    try {
      setLoading(true)
      const response = await axios.get(`/api/containers/${id}`)
      setContainer(response.data.container)
    } catch (error) {
      console.error('Error fetching container:', error)
      toast.error('Failed to load container details')
      navigate('/containers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchContainer()
    }
  }, [id])

  // Use real container data from API
  const containerData = {
    _id: id,
    clientFacingId: 'SHIP-ABC123',
    realContainerId: 'MSKU1234567',
    type: '40ft',
    status: 'loading',
    currentCbm: 45.2,
    maxCbm: 67,
    currentWeight: 15000,
    maxWeight: 30000,
    location: {
      current: 'Warehouse A',
      port: 'Mumbai Port',
      destination: 'Los Angeles Port'
    },
    billNo: 'BILL-001234',
    sealNo: 'SEAL-567890',
    estimatedDeparture: '2024-01-25T10:00:00Z',
    estimatedArrival: '2024-02-15T14:00:00Z',
    actualDeparture: null,
    actualArrival: null,
    createdAt: '2024-01-15T09:00:00Z',
    updatedAt: '2024-01-20T16:30:00Z',
    orders: [
      {
        orderId: {
          _id: 'order1',
          orderNumber: 'ORD-001234',
          clientName: 'ABC Trading Co.',
          totalAmount: 125000,
          totalCartons: 25,
          totalCbm: 15.2,
          totalWeight: 800
        },
        allocatedCbm: 15.2,
        allocatedWeight: 800,
        allocatedCartons: 25
      },
      {
        orderId: {
          _id: 'order2',
          orderNumber: 'ORD-001235',
          clientName: 'XYZ Imports Ltd.',
          totalAmount: 89000,
          totalCartons: 20,
          totalCbm: 12.0,
          totalWeight: 650
        },
        allocatedCbm: 12.0,
        allocatedWeight: 650,
        allocatedCartons: 20
      }
    ],
    charges: [
      { name: 'Freight Charges', value: 2500, currency: 'USD', type: 'shipping' },
      { name: 'Documentation Fee', value: 150, currency: 'USD', type: 'admin' },
      { name: 'Port Handling', value: 300, currency: 'USD', type: 'port' },
      { name: 'Insurance', value: 200, currency: 'USD', type: 'insurance' }
    ],
    timeline: [
      {
        date: '2024-01-15T09:00:00Z',
        action: 'Container Created',
        description: 'Container booking created in system',
        user: 'Admin User',
        status: 'planning'
      },
      {
        date: '2024-01-16T10:30:00Z',
        action: 'Orders Allocated',
        description: 'Orders ORD-001234 and ORD-001235 allocated to container',
        user: 'Warehouse Staff',
        status: 'planning'
      },
      {
        date: '2024-01-18T08:00:00Z',
        action: 'Loading Started',
        description: 'Container loading commenced at Warehouse A',
        user: 'Warehouse Staff',
        status: 'loading'
      },
      {
        date: '2024-01-20T16:30:00Z',
        action: 'Loading Progress',
        description: 'Container 67% loaded, on schedule',
        user: 'Warehouse Staff',
        status: 'loading'
      }
    ]
  }

  const displayContainer = container || null

  const getStatusIcon = (status) => {
    switch (status) {
      case 'planning':
        return <Clock className="h-5 w-5 text-blue-500" />
      case 'loading':
        return <Package className="h-5 w-5 text-yellow-500" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-green-500" />
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-gray-500" />
    }
  }

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const handleExportContainer = () => {
    toast.success('Export functionality will be implemented')
  }

  const handleUpdateStatus = async (newStatus) => {
    try {
      await axios.patch(`/api/containers/${id}`, { status: newStatus })
      toast.success('Container status updated successfully')
      fetchContainer()
    } catch (error) {
      toast.error('Failed to update container status')
    }
  }

  if (loading) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading container details...</span>
        </div>
      </div>
    )
  }

  if (!displayContainer) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="text-center py-12">
          <ContainerIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Container not found</h3>
          <p className="text-gray-500 mb-6">The container you're looking for doesn't exist.</p>
          <Link to="/containers">
            <Button variant="gradient">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Containers
            </Button>
          </Link>
        </div>
      </div>
    )
  }

  const cbmUtilization = (displayContainer.currentCbm / displayContainer.maxCbm) * 100
  const weightUtilization = (displayContainer.currentWeight / displayContainer.maxWeight) * 100

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
            <Button variant="ghost" onClick={() => navigate('/containers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Containers
            </Button>
            <div>
              <div className="flex items-center space-x-3">
                {getStatusIcon(displayContainer.status)}
                <h1 className="text-3xl font-bold text-gray-900">{displayContainer.clientFacingId}</h1>
                <span className={`status-badge ${getStatusColor(displayContainer.status)}`}>
                  {displayContainer.status}
                </span>
              </div>
              <p className="text-gray-600 mt-2">
                {displayContainer.type} Container • {displayContainer.realContainerId}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleExportContainer}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline">
              <Share2 className="h-4 w-4 mr-2" />
              Share
            </Button>
            <Button variant="outline" onClick={fetchContainer}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <Link to={`/containers/${id}/edit`}>
                <Button variant="gradient">
                  <Edit className="h-4 w-4 mr-2" />
                  Edit Container
                </Button>
              </Link>
            )}
          </div>
        </div>

        {/* Tab Navigation */}
        <div className="mb-6">
          <div className="border-b border-gray-200">
            <nav className="-mb-px flex space-x-8">
              {[
                { id: 'overview', name: 'Overview', icon: BarChart3 },
                { id: 'orders', name: 'Orders', icon: Package },
                { id: 'financials', name: 'Financials', icon: DollarSign },
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
            {/* Container Information */}
            <div className="lg:col-span-2 space-y-6">
              {/* Basic Information */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <ContainerIcon className="h-5 w-5 mr-2" />
                    Container Information
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Container Details</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-gray-500">Client Facing ID:</span>
                          <span className="font-medium">{displayContainer.clientFacingId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Real Container ID:</span>
                          <span className="font-medium">{displayContainer.realContainerId}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Container Type:</span>
                          <span className="font-medium">{displayContainer.type}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Bill Number:</span>
                          <span className="font-medium">{displayContainer.billNo || 'Not assigned'}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-500">Seal Number:</span>
                          <span className="font-medium">{displayContainer.sealNo || 'Not sealed'}</span>
                        </div>
                      </div>
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900 mb-3">Location & Schedule</h3>
                      <div className="space-y-2 text-sm">
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>Current: {displayContainer.location?.current}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>Port: {displayContainer.location?.port}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <MapPin className="h-4 w-4 mr-2" />
                          <span>Destination: {displayContainer.location?.destination}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Est. Departure: {formatDateTime(displayContainer.estimatedDeparture)}</span>
                        </div>
                        <div className="flex items-center text-gray-600">
                          <Calendar className="h-4 w-4 mr-2" />
                          <span>Est. Arrival: {formatDateTime(displayContainer.estimatedArrival)}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Utilization */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2" />
                    Container Utilization
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">CBM Utilization</span>
                        <span className="text-sm font-semibold">{cbmUtilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${getUtilizationColor(cbmUtilization)}`}
                          style={{ width: `${Math.min(cbmUtilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{displayContainer.currentCbm} m³ used</span>
                        <span>{displayContainer.maxCbm} m³ total</span>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-sm font-medium text-gray-700">Weight Utilization</span>
                        <span className="text-sm font-semibold">{weightUtilization.toFixed(1)}%</span>
                      </div>
                      <div className="w-full bg-gray-200 rounded-full h-3">
                        <div
                          className={`h-3 rounded-full ${getUtilizationColor(weightUtilization)}`}
                          style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                        />
                      </div>
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>{displayContainer.currentWeight.toLocaleString()} kg used</span>
                        <span>{displayContainer.maxWeight.toLocaleString()} kg total</span>
                      </div>
                    </div>

                    <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">{displayContainer.orders?.length || 0}</p>
                        <p className="text-sm text-gray-500">Orders</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {displayContainer.orders?.reduce((sum, order) => sum + order.allocatedCartons, 0) || 0}
                        </p>
                        <p className="text-sm text-gray-500">Cartons</p>
                      </div>
                      <div className="text-center">
                        <p className="text-2xl font-bold text-gray-900">
                          {Math.round((cbmUtilization + weightUtilization) / 2)}%
                        </p>
                        <p className="text-sm text-gray-500">Avg Utilization</p>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Status & Actions */}
            <div>
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <CheckCircle className="h-5 w-5 mr-2" />
                    Status & Actions
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="text-center">
                    <div className="flex items-center justify-center mb-2">
                      {getStatusIcon(displayContainer.status)}
                      <span className={`status-badge ml-2 ${getStatusColor(displayContainer.status)}`}>
                        {displayContainer.status.toUpperCase()}
                      </span>
                    </div>
                    <p className="text-sm text-gray-500">Current Status</p>
                  </div>

                  {/* Status Actions */}
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <div className="space-y-2">
                      <h4 className="font-medium text-gray-900">Status Actions</h4>
                      {displayContainer.status === 'planning' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUpdateStatus('loading')}
                        >
                          <Package className="h-4 w-4 mr-2" />
                          Start Loading
                        </Button>
                      )}
                      {displayContainer.status === 'loading' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUpdateStatus('shipped')}
                        >
                          <Truck className="h-4 w-4 mr-2" />
                          Mark as Shipped
                        </Button>
                      )}
                      {displayContainer.status === 'shipped' && (
                        <Button
                          variant="outline"
                          size="sm"
                          className="w-full"
                          onClick={() => handleUpdateStatus('delivered')}
                        >
                          <CheckCircle className="h-4 w-4 mr-2" />
                          Mark as Delivered
                        </Button>
                      )}
                    </div>
                  )}

                  {/* Container Info */}
                  <div className="pt-4 border-t">
                    <h4 className="font-medium text-gray-900 mb-3">Container Info</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-gray-500">Created:</span>
                        <span>{formatDate(displayContainer.createdAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Last Updated:</span>
                        <span>{formatDate(displayContainer.updatedAt)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-gray-500">Total Value:</span>
                        <span className="font-semibold">
                          {formatCurrency(displayContainer.orders?.reduce((sum, order) => sum + order.orderId.totalAmount, 0) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Orders Tab */}
        {selectedTab === 'orders' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Package className="h-5 w-5 mr-2" />
                Allocated Orders ({displayContainer.orders?.length || 0})
              </CardTitle>
              <CardDescription>Orders assigned to this container</CardDescription>
            </CardHeader>
            <CardContent>
              {displayContainer.orders && displayContainer.orders.length > 0 ? (
                <div className="space-y-4">
                  {displayContainer.orders.map((orderAllocation, index) => (
                    <Card key={orderAllocation.orderId._id} className="p-4">
                      <div className="flex items-center justify-between mb-4">
                        <div className="flex items-center space-x-3">
                          <Package className="h-6 w-6 text-blue-500" />
                          <div>
                            <h3 className="font-semibold text-gray-900">
                              {orderAllocation.orderId.orderNumber}
                            </h3>
                            <p className="text-sm text-gray-500">{orderAllocation.orderId.clientName}</p>
                          </div>
                        </div>
                        <div className="flex items-center space-x-4">
                          <div className="text-right">
                            <p className="font-semibold text-green-600">
                              {formatCurrency(orderAllocation.orderId.totalAmount)}
                            </p>
                            <p className="text-sm text-gray-500">Order Value</p>
                          </div>
                          <Link to={`/orders/${orderAllocation.orderId._id}`}>
                            <Button variant="outline" size="sm">
                              <Eye className="h-4 w-4 mr-1" />
                              View Order
                            </Button>
                          </Link>
                        </div>
                      </div>

                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocated CBM</p>
                          <p className="text-lg font-semibold text-gray-900">{orderAllocation.allocatedCbm} m³</p>
                          <p className="text-xs text-gray-500">
                            {((orderAllocation.allocatedCbm / displayContainer.maxCbm) * 100).toFixed(1)}% of container
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocated Weight</p>
                          <p className="text-lg font-semibold text-gray-900">{orderAllocation.allocatedWeight} kg</p>
                          <p className="text-xs text-gray-500">
                            {((orderAllocation.allocatedWeight / displayContainer.maxWeight) * 100).toFixed(1)}% of container
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocated Cartons</p>
                          <p className="text-lg font-semibold text-gray-900">{orderAllocation.allocatedCartons}</p>
                          <p className="text-xs text-gray-500">
                            {((orderAllocation.allocatedCartons / orderAllocation.orderId.totalCartons) * 100).toFixed(1)}% of order
                          </p>
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-500">Allocation %</p>
                          <p className="text-lg font-semibold text-gray-900">
                            {((orderAllocation.allocatedCbm / orderAllocation.orderId.totalCbm) * 100).toFixed(1)}%
                          </p>
                          <p className="text-xs text-gray-500">of order CBM</p>
                        </div>
                      </div>
                    </Card>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No orders allocated</h3>
                  <p className="text-gray-500 mb-6">This container doesn't have any orders allocated yet.</p>
                  {(user?.role === 'admin' || user?.role === 'staff') && (
                    <Button variant="gradient">
                      <Plus className="h-4 w-4 mr-2" />
                      Allocate Orders
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Financials Tab */}
        {selectedTab === 'financials' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <DollarSign className="h-5 w-5 mr-2" />
                Financial Summary
              </CardTitle>
              <CardDescription>Container charges and financial breakdown</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Charges Breakdown */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Container Charges</h3>
                  <div className="space-y-3">
                    {displayContainer.charges?.map((charge, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{charge.name}</p>
                          <p className="text-sm text-gray-500 capitalize">{charge.type} charge</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">{formatCurrency(charge.value)}</p>
                          <p className="text-sm text-gray-500">{charge.currency}</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Container Charges</span>
                        <span className="text-lg font-bold text-green-600">
                          {formatCurrency(displayContainer.charges?.reduce((sum, charge) => sum + charge.value, 0) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Order Values */}
                <div>
                  <h3 className="font-semibold text-gray-900 mb-4">Order Values</h3>
                  <div className="space-y-3">
                    {displayContainer.orders?.map((orderAllocation, index) => (
                      <div key={index} className="flex items-center justify-between p-3 border rounded-lg">
                        <div>
                          <p className="font-medium text-gray-900">{orderAllocation.orderId.orderNumber}</p>
                          <p className="text-sm text-gray-500">{orderAllocation.orderId.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="font-semibold text-gray-900">
                            {formatCurrency(orderAllocation.orderId.totalAmount)}
                          </p>
                          <p className="text-sm text-gray-500">Order value</p>
                        </div>
                      </div>
                    ))}
                    <div className="pt-3 border-t">
                      <div className="flex justify-between items-center">
                        <span className="font-semibold text-gray-900">Total Order Value</span>
                        <span className="text-lg font-bold text-blue-600">
                          {formatCurrency(displayContainer.orders?.reduce((sum, order) => sum + order.orderId.totalAmount, 0) || 0)}
                        </span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Financial Summary */}
              <div className="mt-8 pt-6 border-t">
                <h3 className="font-semibold text-gray-900 mb-4">Financial Summary</h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div className="text-center p-4 bg-blue-50 rounded-lg">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(displayContainer.orders?.reduce((sum, order) => sum + order.orderId.totalAmount, 0) || 0)}
                    </p>
                    <p className="text-sm text-blue-700">Total Order Value</p>
                  </div>
                  <div className="text-center p-4 bg-green-50 rounded-lg">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(displayContainer.charges?.reduce((sum, charge) => sum + charge.value, 0) || 0)}
                    </p>
                    <p className="text-sm text-green-700">Container Charges</p>
                  </div>
                  <div className="text-center p-4 bg-purple-50 rounded-lg">
                    <p className="text-2xl font-bold text-purple-600">
                      {formatCurrency(
                        (displayContainer.orders?.reduce((sum, order) => sum + order.orderId.totalAmount, 0) || 0) +
                        (displayContainer.charges?.reduce((sum, charge) => sum + charge.value, 0) || 0)
                      )}
                    </p>
                    <p className="text-sm text-purple-700">Total Value</p>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Timeline Tab */}
        {selectedTab === 'timeline' && (
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Clock className="h-5 w-5 mr-2" />
                Container Timeline
              </CardTitle>
              <CardDescription>Complete history of container activities and status changes</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="flow-root">
                <ul className="-mb-8">
                  {displayContainer.timeline?.map((event, index) => (
                    <li key={index}>
                      <div className="relative pb-8">
                        {index !== displayContainer.timeline.length - 1 && (
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
                        placeholder="e.g., Container Inspection Completed"
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

export default ContainerDetails