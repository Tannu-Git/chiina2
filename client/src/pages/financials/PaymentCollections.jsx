import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  CreditCard,
  Users,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle,
  Clock,
  Eye,
  Download,
  RefreshCw,
  Building2,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Receipt,
  Banknote,
  Wallet,
  Target,
  BarChart3
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const PaymentCollections = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [containers, setContainers] = useState([])
  const [clientPayments, setClientPayments] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('collections')

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch payment data
  const handleViewClientDetails = (client) => {
    toast.info(`Viewing payment details for ${client.clientName}. Advanced client payment dashboard coming soon!`)
    // TODO: Navigate to detailed client payment page
    // navigate(`/payment-collections/client/${client.clientId}`)
  }

  const handleMarkAsCollected = (client) => {
    toast.info(`Marking payment as collected for ${client.clientName} (${formatCurrency(client.totalDue)}). Payment confirmation system coming soon!`)
    // TODO: Open payment confirmation modal
    // setSelectedClient(client)
    // setShowCollectionModal(true)
  }

  const handleExportCollections = () => {
    try {
      // Prepare detailed collections export data
      const collectionsData = []

      // Add summary row
      collectionsData.push({
        'Type': 'SUMMARY',
        'Description': 'Payment Collections Summary',
        'Total Due': formatCurrency(summaryMetrics.totalDue),
        'Clients with Dues': summaryMetrics.clientsWithDues,
        'Total Clients': summaryMetrics.totalClients,
        'Average Due per Client': formatCurrency(summaryMetrics.avgDuePerClient),
        'Collection Rate %': summaryMetrics.collectiveEfficiency.toFixed(1),
        'Total Through Me': formatCurrency(summaryMetrics.totalThroughMe),
        'Total Direct': formatCurrency(summaryMetrics.totalDirect),
        'Export Date': new Date().toLocaleString()
      })

      // Add client-wise data
      filteredClientPayments.forEach(client => {
        // Main client record
        collectionsData.push({
          'Type': 'CLIENT',
          'Client Name': client.clientName,
          'Client ID': client.clientId,
          'Total Due': formatCurrency(client.totalDue),
          'Through Me Amount': formatCurrency(client.throughMeAmount),
          'Direct Amount': formatCurrency(client.directAmount),
          'Total Business': formatCurrency(client.throughMeAmount + client.directAmount),
          'Containers': client.containers,
          'Order Count': client.orderCount,
          'Collection Status': client.totalDue > 0 ? 'Pending' : 'Complete',
          'Priority': client.totalDue > 100000 ? 'High' : client.totalDue > 50000 ? 'Medium' : 'Normal',
          'Collection Rate %': client.directAmount > 0 ? ((client.directAmount / (client.throughMeAmount + client.directAmount)) * 100).toFixed(1) : '0'
        })

        // Add order-level details for clients with dues
        if (client.totalDue > 0 && client.orders) {
          client.orders.filter(order => order.paymentType === 'THROUGH_ME').forEach(order => {
            collectionsData.push({
              'Type': 'ORDER_DETAIL',
              'Client Name': client.clientName,
              'Order Number': order.orderNumber,
              'Container Name': order.containerName,
              'Amount Due': formatCurrency(order.amount),
              'Payment Type': order.paymentType,
              'CBM Share': order.cbmShare?.toFixed(2) || '0',
              'Weight Share': order.weightShare?.toFixed(1) || '0',
              'Partial Allocation': order.partialAllocation ? 'Yes' : 'No',
              'Order Status': order.status || 'Unknown'
            })
          })
        }
      })

      if (collectionsData.length === 0) {
        toast.error('No payment collection data to export')
        return
      }

      // Convert to CSV
      const headers = Object.keys(collectionsData[0])
      const csvContent = [
        headers.join(','),
        ...collectionsData.map(row => 
          headers.map(header => {
            const value = row[header] || ''
            // Escape commas and quotes
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      // Download CSV
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `payment-collections-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success(`Payment collections exported successfully! (${collectionsData.length} records)`)
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export payment collections')
    }
  }

  const fetchPaymentData = async () => {
    try {
      setLoading(true)
      console.log('💰 [PAYMENT COLLECTIONS] Fetching payment data')
      
      if (!isAuthenticated || !token) {
        console.error('❌ [PAYMENT COLLECTIONS] Not authenticated')
        toast.error('Please log in to view payment data')
        navigate('/login')
        return
      }
      
      // Fetch containers with order allocations
      const response = await axios.get('/api/containers')
      const containerData = response.data.containers || []
      
      setContainers(containerData)
      
      // Process client payment data
      const paymentMap = new Map()
      
      containerData.forEach(container => {
        container.orders?.forEach(order => {
          const orderDetails = order.orderId || order
          const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client'
          const clientId = orderDetails?.clientId || order.clientId || 'unknown'
          const paymentType = order.paymentType || 'CLIENT_DIRECT'
          const amount = order.carryingCharges || 0
          
          if (!paymentMap.has(clientId)) {
            paymentMap.set(clientId, {
              clientId,
              clientName,
              totalDue: 0,
              throughMeAmount: 0,
              directAmount: 0,
              containers: new Set(),
              orders: [],
              lastPaymentDate: null,
              status: 'pending'
            })
          }
          
          const client = paymentMap.get(clientId)
          client.containers.add(container._id)
          client.orders.push({
            orderId: orderDetails?._id || order.orderId,
            orderNumber: orderDetails?.orderNumber || 'Unknown',
            containerId: container._id,
            containerName: container.realContainerId || container.clientFacingId,
            amount,
            paymentType,
            status: container.status
          })
          
          if (paymentType === 'THROUGH_ME') {
            client.throughMeAmount += amount
            client.totalDue += amount
          } else {
            client.directAmount += amount
          }
        })
      })
      
      const clientList = Array.from(paymentMap.values()).map(client => ({
        ...client,
        containers: client.containers.size,
        orderCount: client.orders.length,
        // Determine collection status
        status: client.totalDue === 0 ? 'no_collection' : 
               client.totalDue > 0 ? 'pending' : 'collected'
      }))
      
      // Sort by amount due (highest first)
      clientList.sort((a, b) => b.totalDue - a.totalDue)
      
      setClientPayments(clientList)
      console.log('💰 [PAYMENT COLLECTIONS] Processed', clientList.length, 'client payment records')
      
    } catch (error) {
      console.error('❌ [PAYMENT COLLECTIONS] Error fetching payment data:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to load payment data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchPaymentData()
  }, [])

  // Filter client payments
  const filteredClientPayments = clientPayments.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'pending' && client.totalDue > 0) ||
      (statusFilter === 'no_collection' && client.totalDue === 0) ||
      (statusFilter === 'high_value' && client.totalDue > 100000)
    
    return matchesSearch && matchesStatus
  })

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const totalClients = clientPayments.length
    const clientsWithDues = clientPayments.filter(c => c.totalDue > 0).length
    const totalDue = clientPayments.reduce((sum, c) => sum + c.totalDue, 0)
    const totalDirect = clientPayments.reduce((sum, c) => sum + c.directAmount, 0)
    const avgDuePerClient = clientsWithDues > 0 ? totalDue / clientsWithDues : 0
    
    return {
      totalClients,
      clientsWithDues,
      totalDue,
      totalDirect,
      avgDuePerClient,
      collectiveEfficiency: totalClients > 0 ? ((totalClients - clientsWithDues) / totalClients * 100) : 0
    }
  }, [clientPayments])

  const getStatusColor = (status) => {
    switch (status) {
      case 'pending':
        return 'bg-yellow-100 text-yellow-800 border-yellow-300'
      case 'no_collection':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'high_value':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-gray-100 text-gray-800 border-gray-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'pending':
        return <Clock className="h-4 w-4" />
      case 'no_collection':
        return <CheckCircle className="h-4 w-4" />
      case 'high_value':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-green-500"></div>
          <span className="text-lg">Loading payment collections...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Payment Collections</h1>
            <p className="text-muted-foreground mt-1">
              Track and manage client payment collections and dues
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchPaymentData}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCollections}>
              <Download className="h-4 w-4 mr-2" />
              Export Collections
            </Button>
            <Button onClick={() => navigate('/financials')}>
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Dashboard
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-gradient-to-br from-green-50 to-emerald-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Wallet className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-800">{formatCurrency(summaryMetrics.totalDue)}</p>
              <p className="text-sm text-green-600">Total Due</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-blue-50 to-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-800">{summaryMetrics.clientsWithDues}</p>
              <p className="text-sm text-blue-600">Clients with Dues</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-purple-50 to-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <Building2 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-800">{summaryMetrics.totalClients}</p>
              <p className="text-sm text-purple-600">Total Clients</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-orange-50 to-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <Target className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-800">{formatCurrency(summaryMetrics.avgDuePerClient)}</p>
              <p className="text-sm text-orange-600">Avg Due/Client</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-indigo-50 to-indigo-50 border-indigo-200">
            <CardContent className="p-4 text-center">
              <ArrowDownLeft className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-indigo-800">{formatCurrency(summaryMetrics.totalDirect)}</p>
              <p className="text-sm text-indigo-600">Direct Payments</p>
            </CardContent>
          </Card>
          
          <Card className="bg-gradient-to-br from-teal-50 to-teal-50 border-teal-200">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-teal-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-teal-800">{summaryMetrics.collectiveEfficiency.toFixed(1)}%</p>
              <p className="text-sm text-teal-600">Collection Rate</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search clients by name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="w-full"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  <SelectItem value="pending">With Dues</SelectItem>
                  <SelectItem value="no_collection">No Collection Needed</SelectItem>
                  <SelectItem value="high_value">High Value (₹1L+)</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="collections">
              <CreditCard className="h-4 w-4 mr-2" />
              Collections Due ({summaryMetrics.clientsWithDues})
            </TabsTrigger>
            <TabsTrigger value="overview">
              <BarChart3 className="h-4 w-4 mr-2" />
              Payment Overview ({summaryMetrics.totalClients})
            </TabsTrigger>
          </TabsList>

          {/* Collections Due Tab */}
          <TabsContent value="collections" className="mt-6">
            {filteredClientPayments.filter(client => client.totalDue > 0).length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">All Collections Complete!</h3>
                  <p className="text-muted-foreground">No pending collections from clients</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {filteredClientPayments.filter(client => client.totalDue > 0).map((client) => (
                  <Card key={client.clientId} className="border-l-4 border-l-yellow-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-3 bg-yellow-100 rounded-full">
                            <Building2 className="h-6 w-6 text-yellow-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-yellow-900">{client.clientName}</CardTitle>
                            <CardDescription className="text-yellow-700">
                              {client.containers} containers • {client.orderCount} orders
                            </CardDescription>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className="text-2xl font-bold text-red-600">
                            {formatCurrency(client.totalDue)}
                          </p>
                          <Badge className="bg-yellow-100 text-yellow-800 border-yellow-300">
                            Collection Due
                          </Badge>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
                        <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                          <p className="text-xl font-bold text-red-800">{formatCurrency(client.throughMeAmount)}</p>
                          <p className="text-sm text-red-600">Through Me</p>
                        </div>
                        <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                          <p className="text-xl font-bold text-blue-800">{formatCurrency(client.directAmount)}</p>
                          <p className="text-sm text-blue-600">Direct Payment</p>
                        </div>
                        <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                          <p className="text-xl font-bold text-green-800">{client.containers}</p>
                          <p className="text-sm text-green-600">Containers</p>
                        </div>
                        <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                          <p className="text-xl font-bold text-purple-800">{client.orderCount}</p>
                          <p className="text-sm text-purple-600">Total Orders</p>
                        </div>
                      </div>

                      {/* Order Details */}
                      <div className="mt-4 pt-4 border-t border-border">
                        <h4 className="font-medium text-foreground mb-3 flex items-center">
                          <Receipt className="h-4 w-4 mr-2" />
                          Order Breakdown
                        </h4>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm">
                          {client.orders.filter(order => order.paymentType === 'THROUGH_ME').map((order, index) => (
                            <div key={index} className="flex justify-between items-center bg-yellow-50 p-3 rounded border border-yellow-200">
                              <div>
                                <span className="font-medium text-yellow-800">{order.orderNumber}</span>
                                <p className="text-xs text-yellow-600">{order.containerName}</p>
                              </div>
                              <div className="text-right">
                                <span className="font-bold text-red-700">{formatCurrency(order.amount)}</span>
                                <p className="text-xs text-yellow-600">Due</p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="mt-4 pt-4 border-t border-border flex justify-between items-center">
                        <div className="flex items-center space-x-2">
                          <Badge variant="outline" className="text-xs">
                            Priority: {client.totalDue > 100000 ? 'High' : client.totalDue > 50000 ? 'Medium' : 'Normal'}
                          </Badge>
                          <Badge variant="outline" className="text-xs">
                            Last Update: {new Date().toLocaleDateString()}
                          </Badge>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button variant="outline" size="sm" onClick={() => handleViewClientDetails(client)}>
                            <Eye className="h-4 w-4 mr-1" />
                            View Details
                          </Button>
                          <Button size="sm" className="bg-green-600 hover:bg-green-700" onClick={() => handleMarkAsCollected(client)}>
                            <Banknote className="h-4 w-4 mr-1" />
                            Mark as Collected
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Payment Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="space-y-4">
              {filteredClientPayments.map((client) => (
                <Card key={client.clientId} className={`border-l-4 ${client.totalDue > 0 ? 'border-l-yellow-500' : 'border-l-green-500'}`}>
                  <CardHeader className="pb-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <div className={`p-2 rounded-full ${client.totalDue > 0 ? 'bg-yellow-100' : 'bg-green-100'}`}>
                          <Building2 className={`h-5 w-5 ${client.totalDue > 0 ? 'text-yellow-600' : 'text-green-600'}`} />
                        </div>
                        <div>
                          <h3 className="font-semibold text-foreground">{client.clientName}</h3>
                          <p className="text-sm text-muted-foreground">
                            {client.containers} containers • {client.orderCount} orders
                          </p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className={`text-lg font-bold ${client.totalDue > 0 ? 'text-red-600' : 'text-green-600'}`}>
                          {client.totalDue > 0 ? formatCurrency(client.totalDue) : 'No Collection'}
                        </p>
                        <Badge className={getStatusColor(client.status)}>
                          {getStatusIcon(client.status)}
                          <span className="ml-1">{client.totalDue > 0 ? 'Collection Due' : 'All Clear'}</span>
                        </Badge>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div className="text-center">
                        <p className="font-medium text-red-600">{formatCurrency(client.throughMeAmount)}</p>
                        <p className="text-muted-foreground">Through Me</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-blue-600">{formatCurrency(client.directAmount)}</p>
                        <p className="text-muted-foreground">Direct Payment</p>
                      </div>
                      <div className="text-center">
                        <p className="font-medium text-green-600">{formatCurrency(client.throughMeAmount + client.directAmount)}</p>
                        <p className="text-muted-foreground">Total Business</p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default PaymentCollections