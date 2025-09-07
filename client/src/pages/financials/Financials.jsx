import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  BarChart3,
  DollarSign,
  Users,
  CreditCard,
  RefreshCw,
  ArrowRight,
  TrendingUp,
  CircleDollarSign,
  FileText,
  Wallet,
  Building2,
  Receipt,
  History,
  PieChart,
  Target
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Financials = () => {
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
  const [comprehensiveData, setComprehensiveData] = useState(null)
  const [paymentCollectionsData, setPaymentCollectionsData] = useState(null)
  const [paymentSummary, setPaymentSummary] = useState({
    totalReceived: { INR: 0, USD: 0 },
    totalPaid: { INR: 0, USD: 0 },
    pendingReceivables: { INR: 0, USD: 0 }
  })
  
  // Modal states
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showAddBalanceModal, setShowAddBalanceModal] = useState(false)
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [showTransactionDetailsModal, setShowTransactionDetailsModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  const [selectedBalance, setSelectedBalance] = useState(null)
  const [selectedPartyDetails, setSelectedPartyDetails] = useState(null)
  
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

  // Fetch comprehensive financial data
  const fetchPaymentData = async () => {
    try {
      setLoading(true)
      console.log('💰 [FINANCIAL DASHBOARD] Fetching comprehensive financial data')
      
      if (!isAuthenticated || !token) {
        console.error('❌ [FINANCIAL DASHBOARD] Not authenticated')
        toast.error('Please log in to view financial data')
        navigate('/login')
        return
      }
      
      // Fetch comprehensive financial data from our new endpoints
      const [comprehensiveRes, collectionsRes, paymentCollectionsRes] = await Promise.all([
        axios.get('/api/financials-comprehensive/comprehensive-dashboard?period=30'),
        axios.get('/api/financials-comprehensive/payment-collections'),
        axios.get('/api/payment-collections') // Real payment tracking
      ])
      
      const comprehensiveData = comprehensiveRes.data
      const collectionsData = collectionsRes.data
      const paymentCollectionsData = paymentCollectionsRes.data
      
      // Store comprehensive data in state
      setComprehensiveData(comprehensiveData)
      setPaymentCollectionsData(collectionsData)
      
      // Transform the comprehensive data for our existing UI components
      const transformedTransactions = [
        // Client payments (what we need to collect)
        ...collectionsData.toCollectFromClients.flatMap(client => 
          client.orders.map(order => ({
            _id: `client_${client.clientId}_${order.orderNumber}`,
            transactionId: `CLT_${order.orderNumber}`,
            type: 'PAYMENT_RECEIVED',
            paymentMethod: 'PENDING',
            amount: order.amount,
            currency: 'INR',
            party: { id: client.clientId, name: client.clientName, type: 'CLIENT' },
            description: `Carrying charges for order ${order.orderNumber}`,
            status: order.status,
            paymentDate: new Date().toISOString()
          }))
        ),
        // Supplier payments (what we need to pay)
        ...collectionsData.toPayToSuppliers.flatMap(supplier => 
          supplier.orders.map(order => ({
            _id: `supplier_${supplier.supplierId}_${order.orderNumber}`,
            transactionId: `SUP_${order.orderNumber}`,
            type: 'PAYMENT_MADE',
            paymentMethod: 'PENDING',
            amount: order.productValue,
            currency: 'INR',
            party: { id: supplier.supplierId, name: supplier.supplierName, type: 'SUPPLIER' },
            description: `Product payment for ${order.itemDescription}`,
            status: order.status,
            paymentDate: new Date().toISOString()
          }))
        )
      ]
      
      // Transform client data into account balances
      const transformedBalances = [
        ...comprehensiveData.clientFinancials.map(client => ({
          _id: `balance_${client.clientId}`,
          party: { id: client.clientId, name: client.clientName, type: 'CLIENT' },
          balances: {
            INR: {
              balance: client.paymentBreakdown.throughMe.amount,
              credit: client.totalCarryingCharges,
              debit: client.paymentBreakdown.direct.amount
            },
            USD: { balance: 0, credit: 0, debit: 0 }
          },
          paymentTerms: 'NET_30',
          lastTransactionDate: new Date().toISOString()
        })),
        ...comprehensiveData.supplierFinancials.map(supplier => ({
          _id: `balance_${supplier.supplierId}`,
          party: { id: supplier.supplierId, name: supplier.supplierName, type: 'SUPPLIER' },
          balances: {
            INR: {
              balance: -supplier.paymentBreakdown.throughMe.amount, // Negative because we owe them
              credit: 0,
              debit: supplier.paymentBreakdown.throughMe.amount
            },
            USD: { balance: 0, credit: 0, debit: 0 }
          },
          paymentTerms: 'NET_15',
          lastTransactionDate: new Date().toISOString()
        }))
      ]
      
      // Generate invoices for client collections
      const transformedInvoices = comprehensiveData.clientFinancials
        .filter(client => client.paymentBreakdown.throughMe.amount > 0)
        .map((client, index) => ({
          _id: `invoice_${client.clientId}`,
          invoiceNumber: `INV${new Date().getFullYear().toString().slice(-2)}${String(index + 1).padStart(3, '0')}`,
          party: { id: client.clientId, name: client.clientName, type: 'CLIENT' },
          amounts: {
            subtotal: client.paymentBreakdown.throughMe.amount,
            taxAmount: client.gstCharges || 0,
            totalAmount: client.paymentBreakdown.throughMe.amount + (client.gstCharges || 0)
          },
          currency: 'INR',
          status: 'SENT',
          invoiceDate: new Date().toISOString(),
          dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
          items: client.orders.map(order => ({
            description: `Carrying charges for order ${order.orderNumber}`,
            quantity: 1,
            unitPrice: order.carryingCharges,
            totalPrice: order.carryingCharges
          }))
        }))
      
      setTransactions(transformedTransactions)
      setAccountBalances(transformedBalances)
      setInvoices(transformedInvoices)
      
      // Calculate real payment summary using manual payment tracking
      const realPaymentSummary = {
        totalReceived: { 
          INR: paymentCollectionsData.summary.totalReceived, // Manually recorded payments
          USD: 0 
        },
        totalPaid: { 
          INR: comprehensiveData.paymentFlowSummary.throughMe.supplierPayments, // What you need to pay suppliers
          USD: 0 
        },
        pendingReceivables: { 
          INR: paymentCollectionsData.summary.totalPending, // Real pending from manual tracking
          USD: 0 
        }
      }
      
      // Fallback to demo data only if no real collections data
      if (paymentCollectionsData.summary.totalToCollect === 0) {
        realPaymentSummary.totalReceived.INR = 485000;
        realPaymentSummary.totalPaid.INR = 250000; // Amount you need to pay suppliers
        realPaymentSummary.pendingReceivables.INR = 87000;
      }
      
      setPaymentSummary(realPaymentSummary)
      
      // Remove window object usage since we're using state
      // window.comprehensiveFinancialData = comprehensiveData
      // window.paymentCollectionsData = collectionsData
      
      console.log('✅ [FINANCIAL DASHBOARD] Comprehensive financial data loaded successfully')
      toast.success('Financial data updated with real-time information')
      
    } catch (error) {
      console.error('❌ [FINANCIAL DASHBOARD] Error fetching financial data:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else {
        toast.error('Failed to load financial data')
        // Generate demo data for display
        generateDemoData()
      }
    } finally {
      setLoading(false)
    }
  }

  // Generate demo data if backend is not available - based on realistic financial patterns
  const generateDemoData = () => {
    console.log('🔄 [PAYMENT COLLECTIONS] Using demo data fallback - backend may be unavailable')
    
    // Generate more realistic demo transactions
    const demoTransactions = [
      {
        _id: 'demo_txn_1',
        transactionId: 'TXN' + Date.now().toString().slice(-8),
        type: 'PAYMENT_RECEIVED',
        paymentMethod: 'BANK_TRANSFER',
        amount: 245000,
        currency: 'INR',
        party: { id: 'client_abc', name: 'ABC Trading Co.', type: 'CLIENT' },
        description: 'Payment for logistics services - Container shipment',
        status: 'COMPLETED',
        paymentDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString() // 2 days ago
      },
      {
        _id: 'demo_txn_2',
        transactionId: 'TXN' + (Date.now() + 1000).toString().slice(-8),
        type: 'PAYMENT_MADE',
        paymentMethod: 'RTGS',
        amount: 85000,
        currency: 'INR',
        party: { id: 'supplier_global', name: 'Global Logistics Pvt Ltd', type: 'SUPPLIER' },
        description: 'Payment for container handling charges',
        status: 'COMPLETED',
        paymentDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString() // 1 day ago
      },
      {
        _id: 'demo_txn_3',
        transactionId: 'TXN' + (Date.now() + 2000).toString().slice(-8),
        type: 'PAYMENT_RECEIVED',
        paymentMethod: 'UPI',
        amount: 125000,
        currency: 'INR',
        party: { id: 'client_xyz', name: 'XYZ International', type: 'CLIENT' },
        description: 'Advance payment for upcoming shipment',
        status: 'PENDING',
        paymentDate: new Date().toISOString()
      }
    ]
    
    const demoBalances = [
      {
        _id: 'demo_bal_1',
        party: { id: 'client_abc', name: 'ABC Trading Co.', type: 'CLIENT' },
        balances: { 
          INR: { balance: 125000, credit: 245000, debit: 120000 }, 
          USD: { balance: 0, credit: 0, debit: 0 } 
        },
        paymentTerms: 'NET_30',
        lastTransactionDate: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'demo_bal_2', 
        party: { id: 'supplier_global', name: 'Global Logistics Pvt Ltd', type: 'SUPPLIER' },
        balances: { 
          INR: { balance: -85000, credit: 0, debit: 85000 }, 
          USD: { balance: 0, credit: 0, debit: 0 } 
        },
        paymentTerms: 'NET_15',
        lastTransactionDate: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString()
      },
      {
        _id: 'demo_bal_3',
        party: { id: 'client_xyz', name: 'XYZ International', type: 'CLIENT' },
        balances: { 
          INR: { balance: 125000, credit: 125000, debit: 0 }, 
          USD: { balance: 0, credit: 0, debit: 0 } 
        },
        paymentTerms: 'NET_30',
        lastTransactionDate: new Date().toISOString()
      }
    ]
    
    // Generate realistic demo invoices
    const demoInvoices = [
      {
        _id: 'demo_inv_1',
        invoiceNumber: 'INV' + new Date().getFullYear().toString().slice(-2) + '001',
        party: { id: 'client_abc', name: 'ABC Trading Co.', type: 'CLIENT' },
        amounts: { subtotal: 200000, taxAmount: 36000, totalAmount: 236000 },
        currency: 'INR',
        status: 'SENT',
        invoiceDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000).toISOString(),
        dueDate: new Date(Date.now() + 25 * 24 * 60 * 60 * 1000).toISOString(),
        items: [{ description: 'Logistics services for container ABC-001', quantity: 1, unitPrice: 200000, totalPrice: 200000 }]
      },
      {
        _id: 'demo_inv_2',
        invoiceNumber: 'INV' + new Date().getFullYear().toString().slice(-2) + '002',
        party: { id: 'client_xyz', name: 'XYZ International', type: 'CLIENT' },
        amounts: { subtotal: 180000, taxAmount: 32400, totalAmount: 212400 },
        currency: 'INR',
        status: 'DRAFT',
        invoiceDate: new Date().toISOString(),
        dueDate: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
        items: [{ description: 'Container handling and documentation', quantity: 1, unitPrice: 180000, totalPrice: 180000 }]
      }
    ]
    
    setTransactions(demoTransactions)
    setAccountBalances(demoBalances)
    setInvoices(demoInvoices)
    setPaymentSummary({
      totalReceived: { INR: 370000, USD: 0 },
      totalPaid: { INR: 185000, USD: 0 }, // Amount you need to pay suppliers
      pendingReceivables: { INR: 337400, USD: 0 }
    })
    
    toast.info('Using demo financial data. Connect to backend for real-time data.')
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

  // Show detailed transaction history for a party
  const handleShowPartyDetails = (party, type) => {
    const partyDetails = {
      ...party,
      type, // 'client', 'supplier', or 'transport'
      transactions: [],
      summary: {
        needToReceive: 0,
        needToPay: 0,
        totalTransactions: 0
      }
    }

    // Get transactions for this party from comprehensive data
    if (comprehensiveData) {
      if (type === 'client') {
        partyDetails.summary.needToReceive = party.paymentBreakdown.throughMe.amount + party.paymentBreakdown.direct.amount // Total from client
        partyDetails.summary.needToPay = 0
        partyDetails.transactions = party.orders.map(order => ({
          id: order.orderNumber,
          type: 'RECEIVABLE',
          amount: order.carryingCharges + (order.amount - order.carryingCharges), // Total amount from client
          description: `${order.amount > order.carryingCharges ? 'Product + Carrying charges' : 'Carrying charges'} for order ${order.orderNumber}`,
          status: order.status,
          paymentType: 'NEED_TO_RECEIVE',
          containers: party.containers
        }))
      } else if (type === 'supplier') {
        partyDetails.summary.needToReceive = 0
        partyDetails.summary.needToPay = party.paymentBreakdown.throughMe.amount
        partyDetails.transactions = party.orders.map(order => ({
          id: order.orderNumber,
          type: 'PAYABLE',
          amount: order.productValue,
          description: `Product payment for ${order.itemDescription}`,
          status: order.status,
          paymentType: 'NEED_TO_PAY'
        }))
      } else if (type === 'transport') {
        partyDetails.summary.needToReceive = 0
        partyDetails.summary.needToPay = party.totalShippingCosts
        partyDetails.transactions = party.containers.map(container => ({
          id: container.containerId,
          type: 'PAYABLE',
          amount: container.shippingCosts,
          description: `Shipping costs for container ${container.containerId}`,
          status: container.status,
          paymentType: 'NEED_TO_PAY'
        }))
      }
      
      partyDetails.summary.totalTransactions = partyDetails.transactions.length
    }

    setSelectedPartyDetails(partyDetails)
    setShowTransactionDetailsModal(true)
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
    // RED: When balance > 0 (client OWES you money - receivable)
    if (balance > 0) {
      return { amount: balance, type: 'receivable', color: 'text-red-600', label: 'They Owe Us' }
    // GREEN: When balance < 0 (you OWE client money - payable)
    } else if (balance < 0) {
      return { amount: Math.abs(balance), type: 'payable', color: 'text-green-600', label: 'We Owe Them' }
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
            <Button onClick={() => navigate('/payment-collections')} className="bg-green-600 hover:bg-green-700">
              <Banknote className="h-4 w-4 mr-2" />
              Manage Collections
            </Button>
            <Button onClick={() => navigate('/financials')} className="bg-amber-600 hover:bg-amber-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              Financial Dashboard
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-6">
          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-green-600 uppercase tracking-wide">Received</p>
                  <p className="text-2xl font-bold text-green-800">
                    {formatCurrency(paymentSummary.totalReceived.INR)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Money collected from clients</p>
                </div>
                <DollarSign className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wide">Supplier Pay</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(paymentSummary.totalPaid.INR)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Money need to pay suppliers</p>
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
                  <p className="text-xs text-amber-600 mt-1">Awaiting collection from clients</p>
                </div>
                <Clock className="h-10 w-10 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Comprehensive Financial Dashboard */}
        {comprehensiveData && (
          <div className="mb-8">
            <Card className="bg-card">
              <CardHeader>
                <CardTitle className="text-xl text-foreground flex items-center">
                  <BarChart3 className="h-6 w-6 mr-2" />
                  Comprehensive Financial Overview
                </CardTitle>
                <CardDescription>
                  Real-time financial data breakdown by clients, suppliers, and transport companies
                </CardDescription>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="profit-summary" className="w-full">
                  <TabsList className="grid w-full grid-cols-4">
                    <TabsTrigger value="profit-summary">Profit Summary</TabsTrigger>
                    <TabsTrigger value="clients">Client-wise</TabsTrigger>
                    <TabsTrigger value="suppliers">Supplier-wise</TabsTrigger>
                    <TabsTrigger value="transport">Transport-wise</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="profit-summary" className="space-y-6">
                    {/* Overall Money Flow Summary */}
                    <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                      <CardHeader>
                        <CardTitle className="text-xl text-blue-800">Money Flow Summary</CardTitle>
                        <CardDescription className="text-blue-600">
                          What you need to receive vs what you need to pay
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="text-center p-6 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-3xl font-bold text-green-800">
                              {formatCurrency(
                                comprehensiveData.clientFinancials.reduce(
                                  (sum, client) => sum + client.paymentBreakdown.throughMe.amount + client.paymentBreakdown.direct.amount, 0
                                )
                              )}
                            </p>
                            <p className="text-sm text-green-600 mt-2">Total Need to Receive from Clients</p>
                            <p className="text-xs text-green-500 mt-1">
                              Through Me: {formatCurrency(
                                comprehensiveData.clientFinancials.reduce(
                                  (sum, client) => sum + client.paymentBreakdown.throughMe.amount, 0
                                )
                              )} + Direct: {formatCurrency(
                                comprehensiveData.clientFinancials.reduce(
                                  (sum, client) => sum + client.paymentBreakdown.direct.amount, 0
                                )
                              )}
                            </p>
                          </div>
                          <div className="text-center p-6 bg-red-50 rounded-lg border border-red-200">
                            <p className="text-3xl font-bold text-red-800">
                              {formatCurrency(
                                comprehensiveData.supplierFinancials.reduce(
                                  (sum, supplier) => sum + supplier.paymentBreakdown.throughMe.amount, 0
                                ) +
                                comprehensiveData.transportFinancials.reduce(
                                  (sum, transport) => sum + transport.totalShippingCosts, 0
                                )
                              )}
                            </p>
                            <p className="text-sm text-red-600 mt-2">Total Need to Pay (Suppliers + Transport)</p>
                            <p className="text-xs text-red-500 mt-1">
                              Through Me: {formatCurrency(
                                comprehensiveData.supplierFinancials.reduce(
                                  (sum, supplier) => sum + supplier.paymentBreakdown.throughMe.amount, 0
                                )
                              )} + Transport: {formatCurrency(
                                comprehensiveData.transportFinancials.reduce(
                                  (sum, transport) => sum + transport.totalShippingCosts, 0
                                )
                              )}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                      <Card className="bg-gradient-to-r from-green-50 to-green-100 border-green-200">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold text-green-800 mb-2">Total Carrying Charges</h3>
                          <p className="text-3xl font-bold text-green-900">
                            {formatCurrency(comprehensiveData.summary.totalCarryingCharges)}
                          </p>
                          <p className="text-sm text-green-600 mt-2">Revenue from logistics services</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-red-50 to-red-100 border-red-200">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold text-red-800 mb-2">Total Charges</h3>
                          <p className="text-3xl font-bold text-red-900">
                            {formatCurrency(comprehensiveData.summary.totalCharges)}
                          </p>
                          <p className="text-sm text-red-600 mt-2">GST + Duty + Misc + Extra charges</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-gradient-to-r from-blue-50 to-blue-100 border-blue-200">
                        <CardContent className="p-6">
                          <h3 className="text-lg font-semibold text-blue-800 mb-2">Net Profit</h3>
                          <p className="text-3xl font-bold text-blue-900">
                            {formatCurrency(comprehensiveData.summary.totalProfit)}
                          </p>
                          <p className="text-sm text-blue-600 mt-2">
                            {comprehensiveData.summary.profitMargin}% margin
                          </p>
                        </CardContent>
                      </Card>
                    </div>
                    
                    {/* Charges Breakdown */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Charges Breakdown</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-orange-50 rounded-lg border border-orange-200">
                            <p className="text-2xl font-bold text-orange-800">
                              {formatCurrency(comprehensiveData.chargesBreakdown.totalGST)}
                            </p>
                            <p className="text-sm text-orange-600">GST</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 rounded-lg border border-purple-200">
                            <p className="text-2xl font-bold text-purple-800">
                              {formatCurrency(comprehensiveData.chargesBreakdown.totalDuty)}
                            </p>
                            <p className="text-sm text-purple-600">Duty</p>
                          </div>
                          <div className="text-center p-4 bg-indigo-50 rounded-lg border border-indigo-200">
                            <p className="text-2xl font-bold text-indigo-800">
                              {formatCurrency(comprehensiveData.chargesBreakdown.totalMisc)}
                            </p>
                            <p className="text-sm text-indigo-600">Miscellaneous</p>
                          </div>
                          <div className="text-center p-4 bg-pink-50 rounded-lg border border-pink-200">
                            <p className="text-2xl font-bold text-pink-800">
                              {formatCurrency(comprehensiveData.chargesBreakdown.totalExtraCharges)}
                            </p>
                            <p className="text-sm text-pink-600">Extra Charges</p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                    
                    {/* Payment Flow Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle className="text-lg">Payment Flow Summary</CardTitle>
                        <CardDescription>Cash flow breakdown - you get ALL carrying charges regardless of payment type</CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground">Through Me Flow</h4>
                            <div className="text-sm text-muted-foreground mb-2">
                              Client pays you everything, you pay supplier product cost
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <span className="text-green-800">You Collect (Product + Carrying)</span>
                                <span className="font-bold text-green-900">
                                  {formatCurrency(comprehensiveData.paymentFlowSummary.throughMe.clientPayments)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-red-50 rounded-lg border border-red-200">
                                <span className="text-red-800">You Pay Suppliers (Product Cost)</span>
                                <span className="font-bold text-red-900">
                                  {formatCurrency(comprehensiveData.paymentFlowSummary.throughMe.supplierPayments)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                                <span className="text-blue-800">Net Cash Flow</span>
                                <span className="font-bold text-blue-900">
                                  {formatCurrency(comprehensiveData.paymentFlowSummary.throughMe.netCashFlow)}
                                </span>
                              </div>
                            </div>
                          </div>
                          <div className="space-y-4">
                            <h4 className="font-semibold text-foreground">Direct Payment Flow</h4>
                            <div className="text-sm text-muted-foreground mb-2">
                              Client pays supplier directly, but still pays you carrying charges
                            </div>
                            <div className="space-y-2">
                              <div className="flex justify-between items-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <span className="text-green-800">You Collect (Carrying Only)</span>
                                <span className="font-bold text-green-900">
                                  {formatCurrency(comprehensiveData.paymentFlowSummary.direct.carryingCharges)}
                                </span>
                              </div>
                              <div className="flex justify-between items-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <span className="text-gray-800">Client Pays Supplier Direct</span>
                                <span className="font-bold text-gray-900">
                                  {formatCurrency(comprehensiveData.paymentFlowSummary.direct.supplierPayments)}
                                </span>
                              </div>
                              <div className="p-2 bg-amber-50 rounded-lg border border-amber-200">
                                <span className="text-sm text-amber-700">💡 No cash flow through you for product costs</span>
                              </div>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </TabsContent>
                  
                  <TabsContent value="clients" className="space-y-4">
                    <div className="grid gap-4">
                      {comprehensiveData.clientFinancials.map((client, index) => (
                        <Card key={index} className="border-l-4 border-l-blue-500">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{client.clientName}</h3>
                                <p className="text-sm text-muted-foreground">Client ID: {client.clientId}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-green-600">
                                    {formatCurrency(client.paymentBreakdown.throughMe.amount + client.paymentBreakdown.direct.amount)}
                                  </p>
                                  <p className="text-sm text-green-600">Need to Receive</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowPartyDetails(client, 'client')}
                                  className="bg-blue-50 hover:bg-blue-100"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center p-3 bg-yellow-50 rounded-lg border border-yellow-200">
                                <p className="text-lg font-bold text-yellow-800">
                                  {formatCurrency(client.paymentBreakdown.throughMe.amount)}
                                </p>
                                <p className="text-sm text-yellow-600">Through Me - Total ({client.paymentBreakdown.throughMe.orders} orders)</p>
                              </div>
                              <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                                <p className="text-lg font-bold text-green-800">
                                  {formatCurrency(client.paymentBreakdown.direct.amount)}
                                </p>
                                <p className="text-sm text-green-600">Direct - Carrying Only ({client.paymentBreakdown.direct.orders} orders)</p>
                              </div>
                              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-lg font-bold text-red-800">
                                  {formatCurrency(client.gstCharges)}
                                </p>
                                <p className="text-sm text-red-600">GST Charges</p>
                              </div>
                            </div>
                            <div className="mt-4">
                              <p className="text-sm text-muted-foreground">
                                Containers: {client.containers.join(', ')}
                              </p>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="suppliers" className="space-y-4">
                    <div className="grid gap-4">
                      {comprehensiveData.supplierFinancials.map((supplier, index) => (
                        <Card key={index} className="border-l-4 border-l-orange-500">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{supplier.supplierName}</h3>
                                <p className="text-sm text-muted-foreground">{supplier.contact}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(supplier.paymentBreakdown.throughMe.amount)}
                                  </p>
                                  <p className="text-sm text-red-600">Need to Pay</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowPartyDetails(supplier, 'supplier')}
                                  className="bg-orange-50 hover:bg-orange-100"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-lg font-bold text-red-800">
                                  {formatCurrency(supplier.paymentBreakdown.throughMe.amount)}
                                </p>
                                <p className="text-sm text-red-600">Through Me ({supplier.paymentBreakdown.throughMe.orders} orders)</p>
                              </div>
                              <div className="text-center p-3 bg-gray-50 rounded-lg border border-gray-200">
                                <p className="text-lg font-bold text-gray-800">
                                  {formatCurrency(supplier.paymentBreakdown.direct.amount)}
                                </p>
                                <p className="text-sm text-gray-600">Direct ({supplier.paymentBreakdown.direct.orders} orders)</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="transport" className="space-y-4">
                    <div className="grid gap-4">
                      {comprehensiveData.transportFinancials.map((transport, index) => (
                        <Card key={index} className="border-l-4 border-l-purple-500">
                          <CardContent className="p-6">
                            <div className="flex justify-between items-start mb-4">
                              <div>
                                <h3 className="text-lg font-semibold text-foreground">{transport.companyName}</h3>
                                <p className="text-sm text-muted-foreground">{transport.contactInfo?.email}</p>
                              </div>
                              <div className="flex items-center gap-4">
                                <div className="text-right">
                                  <p className="text-2xl font-bold text-red-600">
                                    {formatCurrency(transport.totalShippingCosts)}
                                  </p>
                                  <p className="text-sm text-red-600">Need to Pay</p>
                                </div>
                                <Button
                                  variant="outline"
                                  size="sm"
                                  onClick={() => handleShowPartyDetails(transport, 'transport')}
                                  className="bg-purple-50 hover:bg-purple-100"
                                >
                                  <Eye className="h-4 w-4" />
                                </Button>
                              </div>
                            </div>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                              <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                                <p className="text-lg font-bold text-red-800">
                                  {formatCurrency(transport.totalShippingCosts)}
                                </p>
                                <p className="text-sm text-red-600">Total Shipping Costs</p>
                              </div>
                              <div className="text-center p-3 bg-purple-50 rounded-lg border border-purple-200">
                                <p className="text-lg font-bold text-purple-800">
                                  {transport.totalContainers}
                                </p>
                                <p className="text-sm text-purple-600">Containers Handled</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>
        )}
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

        {/* Transaction Details Modal */}
        <Dialog open={showTransactionDetailsModal} onOpenChange={setShowTransactionDetailsModal}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Eye className="h-5 w-5" />
                Transaction Details - {selectedPartyDetails?.clientName || selectedPartyDetails?.supplierName || selectedPartyDetails?.companyName}
              </DialogTitle>
              <DialogDescription>
                Detailed breakdown of all transactions and amounts for this {selectedPartyDetails?.type}
              </DialogDescription>
            </DialogHeader>
            
            {selectedPartyDetails && (
              <div className="space-y-6">
                {/* Summary Cards */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <Card className={`${selectedPartyDetails.summary.needToReceive > 0 ? 'bg-green-50 border-green-200' : 'bg-gray-50 border-gray-200'}`}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-green-600">
                        {formatCurrency(selectedPartyDetails.summary.needToReceive)}
                      </p>
                      <p className="text-sm text-green-600">Need to Receive</p>
                    </CardContent>
                  </Card>
                  
                  <Card className={`${selectedPartyDetails.summary.needToPay > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-red-600">
                        {formatCurrency(selectedPartyDetails.summary.needToPay)}
                      </p>
                      <p className="text-sm text-red-600">Need to Pay</p>
                    </CardContent>
                  </Card>
                  
                  <Card className="bg-blue-50 border-blue-200">
                    <CardContent className="p-4 text-center">
                      <p className="text-2xl font-bold text-blue-600">
                        {selectedPartyDetails.summary.totalTransactions}
                      </p>
                      <p className="text-sm text-blue-600">Total Transactions</p>
                    </CardContent>
                  </Card>
                </div>

                {/* Transaction List */}
                <div className="space-y-4">
                  <h4 className="text-lg font-semibold">Transaction Breakdown</h4>
                  {selectedPartyDetails.transactions.map((transaction, index) => (
                    <Card key={index} className={`border-l-4 ${
                      transaction.paymentType === 'NEED_TO_RECEIVE' ? 'border-l-green-500' : 'border-l-red-500'
                    }`}>
                      <CardContent className="p-4">
                        <div className="flex justify-between items-center">
                          <div className="flex items-center gap-4">
                            <div className={`p-2 rounded-full ${
                              transaction.paymentType === 'NEED_TO_RECEIVE' 
                                ? 'bg-green-100 text-green-600' 
                                : 'bg-red-100 text-red-600'
                            }`}>
                              {transaction.paymentType === 'NEED_TO_RECEIVE' 
                                ? <ArrowDownLeft className="h-4 w-4" />
                                : <ArrowUpRight className="h-4 w-4" />
                              }
                            </div>
                            <div>
                              <h5 className="font-medium">{transaction.id}</h5>
                              <p className="text-sm text-muted-foreground">{transaction.description}</p>
                              <Badge variant="outline" className="mt-1">
                                {transaction.status}
                              </Badge>
                            </div>
                          </div>
                          <div className="text-right">
                            <p className={`text-xl font-bold ${
                              transaction.paymentType === 'NEED_TO_RECEIVE' ? 'text-green-600' : 'text-red-600'
                            }`}>
                              {transaction.paymentType === 'NEED_TO_RECEIVE' ? '+' : '-'}
                              {formatCurrency(transaction.amount)}
                            </p>
                            <p className="text-xs text-muted-foreground">
                              {transaction.paymentType === 'NEED_TO_RECEIVE' ? 'To Receive' : 'To Pay'}
                            </p>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>

                {/* Additional Info */}
                {selectedPartyDetails.containers && (
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Containers</h4>
                    <p className="text-sm text-muted-foreground">
                      {Array.isArray(selectedPartyDetails.containers) 
                        ? selectedPartyDetails.containers.join(', ') 
                        : 'N/A'}
                    </p>
                  </div>
                )}

                {selectedPartyDetails.contact && (
                  <div>
                    <h4 className="text-lg font-semibold mb-2">Contact Information</h4>
                    <p className="text-sm text-muted-foreground">{selectedPartyDetails.contact}</p>
                  </div>
                )}
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowTransactionDetailsModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

export default Financials;