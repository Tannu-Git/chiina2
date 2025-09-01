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
  Users,
  Ship,
  Weight,
  CreditCard,
  Banknote,
  Wallet,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useAuthStore } from '@/stores/authStore'
import ClientAllocationSummary from '@/components/containers/ClientAllocationSummary'
import axios from 'axios'
import toast from 'react-hot-toast'

const ContainerDetails = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [container, setContainer] = useState(null)
  const [isEditingFinancials, setIsEditingFinancials] = useState(false)
  const [editFinancials, setEditFinancials] = useState({
    gst: 0,
    duty: 0,
    misc: 0,
    extraCharge: 0
  })

  // Set up axios defaults if token exists
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch container details
  const handleViewClientPaymentDetails = (client) => {
    toast.info(`Viewing payment details for ${client.clientName}. Advanced payment tracking coming soon!`)
    // TODO: Navigate to client payment details
    // navigate(`/payment-collections/client/${client.clientId}`)
  }

  const handleMarkPaymentCollected = (client) => {
    toast.info(`Marking payment as collected for ${client.clientName} (${formatCurrency(client.throughMeAmount)}). Payment confirmation system coming soon!`)
    // TODO: Open payment collection confirmation modal
    // setSelectedClient(client)
    // setShowPaymentModal(true)
  }

  const handleModifyAllocation = (orderAllocation) => {
    toast.info(`Modifying allocation for order ${orderAllocation.orderId?.orderNumber || 'Unknown'}. Advanced allocation editor coming soon!`)
    // TODO: Open allocation modification modal
    // setSelectedAllocation(orderAllocation)
    // setShowAllocationModal(true)
  }

  const handleUpdatePaymentStatus = () => {
    toast.info('Payment status update interface coming soon! For now, use the Payment Collections page to track payments.')
    // TODO: Open payment status update modal
    // setShowPaymentModal(true)
  }

  const fetchContainer = async () => {
    try {
      setLoading(true)
      console.log('📋 [CONTAINER DETAILS] Fetching container:', id)
      
      if (!isAuthenticated || !token) {
        console.error('❌ [CONTAINER DETAILS] Not authenticated')
        toast.error('Please log in to view container details')
        navigate('/login')
        return
      }
      
      const response = await axios.get(`/api/containers/${id}`)
      console.log('📋 [CONTAINER DETAILS] API Response:', response.data)
      console.log('📋 [CONTAINER DETAILS] Orders:', response.data.orders)
      if (response.data.orders && response.data.orders.length > 0) {
        console.log('📋 [CONTAINER DETAILS] First Order Details:', response.data.orders[0])
        if (response.data.orders[0].orderId) {
          console.log('📋 [CONTAINER DETAILS] Populated Order Data:', response.data.orders[0].orderId)
          if (response.data.orders[0].orderId.items) {
            console.log('📋 [CONTAINER DETAILS] Order Items:', response.data.orders[0].orderId.items)
          }
        }
      }
      
      setContainer(response.data)
      
      // Initialize edit form with current financial data
      if (response.data.baseCharges) {
        setEditFinancials({
          gst: response.data.baseCharges.gst || 0,
          duty: response.data.baseCharges.duty || 0,
          misc: response.data.baseCharges.misc || 0,
          extraCharge: response.data.baseCharges.extraCharge || 0
        })
      }
      
    } catch (error) {
      console.error('❌ [CONTAINER DETAILS] Error fetching container:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else if (error.response?.status === 404) {
        toast.error('Container not found')
        navigate('/containers')
      } else if (error.response?.status === 403) {
        toast.error('Access denied to this container')
        navigate('/containers')
      } else {
        toast.error('Failed to load container details')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchContainer()
    }
  }, [id])

  // Helper functions
  const getStatusIcon = (status) => {
    switch (status) {
      case 'planning':
        return <Clock className="h-5 w-5 text-amber-500" />
      case 'loading':
        return <Package className="h-5 w-5 text-yellow-500" />
      case 'shipped':
        return <Truck className="h-5 w-5 text-blue-500" />
      case 'delivered':
        return <CheckCircle className="h-5 w-5 text-green-600" />
      default:
        return <AlertTriangle className="h-5 w-5 text-stone-500" />
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'planning':
        return 'bg-amber-100 text-amber-800'
      case 'loading':
        return 'bg-yellow-100 text-yellow-800'
      case 'shipped':
        return 'bg-blue-100 text-blue-800'
      case 'delivered':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-stone-100 text-stone-800'
    }
  }

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR'
    }).format(amount || 0)
  }

  const formatDate = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    })
  }

  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not set'
    return new Date(dateString).toLocaleString('en-IN', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    })
  }

  const handleUpdateStatus = async (newStatus) => {
    try {
      console.log('🔄 [CONTAINER DETAILS] Updating status to:', newStatus)
      await axios.patch(`/api/containers/${id}`, { status: newStatus })
      toast.success('Container status updated successfully')
      fetchContainer()
    } catch (error) {
      console.error('❌ [CONTAINER DETAILS] Status update failed:', error)
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to update container status')
      }
    }
  }

  const handleEditFinancials = () => {
    setEditFinancials({
      gst: container.baseCharges?.gst || 0,
      duty: container.baseCharges?.duty || 0,
      misc: container.baseCharges?.misc || 0,
      extraCharge: container.baseCharges?.extraCharge || 0,
      shippingCompany: container.shippingCompany?.id || ''
    })
    setIsEditingFinancials(true)
  }

  const handleSaveFinancials = async () => {
    try {
      setLoading(true)
      console.log('💰 [CONTAINER DETAILS] Updating financials:', editFinancials)
      
      await axios.post(`/api/financials/container-charges/${id}`, {
        gst: parseFloat(editFinancials.gst) || 0,
        duty: parseFloat(editFinancials.duty) || 0,
        misc: parseFloat(editFinancials.misc) || 0,
        extraCharge: parseFloat(editFinancials.extraCharge) || 0,
        currency: 'INR'
      })
      
      toast.success('Financial information updated successfully')
      setIsEditingFinancials(false)
      fetchContainer() // Refresh data
    } catch (error) {
      console.error('❌ [CONTAINER DETAILS] Financial update failed:', error)
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to update financial information')
      }
    } finally {
      setLoading(false)
    }
  }

  const handleCancelFinancialEdit = () => {
    setIsEditingFinancials(false)
    // Reset to current values
    if (container?.baseCharges) {
      setEditFinancials({
        gst: container.baseCharges.gst || 0,
        duty: container.baseCharges.duty || 0,
        misc: container.baseCharges.misc || 0,
        extraCharge: container.baseCharges.extraCharge || 0
      })
    }
  }

  const handleExportContainer = () => {
    try {
      // Prepare container data for export
      const containerData = {
        'Container ID (Client)': container.clientFacingId || 'N/A',
        'Container ID (Real)': container.realContainerId || 'N/A',
        'Type': container.type || 'N/A',
        'Status': container.status?.replace('_', ' ') || 'Unknown',
        'Bill Number': container.billNo || 'N/A',
        'Seal Number': container.sealNo || 'N/A',
        'Current CBM': container.currentCbm || 0,
        'Max CBM': container.maxCbm || 0,
        'CBM Utilization %': container.maxCbm ? ((container.currentCbm / container.maxCbm) * 100).toFixed(1) : '0',
        'Current Weight': container.currentWeight || 0,
        'Max Weight': container.maxWeight || 0,
        'Weight Utilization %': container.maxWeight ? ((container.currentWeight / container.maxWeight) * 100).toFixed(1) : '0',
        'Orders Count': container.orders?.length || 0,
        'Total Revenue': container.totalRevenue || 0,
        'Total Costs': container.totalCosts || 0,
        'Gross Profit': container.grossProfit || 0,
        'Profit Margin %': container.totalRevenue ? ((container.grossProfit / container.totalRevenue) * 100).toFixed(1) : '0',
        'GST': container.baseCharges?.gst || 0,
        'Duty': container.baseCharges?.duty || 0,
        'Misc Charges': container.baseCharges?.misc || 0,
        'Extra Charges': container.baseCharges?.extraCharge || 0,
        'Location': container.location?.current || 'N/A',
        'Estimated Departure': container.estimatedDeparture ? new Date(container.estimatedDeparture).toLocaleDateString() : 'N/A',
        'Estimated Arrival': container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'N/A',
        'Created Date': new Date(container.createdAt).toLocaleDateString(),
        'Updated Date': new Date(container.updatedAt).toLocaleDateString(),
        'Created By': container.createdBy?.name || 'N/A'
      }

      // Prepare orders data
      const ordersData = container.orders?.map((order, index) => ({
        'Order #': index + 1,
        'Order Number': order.orderNumber || 'N/A',
        'Client Name': order.clientName || 'N/A',
        'Order Status': order.status || 'N/A',
        'Priority': order.priority || 'N/A',
        'CBM Share': order.cbmShare || 0,
        'Weight Share': order.weightShare || 0,
        'Carton Share': order.cartonShare || 0,
        'Carrying Charges': order.carryingCharges?.amount || 0,
        'Payment Type': order.paymentType || 'N/A',
        'Allocated At': order.allocatedAt ? new Date(order.allocatedAt).toLocaleDateString() : 'N/A'
      })) || []

      // Combine container and orders data
      const csvData = [
        // Container header
        { Type: 'CONTAINER_HEADER', ...containerData },
        // Empty row for separation
        {},
        // Orders header
        { Type: 'ORDERS' },
        // Orders data
        ...ordersData.map(order => ({ Type: 'ORDER', ...order }))
      ]

      // Convert to CSV
      const allKeys = new Set()
      csvData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)))
      const headers = Array.from(allKeys)
      
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
      const containerId = container.clientFacingId || container.realContainerId || 'container'
      link.download = `container-${containerId}-export-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported container ${containerId} details to CSV`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export container details')
    }
  }

  const handleExportPaymentReport = () => {
    try {
      // Prepare payment data for export
      const paymentData = {
        'Container ID': container.clientFacingId || container.realContainerId || 'N/A',
        'Report Date': new Date().toLocaleDateString(),
        'Total Revenue': container.totalRevenue || 0,
        'Total Costs': container.totalCosts || 0,
        'Gross Profit': container.grossProfit || 0,
        'Profit Margin %': container.totalRevenue ? ((container.grossProfit / container.totalRevenue) * 100).toFixed(1) : '0',
        'Through Me Payment': container.paymentDistribution?.throughMe?.amount || 0,
        'Direct Payment': container.paymentDistribution?.direct?.amount || 0,
        'Total Payment Collected': (container.paymentDistribution?.throughMe?.amount || 0) + (container.paymentDistribution?.direct?.amount || 0),
        'Outstanding Amount': Math.max(0, (container.totalRevenue || 0) - ((container.paymentDistribution?.throughMe?.amount || 0) + (container.paymentDistribution?.direct?.amount || 0))),
        'Payment Collection %': container.totalRevenue ? (((container.paymentDistribution?.throughMe?.amount || 0) + (container.paymentDistribution?.direct?.amount || 0)) / container.totalRevenue * 100).toFixed(1) : '0',
        'Orders Count': container.orders?.length || 0,
        'Container Status': container.status || 'N/A',
        'Created Date': new Date(container.createdAt).toLocaleDateString()
      }

      // Prepare detailed order payments
      const orderPayments = container.orders?.map((order, index) => ({
        'Order #': index + 1,
        'Order Number': order.orderNumber || 'N/A',
        'Client Name': order.clientName || 'N/A',
        'Carrying Charges': order.carryingCharges?.amount || 0,
        'Payment Type': order.paymentType || 'N/A',
        'Through Me': order.paymentType === 'through_me' ? (order.carryingCharges?.amount || 0) : 0,
        'Direct Payment': order.paymentType === 'direct' ? (order.carryingCharges?.amount || 0) : 0,
        'Order Status': order.status || 'N/A'
      })) || []

      // Combine payment summary and order details
      const csvData = [
        // Payment summary header
        { Type: 'PAYMENT_SUMMARY', ...paymentData },
        // Empty row for separation
        {},
        // Order payments header
        { Type: 'ORDER_PAYMENTS' },
        // Order payments data
        ...orderPayments.map(payment => ({ Type: 'ORDER_PAYMENT', ...payment }))
      ]

      // Convert to CSV
      const allKeys = new Set()
      csvData.forEach(row => Object.keys(row).forEach(key => allKeys.add(key)))
      const headers = Array.from(allKeys)
      
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
      const containerId = container.clientFacingId || container.realContainerId || 'container'
      link.download = `payment-report-${containerId}-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported payment report for container ${containerId}`)
    } catch (error) {
      console.error('Payment export failed:', error)
      toast.error('Failed to export payment report')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg">Loading container details...</span>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ContainerIcon className="h-16 w-16 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">Container not found</h3>
          <p className="text-stone-500 mb-6">The container you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/containers')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Containers
          </Button>
        </div>
      </div>
    )
  }

  // Safe calculations
  const cbmUtilization = container.maxCbm > 0 ? (container.currentCbm / container.maxCbm) * 100 : 0
  const weightUtilization = container.maxWeight > 0 ? (container.currentWeight / container.maxWeight) * 100 : 0

  return (
    <div className="min-h-screen bg-stone-50 p-6">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
        className="max-w-7xl mx-auto"
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
                {getStatusIcon(container.status)}
                <h1 className="text-3xl font-bold text-stone-900">
                  {user?.role === 'client' ? container.clientFacingId : container.realContainerId}
                </h1>
                <Badge className={getStatusColor(container.status)}>
                  {container.status}
                </Badge>
              </div>
              <p className="text-stone-600 mt-2">
                {container.type} Container • Created {formatDate(container.createdAt)}
              </p>
            </div>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={handleExportContainer}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="outline" onClick={() => navigate('/client-allocations')}>
              <Users className="h-4 w-4 mr-2" />
              All Client Allocations
            </Button>
            <Button variant="outline" onClick={fetchContainer}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <Button onClick={() => navigate(`/containers/${id}/edit`)}>
                <Edit className="h-4 w-4 mr-2" />
                Edit Container
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="overview" className="space-y-6">
          <TabsList className="grid w-full grid-cols-5">
            <TabsTrigger value="overview" className="flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="orders" className="flex items-center">
              <Package className="h-4 w-4 mr-2" />
              Orders ({container.orders?.length || 0})
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="payments" className="flex items-center">
              <CreditCard className="h-4 w-4 mr-2" />
              Payments
            </TabsTrigger>
            <TabsTrigger value="timeline" className="flex items-center">
              <Clock className="h-4 w-4 mr-2" />
              Timeline
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="space-y-6">
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
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
                        <h3 className="font-semibold text-stone-900 mb-3">Container Details</h3>
                        <div className="space-y-2 text-sm">
                          {user?.role !== 'client' && (
                            <div className="flex justify-between">
                              <span className="text-stone-500">Real Container ID:</span>
                              <span className="font-medium">{container.realContainerId}</span>
                            </div>
                          )}
                          <div className="flex justify-between">
                            <span className="text-stone-500">Client Facing ID:</span>
                            <span className="font-medium">{container.clientFacingId || 'N/A'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Container Type:</span>
                            <span className="font-medium">{container.type}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Bill Number:</span>
                            <span className="font-medium">{container.billNo || 'Not assigned'}</span>
                          </div>
                          <div className="flex justify-between">
                            <span className="text-stone-500">Seal Number:</span>
                            <span className="font-medium">{container.sealNo || 'Not sealed'}</span>
                          </div>
                        </div>
                      </div>
                      <div>
                        <h3 className="font-semibold text-stone-900 mb-3">Location & Schedule</h3>
                        <div className="space-y-2 text-sm">
                          <div className="flex items-center text-stone-600">
                            <MapPin className="h-4 w-4 mr-2" />
                            <span>Current: {container.location?.current || 'Unknown'}</span>
                          </div>
                          <div className="flex items-center text-stone-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Est. Departure: {formatDateTime(container.estimatedDeparture)}</span>
                          </div>
                          <div className="flex items-center text-stone-600">
                            <Calendar className="h-4 w-4 mr-2" />
                            <span>Est. Arrival: {formatDateTime(container.estimatedArrival)}</span>
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
                          <span className="text-sm font-medium text-stone-700">CBM Utilization</span>
                          <span className="text-sm font-semibold">{cbmUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${getUtilizationColor(cbmUtilization)}`}
                            style={{ width: `${Math.min(cbmUtilization, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                          <span>{container.currentCbm || 0} m³ used</span>
                          <span>{container.maxCbm || 0} m³ total</span>
                        </div>
                      </div>

                      <div>
                        <div className="flex justify-between items-center mb-2">
                          <span className="text-sm font-medium text-stone-700">Weight Utilization</span>
                          <span className="text-sm font-semibold">{weightUtilization.toFixed(1)}%</span>
                        </div>
                        <div className="w-full bg-stone-200 rounded-full h-3">
                          <div
                            className={`h-3 rounded-full ${getUtilizationColor(weightUtilization)}`}
                            style={{ width: `${Math.min(weightUtilization, 100)}%` }}
                          />
                        </div>
                        <div className="flex justify-between text-xs text-stone-500 mt-1">
                          <span>{(container.currentWeight || 0).toLocaleString()} kg used</span>
                          <span>{(container.maxWeight || 0).toLocaleString()} kg total</span>
                        </div>
                      </div>

                      <div className="grid grid-cols-3 gap-4 pt-4 border-t">
                        <div className="text-center">
                          <p className="text-2xl font-bold text-stone-900">{container.orders?.length || 0}</p>
                          <p className="text-sm text-stone-500">Orders</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-stone-900">
                            {container.orders?.reduce((sum, order) => sum + (order.cartonShare || 0), 0) || 0}
                          </p>
                          <p className="text-sm text-stone-500">Cartons</p>
                        </div>
                        <div className="text-center">
                          <p className="text-2xl font-bold text-stone-900">
                            {Math.round((cbmUtilization + weightUtilization) / 2)}%
                          </p>
                          <p className="text-sm text-stone-500">Avg Utilization</p>
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
                        {getStatusIcon(container.status)}
                        <Badge className={`ml-2 ${getStatusColor(container.status)}`}>
                          {container.status.toUpperCase()}
                        </Badge>
                      </div>
                      <p className="text-sm text-stone-500">Current Status</p>
                    </div>

                    {/* Status Actions */}
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <div className="space-y-2">
                        <h4 className="font-medium text-stone-900">Status Actions</h4>
                        {container.status === 'planning' && (
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
                        {container.status === 'loading' && (
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
                        {container.status === 'shipped' && (
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
                      <h4 className="font-medium text-stone-900 mb-3">Container Info</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-stone-500">Created:</span>
                          <span>{formatDate(container.createdAt)}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-stone-500">Last Updated:</span>
                          <span>{formatDate(container.updatedAt)}</span>
                        </div>
                        {user?.role !== 'client' && (
                          <div className="flex justify-between">
                            <span className="text-stone-500">Total Revenue:</span>
                            <span className="font-semibold">
                              {formatCurrency(container.totalRevenue || 0)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>
            </div>
          </TabsContent>

          {/* Orders Tab */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Allocated Orders ({container.orders?.length || 0})
                </CardTitle>
                <CardDescription>Detailed breakdown of orders assigned to this container</CardDescription>
              </CardHeader>
              <CardContent>
                {container.orders && container.orders.length > 0 ? (
                  <div className="space-y-6">
                    {/* Enhanced Client Allocation Summary */}
                    <ClientAllocationSummary 
                      container={container} 
                      showTitle={true}
                      compact={false}
                      showPercentages={true}
                      className="mb-6"
                    />

                    {/* Individual Orders */}
                    <div className="space-y-4">
                      <h3 className="text-lg font-semibold text-stone-900 border-b pb-2">Order Details</h3>
                    {container.orders.map((orderAllocation, index) => {
                      // Get the populated order details
                      const orderDetails = orderAllocation.orderId || orderAllocation;
                      const isPopulated = orderDetails && orderDetails.orderNumber;
                      
                      return (
                        <Card key={index} className="border-l-4 border-l-amber-500 hover:shadow-lg transition-shadow">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className="p-2 bg-amber-100 rounded-lg">
                                  <Package className="h-5 w-5 text-amber-600" />
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-stone-900">
                                    {isPopulated ? orderDetails.orderNumber : `Order #${index + 1}`}
                                  </h3>
                                  <div className="flex items-center space-x-4 text-sm mt-1">
                                    <div className="flex items-center bg-blue-50 px-3 py-1 rounded-full">
                                      <Users className="h-4 w-4 mr-2 text-blue-600" />
                                      <span className="font-medium text-blue-800">
                                        {isPopulated ? orderDetails.clientName : (orderAllocation.clientName || 'Unknown Client')}
                                      </span>
                                    </div>
                                    {isPopulated && orderDetails.priority && (
                                      <Badge variant="outline" className="text-xs">
                                        {orderDetails.priority} Priority
                                      </Badge>
                                    )}
                                    <Badge variant="secondary" className="text-xs">
                                      Order {index + 1} of {container.orders.length}
                                    </Badge>
                                  </div>
                                </div>
                              </div>
                              <div className="text-right">
                                <p className="text-lg font-bold text-green-600">
                                  {formatCurrency(orderAllocation.carryingCharges || 0)}
                                </p>
                                <p className="text-sm text-stone-500">Carrying Charges</p>
                                <p className="text-xs text-blue-600 mt-1">
                                  Client: {isPopulated ? orderDetails.clientName : (orderAllocation.clientName || 'Unknown')}
                                </p>
                              </div>
                            </div>
                          </CardHeader>
                          
                          <CardContent className="space-y-6">
                            {/* Order Summary Stats */}
                            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                              <div className="bg-blue-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-blue-600">{orderAllocation.cbmShare || 0}</p>
                                <p className="text-sm text-blue-700">CBM Allocated</p>
                                <p className="text-xs text-stone-500">
                                  {container.maxCbm > 0 ? ((orderAllocation.cbmShare / container.maxCbm) * 100).toFixed(1) : 0}% of container
                                </p>
                              </div>
                              <div className="bg-green-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-green-600">{(orderAllocation.weightShare || 0).toLocaleString()}</p>
                                <p className="text-sm text-green-700">Weight (kg)</p>
                                <p className="text-xs text-stone-500">
                                  {container.maxWeight > 0 ? ((orderAllocation.weightShare / container.maxWeight) * 100).toFixed(1) : 0}% of container
                                </p>
                              </div>
                              <div className="bg-orange-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-orange-600">{orderAllocation.cartonShare || 0}</p>
                                <p className="text-sm text-orange-700">Cartons</p>
                                <p className="text-xs text-stone-500">Total Cartons</p>
                              </div>
                              <div className="bg-purple-50 p-4 rounded-lg text-center">
                                <p className="text-2xl font-bold text-purple-600">
                                  {isPopulated && orderDetails.items ? orderDetails.items.length : (orderAllocation.itemCount || 'N/A')}
                                </p>
                                <p className="text-sm text-purple-700">Items</p>
                                <p className="text-xs text-stone-500">Total Items</p>
                              </div>
                            </div>

                            {/* Order Details */}
                            {isPopulated && (
                              <div className="border-t pt-4">
                                <h4 className="font-medium text-stone-900 mb-3">Order Information</h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Order Status:</span>
                                      <Badge className={getStatusColor(orderDetails.status || 'unknown')}>
                                        {(orderDetails.status || 'unknown').replace('_', ' ')}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Total Order Value:</span>
                                      <span className="font-medium">{formatCurrency(orderDetails.totalAmount || orderDetails.totalPrice || 0)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Order CBM:</span>
                                      <span className="font-medium">{orderDetails.totalCbm || 
                                        (orderDetails.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCbm || 0)), 0) || 0)} m³</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Order Weight:</span>
                                      <span className="font-medium">{(orderDetails.totalWeight || 
                                        (orderDetails.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitWeight || 0)), 0) || 0)).toLocaleString()} kg</span>
                                    </div>
                                  </div>
                                  <div className="space-y-2">
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Payment Type:</span>
                                      <Badge variant={orderAllocation.paymentType === 'THROUGH_ME' ? 'default' : 'secondary'}>
                                        {orderAllocation.paymentType === 'THROUGH_ME' ? 'Through Agent' : 'Client Direct'}
                                      </Badge>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Created Date:</span>
                                      <span className="font-medium">{formatDate(orderDetails.createdAt)}</span>
                                    </div>
                                    <div className="flex justify-between">
                                      <span className="text-stone-500">Deadline:</span>
                                      <span className="font-medium text-red-600">{formatDate(orderDetails.deadline)}</span>
                                    </div>
                                    {orderDetails.notes && (
                                      <div className="flex justify-between">
                                        <span className="text-stone-500">Notes:</span>
                                        <span className="font-medium text-sm truncate max-w-32" title={orderDetails.notes}>
                                          {orderDetails.notes}
                                        </span>
                                      </div>
                                    )}
                                  </div>
                                </div>
                              </div>
                            )}

                            {/* Container Item Allocation */}
                            {/* Debug: Let's see what data we actually have */}
                            {console.log('🔍 [CONTAINER DEBUG] Order Allocation Data:', orderAllocation)}
                            {orderAllocation.itemAllocations && orderAllocation.itemAllocations.length > 0 ? (
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-stone-900">Items Allocated to Container ({orderAllocation.itemAllocations.length})</h4>
                                  {isPopulated && (
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/orders/${orderDetails._id}`}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Full Order
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                                <div className="space-y-2 max-h-48 overflow-y-auto">
                                  {orderAllocation.itemAllocations.slice(0, 5).map((allocation, itemIndex) => {
                                    // Find the original item details if order is populated
                                    const originalItem = isPopulated && orderDetails.items ? 
                                      orderDetails.items.find(item => item._id === allocation.itemId || item.itemCode === allocation.itemCode) : 
                                      null;
                                    
                                    console.log('📦 [CONTAINER DETAILS] Item Allocation:', allocation);
                                    console.log('📦 [CONTAINER DETAILS] Original Item:', originalItem);
                                    
                                    return (
                                      <div key={itemIndex} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-sm">
                                        <div className="flex-1">
                                          <p className="font-medium text-stone-900">
                                            {originalItem?.itemCode || allocation.itemCode || `Item ${itemIndex + 1}`}
                                          </p>
                                          <p className="text-stone-500">
                                            {originalItem?.description || allocation.description || 'Container allocated item'}
                                          </p>
                                        </div>
                                        <div className="text-right space-x-4">
                                          <span className="text-stone-600">{allocation.allocatedQuantity || allocation.quantity || 0} qty</span>
                                          <span className="text-stone-600">{allocation.allocatedCartons || allocation.cartons || 0} ctn</span>
                                          <span className="text-stone-600">{allocation.allocatedCbm || allocation.cbm || 0} m³</span>
                                          <span className="font-medium">
                                            {formatCurrency(allocation.allocatedValue || allocation.value || allocation.totalPrice || 0)}
                                          </span>
                                        </div>
                                      </div>
                                    );
                                  })}
                                  {orderAllocation.itemAllocations.length > 5 && (
                                    <div className="text-center py-2">
                                      <span className="text-sm text-stone-500">
                                        Showing 5 of {orderAllocation.itemAllocations.length} allocated items
                                      </span>
                                    </div>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <div className="border-t pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="font-medium text-stone-900">Order Items Summary</h4>
                                  {isPopulated && (
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/orders/${orderDetails._id}`}>
                                        <Eye className="h-4 w-4 mr-1" />
                                        View Full Order
                                      </Link>
                                    </Button>
                                  )}
                                </div>
                                
                                {/* Show order-level allocation summary */}
                                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                                  <div className="flex items-center mb-2">
                                    <Package className="h-5 w-5 text-blue-500 mr-2" />
                                    <div>
                                      <p className="font-medium text-blue-800">Container Allocation Summary</p>
                                      <p className="text-sm text-blue-700">
                                        This order is allocated to the container at the order level. Individual item breakdowns are handled through the order management system.
                                      </p>
                                    </div>
                                  </div>
                                  
                                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-3">
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-blue-600">{orderAllocation.cbmShare || 0}</p>
                                      <p className="text-xs text-blue-700">CBM Allocated</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-green-600">{(orderAllocation.weightShare || 0).toLocaleString()}</p>
                                      <p className="text-xs text-green-700">Weight (kg)</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-orange-600">{orderAllocation.cartonShare || 0}</p>
                                      <p className="text-xs text-orange-700">Cartons</p>
                                    </div>
                                    <div className="text-center">
                                      <p className="text-lg font-bold text-purple-600">{formatCurrency(orderAllocation.carryingCharges || 0)}</p>
                                      <p className="text-xs text-purple-700">Revenue</p>
                                    </div>
                                  </div>
                                </div>
                                
                                {/* Show items from the original order if available */}
                                {isPopulated && orderDetails.items && orderDetails.items.length > 0 && (
                                  <div>
                                    <div className="flex items-center justify-between mb-3">
                                      <h5 className="font-medium text-stone-700">Items in Original Order</h5>
                                      <Badge variant="outline" className="text-xs">
                                        Reference Only - Allocation handled at order level
                                      </Badge>
                                    </div>
                                    <div className="space-y-2 max-h-48 overflow-y-auto">
                                      {orderDetails.items.slice(0, 3).map((item, itemIndex) => (
                                        <div key={itemIndex} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg text-sm border border-stone-200">
                                          <div className="flex-1">
                                            <p className="font-medium text-stone-700">{item.itemCode || `Item ${itemIndex + 1}`}</p>
                                            <p className="text-stone-500 text-xs">{item.description || 'No description'}</p>
                                          </div>
                                          <div className="text-right space-x-3 text-xs text-stone-600">
                                            <span>{item.quantity || 0} qty</span>
                                            <span>{item.cartons || 0} ctn</span>
                                            <span>{(item.unitCbm ? (item.quantity * item.unitCbm) : item.cbm || 0)} m³</span>
                                            <span className="font-medium">{formatCurrency((item.totalPrice || item.totalAmount || (item.quantity * item.unitPrice)) || 0)}</span>
                                          </div>
                                        </div>
                                      ))}
                                      {orderDetails.items.length > 3 && (
                                        <div className="text-center py-2">
                                          <Button variant="ghost" size="sm" asChild>
                                            <Link to={`/orders/${orderDetails._id}`}>
                                              View all {orderDetails.items.length} items in order
                                            </Link>
                                          </Button>
                                        </div>
                                      )}
                                    </div>
                                  </div>
                                )}
                                
                                {/* Helpful information and suggestions */}
                                <div className="mt-4 space-y-3">
                                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                                    <div className="flex items-start">
                                      <AlertTriangle className="h-4 w-4 text-amber-500 mr-2 mt-0.5" />
                                      <div className="text-sm">
                                        <p className="font-medium text-amber-800">About Container Allocation</p>
                                        <p className="text-amber-700 mt-1">
                                          This system tracks allocations at the order level for simplified container management. 
                                          For detailed item-level allocation tracking, visit the order details page.
                                        </p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {(user?.role === 'admin' || user?.role === 'staff') && (
                                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                                      <div className="flex items-start">
                                        <Package className="h-4 w-4 text-blue-500 mr-2 mt-0.5" />
                                        <div className="text-sm">
                                          <p className="font-medium text-blue-800">For Enhanced Item Tracking</p>
                                          <p className="text-blue-700 mt-1">
                                            Consider using the advanced allocation system that tracks individual item quantities per container. 
                                            This provides granular control over partial item allocations.
                                          </p>
                                          <Button 
                                            variant="outline" 
                                            size="sm" 
                                            className="mt-2 text-blue-700 border-blue-300 hover:bg-blue-100"
                                            onClick={() => navigate('/warehouse/allocation')}
                                          >
                                            <Plus className="h-3 w-3 mr-1" />
                                            Try Advanced Allocation
                                          </Button>
                                        </div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              </div>
                            )}

                            {/* Allocation Efficiency */}
                            <div className="border-t pt-4">
                              <h4 className="font-medium text-stone-900 mb-3">Allocation Efficiency</h4>
                              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p className="text-lg font-bold text-gray-700">
                                    {(() => {
                                      const orderTotalCbm = orderDetails?.totalCbm || 
                                        (orderDetails?.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitCbm || 0)), 0) || 0);
                                      return orderTotalCbm > 0 ? 
                                        ((orderAllocation.cbmShare / orderTotalCbm) * 100).toFixed(1) : 
                                        orderAllocation.cbmShare > 0 ? '100' : '0';
                                    })()}%
                                  </p>
                                  <p className="text-sm text-gray-600">CBM Utilization</p>
                                  <p className="text-xs text-gray-500">of order total</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p className="text-lg font-bold text-gray-700">
                                    {(() => {
                                      const orderTotalWeight = orderDetails?.totalWeight || 
                                        (orderDetails?.items?.reduce((sum, item) => sum + ((item.quantity || 0) * (item.unitWeight || 0)), 0) || 0);
                                      return orderTotalWeight > 0 ? 
                                        ((orderAllocation.weightShare / orderTotalWeight) * 100).toFixed(1) : 
                                        orderAllocation.weightShare > 0 ? '100' : '0';
                                    })()}%
                                  </p>
                                  <p className="text-sm text-gray-600">Weight Utilization</p>
                                  <p className="text-xs text-gray-500">of order total</p>
                                </div>
                                <div className="text-center p-3 bg-gray-50 rounded-lg">
                                  <p className="text-lg font-bold text-gray-700">
                                    {(() => {
                                      const orderTotalValue = orderDetails?.totalAmount || orderDetails?.totalPrice || 0;
                                      return orderTotalValue > 0 ? 
                                        ((orderAllocation.carryingCharges / orderTotalValue) * 100).toFixed(1) : 
                                        orderAllocation.carryingCharges > 0 ? 'N/A' : '0';
                                    })()}%
                                  </p>
                                  <p className="text-sm text-gray-600">Value Ratio</p>
                                  <p className="text-xs text-gray-500">charges to order value</p>
                                </div>
                              </div>
                            </div>

                            {/* Quick Actions */}
                            <div className="border-t pt-4">
                              <div className="flex items-center justify-between">
                                <div className="flex space-x-2">
                                  {isPopulated && (
                                    <Button variant="outline" size="sm" asChild>
                                      <Link to={`/orders/${orderDetails._id}`}>
                                        <FileText className="h-4 w-4 mr-1" />
                                        View Order Details
                                      </Link>
                                    </Button>
                                  )}
                                  {(user?.role === 'admin' || user?.role === 'staff') && (
                                    <Button variant="outline" size="sm" onClick={() => handleModifyAllocation(orderAllocation)}>
                                      <Edit className="h-4 w-4 mr-1" />
                                      Modify Allocation
                                    </Button>
                                  )}
                                </div>
                                <div className="text-sm text-stone-500">
                                  Allocation ID: {orderAllocation._id ? orderAllocation._id.slice(-8) : `${index + 1}`}
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      );
                    })}
                    </div> {/* End Individual Orders */}

                    {/* Container Summary */}
                    <Card className="bg-stone-50 border-stone-200">
                      <CardHeader>
                        <CardTitle className="text-lg text-stone-900">Container Allocation Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center">
                            <p className="text-2xl font-bold text-stone-900">
                              {container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0).toFixed(1) || 0}
                            </p>
                            <p className="text-sm text-stone-600">Total CBM Used</p>
                            <p className="text-xs text-stone-500">out of {container.maxCbm} m³</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-stone-900">
                              {container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0).toLocaleString() || 0}
                            </p>
                            <p className="text-sm text-stone-600">Total Weight (kg)</p>
                            <p className="text-xs text-stone-500">out of {(container.maxWeight || 0).toLocaleString()} kg</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-stone-900">
                              {container.orders?.reduce((sum, order) => sum + (order.cartonShare || 0), 0) || 0}
                            </p>
                            <p className="text-sm text-stone-600">Total Cartons</p>
                            <p className="text-xs text-stone-500">across all orders</p>
                          </div>
                          <div className="text-center">
                            <p className="text-2xl font-bold text-green-600">
                              {formatCurrency(container.orders?.reduce((sum, order) => sum + (order.carryingCharges || 0), 0) || 0)}
                            </p>
                            <p className="text-sm text-stone-600">Total Revenue</p>
                            <p className="text-xs text-stone-500">carrying charges</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <Package className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                    <h3 className="text-lg font-medium text-stone-900 mb-2">No orders allocated</h3>
                    <p className="text-stone-500 mb-6">This container doesn't have any orders allocated yet.</p>
                    {(user?.role === 'admin' || user?.role === 'staff') && (
                      <Button onClick={() => navigate('/warehouse/allocation')}>
                        <Plus className="h-4 w-4 mr-2" />
                        Allocate Orders
                      </Button>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center">
                    <DollarSign className="h-5 w-5 mr-2" />
                    Financial Summary
                  </div>
                  {user?.role !== 'client' && (
                    <div className="flex items-center gap-2">
                      {isEditingFinancials ? (
                        <>
                          <Button onClick={handleSaveFinancials} size="sm" disabled={loading}>
                            {loading ? 'Saving...' : 'Save Changes'}
                          </Button>
                          <Button onClick={handleCancelFinancialEdit} variant="outline" size="sm">
                            Cancel
                          </Button>
                        </>
                      ) : (
                        <Button onClick={() => setIsEditingFinancials(true)} variant="outline" size="sm">
                          <Edit className="h-4 w-4 mr-1" />
                          Edit Financials
                        </Button>
                      )}
                    </div>
                  )}
                </CardTitle>
                <CardDescription>Container charges and financial breakdown</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                  {/* Base Charges */}
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-4">Base Charges</h3>
                    <div className="space-y-3">
                      {isEditingFinancials ? (
                        // Edit Mode
                        <div className="grid grid-cols-2 gap-4">
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">GST</label>
                            <input
                              type="number"
                              value={editFinancials.gst}
                              onChange={(e) => setEditFinancials(prev => ({ ...prev, gst: e.target.value }))}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Duty</label>
                            <input
                              type="number"
                              value={editFinancials.duty}
                              onChange={(e) => setEditFinancials(prev => ({ ...prev, duty: e.target.value }))}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Misc</label>
                            <input
                              type="number"
                              value={editFinancials.misc}
                              onChange={(e) => setEditFinancials(prev => ({ ...prev, misc: e.target.value }))}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                          <div>
                            <label className="block text-sm font-medium text-stone-700 mb-1">Extra Charge</label>
                            <input
                              type="number"
                              value={editFinancials.extraCharge}
                              onChange={(e) => setEditFinancials(prev => ({ ...prev, extraCharge: e.target.value }))}
                              className="w-full px-3 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500"
                              placeholder="0"
                              min="0"
                              step="0.01"
                            />
                          </div>
                        </div>
                      ) : (
                        // View Mode
                        <>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-stone-900">GST</p>
                              <p className="text-sm text-stone-500">Goods and Services Tax</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-stone-900">{formatCurrency(container.baseCharges?.gst || 0)}</p>
                              <p className="text-sm text-stone-500">{container.baseCharges?.currency || 'INR'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-stone-900">Duty</p>
                              <p className="text-sm text-stone-500">Customs Duty</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-stone-900">{formatCurrency(container.baseCharges?.duty || 0)}</p>
                              <p className="text-sm text-stone-500">{container.baseCharges?.currency || 'INR'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-stone-900">Miscellaneous</p>
                              <p className="text-sm text-stone-500">Misc Charges</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-stone-900">{formatCurrency(container.baseCharges?.misc || 0)}</p>
                              <p className="text-sm text-stone-500">{container.baseCharges?.currency || 'INR'}</p>
                            </div>
                          </div>
                          <div className="flex items-center justify-between p-3 border rounded-lg">
                            <div>
                              <p className="font-medium text-stone-900">Extra Charge</p>
                              <p className="text-sm text-stone-500">Additional Charges</p>
                            </div>
                            <div className="text-right">
                              <p className="font-semibold text-stone-900">{formatCurrency(container.baseCharges?.extraCharge || 0)}</p>
                              <p className="text-sm text-stone-500">{container.baseCharges?.currency || 'INR'}</p>
                            </div>
                          </div>
                        </>
                      )}
                    </div>
                  </div>

                  {/* Profit Summary */}
                  {user?.role !== 'client' && (
                    <div>
                      <h3 className="font-semibold text-stone-900 mb-4">Profit Summary</h3>
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-600">
                            {formatCurrency(container.totalRevenue || 0)}
                          </p>
                          <p className="text-sm text-green-700">Total Revenue</p>
                          <p className="text-xs text-stone-500">Carrying Charges</p>
                        </div>
                        <div className="text-center p-4 bg-red-50 rounded-lg">
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(container.totalCosts || 0)}
                          </p>
                          <p className="text-sm text-red-700">Total Costs</p>
                          <p className="text-xs text-stone-500">Base + Container Charges</p>
                        </div>
                        <div className="text-center p-4 bg-amber-50 rounded-lg">
                          <p className="text-2xl font-bold text-amber-600">
                            {formatCurrency(container.grossProfit || 0)}
                          </p>
                          <p className="text-sm text-amber-700">Gross Profit</p>
                          <p className="text-xs text-stone-500">
                            {(container.profitMargin || 0).toFixed(1)}% margin
                          </p>
                        </div>
                      </div>
                      <div className="mt-4 text-center text-sm text-stone-500">
                        <p>Profit Formula: Total Carrying Charges - Base Charges (GST + Duty + Misc + Extra)</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Payments Tab */}
          <TabsContent value="payments">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CreditCard className="h-5 w-5 mr-2" />
                  Payment Collections & Tracking
                </CardTitle>
                <CardDescription>Track payment status and collections for this container's orders</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-6">
                  {/* Payment Summary Metrics */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="text-center p-4 bg-green-50 rounded-lg border border-green-200">
                      <Wallet className="h-6 w-6 text-green-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-green-800">
                        {formatCurrency(
                          container.orders?.reduce((sum, order) => {
                            // For CLIENT_DIRECT: show carrying charges you need to collect
                            // For THROUGH_ME: show total amount you need to collect
                            return sum + (order.carryingCharges || 0);
                          }, 0) || 0
                        )}
                      </p>
                      <p className="text-sm text-green-600">To Collect</p>
                      <p className="text-xs text-stone-500">What I need to collect from clients</p>
                    </div>
                    
                    <div className="text-center p-4 bg-blue-50 rounded-lg border border-blue-200">
                      <Banknote className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-blue-800">
                        {formatCurrency(
                          container.orders?.filter(order => order.paymentType === 'THROUGH_ME')
                            .reduce((sum, order) => {
                              // For THROUGH_ME: calculate product cost (total - carrying charges)
                              // For CLIENT_DIRECT: ₹0 because client pays supplier directly
                              return sum + 0; // Placeholder - would need product cost data
                            }, 0) || 0
                        )}
                      </p>
                      <p className="text-sm text-blue-600">To Supplier</p>
                      <p className="text-xs text-stone-500">What goes to suppliers</p>
                    </div>
                  </div>

                  {/* Payment Status by Client */}
                  <div>
                    <h3 className="font-semibold text-stone-900 mb-4 flex items-center">
                      <Users className="h-4 w-4 mr-2" />
                      Payment Status by Client
                    </h3>
                    
                    {(() => {
                      // Group orders by client for payment tracking
                      const clientPayments = new Map();
                      
                      container.orders?.forEach(order => {
                        const orderDetails = order.orderId || order;
                        const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client';
                        const clientId = orderDetails?.clientId || order.clientId || 'unknown';
                        
                        if (!clientPayments.has(clientId)) {
                          clientPayments.set(clientId, {
                            clientName,
                            throughMeAmount: 0,
                            directAmount: 0,
                            throughMeOrders: [],
                            directOrders: [],
                            totalOrders: 0
                          });
                        }
                        
                        const client = clientPayments.get(clientId);
                        client.totalOrders += 1;
                        
                        if (order.paymentType === 'THROUGH_ME') {
                          client.throughMeAmount += order.carryingCharges || 0;
                          client.throughMeOrders.push({
                            orderNumber: orderDetails?.orderNumber || `Order ${client.totalOrders}`,
                            amount: order.carryingCharges || 0
                          });
                        } else {
                          client.directAmount += order.carryingCharges || 0;
                          client.directOrders.push({
                            orderNumber: orderDetails?.orderNumber || `Order ${client.totalOrders}`,
                            amount: order.carryingCharges || 0
                          });
                        }
                      });
                      
                      return Array.from(clientPayments.values()).map((client, index) => (
                        <Card key={index} className={`border-l-4 ${client.throughMeAmount > 0 ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                          <CardHeader className="pb-3">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center space-x-3">
                                <div className={`p-2 rounded-full ${client.throughMeAmount > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                                  <Users className={`h-5 w-5 ${client.throughMeAmount > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                                </div>
                                <div>
                                  <h4 className="font-semibold text-stone-900">{client.clientName}</h4>
                                  <p className="text-sm text-stone-600">
                                    {client.totalOrders} orders in this container
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                {client.throughMeAmount > 0 ? (
                                  <>
                                    <p className="text-lg font-bold text-red-600">
                                      {formatCurrency(client.throughMeAmount)}
                                    </p>
                                    <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                                      Collection Due
                                    </Badge>
                                  </>
                                ) : (
                                  <>
                                    <p className="text-lg font-bold text-green-600">
                                      {formatCurrency(client.directAmount)}
                                    </p>
                                    <Badge className="bg-green-100 text-green-800 border-green-300">
                                      Direct Payment
                                    </Badge>
                                  </>
                                )}
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-xl font-bold text-green-800">
                                  {formatCurrency(client.throughMeAmount + client.directAmount)}
                                </p>
                                <p className="text-sm text-green-600">To Collect</p>
                                <p className="text-xs text-stone-500">My carrying charges</p>
                              </div>
                              <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <p className="text-xl font-bold text-blue-800">₹0.00</p>
                                <p className="text-sm text-blue-600">To Supplier</p>
                                <p className="text-xs text-stone-500">Client pays direct</p>
                              </div>
                            </div>
                            
                            {/* Show orders requiring collection */}
                            {client.throughMeOrders.length > 0 && (
                              <div className="mt-4 pt-4 border-t border-stone-200">
                                <h5 className="font-medium text-stone-900 mb-2 flex items-center">
                                  <CreditCard className="h-4 w-4 mr-2" />
                                  Orders Requiring Collection
                                </h5>
                                <div className="space-y-2">
                                  {client.throughMeOrders.map((order, orderIndex) => (
                                    <div key={orderIndex} className="flex justify-between items-center bg-yellow-50 p-2 rounded border border-yellow-200">
                                      <span className="font-medium text-yellow-800">{order.orderNumber}</span>
                                      <span className="font-bold text-red-700">{formatCurrency(order.amount)}</span>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                            
                            {/* Action Buttons */}
                            <div className="mt-4 pt-4 border-t border-stone-200 flex justify-between items-center">
                              <div className="flex items-center space-x-2">
                                <Badge variant="outline" className="text-xs">
                                  {client.throughMeAmount > 0 ? 
                                    (client.throughMeAmount > 100000 ? 'High Priority' : client.throughMeAmount > 50000 ? 'Medium Priority' : 'Normal Priority') :
                                    'No Collection Needed'
                                  }
                                </Badge>
                              </div>
                              {client.throughMeAmount > 0 && (
                                <div className="flex items-center space-x-2">
                                  <Button variant="outline" size="sm" onClick={() => handleViewClientPaymentDetails(client)}>
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Client Details
                                  </Button>
                                  <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkPaymentCollected(client)}>
                                    <Banknote className="h-4 w-4 mr-1" />
                                    Mark as Collected
                                  </Button>
                                </div>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ));
                    })()}
                  </div>

                  {/* Payment Summary and Actions */}
                  <Card className="bg-stone-50 border-stone-200">
                    <CardHeader>
                      <CardTitle className="text-lg text-stone-900">Container Payment Summary</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div className="text-center">
                          <p className="text-3xl font-bold text-green-600">
                            {formatCurrency(
                              (container.orders?.reduce((sum, order) => sum + (order.carryingCharges || 0), 0) || 0)
                            )}
                          </p>
                          <p className="text-sm text-stone-600">Total To Collect</p>
                          <p className="text-xs text-stone-500">My carrying charges from all clients</p>
                        </div>
                        <div className="text-center">
                          <p className="text-3xl font-bold text-blue-600">₹0.00</p>
                          <p className="text-sm text-stone-600">Total To Supplier</p>
                          <p className="text-xs text-stone-500">
                            Clients handle supplier payments directly
                          </p>
                        </div>
                      </div>
                      
                      {/* Quick Actions */}
                      <div className="mt-6 pt-4 border-t border-stone-300 flex justify-center space-x-4">
                        <Button variant="outline" onClick={() => navigate('/payment-collections')}>
                          <CreditCard className="h-4 w-4 mr-2" />
                          View All Collections
                        </Button>
                        <Button variant="outline" onClick={handleExportPaymentReport}>
                          <Download className="h-4 w-4 mr-2" />
                          Export Payment Report
                        </Button>
                        {(user?.role === 'admin' || user?.role === 'staff') && (
                          <Button onClick={() => handleUpdatePaymentStatus()}>
                            <RefreshCw className="h-4 w-4 mr-2" />
                            Update Payment Status
                          </Button>
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Timeline Tab */}
          <TabsContent value="timeline">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Clock className="h-5 w-5 mr-2" />
                  Container Timeline
                </CardTitle>
                <CardDescription>Complete history of container activities and status changes</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center p-4 bg-blue-50 rounded-lg">
                    <div className="flex items-center justify-center w-10 h-10 bg-blue-100 rounded-full mr-4">
                      <ContainerIcon className="h-5 w-5 text-blue-600" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-semibold text-stone-900">Container Created</h4>
                      <p className="text-sm text-stone-500">Container was created in the system</p>
                      <p className="text-xs text-stone-400 mt-1">{formatDateTime(container.createdAt)}</p>
                    </div>
                  </div>
                  
                  {container.status !== 'planning' && (
                    <div className="flex items-center p-4 bg-yellow-50 rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-yellow-100 rounded-full mr-4">
                        <Package className="h-5 w-5 text-yellow-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-stone-900">Loading Started</h4>
                        <p className="text-sm text-stone-500">Container loading process initiated</p>
                        <p className="text-xs text-stone-400 mt-1">{formatDateTime(container.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                  
                  {container.status === 'shipped' || container.status === 'delivered' ? (
                    <div className="flex items-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mr-4">
                        <Truck className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-stone-900">Container Shipped</h4>
                        <p className="text-sm text-stone-500">Container has been shipped</p>
                        <p className="text-xs text-stone-400 mt-1">{formatDateTime(container.updatedAt)}</p>
                      </div>
                    </div>
                  ) : null}
                  
                  {container.status === 'delivered' && (
                    <div className="flex items-center p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-center w-10 h-10 bg-green-100 rounded-full mr-4">
                        <CheckCircle className="h-5 w-5 text-green-600" />
                      </div>
                      <div className="flex-1">
                        <h4 className="font-semibold text-stone-900">Container Delivered</h4>
                        <p className="text-sm text-stone-500">Container has been successfully delivered</p>
                        <p className="text-xs text-stone-400 mt-1">{formatDateTime(container.updatedAt)}</p>
                      </div>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default ContainerDetails