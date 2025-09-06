import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  Users,
  Plus,
  RefreshCw,
  Download,
  Search,
  Building2,
  PiggyBank,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import { 
  fetchPaymentData, 
  getBalanceDisplay,
  handleExportCollections
} from './utils/financialUtils'
import axios from 'axios'
import toast from 'react-hot-toast'

const AccountBalances = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [accountBalances, setAccountBalances] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [partyTypeFilter, setPartyTypeFilter] = useState('all')
  
  // Modal states
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [selectedBalance, setSelectedBalance] = useState(null)
  
  // Form state
  const [balanceForm, setBalanceForm] = useState({
    party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
    initialBalance: '',
    currency: 'INR',
    creditLimit: { INR: '', USD: '' },
    paymentTerms: 'NET_30'
  })

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch data
  const loadBalanceData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view account data')
        navigate('/login')
        return
      }

      const data = await fetchPaymentData(token, navigate)
      if (data) {
        setAccountBalances(data.accountBalances)
      }
    } catch (error) {
      console.error('Error loading account balance data:', error)
      toast.error('Failed to load account balance data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadBalanceData()
  }, [])

  // Filter functions
  const getFilteredBalances = () => {
    return accountBalances.filter(balance => {
      const matchesSearch = searchTerm === '' || 
        balance.party.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPartyType = partyTypeFilter === 'all' || balance.party.type === partyTypeFilter
      
      return matchesSearch && matchesPartyType
    })
  }

  // CRUD Operations for Account Balances
  const handleCreateOrUpdateBalance = async () => {
    try {
      if (!balanceForm.party.name) {
        toast.error('Please enter party name')
        return
      }

      const requestData = {
        party: {
          ...balanceForm.party,
          id: balanceForm.party.id || `${balanceForm.party.type.toLowerCase()}_${Date.now()}`
        },
        initialBalance: parseFloat(balanceForm.initialBalance) || 0,
        currency: balanceForm.currency,
        creditLimit: {
          INR: parseFloat(balanceForm.creditLimit.INR) || 0,
          USD: parseFloat(balanceForm.creditLimit.USD) || 0
        },
        paymentTerms: balanceForm.paymentTerms
      }

      await axios.post('/api/payments/balances', requestData)
      toast.success('Account balance updated successfully!')
      setShowAddBalanceModal(false)
      resetBalanceForm()
      loadBalanceData()
    } catch (error) {
      console.error('Create/Update balance error:', error)
      toast.error('Failed to update account balance')
    }
  }

  // Utility functions
  const resetBalanceForm = () => {
    setBalanceForm({
      party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
      initialBalance: '',
      currency: 'INR',
      creditLimit: { INR: '', USD: '' },
      paymentTerms: 'NET_30'
    })
    setSelectedBalance(null)
  }

  const handleExport = () => {
    handleExportCollections([], accountBalances, { totalReceived: { INR: 0 }, totalPaid: { INR: 0 }, pendingReceivables: { INR: 0 } })
  }

  // Calculate summary statistics
  const calculateSummary = () => {
    const filteredBalances = getFilteredBalances()
    const totalReceivable = filteredBalances
      .filter(balance => balance.balances.INR.balance > 0)
      .reduce((sum, balance) => sum + balance.balances.INR.balance, 0)
    
    const totalPayable = filteredBalances
      .filter(balance => balance.balances.INR.balance < 0)
      .reduce((sum, balance) => sum + Math.abs(balance.balances.INR.balance), 0)
    
    const clientCount = filteredBalances.filter(balance => balance.party.type === 'CLIENT').length
    const supplierCount = filteredBalances.filter(balance => balance.party.type === 'SUPPLIER').length
    
    return { totalReceivable, totalPayable, clientCount, supplierCount }
  }

  const summary = calculateSummary()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading account balances...</span>
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
          <div className="flex items-center gap-4">
            <Button variant="outline" onClick={() => navigate('/financials')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Overview
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Account Balances</h1>
              <p className="text-muted-foreground mt-1">
                Manage client, supplier, and company account balances
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadBalanceData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <Button onClick={() => setShowAddBalanceModal(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(summary.totalReceivable)}
              </p>
              <p className="text-sm text-green-600">Total Receivable</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-800">
                {formatCurrency(summary.totalPayable)}
              </p>
              <p className="text-sm text-red-600">Total Payable</p>
            </CardContent>
          </Card>
          
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-800">
                {summary.clientCount}
              </p>
              <p className="text-sm text-blue-600">Client Accounts</p>
            </CardContent>
          </Card>
          
          <Card className="bg-orange-50 border-orange-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-orange-800">
                {summary.supplierCount}
              </p>
              <p className="text-sm text-orange-600">Supplier Accounts</p>
            </CardContent>
          </Card>
        </div>

        {/* Filters and Search */}
        <Card className="mb-6 bg-card">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1 relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by party name..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={partyTypeFilter} onValueChange={setPartyTypeFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Types</SelectItem>
                  <SelectItem value="CLIENT">Clients</SelectItem>
                  <SelectItem value="SUPPLIER">Suppliers</SelectItem>
                  <SelectItem value="COMPANY">Companies</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Account Balances List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Account Balances</CardTitle>
              <CardDescription>Manage client, supplier, and company account balances ({getFilteredBalances().length} accounts)</CardDescription>
            </div>
            <Button onClick={() => setShowAddBalanceModal(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Account
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getFilteredBalances().map((balance) => {
                const inrBalance = getBalanceDisplay(balance.balances.INR.balance)
                const usdBalance = getBalanceDisplay(balance.balances.USD.balance)
                
                return (
                  <Card key={balance._id} className="border-l-4 border-l-amber-500">
                    <CardContent className="p-4">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-4">
                          <div className="p-3 bg-amber-100 rounded-full">
                            <Building2 className="h-6 w-6 text-amber-600" />
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <h3 className="font-semibold text-stone-900">{balance.party.name}</h3>
                              <Badge variant="outline" className="text-xs">
                                {balance.party.type}
                              </Badge>
                            </div>
                            <p className="text-sm text-stone-600">Payment Terms: {balance.paymentTerms}</p>
                            <p className="text-xs text-stone-500">
                              Last transaction: {new Date(balance.lastTransactionDate).toLocaleDateString()}
                            </p>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="space-y-2">
                            <div>
                              <p className={`text-lg font-bold ${inrBalance.color}`}>
                                ₹{formatCurrency(inrBalance.amount)}
                              </p>
                              <p className="text-xs text-stone-500">{inrBalance.label} (INR)</p>
                            </div>
                            {usdBalance.amount > 0 && (
                              <div>
                                <p className={`text-sm font-medium ${usdBalance.color}`}>
                                  ${formatCurrency(usdBalance.amount)}
                                </p>
                                <p className="text-xs text-stone-500">{usdBalance.label} (USD)</p>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                      
                      {/* Additional Balance Details */}
                      <div className="mt-4 pt-4 border-t border-stone-200">
                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                          <div className="text-center p-2 bg-green-50 rounded">
                            <p className="font-medium text-green-800">₹{formatCurrency(balance.balances.INR.credit)}</p>
                            <p className="text-xs text-green-600">Total Credit</p>
                          </div>
                          <div className="text-center p-2 bg-red-50 rounded">
                            <p className="font-medium text-red-800">₹{formatCurrency(balance.balances.INR.debit)}</p>
                            <p className="text-xs text-red-600">Total Debit</p>
                          </div>
                          <div className="text-center p-2 bg-blue-50 rounded">
                            <p className="font-medium text-blue-800">₹{formatCurrency(balance.balances.INR.balance)}</p>
                            <p className="text-xs text-blue-600">Net Balance</p>
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                )
              })}
              {getFilteredBalances().length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <PiggyBank className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                  <p>No account balances found</p>
                  <p className="text-sm mt-2">Try adjusting your filters or add a new account</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Account Balance Modal */}
        <Dialog open={showAddBalanceModal} onOpenChange={setShowAddBalanceModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedBalance ? 'Edit Account' : 'Add New Account'}
              </DialogTitle>
              <DialogDescription>
                {selectedBalance ? 'Update account details' : 'Create a new account balance record'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="partyName">Party Name</Label>
                  <Input
                    id="partyName"
                    placeholder="Enter party name"
                    value={balanceForm.party.name}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm, 
                      party: {...balanceForm.party, name: e.target.value}
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="partyType">Party Type</Label>
                  <Select value={balanceForm.party.type} onValueChange={(value) => setBalanceForm({
                    ...balanceForm, 
                    party: {...balanceForm.party, type: value}
                  })}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="CLIENT">Client</SelectItem>
                      <SelectItem value="SUPPLIER">Supplier</SelectItem>
                      <SelectItem value="COMPANY">Company</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="initialBalance">Initial Balance</Label>
                  <Input
                    id="initialBalance"
                    type="number"
                    placeholder="Enter initial balance"
                    value={balanceForm.initialBalance}
                    onChange={(e) => setBalanceForm({...balanceForm, initialBalance: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={balanceForm.currency} onValueChange={(value) => setBalanceForm({...balanceForm, currency: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="INR">INR</SelectItem>
                      <SelectItem value="USD">USD</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="creditLimitINR">Credit Limit (INR)</Label>
                  <Input
                    id="creditLimitINR"
                    type="number"
                    placeholder="Enter INR credit limit"
                    value={balanceForm.creditLimit.INR}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm, 
                      creditLimit: {...balanceForm.creditLimit, INR: e.target.value}
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="creditLimitUSD">Credit Limit (USD)</Label>
                  <Input
                    id="creditLimitUSD"
                    type="number"
                    placeholder="Enter USD credit limit"
                    value={balanceForm.creditLimit.USD}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm, 
                      creditLimit: {...balanceForm.creditLimit, USD: e.target.value}
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="paymentTerms">Payment Terms</Label>
                <Select value={balanceForm.paymentTerms} onValueChange={(value) => setBalanceForm({...balanceForm, paymentTerms: value})}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="NET_15">Net 15 Days</SelectItem>
                    <SelectItem value="NET_30">Net 30 Days</SelectItem>
                    <SelectItem value="NET_60">Net 60 Days</SelectItem>
                    <SelectItem value="COD">Cash on Delivery</SelectItem>
                    <SelectItem value="ADVANCE">Advance Payment</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="email">Email</Label>
                  <Input
                    id="email"
                    type="email"
                    placeholder="Enter email address"
                    value={balanceForm.party.contactInfo.email}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm, 
                      party: {
                        ...balanceForm.party, 
                        contactInfo: {...balanceForm.party.contactInfo, email: e.target.value}
                      }
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    placeholder="Enter phone number"
                    value={balanceForm.party.contactInfo.phone}
                    onChange={(e) => setBalanceForm({
                      ...balanceForm, 
                      party: {
                        ...balanceForm.party, 
                        contactInfo: {...balanceForm.party.contactInfo, phone: e.target.value}
                      }
                    })}
                  />
                </div>
              </div>

              <div>
                <Label htmlFor="address">Address</Label>
                <Input
                  id="address"
                  placeholder="Enter party address"
                  value={balanceForm.party.address}
                  onChange={(e) => setBalanceForm({
                    ...balanceForm, 
                    party: {...balanceForm.party, address: e.target.value}
                  })}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowAddBalanceModal(false)
                resetBalanceForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateOrUpdateBalance} className="bg-amber-600 hover:bg-amber-700">
                {selectedBalance ? 'Update' : 'Create'} Account
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

export default AccountBalances