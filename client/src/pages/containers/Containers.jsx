import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link } from 'react-router-dom'
import {
  Container as ContainerIcon,
  Plus,
  Search,
  Filter,
  Eye,
  Edit,
  Truck,
  Package,
  MapPin,
  Calendar,
  BarChart3,
  RefreshCw,
  Download,
  AlertTriangle,
  CheckCircle,
  Clock,
  Ship,
  Anchor,
  Zap,
  DollarSign,
  TrendingUp,
  CreditCard,
  Users,
  Building2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { useNavigate } from 'react-router-dom'
import FinancialDashboard from '@/components/financials/FinancialDashboard'

import { useAuthStore } from '@/stores/authStore'
import { formatCurrency, getStatusColor, formatDate } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Containers = () => {
  const { user } = useAuthStore()
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [containers, setContainers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [activeTab, setActiveTab] = useState('containers')




  // Fetch containers
  const fetchContainers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/containers')
      setContainers(response.data.containers || [])
    } catch (error) {
      console.error('Error fetching containers:', error)
      toast.error('Failed to load containers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchContainers()
  }, [])

  // Handle navigation to new allocation system
  const handleStartAllocation = () => {
    navigate('/warehouse/allocation')
  }

  const handleMoreFilters = () => {
    toast.info('Advanced filters coming soon! For now, you can filter by status using the dropdown.')
  }



  const displayContainers = containers // Remove mock data fallback

  // Filter containers with null safety
  const filteredContainers = displayContainers.filter(container => {
    // Use optional chaining and provide fallback empty strings to prevent undefined errors
    const clientId = container.clientFacingId?.toLowerCase() || '';
    const realId = container.realContainerId?.toLowerCase() || '';
    const searchLower = searchTerm.toLowerCase();
    
    const matchesSearch = clientId.includes(searchLower) || realId.includes(searchLower);
    const matchesStatus = statusFilter === 'all' || container.status === statusFilter;
    return matchesSearch && matchesStatus;
  })

  const getStatusIcon = (status) => {
    switch (status) {
      case 'planning':
        return <Clock className="h-4 w-4 text-amber-500" />
      case 'loading':
        return <Package className="h-4 w-4 text-yellow-500" />
      case 'shipped':
        return <Truck className="h-4 w-4 text-green-500" />
      case 'delivered':
        return <CheckCircle className="h-4 w-4 text-green-600" />
      default:
        return <AlertTriangle className="h-4 w-4 text-stone-500" />
    }
  }

  const getUtilizationColor = (percentage) => {
    if (percentage >= 90) return 'bg-red-500'
    if (percentage >= 75) return 'bg-yellow-500'
    return 'bg-green-500'
  }

  // Calculate metrics with safe number parsing and null safety
  const metrics = {
    totalContainers: filteredContainers.length,
    activeContainers: filteredContainers.filter(c => c?.status && ['loading', 'shipped'].includes(c.status)).length,
    plannedContainers: filteredContainers.filter(c => c?.status === 'planning').length,
    avgUtilization: (() => {
      if (filteredContainers.length === 0) return 0;
      const totalUtilization = filteredContainers.reduce((acc, c) => {
        const currentCbm = parseFloat(c?.currentCbm) || 0;
        const maxCbm = parseFloat(c?.maxCbm) || 1; // Avoid division by zero
        return acc + (currentCbm / maxCbm * 100);
      }, 0);
      return totalUtilization / filteredContainers.length;
    })(),
    totalRevenue: filteredContainers.reduce((acc, c) => acc + (parseFloat(c?.totalRevenue) || 0), 0),
    totalProfit: filteredContainers.reduce((acc, c) => acc + (parseFloat(c?.grossProfit) || 0), 0)
  }

  // Export containers to CSV
  const handleExportContainers = () => {
    try {
      // Prepare CSV data
      const csvData = filteredContainers.map(container => ({
        'Container ID (Client)': container.clientFacingId || 'N/A',
        'Container ID (Real)': container.realContainerId || 'N/A',
        'Type': container.type || 'N/A',
        'Status': container.status?.replace('_', ' ') || 'Unknown',
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
        'Location': container.location?.current || 'N/A',
        'Estimated Arrival': container.estimatedArrival ? new Date(container.estimatedArrival).toLocaleDateString() : 'N/A',
        'Created Date': new Date(container.createdAt).toLocaleDateString(),
        'Updated Date': new Date(container.updatedAt).toLocaleDateString(),
        'Created By': container.createdBy?.name || 'N/A'
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
      link.download = `containers-export-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      
      toast.success(`Exported ${filteredContainers.length} containers to CSV`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export containers')
    }
  }

  if (loading && containers.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8 bg-background min-h-screen">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span className="text-muted-foreground">Loading containers...</span>
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
            <h1 className="text-3xl font-bold text-stone-900">Container Management</h1>
            <p className="text-muted-foreground mt-2">Track, manage, and allocate shipping containers</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchContainers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={() => navigate('/client-allocations')}>
              <Users className="h-4 w-4 mr-2" />
              Client Allocations
            </Button>
            <Button variant="outline" onClick={() => navigate('/client-management')}>
              <Building2 className="h-4 w-4 mr-2" />
              Client Management
            </Button>
            <Button variant="outline" onClick={() => navigate('/payment-collections')}>
              <CreditCard className="h-4 w-4 mr-2" />
              Payment Collections
            </Button>
            <Button variant="outline" onClick={handleExportContainers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button variant="gradient" onClick={handleStartAllocation}>
              <Zap className="h-4 w-4 mr-2" />
              Start Allocation
            </Button>
            <Link to="/containers/create">
              <Button variant="outline">
                <Plus className="h-4 w-4 mr-2" />
                New Container
              </Button>
            </Link>
          </div>
        </div>

        {/* Enhanced Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MetricCard
              title="Total Containers"
              value={metrics.totalContainers}
              icon={ContainerIcon}
              change="+2 this week"
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MetricCard
              title="Active Containers"
              value={metrics.activeContainers}
              icon={Truck}
              change="In transit/loading"
              changeType="neutral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MetricCard
              title="Planned Containers"
              value={metrics.plannedContainers}
              icon={Clock}
              change="Awaiting allocation"
              changeType="neutral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MetricCard
              title="Avg Utilization"
              value={`${metrics.avgUtilization.toFixed(1)}%`}
              icon={BarChart3}
              change={metrics.avgUtilization > 80 ? "Excellent" : "Good"}
              changeType={metrics.avgUtilization > 80 ? "positive" : "neutral"}
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.5 }}
          >
            <MetricCard
              title="Total Revenue"
              value={`₹${metrics.totalRevenue.toLocaleString()}`}
              icon={DollarSign}
              change="From carrying charges"
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.6 }}
          >
            <MetricCard
              title="Net Profit"
              value={`₹${metrics.totalProfit.toLocaleString()}`}
              icon={TrendingUp}
              change={metrics.totalProfit > 0 ? "Profitable" : "Review costs"}
              changeType={metrics.totalProfit > 0 ? "positive" : "negative"}
            />
          </motion.div>
        </div>

        {/* Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="containers" className="flex items-center">
              <ContainerIcon className="h-4 w-4 mr-2" />
              Container Management
            </TabsTrigger>
            <TabsTrigger value="financials" className="flex items-center">
              <DollarSign className="h-4 w-4 mr-2" />
              Financial Dashboard
            </TabsTrigger>
          </TabsList>

          <TabsContent value="containers" className="mt-6">
            {/* Filters */}
            <Card className="mb-6 bg-card">
              <CardContent className="p-6">
                <div className="flex flex-col sm:flex-row gap-4">
                  <div className="flex-1">
                    <SearchInput
                      placeholder="Search containers..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                    />
                  </div>
                  <div className="flex space-x-2">
                    <select
                      value={statusFilter}
                      onChange={(e) => setStatusFilter(e.target.value)}
                      className="px-3 py-2 border border-border rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary bg-background text-foreground"
                    >
                      <option value="all">All Status</option>
                      <option value="planning">Planning</option>
                      <option value="loading">Loading</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                    <Button variant="outline" onClick={handleMoreFilters}>
                      <Filter className="h-4 w-4 mr-2" />
                      More Filters
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Containers Table */}
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <ContainerIcon className="h-5 w-5 mr-2" />
                  Containers ({filteredContainers.length})
                </CardTitle>
              </CardHeader>
              <CardContent>
                {filteredContainers.length === 0 ? (
                  <div className="text-center py-8">
                    <ContainerIcon className="h-12 w-12 mx-auto mb-4 text-muted-foreground/50" />
                    <p className="text-muted-foreground">No containers found</p>
                  </div>
                ) : (
                  <div className="overflow-x-auto">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-border">
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Container ID</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Status</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Type</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Utilization</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Weight</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">CBM</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Revenue</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Profit</th>
                          <th className="text-left py-3 px-4 font-medium text-muted-foreground">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filteredContainers.map((container) => {
                          const currentCbm = parseFloat(container?.currentCbm) || 0;
                          const maxCbm = parseFloat(container?.maxCbm) || 1;
                          const currentWeight = parseFloat(container?.currentWeight) || 0;
                          const maxWeight = parseFloat(container?.maxWeight) || 1;
                          const utilizationPercentage = (currentCbm / maxCbm) * 100;
                          
                          return (
                          <tr key={container._id} className="border-b border-border hover:bg-muted/50">
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                {getStatusIcon(container?.status)}
                                <Link
                                  to={`/containers/${container._id}`}
                                  className="font-medium text-primary hover:text-primary/80"
                                >
                                  {container?.clientFacingId || container?.realContainerId || 'Unknown ID'}
                                </Link>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(container?.status || 'unknown')}`}>
                                {container?.status || 'Unknown'}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="font-medium">{container?.type || 'Unknown'}</span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <div className="w-16 bg-muted rounded-full h-2">
                                  <div
                                    className={`h-2 rounded-full ${getUtilizationColor(utilizationPercentage)}`}
                                    style={{ width: `${Math.min(utilizationPercentage, 100)}%` }}
                                  />
                                </div>
                                <span className="text-sm text-stone-600">
                                  {utilizationPercentage.toFixed(1)}%
                                </span>
                              </div>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm">
                                {currentWeight.toFixed(1)} / {maxWeight} kg
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm">
                                {currentCbm.toFixed(2)} / {maxCbm} m³
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className="text-sm font-medium text-green-600">
                                ₹{(parseFloat(container?.totalRevenue) || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <span className={`text-sm font-medium ${
                                (parseFloat(container?.grossProfit) || 0) > 0 ? 'text-green-600' : 'text-red-600'
                              }`}>
                                ₹{(parseFloat(container?.grossProfit) || 0).toLocaleString()}
                              </span>
                            </td>
                            <td className="py-3 px-4">
                              <div className="flex items-center space-x-2">
                                <Link to={`/containers/${container._id}`}>
                                  <Button variant="ghost" size="sm">
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </Link>
                                <Link to={`/containers/${container._id}/edit`}>
                                  <Button variant="ghost" size="sm">
                                    <Edit className="h-4 w-4" />
                                  </Button>
                                </Link>
                              </div>
                            </td>
                          </tr>
                        )})}
                      </tbody>
                    </table>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Empty State */}
            {filteredContainers.length === 0 && !loading && (
              <div className="text-center py-12">
                <ContainerIcon className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-stone-900 mb-2">No containers found</h3>
                <p className="text-stone-500 mb-6">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by creating your first container or using the allocation wizard'}
                </p>
                <div className="flex justify-center space-x-4">
                  <Button onClick={handleStartAllocation} variant="gradient">
                    <Zap className="h-4 w-4 mr-2" />
                    New Container Allocation
                  </Button>
                  <Link to="/containers/create">
                    <Button variant="outline">
                      <Plus className="h-4 w-4 mr-2" />
                      Create Manual Container
                    </Button>
                  </Link>
                </div>
              </div>
            )}
          </TabsContent>

          <TabsContent value="financials" className="mt-6">
            <FinancialDashboard />
          </TabsContent>
        </Tabs>
      </motion.div>
    </div>
  )
}

export default Containers