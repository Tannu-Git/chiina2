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
  BarChart3,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  FileText,
  History,
  TrendingDown,
  CircleDollarSign,
  PiggyBank,
  CreditCard as CardIcon
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const PaymentCollections = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [activeTab, setActiveTab] = useState('overview')
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [partyTypeFilter, setPartyTypeFilter] = useState('all')
  
  // Data states
  const [transactions, setTransactions] = useState([])
  const [accountBalances, setAccountBalances] = useState([])
  const [invoices, setInvoices] = useState([])
  const [paymentSummary, setPaymentSummary] = useState({
    totalReceived: { INR: 0, USD: 0 },
    totalPaid: { INR: 0, USD: 0 },
    pendingReceivables: { INR: 0, USD: 0 },
    overdueInvoices: { INR: 0, USD: 0 }
  })
  
  // Modal states
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedBalance, setSelectedBalance] = useState(null)
  
  // Form states
  const [transactionForm, setTransactionForm] = useState({
    type: 'PAYMENT_RECEIVED',
    paymentMethod: 'BANK_TRANSFER',
    amount: '',
    currency: 'INR',
    party: { id: '', name: '', type: 'CLIENT' },
    description: '',
    notes: '',
    bankDetails: { accountNumber: '', bankName: '', transactionReference: '' }
  })
  
  const [balanceForm, setBalanceForm] = useState({
    party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
    initialBalance: '',
    currency: 'INR',
    creditLimit: { INR: '', USD: '' },
    paymentTerms: 'NET_30'
  })
  
  const [invoiceForm, setInvoiceForm] = useState({
    party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
    items: [{ description: '', quantity: 1, unitPrice: '', totalPrice: '' }],
    currency: 'INR',
    dueDate: '',
    notes: ''
  })

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch all payment data
  const fetchPaymentData = async () => {
    try {
      setLoading(true)
      console.log('💰 [PAYMENT COLLECTIONS] Fetching comprehensive payment data')
      
      if (!isAuthenticated || !token) {
        console.error('❌ [PAYMENT COLLECTIONS] Not authenticated')
        toast.error('Please log in to view payment data')
        navigate('/login')
        return
      }
      
      // Fetch all payment-related data in parallel
      const [transactionsRes, balancesRes, invoicesRes, summaryRes] = await Promise.all([
        axios.get('/api/payments/transactions?limit=50'),
        axios.get('/api/payments/balances'),
        axios.get('/api/payments/invoices?limit=50'),
        axios.get('/api/payments/summary')
      ])
      
      setTransactions(transactionsRes.data.transactions || [])
      setAccountBalances(balancesRes.data.balances || [])
      setInvoices(invoicesRes.data.invoices || [])
      setPaymentSummary(summaryRes.data.summary || paymentSummary)
      
      console.log('✅ [PAYMENT COLLECTIONS] All payment data loaded successfully')
      
    } catch (error) {
      console.error('❌ [PAYMENT COLLECTIONS] Error fetching payment data:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to load payment data')
        // Generate demo data for display
        generateDemoData()
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate demo data if backend is not available
  const generateDemoData = () => {
    const demoTransactions = [
      {
        _id: '1',
        transactionId: 'TXN001234',
        type: 'PAYMENT_RECEIVED',
        paymentMethod: 'BANK_TRANSFER',
        amount: 125000,
        currency: 'INR',
        party: { id: 'client1', name: 'ABC Trading Co.', type: 'CLIENT' },
        description: 'Payment for Container ABC-001',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString()
      },
      {
        _id: '2',
        transactionId: 'TXN001235',
        type: 'PAYMENT_MADE',
        paymentMethod: 'UPI',
        amount: 45000,
        currency: 'INR',
        party: { id: 'supplier1', name: 'Global Suppliers Ltd.', type: 'SUPPLIER' },
        description: 'Payment to supplier for goods',
        status: 'COMPLETED',
        paymentDate: new Date().toISOString()
      }
    ]
    
    const demoBalances = [
      {
        _id: '1',
        party: { id: 'client1', name: 'ABC Trading Co.', type: 'CLIENT' },
        balances: { INR: { balance: 125000, credit: 150000, debit: 25000 }, USD: { balance: 0, credit: 0, debit: 0 } },
        paymentTerms: 'NET_30'
      },
      {
        _id: '2', 
        party: { id: 'supplier1', name: 'Global Suppliers Ltd.', type: 'SUPPLIER' },
        balances: { INR: { balance: -45000, credit: 0, debit: 45000 }, USD: { balance: 0, credit: 0, debit: 0 } },
        paymentTerms: 'NET_15'
      }
    ]
    
    setTransactions(demoTransactions)
    setAccountBalances(demoBalances)
    setPaymentSummary({
      totalReceived: { INR: 450000, USD: 12000 },
      totalPaid: { INR: 320000, USD: 8500 },
      pendingReceivables: { INR: 125000, USD: 3500 },
      overdueInvoices: { INR: 65000, USD: 1200 }
    })
  }

  // CRUD Operations for Transactions
  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.amount || !transactionForm.party.name || !transactionForm.description) {
        toast.error('Please fill in all required fields')
        return
      }

      const response = await axios.post('/api/payments/transactions', {
        ...transactionForm,
        amount: parseFloat(transactionForm.amount),
        party: {
          ...transactionForm.party,
          id: transactionForm.party.id || `${transactionForm.party.type.toLowerCase()}_${Date.now()}`
        }
      })

      toast.success('Payment transaction created successfully!')
      setShowAddTransactionModal(false)
      resetTransactionForm()
      fetchPaymentData()
    } catch (error) {
      console.error('Create transaction error:', error)
      toast.error('Failed to create transaction')
    }
  }

  const handleUpdateTransaction = async (transactionId, updates) => {
    try {
      await axios.put(`/api/payments/transactions/${transactionId}`, updates)
      toast.success('Transaction updated successfully!')
      fetchPaymentData()
    } catch (error) {
      console.error('Update transaction error:', error)
      toast.error('Failed to update transaction')
    }
  }

  const handleDeleteTransaction = async (transactionId) => {
    if (!window.confirm('Are you sure you want to delete this transaction?')) return
    
    try {
      await axios.delete(`/api/payments/transactions/${transactionId}`)
      toast.success('Transaction deleted successfully!')
      fetchPaymentData()
    } catch (error) {
      console.error('Delete transaction error:', error)
      toast.error('Failed to delete transaction')
    }
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
      fetchPaymentData()
    } catch (error) {
      console.error('Create/Update balance error:', error)
      toast.error('Failed to update account balance')
    }
  }

  // Invoice Operations
  const handleCreateInvoice = async () => {
    try {
      if (!invoiceForm.party.name || invoiceForm.items.length === 0) {
        toast.error('Please fill in all required fields')
        return
      }

      const subtotal = invoiceForm.items.reduce((sum, item) => sum + (parseFloat(item.totalPrice) || 0), 0)
      const taxAmount = subtotal * 0.18 // 18% GST
      const totalAmount = subtotal + taxAmount

      const requestData = {
        party: {
          ...invoiceForm.party,
          id: invoiceForm.party.id || `${invoiceForm.party.type.toLowerCase()}_${Date.now()}`
        },
        items: invoiceForm.items.map(item => ({
          ...item,
          quantity: parseFloat(item.quantity),
          unitPrice: parseFloat(item.unitPrice),
          totalPrice: parseFloat(item.totalPrice)
        })),
        amounts: {
          subtotal,
          taxAmount,
          discountAmount: 0,
          totalAmount
        },
        currency: invoiceForm.currency,
        dueDate: invoiceForm.dueDate,
        notes: invoiceForm.notes
      }

      await axios.post('/api/payments/invoices', requestData)
      toast.success('Invoice created successfully!')
      setShowCreateInvoiceModal(false)
      resetInvoiceForm()
      fetchPaymentData()
    } catch (error) {
      console.error('Create invoice error:', error)
      toast.error('Failed to create invoice')
    }
  }
  // Export comprehensive payment data
  const handleExportCollections = () => {
    try {
      const exportData = []

      // Add summary row
      exportData.push({
        'Type': 'SUMMARY',
        'Description': 'Payment Collections Summary',
        'Total Received (INR)': formatCurrency(paymentSummary.totalReceived.INR),
        'Total Paid (INR)': formatCurrency(paymentSummary.totalPaid.INR),
        'Pending Receivables (INR)': formatCurrency(paymentSummary.pendingReceivables.INR),
        'Overdue Amount (INR)': formatCurrency(paymentSummary.overdueInvoices.INR),
        'Export Date': new Date().toLocaleString()
      })

      // Add transaction details
      transactions.forEach(transaction => {
        exportData.push({
          'Type': 'TRANSACTION',
          'Transaction ID': transaction.transactionId,
          'Party Name': transaction.party.name,
          'Party Type': transaction.party.type,
          'Transaction Type': transaction.type,
          'Payment Method': transaction.paymentMethod,
          'Amount': formatCurrency(transaction.amount),
          'Currency': transaction.currency,
          'Status': transaction.status,
          'Description': transaction.description,
          'Date': new Date(transaction.paymentDate).toLocaleDateString()
        })
      })

      // Add account balances
      accountBalances.forEach(balance => {
        exportData.push({
          'Type': 'ACCOUNT_BALANCE',
          'Party Name': balance.party.name,
          'Party Type': balance.party.type,
          'INR Balance': formatCurrency(balance.balances.INR.balance),
          'USD Balance': formatCurrency(balance.balances.USD.balance),
          'Payment Terms': balance.paymentTerms,
          'Last Transaction': new Date(balance.lastTransactionDate).toLocaleDateString()
        })
      })

      if (exportData.length === 0) {
        toast.error('No payment data to export')
        return
      }

      // Convert to CSV
      const headers = Object.keys(exportData[0])
      const csvContent = [
        headers.join(','),
        ...exportData.map(row => 
          headers.map(header => {
            const value = row[header] || ''
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

      toast.success(`Payment data exported successfully! (${exportData.length} records)`)
      
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export payment data')
    }
  }

  // Utility functions for form management
  const resetTransactionForm = () => {
    setTransactionForm({
      type: 'PAYMENT_RECEIVED',
      paymentMethod: 'BANK_TRANSFER',
      amount: '',
      currency: 'INR',
      party: { id: '', name: '', type: 'CLIENT' },
      description: '',
      notes: '',
      bankDetails: { accountNumber: '', bankName: '', transactionReference: '' }
    })
  }

  const resetBalanceForm = () => {
    setBalanceForm({
      party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
      initialBalance: '',
      currency: 'INR',
      creditLimit: { INR: '', USD: '' },
      paymentTerms: 'NET_30'
    })
  }

  const resetInvoiceForm = () => {
    setInvoiceForm({
      party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
      items: [{ description: '', quantity: 1, unitPrice: '', totalPrice: '' }],
      currency: 'INR',
      dueDate: '',
      notes: ''
    })
  }

  // Filter functions
  const getFilteredTransactions = () => {
    return transactions.filter(transaction => {
      const matchesSearch = searchTerm === '' || 
        transaction.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        transaction.transactionId.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || transaction.status === statusFilter
      const matchesPartyType = partyTypeFilter === 'all' || transaction.party.type === partyTypeFilter
      
      return matchesSearch && matchesStatus && matchesPartyType
    })
  }

  const getFilteredBalances = () => {
    return accountBalances.filter(balance => {
      const matchesSearch = searchTerm === '' || 
        balance.party.name.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesPartyType = partyTypeFilter === 'all' || balance.party.type === partyTypeFilter
      
      return matchesSearch && matchesPartyType
    })
  }

  // Component lifecycle
  useEffect(() => {
    fetchPaymentData()
  }, [])

  // Status and type helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'COMPLETED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'PENDING':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'FAILED':
        return 'bg-red-100 text-red-800 border-red-300'
      case 'CANCELLED':
        return 'bg-stone-100 text-stone-800 border-stone-300'
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'COMPLETED':
        return <CheckCircle className="h-4 w-4" />
      case 'PENDING':
        return <Clock className="h-4 w-4" />
      case 'FAILED':
        return <AlertCircle className="h-4 w-4" />
      case 'CANCELLED':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  const getTransactionTypeIcon = (type) => {
    switch (type) {
      case 'PAYMENT_RECEIVED':
        return <ArrowDownLeft className="h-5 w-5 text-green-600" />
      case 'PAYMENT_MADE':
        return <ArrowUpRight className="h-5 w-5 text-red-600" />
      case 'INVOICE_GENERATED':
        return <FileText className="h-5 w-5 text-blue-600" />
      case 'REFUND':
        return <TrendingDown className="h-5 w-5 text-orange-600" />
      default:
        return <Receipt className="h-5 w-5 text-stone-600" />
    }
  }

  const getBalanceDisplay = (balance) => {
    if (balance > 0) {
      return { amount: balance, type: 'receivable', color: 'text-green-600', label: 'Receivable' }
    } else if (balance < 0) {
      return { amount: Math.abs(balance), type: 'payable', color: 'text-red-600', label: 'Payable' }
    } else {
      return { amount: 0, type: 'neutral', color: 'text-stone-600', label: 'Settled' }
    }
  }

  // Early return for loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading payment management...</span>
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
        {/* Professional Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <CircleDollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Payment Management</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive financial tracking, invoicing, and account management
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchPaymentData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportCollections}>
              <Download className="h-4 w-4 mr-2" />
              Export Data
            </Button>
            <Button onClick={() => navigate('/financials')} className="bg-amber-600 hover:bg-amber-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Financial Dashboard
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Received</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(paymentSummary.totalReceived.INR)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">
                    ${(paymentSummary.totalReceived.USD / 100).toFixed(2)} USD
                  </p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wide">Paid Out</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(paymentSummary.totalPaid.INR)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">
                    ${(paymentSummary.totalPaid.USD / 100).toFixed(2)} USD
                  </p>
                </div>
                <ArrowUpRight className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-amber-800">
                    {formatCurrency(paymentSummary.pendingReceivables.INR)}
                  </p>
                  <p className="text-xs text-amber-600 mt-1">
                    ${(paymentSummary.pendingReceivables.USD / 100).toFixed(2)} USD
                  </p>
                </div>
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-orange-600 uppercase tracking-wide">Overdue</p>
                  <p className="text-2xl font-bold text-orange-800">
                    {formatCurrency(paymentSummary.overdueInvoices.INR)}
                  </p>
                  <p className="text-xs text-orange-600 mt-1">
                    ${(paymentSummary.overdueInvoices.USD / 100).toFixed(2)} USD
                  </p>
                </div>
                <AlertCircle className="h-10 w-10 text-orange-500" />
              </div>
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
                  placeholder="Search transactions, parties, or IDs..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-48">
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="COMPLETED">Completed</SelectItem>
                  <SelectItem value="PENDING">Pending</SelectItem>
                  <SelectItem value="FAILED">Failed</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
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

        {/* Main Tabbed Interface */}
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-4 bg-muted p-1 rounded-lg">
            <TabsTrigger value="overview" className="flex items-center gap-2 font-medium">
              <PiggyBank className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="transactions" className="flex items-center gap-2 font-medium">
              <History className="h-4 w-4" />
              Transactions ({getFilteredTransactions().length})
            </TabsTrigger>
            <TabsTrigger value="accounts" className="flex items-center gap-2 font-medium">
              <Users className="h-4 w-4" />
              Account Balances ({getFilteredBalances().length})
            </TabsTrigger>
            <TabsTrigger value="invoices" className="flex items-center gap-2 font-medium">
              <FileText className="h-4 w-4" />
              Invoices ({invoices.length})
            </TabsTrigger>
          </TabsList>

          {/* Overview Tab */}
          <TabsContent value="overview" className="mt-6">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Quick Actions */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <Plus className="h-5 w-5" />
                    Quick Actions
                  </CardTitle>
                  <CardDescription>
                    Manage payments, accounts, and invoices
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <Button 
                      onClick={() => setShowAddTransactionModal(true)}
                      className="h-20 flex flex-col items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-2 border-green-500/20" 
                      variant="outline"
                    >
                      <DollarSign className="h-6 w-6" />
                      <span className="text-sm font-medium">Record Payment</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setShowCreateInvoiceModal(true)}
                      className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20" 
                      variant="outline"
                    >
                      <FileText className="h-6 w-6" />
                      <span className="text-sm font-medium">Create Invoice</span>
                    </Button>
                    
                    <Button 
                      onClick={() => setShowAddBalanceModal(true)}
                      className="h-20 flex flex-col items-center justify-center gap-2 bg-primary/10 hover:bg-primary/20 text-primary border-2 border-primary/20" 
                      variant="outline"
                    >
                      <PiggyBank className="h-6 w-6" />
                      <span className="text-sm font-medium">Manage Account</span>
                    </Button>
                    
                    <Button 
                      onClick={handleExportCollections}
                      className="h-20 flex flex-col items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-2 border-purple-500/20" 
                      variant="outline"
                    >
                      <Download className="h-6 w-6" />
                      <span className="text-sm font-medium">Export Data</span>
                    </Button>
                  </div>
                </CardContent>
              </Card>

              {/* Recent Activity */}
              <Card className="bg-card">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <History className="h-5 w-5" />
                    Recent Activity
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {getFilteredTransactions().slice(0, 5).map((transaction) => (
                      <div key={transaction._id} className="flex items-center justify-between p-3 bg-stone-50 rounded-lg hover:bg-stone-100 transition-colors">
                        <div className="flex items-center gap-3">
                          {getTransactionTypeIcon(transaction.type)}
                          <div>
                            <p className="font-medium text-stone-900">{transaction.party.name}</p>
                            <p className="text-sm text-stone-500">{transaction.description}</p>
                          </div>
                        </div>
                        <div className="text-right">
                          <p className={`font-bold ${
                            transaction.type === 'PAYMENT_RECEIVED' ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {transaction.type === 'PAYMENT_RECEIVED' ? '+' : '-'}{formatCurrency(transaction.amount)}
                          </p>
                          <Badge className={getStatusColor(transaction.status)}>
                            {getStatusIcon(transaction.status)}
                            <span className="ml-1">{transaction.status}</span>
                          </Badge>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            </div>
          </TabsContent>

          {/* Transactions Tab */}
          <TabsContent value="transactions" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Payment Transactions</CardTitle>
                  <CardDescription>All payment activities and financial transactions</CardDescription>
                </div>
                <Button onClick={() => setShowAddTransactionModal(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Add Transaction
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {getFilteredTransactions().map((transaction) => (
                    <Card key={transaction._id} className="border-l-4 border-l-amber-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            {getTransactionTypeIcon(transaction.type)}
                            <div>
                              <div className="flex items-center gap-2">
                                <h3 className="font-semibold text-stone-900">{transaction.party.name}</h3>
                                <Badge variant="outline" className="text-xs">
                                  {transaction.party.type}
                                </Badge>
                              </div>
                              <p className="text-sm text-stone-600">{transaction.description}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                                <span>ID: {transaction.transactionId}</span>
                                <span>{transaction.paymentMethod}</span>
                                <span>{new Date(transaction.paymentDate).toLocaleDateString()}</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-2xl font-bold ${
                              transaction.type === 'PAYMENT_RECEIVED' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.type === 'PAYMENT_RECEIVED' ? '+' : '-'}{formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-sm text-stone-500">{transaction.currency}</p>
                            <Badge className={getStatusColor(transaction.status)}>
                              {getStatusIcon(transaction.status)}
                              <span className="ml-1">{transaction.status}</span>
                            </Badge>
                          </div>
                        </div>
                        {user?.role === 'admin' && (
                          <div className="flex justify-end gap-2 mt-4 pt-4 border-t border-stone-200">
                            <Button 
                              variant="outline" 
                              size="sm"
                              onClick={() => {
                                setSelectedTransaction(transaction)
                                setTransactionForm({ ...transaction })
                                setShowAddTransactionModal(true)
                              }}
                            >
                              <Edit className="h-4 w-4 mr-1" />
                              Edit
                            </Button>
                            <Button 
                              variant="outline" 
                              size="sm" 
                              onClick={() => handleDeleteTransaction(transaction._id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Trash2 className="h-4 w-4 mr-1" />
                              Delete
                            </Button>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  ))}
                  {getFilteredTransactions().length === 0 && (
                    <div className="text-center py-8 text-stone-500">
                      <History className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                      <p>No transactions found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Account Balances Tab */}
          <TabsContent value="accounts" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Account Balances</CardTitle>
                  <CardDescription>Manage client, supplier, and company account balances</CardDescription>
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
                        </CardContent>
                      </Card>
                    )
                  })}
                  {getFilteredBalances().length === 0 && (
                    <div className="text-center py-8 text-stone-500">
                      <PiggyBank className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                      <p>No account balances found</p>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Invoices Tab */}
          <TabsContent value="invoices" className="mt-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <div>
                  <CardTitle>Invoices</CardTitle>
                  <CardDescription>Manage invoices and billing</CardDescription>
                </div>
                <Button onClick={() => setShowCreateInvoiceModal(true)} className="bg-amber-600 hover:bg-amber-700">
                  <Plus className="h-4 w-4 mr-2" />
                  Create Invoice
                </Button>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {invoices.map((invoice) => (
                    <Card key={invoice._id} className="border-l-4 border-l-blue-500">
                      <CardContent className="p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="p-3 bg-blue-100 rounded-full">
                              <FileText className="h-6 w-6 text-blue-600" />
                            </div>
                            <div>
                              <h3 className="font-semibold text-stone-900">{invoice.invoiceNumber}</h3>
                              <p className="text-sm text-stone-600">{invoice.party.name}</p>
                              <div className="flex items-center gap-4 mt-1 text-xs text-stone-500">
                                <span>Due: {new Date(invoice.dueDate).toLocaleDateString()}</span>
                                <span>{invoice.items.length} items</span>
                              </div>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className="text-2xl font-bold text-stone-900">
                              {formatCurrency(invoice.amounts.totalAmount)}
                            </p>
                            <p className="text-sm text-stone-500">{invoice.currency}</p>
                            <Badge className={getStatusColor(invoice.status)}>
                              {getStatusIcon(invoice.status)}
                              <span className="ml-1">{invoice.status}</span>
                            </Badge>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                  {invoices.length === 0 && (
                    <div className="text-center py-8 text-stone-500">
                      <FileText className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                      <p>No invoices found</p>
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

export default PaymentCollections;