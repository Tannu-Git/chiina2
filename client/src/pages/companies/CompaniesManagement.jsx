import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Building2,
  Ship,
  Factory,
  Users,
  Plus,
  Eye,
  Edit,
  Search,
  DollarSign,
  Star,
  TrendingUp,
  MapPin,
  Phone,
  Mail,
  FileText
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { formatCurrency } from '@/lib/utils'
import TransportCompanyModal from '@/components/companies/TransportCompanyModal'
import axios from 'axios'
import toast from 'react-hot-toast'

const CompaniesManagement = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const { isDark } = useThemeStore()
  const [loading, setLoading] = useState(true)
  const [transportCompanies, setTransportCompanies] = useState([])
  const [serviceProviders, setServiceProviders] = useState([])
  const [businessPartners, setBusinessPartners] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [selectedCompany, setSelectedCompany] = useState(null)
  const [isEditModalOpen, setIsEditModalOpen] = useState(false)
  const [isAddModalOpen, setIsAddModalOpen] = useState(false)
  const [activeTab, setActiveTab] = useState('transport')

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch all companies data
  const fetchCompaniesData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view companies data')
        navigate('/login')
        return
      }
      
      // Fetch transport companies from new API
      const transportResponse = await axios.get('/api/companies/transport')
      const transport = transportResponse.data.companies || []
      
      // Process transport companies data
      const processedTransport = transport.map(company => ({
        ...company,
        type: 'transport',
        totalContainerTypes: company.rates?.length || 0,
        serviceAreasCount: company.serviceAreas?.length || 0,
        averageRate: company.rates?.length > 0 ? 
          company.rates.reduce((sum, rate) => sum + (rate.oceanFreight + rate.localCharges + rate.fuelSurcharge), 0) / company.rates.length : 0,
        contractStatus: company.contractDetails?.preferredPartner ? 'Preferred' : 'Standard'
      }))
      
      // Fetch service providers
      const serviceResponse = await axios.get('/api/companies/service-providers')
      const serviceProviders = serviceResponse.data.serviceProviders || []
      
      // Fetch business partners
      const partnersResponse = await axios.get('/api/companies/business-partners')
      const businessPartners = partnersResponse.data.businessPartners || []
      
      setTransportCompanies(processedTransport)
      setServiceProviders(serviceProviders)
      setBusinessPartners(businessPartners)
      
      console.log('📊 [COMPANIES MANAGEMENT] Data loaded:', {
        transport: processedTransport.length,
        serviceProviders: serviceProviders.length,
        businessPartners: businessPartners.length
      })
      
    } catch (error) {
      console.error('Error fetching companies data:', error)
      toast.error('Failed to load companies data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchCompaniesData()
  }, [])

  // CRUD Operations for Transport Companies
  const handleEditTransportCompany = (company) => {
    setSelectedCompany(company)
    setIsEditModalOpen(true)
  }

  const handleAddTransportCompany = () => {
    setSelectedCompany(null)
    setIsAddModalOpen(true)
  }

  const handleUpdateTransportCompany = async (companyData) => {
    try {
      const response = await axios.put(`/api/companies/transport/${selectedCompany._id}`, companyData)
      toast.success('Transport company updated successfully')
      fetchCompaniesData() // Refresh data
      setIsEditModalOpen(false)
      setSelectedCompany(null)
    } catch (error) {
      console.error('Error updating transport company:', error)
      toast.error('Failed to update transport company')
    }
  }

  const handleCreateTransportCompany = async (companyData) => {
    try {
      const response = await axios.post('/api/companies/transport', companyData)
      toast.success('Transport company created successfully')
      fetchCompaniesData() // Refresh data
      setIsAddModalOpen(false)
    } catch (error) {
      console.error('Error creating transport company:', error)
      toast.error('Failed to create transport company')
    }
  }

  const handleDeleteTransportCompany = async (companyId) => {
    if (!window.confirm('Are you sure you want to deactivate this transport company?')) {
      return
    }
    
    try {
      await axios.delete(`/api/companies/transport/${companyId}`)
      toast.success('Transport company deactivated successfully')
      fetchCompaniesData() // Refresh data
    } catch (error) {
      console.error('Error deactivating transport company:', error)
      toast.error('Failed to deactivate transport company')
    }
  }

  const handleUpdateRates = async (companyId, rates) => {
    try {
      await axios.put(`/api/companies/transport/${companyId}/rates`, { rates })
      toast.success('Rates updated successfully')
      fetchCompaniesData() // Refresh data
    } catch (error) {
      console.error('Error updating rates:', error)
      toast.error('Failed to update rates')
    }
  }

  const handleUpdateContract = async (companyId, contractDetails) => {
    try {
      await axios.put(`/api/companies/transport/${companyId}/contract`, { contractDetails })
      toast.success('Contract updated successfully')
      fetchCompaniesData() // Refresh data
    } catch (error) {
      console.error('Error updating contract:', error)
      toast.error('Failed to update contract')
    }
  }

  // Filter companies based on search and status
  const filteredTransportCompanies = transportCompanies.filter(company => {
    const matchesSearch = searchTerm === '' || 
      company.companyName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.shortName.toLowerCase().includes(searchTerm.toLowerCase()) ||
      company.companyId.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = statusFilter === 'all' || 
      (statusFilter === 'active' && company.isActive) ||
      (statusFilter === 'preferred' && company.contractDetails?.preferredPartner)
    
    return matchesSearch && matchesStatus
  })

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => ({
    totalTransport: transportCompanies.length,
    totalServiceProviders: serviceProviders.length,
    totalBusinessPartners: businessPartners.length,
    activeCompanies: transportCompanies.filter(c => c.isActive).length + 
                    serviceProviders.filter(c => c.isActive).length + 
                    businessPartners.filter(c => c.isActive).length,
    preferredPartners: transportCompanies.filter(c => c.contractDetails?.preferredPartner).length,
    totalBusinessValue: businessPartners.reduce((sum, p) => sum + (p.businessVolume?.totalValue || 0), 0)
  }), [transportCompanies, serviceProviders, businessPartners])

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-gray-600 dark:border-gray-400"></div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="mb-8"
        >
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-foreground flex items-center">
                <Building2 className="h-8 w-8 mr-3 text-amber-600 dark:text-amber-400" />
                Companies Management
              </h1>
              <p className="text-muted-foreground mt-2">Manage transport companies, service providers, and business partners</p>
            </div>
            <Button className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white" onClick={handleAddTransportCompany}>
              <Plus className="h-4 w-4 mr-2" />
              Add Company
            </Button>
          </div>
        </motion.div>

        {/* Summary Metrics */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-2 md:grid-cols-6 gap-4 mb-8"
        >
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <Ship className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.totalTransport}</p>
              <p className="text-sm text-muted-foreground">Transport</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <Factory className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.totalServiceProviders}</p>
              <p className="text-sm text-muted-foreground">Service Providers</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <Users className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.totalBusinessPartners}</p>
              <p className="text-sm text-muted-foreground">Partners</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <TrendingUp className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.activeCompanies}</p>
              <p className="text-sm text-muted-foreground">Active</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <Star className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{summaryMetrics.preferredPartners}</p>
              <p className="text-sm text-muted-foreground">Preferred</p>
            </CardContent>
          </Card>
          
          <Card className="bg-card border border-border">
            <CardContent className="p-4 text-center">
              <DollarSign className="h-6 w-6 text-amber-600 dark:text-amber-400 mx-auto mb-2" />
              <p className="text-2xl font-bold text-foreground">{formatCurrency(summaryMetrics.totalBusinessValue)}</p>
              <p className="text-sm text-muted-foreground">Business Value</p>
            </CardContent>
          </Card>
        </motion.div>

        {/* Main Content */}
        <Tabs defaultValue="transport" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="transport">Transport Companies</TabsTrigger>
            <TabsTrigger value="services">Service Providers</TabsTrigger>
            <TabsTrigger value="partners">Business Partners</TabsTrigger>
          </TabsList>

          {/* Transport Companies Tab */}
          <TabsContent value="transport">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Ship className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                  Transport Companies
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage shipping lines and freight carriers</CardDescription>
                
                {/* Filters */}
                <div className="flex flex-col sm:flex-row gap-4 mt-4">
                  <Input
                    placeholder="Search companies..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="sm:w-64"
                  />
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="sm:w-48">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Companies</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="preferred">Preferred Partners</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {filteredTransportCompanies.length === 0 ? (
                    <div className="text-center py-12">
                      <Ship className="h-12 w-12 text-amber-500 dark:text-amber-400 mx-auto mb-4" />
                      <h3 className="text-lg font-medium text-foreground mb-2">No Transport Companies Found</h3>
                      <p className="text-muted-foreground mb-4">
                        {searchTerm || statusFilter !== 'all' 
                          ? 'No companies match your current filters.' 
                          : 'No transport companies have been added yet.'}
                      </p>
                      <Button onClick={handleAddTransportCompany} className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white">
                        <Plus className="h-4 w-4 mr-2" />
                        Add First Company
                      </Button>
                    </div>
                  ) : (
                    filteredTransportCompanies.map((company, index) => (
                    <motion.div
                      key={company._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <Ship className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{company.companyName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {company.shortName} • {company.totalContainerTypes} container types • {company.serviceAreasCount} service areas
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className={`${company.contractDetails?.preferredPartner ? 'bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-700' : 'bg-gray-100 text-gray-800 border-gray-300 dark:bg-gray-700 dark:text-gray-300 dark:border-gray-600'}`}>
                                    {company.contractStatus}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {company.performanceMetrics?.onTimeDelivery}% On-Time
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">{formatCurrency(company.averageRate)}</p>
                              <p className="text-sm text-gray-600 dark:text-gray-400">Avg Rate</p>
                            </div>
                          </div>
                          
                          {/* Company Metrics */}
                          <div className="grid grid-cols-4 gap-4 mb-4">
                            <div className="text-center p-3 bg-muted rounded-lg border border-border">
                              <p className="text-xl font-bold text-foreground">{company.performanceMetrics?.customerRating || 'N/A'}</p>
                              <p className="text-xs text-muted-foreground">Rating</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg border border-border">
                              <p className="text-xl font-bold text-foreground">{company.performanceMetrics?.totalShipments || 0}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Shipments</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg border border-border">
                              <p className="text-xl font-bold text-foreground">{company.serviceAreasCount}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Ports</p>
                            </div>
                            <div className="text-center p-3 bg-muted rounded-lg border border-border">
                              <p className="text-xl font-bold text-foreground">{company.totalContainerTypes}</p>
                              <p className="text-xs text-gray-600 dark:text-gray-400">Container Types</p>
                            </div>
                          </div>
                          
                          {/* Contact Information */}
                          <div className="mb-4 p-3 bg-muted rounded-lg border border-border">
                            <h4 className="font-medium text-foreground mb-2">Contact Information</h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                              <div className="flex items-center space-x-2">
                                <Mail className="h-4 w-4 text-muted-foreground" />
                                <span className="text-card-foreground">{company.contactInfo?.email}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <Phone className="h-4 w-4 text-muted-foreground" />
                                <span className="text-card-foreground">{company.contactInfo?.phone}</span>
                              </div>
                              <div className="flex items-center space-x-2">
                                <MapPin className="h-4 w-4 text-muted-foreground" />
                                <span className="text-card-foreground">{company.contactInfo?.address?.city}, {company.contactInfo?.address?.country}</span>
                              </div>
                            </div>
                          </div>
                          
                          {/* Action Buttons */}
                          <div className="flex justify-between items-center pt-4 border-t border-border">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm" onClick={() => navigate(`/companies-management/transport/${company._id}`)}>
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => handleEditTransportCompany(company)}>
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Company
                              </Button>
                              <Button variant="outline" size="sm" onClick={() => {
                                // Open rates edit dialog (implement later)
                                toast.info('Rates editor coming soon')
                              }}>
                                <FileText className="h-4 w-4 mr-1" />
                                Contract
                              </Button>
                            </div>
                            <div className="flex items-center space-x-2">
                              <Button size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white" onClick={() => {
                                // Open rates update dialog (implement later)
                                toast.info('Rates update dialog coming soon')
                              }}>
                                <DollarSign className="h-4 w-4 mr-1" />
                                Update Rates
                              </Button>
                              {user?.role === 'admin' && (
                                <Button variant="destructive" size="sm" onClick={() => handleDeleteTransportCompany(company._id)}>
                                  Delete
                                </Button>
                              )}
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Service Providers Tab */}
          <TabsContent value="services">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Factory className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                  Service Providers
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage warehouses, customs brokers, and other logistics services</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {serviceProviders.map((provider, index) => (
                    <motion.div
                      key={provider._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <Factory className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{provider.companyName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {provider.shortName} • {provider.serviceType}
                                </p>
                                <Badge variant="outline" className="mt-1 text-xs">
                                  {provider.serviceType}
                                </Badge>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-lg font-bold text-foreground">
                                {provider.performanceMetrics?.customerRating}/5
                              </p>
                              <p className="text-sm text-muted-foreground">Rating</p>
                            </div>
                          </div>
                          
                          {/* Contact and Action Buttons */}
                          <div className="space-y-4">
                            <div className="p-3 bg-muted rounded-lg border border-border">
                              <div className="flex justify-between items-center">
                                <div className="space-y-1 text-sm">
                                  <div className="flex items-center space-x-2">
                                    <Mail className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-card-foreground">{provider.contactInfo?.email}</span>
                                  </div>
                                  <div className="flex items-center space-x-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span className="text-card-foreground">{provider.contactInfo?.phone}</span>
                                  </div>
                                </div>
                                <div className="flex space-x-2">
                                  <Button variant="outline" size="sm">
                                    <Edit className="h-4 w-4 mr-1" />
                                    Edit
                                  </Button>
                                  <Button size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white">
                                    <DollarSign className="h-4 w-4 mr-1" />
                                    Rates
                                  </Button>
                                </div>
                              </div>
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

          {/* Business Partners Tab */}
          <TabsContent value="partners">
            <Card className="bg-card border border-border">
              <CardHeader>
                <CardTitle className="flex items-center text-foreground">
                  <Users className="h-5 w-5 mr-2 text-amber-600 dark:text-amber-400" />
                  Business Partners
                </CardTitle>
                <CardDescription className="text-muted-foreground">Manage freight forwarders and other business partnerships</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {businessPartners.map((partner, index) => (
                    <motion.div
                      key={partner._id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                    >
                      <Card className="border border-border hover:shadow-md transition-shadow">
                        <CardContent className="p-6">
                          <div className="flex items-start justify-between mb-4">
                            <div className="flex items-center space-x-4">
                              <div className="p-3 rounded-full bg-amber-100 dark:bg-amber-900/30">
                                <Users className="h-6 w-6 text-amber-600 dark:text-amber-400" />
                              </div>
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{partner.companyName}</h3>
                                <p className="text-sm text-muted-foreground">
                                  {partner.shortName} • {partner.partnerType}
                                </p>
                                <div className="flex items-center space-x-2 mt-1">
                                  <Badge className="bg-amber-100 text-amber-800 border-amber-300 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-700">
                                    {partner.partnershipLevel}
                                  </Badge>
                                  <Badge variant="outline" className="text-xs">
                                    {partner.businessVolume?.totalOrders} Orders
                                  </Badge>
                                </div>
                              </div>
                            </div>
                            <div className="text-right">
                              <p className="text-2xl font-bold text-foreground">{formatCurrency(partner.businessVolume?.totalValue)}</p>
                              <p className="text-sm text-muted-foreground">Total Business</p>
                            </div>
                          </div>
                          
                          {/* Partner Actions */}
                          <div className="pt-4 border-t border-border flex justify-between items-center">
                            <div className="flex items-center space-x-2">
                              <Button variant="outline" size="sm">
                                <Eye className="h-4 w-4 mr-1" />
                                View Details
                              </Button>
                              <Button variant="outline" size="sm">
                                <Edit className="h-4 w-4 mr-1" />
                                Edit Partnership
                              </Button>
                            </div>
                            <Button size="sm" className="bg-amber-600 hover:bg-amber-700 dark:bg-amber-500 dark:hover:bg-amber-600 text-white">
                              <FileText className="h-4 w-4 mr-1" />
                              Agreement
                            </Button>
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
      
      {/* Add Transport Company Modal */}
      <TransportCompanyModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        onSave={handleCreateTransportCompany}
        mode="add"
      />
      
      {/* Edit Transport Company Modal */}
      <TransportCompanyModal
        isOpen={isEditModalOpen}
        onClose={() => setIsEditModalOpen(false)}
        company={selectedCompany}
        onSave={handleUpdateTransportCompany}
        mode="edit"
      />
    </div>
  )
}

export default CompaniesManagement