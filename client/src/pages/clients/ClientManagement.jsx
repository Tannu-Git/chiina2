import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  DollarSign,
  Package,
  Truck,
  CheckCircle,
  Clock,
  Eye,
  FileText,
  Building2,
  Factory,
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

const ClientManagement = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [clients, setClients] = useState([])
  const [suppliers, setSuppliers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch client and supplier data
  const handleViewDetails = (client) => {
    toast.info(`Viewing details for ${client.clientName}. Full client details page coming soon!`)
    // TODO: Navigate to dedicated client details page
    // navigate(`/clients/${client.clientId}/details`)
  }

  const handleStatement = (client) => {
    try {
      // Generate and download client statement
      const statementData = {
        'Client Name': client.clientName,
        'Client ID': client.clientId || 'AUTO_GENERATED',
        'Company': client.company || 'Not specified',
        'Total Orders': client.totalOrders,
        'Pending Orders': client.pendingOrders,
        'Ready Orders': client.readyOrders,
        'Shipped Orders': client.shippedOrders,
        'Delivered Orders': client.deliveredOrders,
        'Total Business Value': formatCurrency(client.totalValue),
        'Amount to Collect': formatCurrency(client.toCollect),
        'Collection Status': client.toCollect > 0 ? 'Outstanding' : 'Current',
        'Last Updated': new Date().toLocaleString(),
        'Statement Generated': new Date().toLocaleString()
      }

      // Convert to CSV for statement
      const headers = Object.keys(statementData)
      const csvContent = [
        'CLIENT STATEMENT',
        '',
        headers.join(','),
        headers.map(header => statementData[header]).join(',')
      ].join('\n')

      // Download statement
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `client-statement-${client.clientName.replace(/[^a-zA-Z0-9]/g, '-')}-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success(`Statement generated for ${client.clientName}`)
      
    } catch (error) {
      console.error('Statement generation failed:', error)
      toast.error('Failed to generate client statement')
    }
  }

  const handleCollectPayment = (client) => {
    toast.info(`Payment collection for ${client.clientName} (${formatCurrency(client.toCollect)}). Payment tracking system coming soon!`)
    // TODO: Navigate to payment collection interface
    // navigate(`/payment-collections/${client.clientId}`)
  }

  const fetchData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view client data')
        navigate('/login')
        return
      }
      
      // Fetch orders to analyze client and supplier data
      const ordersResponse = await axios.get('/api/orders')
      const orders = ordersResponse.data.orders || []
      
      // Fetch containers to get allocation data
      const containersResponse = await axios.get('/api/containers')
      const containers = containersResponse.data.containers || []
      
      // Process client data with focus on manufacturing and shipping progress
      const clientMap = new Map()
      const supplierMap = new Map()
      
      // Analyze orders for practical business metrics
      orders.forEach(order => {
        const clientId = order.clientId || 'unknown'
        const clientName = order.clientName || 'Unknown Client'
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            totalOrders: 0,
            pendingOrders: 0,    // Orders being made
            readyOrders: 0,      // Orders ready to ship
            shippedOrders: 0,    // Orders shipped
            deliveredOrders: 0,  // Orders delivered
            toCollect: 0,
            containers: new Set(),
            containerDetails: [],
            suppliers: new Set(),
            lastActivity: null
          })
        }
        
        const client = clientMap.get(clientId)
        client.totalOrders += 1
        
        // Track manufacturing and shipping progress based on actual status
        switch (order.status?.toLowerCase()) {
          case 'ready':
          case 'partial_ready':
          case 'allocated': // Orders allocated to containers
            client.readyOrders += 1
            break
          case 'shipped':
          case 'in_transit':
          case 'loading':
          case 'loaded':
            client.shippedOrders += 1
            break
          case 'delivered':
          case 'completed':
          case 'received':
            client.deliveredOrders += 1
            break
          case 'pending':
          case 'processing':
          case 'confirmed':
          case 'planning':
          default:
            client.pendingOrders += 1
        }
        
        // Track last activity
        if (!client.lastActivity || new Date(order.updatedAt || order.createdAt) > new Date(client.lastActivity)) {
          client.lastActivity = order.updatedAt || order.createdAt
        }
        
        // Process items for collection and supplier info
        order.items?.forEach(item => {
          if (item.supplier?.name) {
            client.suppliers.add(item.supplier.name)
            
            // Track suppliers with manufacturing status
            if (!supplierMap.has(item.supplier.name)) {
              supplierMap.set(item.supplier.name, {
                name: item.supplier.name,
                contact: item.supplier.contact || item.supplier.email || '',
                clients: new Set(),
                totalOrders: 0,
                pendingMake: 0,
                readyToShip: 0,
                totalValue: 0
              })
            }
            
            const supplier = supplierMap.get(item.supplier.name)
            supplier.clients.add(clientName)
            supplier.totalOrders += 1
            supplier.totalValue += item.totalPrice || 0
            
            // Track what needs to be made vs ready based on order status
            if (['ready', 'partial_ready', 'allocated', 'shipped', 'loading', 'loaded'].includes(order.status?.toLowerCase())) {
              supplier.readyToShip += 1
            } else {
              supplier.pendingMake += 1
            }
          }
          
          // Collection amount (carrying charges only)
          client.toCollect += item.carryingCharge?.amount || 0
        })
      })
      
      // Analyze container allocations to track shipping progress
      containers.forEach(container => {
        container.orders?.forEach(allocation => {
          const clientId = allocation.clientId || allocation.orderId?.clientId
          const clientName = allocation.clientName || allocation.orderId?.clientName
          
          if (clientMap.has(clientId)) {
            const client = clientMap.get(clientId)
            client.containers.add(container._id)
            
            // Add container details
            const existingContainer = client.containerDetails.find(c => c.id === container._id)
            if (!existingContainer) {
              client.containerDetails.push({
                id: container._id,
                clientFacingId: container.clientFacingId,
                realContainerId: container.realContainerId,
                status: container.status,
                orders: 1,
                carryingCharges: allocation.carryingCharges || 0
              })
            } else {
              existingContainer.orders += 1
              existingContainer.carryingCharges += allocation.carryingCharges || 0
            }
          }
        })
      })
      
      // Recalculate client order status based on container statuses
      clientMap.forEach((client, clientId) => {
        // Reset counters for recalculation
        let pendingCount = 0
        let readyCount = 0
        let shippedCount = 0
        let deliveredCount = 0
        
        // Count based on container status if containers exist
        if (client.containerDetails.length > 0) {
          client.containerDetails.forEach(container => {
            const ordersInContainer = container.orders
            
            switch (container.status?.toLowerCase()) {
              case 'delivered':
              case 'completed':
                deliveredCount += ordersInContainer
                break
              case 'shipped':
              case 'in_transit':
                shippedCount += ordersInContainer
                break
              case 'loading':
              case 'ready':
              case 'allocated':
                readyCount += ordersInContainer
                break
              case 'planning':
              case 'pending':
              default:
                pendingCount += ordersInContainer
                break
            }
          })
          
          // Update client counts based on container status
          client.pendingOrders = pendingCount
          client.readyOrders = readyCount
          client.shippedOrders = shippedCount
          client.deliveredOrders = deliveredCount
        }
        // If no containers, keep original order-based status
      })
      
      // Convert to arrays with business-focused metrics
      const clientList = Array.from(clientMap.values()).map(client => {
        // Calculate proper progress rate based on container status
        const totalOrdersInContainers = client.pendingOrders + client.readyOrders + client.shippedOrders + client.deliveredOrders
        const actualTotalOrders = Math.max(client.totalOrders, totalOrdersInContainers)
        
        // Progress: anything beyond pending
        const inProgressOrCompleted = client.readyOrders + client.shippedOrders + client.deliveredOrders
        const progressRate = actualTotalOrders > 0 ? Math.round((inProgressOrCompleted / actualTotalOrders) * 100) : 0
        
        return {
          ...client,
          containers: client.containers.size,
          suppliers: Array.from(client.suppliers),
          progressRate,
          actualTotalOrders, // For debugging
          needsAction: client.toCollect > 0 || client.pendingOrders > 0,
          // Debug info with container status
          statusBreakdown: {
            pending: client.pendingOrders,
            ready: client.readyOrders,
            shipped: client.shippedOrders,
            delivered: client.deliveredOrders,
            hasContainers: client.containerDetails.length > 0,
            containerStatuses: client.containerDetails.map(c => `${c.status}(${c.orders})`).join(', ')
          }
        }
      })
      
      const supplierList = Array.from(supplierMap.values()).map(supplier => ({
        ...supplier,
        clients: Array.from(supplier.clients),
        clientCount: supplier.clients.size,
        productionRate: supplier.totalOrders > 0 ? Math.round((supplier.readyToShip / supplier.totalOrders) * 100) : 0
      }))
      
      // Debug logging
      console.log('📊 [CLIENT MANAGEMENT] Client data processed:', {
        totalClients: clientList.length,
        sampleClient: clientList[0],
        totalOrders: orders.length,
        totalContainers: containers.length
      })
      
      // Sort by needs action first, then by collection amount
      clientList.sort((a, b) => {
        if (a.needsAction && !b.needsAction) return -1
        if (!a.needsAction && b.needsAction) return 1
        return b.toCollect - a.toCollect
      })
      
      supplierList.sort((a, b) => b.pendingMake - a.pendingMake)
      
      setClients(clientList)
      setSuppliers(supplierList)
      
    } catch (error) {
      console.error('Error fetching data:', error)
      toast.error('Failed to load client data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchData()
  }, [])

  // Filter clients
  const filteredClients = clients.filter(client => {
    const matchesSearch = searchTerm === '' || 
      client.clientName.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'needs_action' && client.needsAction) ||
      (statusFilter === 'collections' && client.toCollect > 0) ||
      (statusFilter === 'production' && client.pendingOrders > 0)
    
    return matchesSearch && matchesStatus
  })

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const totalClients = clients.length
    const totalToCollect = clients.reduce((sum, c) => sum + c.toCollect, 0)
    const totalPending = clients.reduce((sum, c) => sum + c.pendingOrders, 0)
    const totalReady = clients.reduce((sum, c) => sum + c.readyOrders, 0)
    const totalShipped = clients.reduce((sum, c) => sum + c.shippedOrders, 0)
    
    return {
      totalClients,
      totalToCollect,
      totalPending,
      totalReady,
      totalShipped,
      totalSuppliers: suppliers.length
    }
  }, [clients, suppliers])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900 flex items-center">
                <Users className="h-8 w-8 mr-3 text-gray-600" />
                Client Management
              </h1>
              <p className="text-gray-600 mt-2">Manufacturing progress, shipping status, and collections</p>
            </div>
          </div>
        </motion.div>

        {/* Summary Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
        >
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalClients}</p>
              <p className="text-sm text-gray-600">Total Clients</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <Clock className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalPending}</p>
              <p className="text-sm text-gray-600">Need to Make</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalReady}</p>
              <p className="text-sm text-gray-600">Ready to Ship</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <Truck className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalShipped}</p>
              <p className="text-sm text-gray-600">Shipped</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{formatCurrency(summaryMetrics.totalToCollect)}</p>
              <p className="text-sm text-gray-600">To Collect</p>
            </CardContent>
          </Card>
          
          <Card className="bg-white border border-gray-200">
            <CardContent className="p-4 text-center">
              <Factory className="h-6 w-6 text-gray-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-gray-900">{summaryMetrics.totalSuppliers}</p>
              <p className="text-sm text-gray-600">Suppliers</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="clients" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="clients">Client Accounts</TabsTrigger>
            <TabsTrigger value="suppliers">Supplier Status</TabsTrigger>
          </TabsList>

          {/* Clients Tab */}
          <TabsContent value="clients">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Users className="h-5 w-5 mr-2" />
                  Client Progress & Collections
                </CardTitle>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Input
                    placeholder="Search clients..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sm:w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Clients</SelectItem>
                      <SelectItem value="needs_action">Needs Action</SelectItem>
                      <SelectItem value="collections">Has Collections</SelectItem>
                      <SelectItem value="production">In Production</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredClients.map((client, index) => (
                    <motion.div
                      key={client.clientId}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-gray-100">
                                <Building2 className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{client.clientName}</h3>
                                <p className="text-sm text-gray-600">
                                  {client.totalOrders} total orders • {client.suppliers.length} suppliers
                                </p>
                                <p className="text-xs text-gray-500">
                                  Status: P:{client.statusBreakdown?.pending} R:{client.statusBreakdown?.ready} S:{client.statusBreakdown?.shipped} D:{client.statusBreakdown?.delivered}
                                </p>
                                {client.statusBreakdown?.hasContainers && (
                                  <p className="text-xs text-gray-400">
                                    Containers: {client.statusBreakdown?.containerStatuses}
                                  </p>
                                )}
                                {client.needsAction && (
                                  <Badge className="mt-1 bg-gray-100 text-gray-800 border-gray-300">
                                    Needs Action
                                  </Badge>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(client.toCollect)}</p>
                              <p className="text-sm text-gray-600">To Collect</p>
                            </div>
                          </div>
                          
                          {/* Progress Metrics */}
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{client.pendingOrders}</p>
                              <p className="text-xs text-gray-600">Need to Make</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{client.readyOrders}</p>
                              <p className="text-xs text-gray-600">Ready to Ship</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{client.shippedOrders}</p>
                              <p className="text-xs text-gray-600">Shipped</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{client.deliveredOrders}</p>
                              <p className="text-xs text-gray-600">Delivered</p>
                            </div>
                          </div>
                          
                          {/* Container Information */}
                          {client.containerDetails && client.containerDetails.length > 0 && (
                            <div className="mb-4 p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <h4 className="font-medium text-gray-900 mb-2 flex items-center">
                                <Package className="h-4 w-4 mr-2" />
                                Containers ({client.containerDetails.length})
                              </h4>
                              <div className="space-y-2">
                                {client.containerDetails.map((container, idx) => (
                                  <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border border-gray-200">
                                    <div>
                                      <span className="font-medium text-gray-800">
                                        {container.clientFacingId || container.realContainerId}
                                      </span>
                                      <Badge 
                                        variant="outline" 
                                        className={`ml-2 text-xs ${
                                          container.status === 'shipped' ? 'bg-green-50 text-green-700 border-green-200' :
                                          container.status === 'loading' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                                          container.status === 'delivered' ? 'bg-gray-100 text-gray-800 border-gray-300' :
                                          'bg-gray-50 text-gray-600 border-gray-200'
                                        }`}
                                      >
                                        {container.status}
                                      </Badge>
                                    </div>
                                    <div className="text-right">
                                      <span className="text-sm text-gray-600">
                                        {container.orders} orders • {formatCurrency(container.carryingCharges)}
                                      </span>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                          )}
                          
                          {/* Progress Bar */}
                          <div className="mb-4">
                            <div className="flex justify-between text-sm text-gray-600 mb-1">
                              <span>Progress Rate</span>
                              <span>{client.progressRate}% ({client.actualTotalOrders} orders tracked)</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div className="h-3 rounded-full bg-gradient-to-r from-gray-400 to-gray-600 transition-all duration-300" 
                                style={{ width: `${client.progressRate}%` }}
                              ></div>
                            </div>
                            <div className="flex justify-between text-xs text-gray-500 mt-1">
                              <span className="text-orange-600">Pending: {client.pendingOrders}</span>
                              <span className="text-blue-600">Ready: {client.readyOrders}</span>
                              <span className="text-green-600">Shipped: {client.shippedOrders}</span>
                              <span className="text-gray-800">Delivered: {client.deliveredOrders}</span>
                            </div>
                            {client.statusBreakdown?.hasContainers && (
                              <p className="text-xs text-gray-400 mt-1 text-center">
                                Status based on container progress
                              </p>
                            )}
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-between items-center pt-4 border-t border-gray-200">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => handleViewDetails(client)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleStatement(client)}>
                                <FileText className="h-4 w-4 mr-1" />
                                Statement
                              </Button>
                            </div>
                            {client.toCollect > 0 && (
                              <Button size="sm" className="bg-gray-900 hover:bg-gray-800 text-white" onClick={() => handleCollectPayment(client)}>
                                <DollarSign className="h-4 w-4 mr-1" />
                                Collect Payment
                              </Button>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Suppliers Tab */}
          <TabsContent value="suppliers">
            <Card className="bg-white border border-gray-200">
              <CardHeader>
                <CardTitle className="flex items-center text-gray-900">
                  <Factory className="h-5 w-5 mr-2" />
                  Supplier Manufacturing Status
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {suppliers.map((supplier, index) => (
                    <motion.div
                      key={supplier.name}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-gray-200 hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-gray-100">
                                <Factory className="h-6 w-6 text-gray-600" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-gray-900">{supplier.name}</h3>
                                <p className="text-sm text-gray-600">
                                  {supplier.clientCount} clients • {supplier.totalOrders} orders
                                </p>
                                {supplier.contact && (
                                  <p className="text-xs text-gray-500">{supplier.contact}</p>
                                )}
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-gray-900">{formatCurrency(supplier.totalValue)}</p>
                              <p className="text-sm text-gray-600">Total Business</p>
                            </div>
                          </div>
                          
                          {/* Manufacturing Status */}
                          <div className="grid grid-cols-3 gap-4 mb-4">
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{supplier.pendingMake}</p>
                              <p className="text-xs text-gray-600">Need to Make</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{supplier.readyToShip}</p>
                              <p className="text-xs text-gray-600">Ready to Ship</p>
                            </div>
                            <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                              <p className="text-xl font-bold text-gray-900">{supplier.productionRate}%</p>
                              <p className="text-xs text-gray-600">Production Rate</p>
                            </div>
                          </div>
                          
                          {/* Client List */}
                          <div className="pt-4 border-t border-gray-200">
                            <h4 className="font-medium text-gray-900 mb-2">Clients ({supplier.clientCount})</h4>
                            <div className="flex flex-wrap gap-2">
                              {supplier.clients.map((clientName, idx) => (
                                <Badge key={idx} variant="outline" className="text-xs bg-gray-50 text-gray-700 border-gray-300">
                                  {clientName}
                                </Badge>
                              ))}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  )
}

export default ClientManagement