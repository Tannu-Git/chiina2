import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Container as ContainerIcon,
  BarChart3,
  RefreshCw,
  Download,
  Filter,
  Search,
  TrendingUp,
  Package,
  Weight,
  DollarSign,
  Eye,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import ClientAllocationSummary from '@/components/containers/ClientAllocationSummary'
import axios from 'axios'
import toast from 'react-hot-toast'

const ClientAllocations = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [containers, setContainers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [clientFilter, setClientFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('containers')

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch containers with allocation details
  const handleExportAllocations = () => {
    try {
      // Prepare CSV data for allocations export
      const csvData = filteredContainers.map(container => {
        const containerData = {
          'Container ID': container.clientFacingId || container.realContainerId,
          'Real Container ID': container.realContainerId,
          'Type': container.type,
          'Status': container.status,
          'Total Orders': container.orders?.length || 0,
          'Total CBM': container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0).toFixed(2),
          'Total Weight (kg)': container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0).toFixed(1),
          'Total Cartons': container.orders?.reduce((sum, order) => sum + (order.cartonShare || 0), 0),
          'Total Revenue': formatCurrency(container.orders?.reduce((sum, order) => sum + (order.carryingCharges || 0), 0) || 0),
          'Max CBM': container.maxCbm,
          'Max Weight (kg)': container.maxWeight,
          'Utilization %': ((container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0) / container.maxCbm) * 100).toFixed(1),
          'Created Date': new Date(container.createdAt).toLocaleDateString(),
          'Clients': container.orders?.map(order => order.orderId?.clientName || order.clientName).filter((value, index, self) => self.indexOf(value) === index).join('; ') || 'None'
        }
        return containerData
      })

      // Add client summary data
      const clientSummaryData = clientSummary.map(client => ({
        'Type': 'CLIENT_SUMMARY',
        'Client Name': client.clientName,
        'Total Containers': client.containers.size,
        'Total CBM': client.totals.cbm.toFixed(2),
        'Total Weight (kg)': client.totals.weight.toFixed(1),
        'Total Cartons': client.totals.cartons,
        'Total Revenue': formatCurrency(client.totals.revenue),
        'Order Count': client.totals.orderCount,
        'CBM Percentage': ((client.totals.cbm / summaryMetrics.totalCbm) * 100).toFixed(1) + '%',
        'Weight Percentage': ((client.totals.weight / summaryMetrics.totalWeight) * 100).toFixed(1) + '%',
        'Revenue Percentage': ((client.totals.revenue / summaryMetrics.totalRevenue) * 100).toFixed(1) + '%'
      }))

      // Combine all data
      const allData = [...csvData, ...clientSummaryData]

      if (allData.length === 0) {
        toast.error('No allocation data to export')
        return
      }

      // Convert to CSV
      const headers = Object.keys(allData[0])
      const csvContent = [
        headers.join(','),
        ...allData.map(row => 
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
      link.download = `client-allocations-${new Date().toISOString().split('T')[0]}.csv`
      link.click()
      URL.revokeObjectURL(link.href)

      toast.success(`Client allocations exported successfully! (${allData.length} records)`)
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export client allocations')
    }
  }

  const fetchContainers = async () => {
    try {
      setLoading(true)
      console.log('📊 [CLIENT ALLOCATIONS] Fetching container allocation data')
      
      if (!isAuthenticated || !token) {
        console.error('❌ [CLIENT ALLOCATIONS] Not authenticated')
        toast.error('Please log in to view allocation data')
        navigate('/login')
        return
      }
      
      const response = await axios.get('/api/containers')
      const containerData = response.data.containers || []
      
      // Filter containers that have orders allocated
      const containersWithOrders = containerData.filter(container => 
        container.orders && container.orders.length > 0
      )
      
      setContainers(containersWithOrders)
      console.log('📊 [CLIENT ALLOCATIONS] Loaded', containersWithOrders.length, 'containers with allocations')
      
    } catch (error) {
      console.error('❌ [CLIENT ALLOCATIONS] Error fetching containers:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to load allocation data')
      }
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [])

  // Get all unique clients across all containers
  const allClients = React.useMemo(() => {
    const clientSet = new Set()
    containers.forEach(container => {
      container.orders?.forEach(order => {
        const orderDetails = order.orderId || order
        const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client'
        clientSet.add(clientName)
      })
    })
    return Array.from(clientSet).sort()
  }, [containers])

  // Filter containers based on search and filters
  const filteredContainers = containers.filter(container => {
    const matchesSearch = searchTerm === '' || 
      container.realContainerId?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      container.clientFacingId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter
    
    const matchesClient = clientFilter === 'all' || 
      container.orders?.some(order => {
        const orderDetails = order.orderId || order
        const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client'
        return clientName === clientFilter
      })
    
    return matchesSearch && matchesStatus && matchesClient
  })

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const totals = filteredContainers.reduce((acc, container) => {
      const containerTotals = container.orders?.reduce((orderAcc, order) => ({
        cbm: orderAcc.cbm + (order.cbmShare || 0),
        weight: orderAcc.weight + (order.weightShare || 0),
        cartons: orderAcc.cartons + (order.cartonShare || 0),
        revenue: orderAcc.revenue + (order.carryingCharges || 0),
        orders: orderAcc.orders + 1
      }), { cbm: 0, weight: 0, cartons: 0, revenue: 0, orders: 0 }) || { cbm: 0, weight: 0, cartons: 0, revenue: 0, orders: 0 }
      
      return {
        totalContainers: acc.totalContainers + 1,
        totalCbm: acc.totalCbm + containerTotals.cbm,
        totalWeight: acc.totalWeight + containerTotals.weight,
        totalCartons: acc.totalCartons + containerTotals.cartons,
        totalRevenue: acc.totalRevenue + containerTotals.revenue,
        totalOrders: acc.totalOrders + containerTotals.orders,
        uniqueClients: new Set([...acc.uniqueClients, ...container.orders?.map(order => {
          const orderDetails = order.orderId || order
          return orderDetails?.clientName || order.clientName || 'Unknown Client'
        }) || []])
      }
    }, {
      totalContainers: 0,
      totalCbm: 0,
      totalWeight: 0,
      totalCartons: 0,
      totalRevenue: 0,
      totalOrders: 0,
      uniqueClients: new Set()
    })
    
    return {
      ...totals,
      uniqueClientsCount: totals.uniqueClients.size
    }
  }, [filteredContainers])

  // Create client-wise summary across all containers
  const clientSummary = React.useMemo(() => {
    const clientMap = new Map()
    
    filteredContainers.forEach(container => {
      container.orders?.forEach(order => {
        const orderDetails = order.orderId || order
        const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client'
        const clientId = orderDetails?.clientId || order.clientId || 'unknown'
        
        if (!clientMap.has(clientId)) {
          clientMap.set(clientId, {
            clientId,
            clientName,
            containers: new Set(),
            totals: {
              cbm: 0,
              weight: 0,
              cartons: 0,
              revenue: 0,
              orders: 0
            }
          })
        }
        
        const client = clientMap.get(clientId)
        client.containers.add(container._id)
        client.totals.cbm += order.cbmShare || 0
        client.totals.weight += order.weightShare || 0
        client.totals.cartons += order.cartonShare || 0
        client.totals.revenue += order.carryingCharges || 0
        client.totals.orders += 1
      })
    })
    
    return Array.from(clientMap.values()).sort((a, b) => b.totals.revenue - a.totals.revenue)
  }, [filteredContainers])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
          <span className="text-lg">Loading client allocations...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div>
            <h1 className="text-3xl font-bold text-stone-900">Client Allocations</h1>
            <p className="text-stone-600 mt-1">
              Client-wise breakdown of container allocations across all containers
            </p>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchContainers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportAllocations}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => navigate('/containers')}>
              <ContainerIcon className="h-4 w-4 mr-2" />
              Back to Containers
            </Button>
          </div>
        </div>

        {/* Summary Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <ContainerIcon className="h-6 w-6 text-blue-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-blue-800">{summaryMetrics.totalContainers}</p>
              <p className="text-sm text-blue-600">Containers</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-green-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-green-800">{summaryMetrics.uniqueClientsCount}</p>
              <p className="text-sm text-green-600">Unique Clients</p>
            </CardContent>
          </Card>
          
          <Card className="bg-purple-50 border-purple-200">
            <CardContent className="p-4 text-center">
              <BarChart3 className="h-6 w-6 text-purple-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-purple-800">{summaryMetrics.totalCbm.toFixed(1)}</p>
              <p className="text-sm text-purple-600">Total CBM</p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <Weight className="h-6 w-6 text-orange-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-orange-800">{summaryMetrics.totalWeight.toLocaleString()}</p>
              <p className="text-sm text-orange-600">Total Weight (kg)</p>
            </CardContent>
          </Card>
          
          <Card className="bg-yellow-50 border-yellow-200">
            <CardContent className="p-4 text-center">
              <Package className="h-6 w-6 text-yellow-600 mx-auto mb-2" />
              <p className="text-2xl font-bold text-yellow-800">{summaryMetrics.totalCartons.toLocaleString()}</p>
              <p className="text-sm text-yellow-600">Total Cartons</p>
            </CardContent>
          </Card>
          
          <Card className="bg-indigo-50 border-indigo-200">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-indigo-600 mx-auto mb-2" />
              <p className="text-xl font-bold text-indigo-800">{formatCurrency(summaryMetrics.totalRevenue)}</p>
              <p className="text-sm text-indigo-600">Total Revenue</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <Input
                  placeholder="Search containers by ID..."
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
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="planning">Planning</SelectItem>
                  <SelectItem value="loading">Loading</SelectItem>
                  <SelectItem value="shipped">Shipped</SelectItem>
                  <SelectItem value="delivered">Delivered</SelectItem>
                </SelectContent>
              </Select>
              <Select value={clientFilter} onValueChange={setClientFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by client" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Clients</SelectItem>
                  {allClients.map(client => (
                    <SelectItem key={client} value={client}>{client}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Tabbed Content */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="containers">
              <ContainerIcon className="h-4 w-4 mr-2" />
              By Container ({filteredContainers.length})
            </TabsTrigger>
            <TabsTrigger value="clients">
              <Users className="h-4 w-4 mr-2" />
              By Client ({clientSummary.length})
            </TabsTrigger>
          </TabsList>

          {/* Container-wise View */}
          <TabsContent value="containers" className="mt-6">
            {filteredContainers.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <ContainerIcon className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-2">No allocated containers found</h3>
                  <p className="text-stone-500">
                    {searchTerm || statusFilter !== 'all' || clientFilter !== 'all' 
                      ? 'Try adjusting your search criteria' 
                      : 'No containers have orders allocated yet'}
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-6">
                {filteredContainers.map((container) => (
                  <div key={container._id} className="space-y-4">
                    {/* Container Header */}
                    <div className="flex items-center justify-between p-4 bg-stone-50 border border-stone-200 rounded-lg">
                      <div className="flex items-center space-x-3">
                        <ContainerIcon className="h-6 w-6 text-blue-600" />
                        <div>
                          <h3 className="text-lg font-semibold text-stone-900">
                            {container.clientFacingId || container.realContainerId}
                          </h3>
                          <p className="text-sm text-stone-600">
                            {container.type} • {container.status} • {container.orders?.length || 0} orders
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center space-x-2">
                        <Badge variant="outline">
                          {container.orders?.length || 0} orders
                        </Badge>
                        <Button 
                          variant="outline" 
                          size="sm"
                          onClick={() => navigate(`/containers/${container._id}`)}
                        >
                          <Eye className="h-4 w-4 mr-1" />
                          View Details
                        </Button>
                      </div>
                    </div>
                    
                    {/* Client Allocation Summary */}
                    <ClientAllocationSummary 
                      container={container} 
                      showTitle={false}
                      compact={false}
                      showPercentages={true}
                    />
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          {/* Client-wise View */}
          <TabsContent value="clients" className="mt-6">
            {clientSummary.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <Users className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-stone-900 mb-2">No client allocations found</h3>
                  <p className="text-stone-500">No clients have container allocations yet</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-4">
                {clientSummary.map((client) => (
                  <Card key={client.clientId} className="border-l-4 border-l-blue-500">
                    <CardHeader className="pb-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-3">
                          <div className="p-2 bg-blue-100 rounded-full">
                            <Building2 className="h-6 w-6 text-blue-600" />
                          </div>
                          <div>
                            <CardTitle className="text-xl text-blue-900">{client.clientName}</CardTitle>
                            <CardDescription className="text-blue-600">
                              {client.containers.size} containers • {client.totals.orders} orders
                            </CardDescription>
                          </div>
                        </div>
                        <Badge variant="secondary" className="bg-blue-100 text-blue-800">
                          Top Client
                        </Badge>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        <div className="text-center p-4 bg-blue-50 rounded-lg">
                          <p className="text-2xl font-bold text-blue-800">{client.totals.cbm.toFixed(1)} m³</p>
                          <p className="text-sm text-blue-600">Total CBM</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {((client.totals.cbm / summaryMetrics.totalCbm) * 100).toFixed(1)}% of all containers
                          </p>
                        </div>
                        <div className="text-center p-4 bg-green-50 rounded-lg">
                          <p className="text-2xl font-bold text-green-800">{client.totals.weight.toLocaleString()} kg</p>
                          <p className="text-sm text-green-600">Total Weight</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {((client.totals.weight / summaryMetrics.totalWeight) * 100).toFixed(1)}% of all containers
                          </p>
                        </div>
                        <div className="text-center p-4 bg-orange-50 rounded-lg">
                          <p className="text-2xl font-bold text-orange-800">{client.totals.cartons.toLocaleString()}</p>
                          <p className="text-sm text-orange-600">Total Cartons</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {client.containers.size} containers
                          </p>
                        </div>
                        <div className="text-center p-4 bg-purple-50 rounded-lg">
                          <p className="text-xl font-bold text-purple-800">{formatCurrency(client.totals.revenue)}</p>
                          <p className="text-sm text-purple-600">Total Revenue</p>
                          <p className="text-xs text-stone-500 mt-1">
                            {((client.totals.revenue / summaryMetrics.totalRevenue) * 100).toFixed(1)}% of total revenue
                          </p>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default ClientAllocations