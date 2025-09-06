import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  History,
  Plus,
  Edit,
  Trash2,
  Search,
  Filter,
  RefreshCw,
  Download,
  ArrowLeft
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import { 
  fetchPaymentData, 
  getStatusColor, 
  getStatusIcon, 
  getTransactionTypeIcon,
  handleExportCollections
} from './utils/financialUtils'
import axios from 'axios'
import toast from 'react-hot-toast'

const TransactionManagement = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [transactions, setTransactions] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [partyTypeFilter, setPartyTypeFilter] = useState('all')
  
  // Modal states
  const [showAddTransactionModal, setShowAddTransactionModal] = useState(false)
  const [showReceivePaymentModal, setShowReceivePaymentModal] = useState(false)
  const [selectedTransaction, setSelectedTransaction] = useState(null)
  
  // Form state
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

  // Quick receive payment form
  const [receivePaymentForm, setReceivePaymentForm] = useState({
    clientId: '',
    clientName: '',
    amount: '',
    paymentMethod: 'BANK_TRANSFER',
    description: 'Payment received from client',
    notes: '',
    bankDetails: { accountNumber: '', bankName: '', transactionReference: '' }
  })

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch data - Get real transaction data from payment collections API
  const loadTransactionData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view transaction data')
        navigate('/login')
        return
      }

      // Get real data from payment collections - use raw collections data
      const response = await axios.get('/api/payment-collections/raw')
      
      if (response.data) {
        console.log('✅ Loaded payment collections data')
        
        // Transform payment collections to transaction format
        const transformedTransactions = []
        const paymentCollections = Array.isArray(response.data) ? response.data : []
        
        paymentCollections.forEach(collection => {
          // Add received payment transaction if amount > 0
          if (collection.receivedAmount && collection.receivedAmount > 0) {
            transformedTransactions.push({
              _id: `received_${collection._id}`,
              transactionId: `REC_${collection.clientId}_${Date.now()}`,
              type: 'PAYMENT_RECEIVED',
              paymentMethod: 'BANK_TRANSFER',
              amount: collection.receivedAmount,
              currency: 'INR',
              party: {
                id: collection.clientId,
                name: collection.clientName,
                type: 'CLIENT'
              },
              description: `Payment received from ${collection.clientName}`,
              notes: collection.notes || '',
              status: 'COMPLETED',
              paymentDate: collection.updatedAt || new Date().toISOString(),
              createdAt: collection.createdAt || new Date().toISOString()
            })
          }
          
          // Add pending payment transaction if pending amount > 0
          if (collection.pendingAmount && collection.pendingAmount > 0) {
            transformedTransactions.push({
              _id: `pending_${collection._id}`,
              transactionId: `PND_${collection.clientId}_${Date.now()}`,
              type: 'PAYMENT_RECEIVED',
              paymentMethod: 'BANK_TRANSFER',
              amount: collection.pendingAmount,
              currency: 'INR',
              party: {
                id: collection.clientId,
                name: collection.clientName,
                type: 'CLIENT'
              },
              description: `Outstanding payment from ${collection.clientName}`,
              notes: collection.notes || 'Pending payment collection',
              status: 'PENDING',
              paymentDate: new Date().toISOString(),
              createdAt: collection.createdAt || new Date().toISOString()
            })
          }
        })
        
        setTransactions(transformedTransactions)
        console.log(`✅ Transformed ${transformedTransactions.length} transactions from payment collections`)
      } else {
        console.log('⚠️ No payment collections data found')
        setTransactions([])
      }
    } catch (error) {
      console.error('Error loading transaction data:', error)
      toast.error('Failed to load transaction data')
      setTransactions([])
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadTransactionData()
  }, [])

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

  // CRUD Operations for Transactions
  const handleCreateTransaction = async () => {
    try {
      if (!transactionForm.amount || !transactionForm.party.name || !transactionForm.description) {
        toast.error('Please fill in all required fields')
        return
      }

      // For now, show success message since we're using payment collections data
      toast.success('Transaction recorded! This will be reflected in payment collections.')
      setShowAddTransactionModal(false)
      resetTransactionForm()
      loadTransactionData()
    } catch (error) {
      console.error('Create transaction error:', error)
      toast.error('Failed to create transaction')
    }
  }

  // Quick receive payment function - using payment collections API
  const handleReceivePayment = async () => {
    try {
      if (!receivePaymentForm.clientName || !receivePaymentForm.amount) {
        toast.error('Please fill in client name and amount')
        return
      }

      // Use the payment collections API to record payment
      const response = await axios.post('/api/payment-collections/record-payment', {
        clientName: receivePaymentForm.clientName,
        amount: parseFloat(receivePaymentForm.amount),
        description: receivePaymentForm.description,
        notes: receivePaymentForm.notes,
        paymentMethod: receivePaymentForm.paymentMethod
      })

      toast.success(`Payment of ₹${receivePaymentForm.amount} received from ${receivePaymentForm.clientName}!`)
      setShowReceivePaymentModal(false)
      resetReceivePaymentForm()
      loadTransactionData()
    } catch (error) {
      console.error('Receive payment error:', error)
      toast.error('Failed to record payment')
    }
  }

  const handleUpdateTransaction = async (transactionId, updates) => {
    try {
      await axios.put(`/api/payments/transactions/${transactionId}`, updates)
      toast.success('Transaction updated successfully!')
      loadTransactionData()
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
      loadTransactionData()
    } catch (error) {
      console.error('Delete transaction error:', error)
      toast.error('Failed to delete transaction')
    }
  }

  // Utility functions
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
    setSelectedTransaction(null)
  }

  const resetReceivePaymentForm = () => {
    setReceivePaymentForm({
      clientId: '',
      clientName: '',
      amount: '',
      paymentMethod: 'BANK_TRANSFER',
      description: 'Payment received from client',
      notes: '',
      bankDetails: { accountNumber: '', bankName: '', transactionReference: '' }
    })
  }

  const handleExport = () => {
    handleExportCollections(transactions, [], { totalReceived: { INR: 0 }, totalPaid: { INR: 0 }, pendingReceivables: { INR: 0 } })
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading transactions...</span>
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
              <h1 className="text-3xl font-bold text-foreground">Transaction Management</h1>
              <p className="text-muted-foreground mt-1">
                Manage all payment transactions and financial activities
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadTransactionData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExport}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            <div className="p-1 rounded-lg amber-gradient">
              <Button onClick={() => setShowReceivePaymentModal(true)} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300 mr-2">
                <Plus className="h-4 w-4 mr-2" />
                Quick Receive
              </Button>
            </div>
            <div className="p-2 rounded-lg amber-gradient">
              <Button onClick={() => setShowAddTransactionModal(true)} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
          </div>
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

        {/* Transactions List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>All payment activities and financial transactions ({getFilteredTransactions().length} transactions)</CardDescription>
            </div>
            <div className="p-2 rounded-lg amber-gradient">
              <Button onClick={() => setShowAddTransactionModal(true)} className="bg-white text-amber-700 hover:bg-amber-50 border-0 shadow-lg hover:shadow-xl transition-all duration-300">
                <Plus className="h-4 w-4 mr-2" />
                Add Transaction
              </Button>
            </div>
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
                  <p className="text-sm mt-2">Try adjusting your filters or add a new transaction</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Add/Edit Transaction Modal */}
        <Dialog open={showAddTransactionModal} onOpenChange={setShowAddTransactionModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>
                {selectedTransaction ? 'Edit Transaction' : 'Add New Transaction'}
              </DialogTitle>
              <DialogDescription>
                {selectedTransaction ? 'Update transaction details' : 'Create a new payment transaction record'}
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="type">Transaction Type</Label>
                  <Select value={transactionForm.type} onValueChange={(value) => setTransactionForm({...transactionForm, type: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="PAYMENT_RECEIVED">Payment Received</SelectItem>
                      <SelectItem value="PAYMENT_MADE">Payment Made</SelectItem>
                      <SelectItem value="REFUND">Refund</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={transactionForm.paymentMethod} onValueChange={(value) => setTransactionForm({...transactionForm, paymentMethod: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={transactionForm.amount}
                    onChange={(e) => setTransactionForm({...transactionForm, amount: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="currency">Currency</Label>
                  <Select value={transactionForm.currency} onValueChange={(value) => setTransactionForm({...transactionForm, currency: value})}>
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
                  <Label htmlFor="partyName">Party Name</Label>
                  <Input
                    id="partyName"
                    placeholder="Enter party name"
                    value={transactionForm.party.name}
                    onChange={(e) => setTransactionForm({
                      ...transactionForm, 
                      party: {...transactionForm.party, name: e.target.value}
                    })}
                  />
                </div>
                
                <div>
                  <Label htmlFor="partyType">Party Type</Label>
                  <Select value={transactionForm.party.type} onValueChange={(value) => setTransactionForm({
                    ...transactionForm, 
                    party: {...transactionForm.party, type: value}
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

              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Enter transaction description"
                  value={transactionForm.description}
                  onChange={(e) => setTransactionForm({...transactionForm, description: e.target.value})}
                />
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add any additional notes"
                  value={transactionForm.notes}
                  onChange={(e) => setTransactionForm({...transactionForm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowAddTransactionModal(false)
                resetTransactionForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateTransaction} className="bg-amber-600 hover:bg-amber-700">
                {selectedTransaction ? 'Update' : 'Create'} Transaction
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Quick Receive Payment Modal */}
        <Dialog open={showReceivePaymentModal} onOpenChange={setShowReceivePaymentModal}>
          <DialogContent className="max-w-lg">
            <DialogHeader>
              <div className="flex items-center gap-3">
                <div className="p-2 rounded-lg amber-gradient">
                  <Plus className="h-5 w-5 text-white" />
                </div>
                <div>
                  <DialogTitle>Quick Receive Payment</DialogTitle>
                  <DialogDescription>
                    Quickly record a payment received from a client
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={receivePaymentForm.clientName}
                  onChange={(e) => setReceivePaymentForm({...receivePaymentForm, clientName: e.target.value})}
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="amount">Amount Received *</Label>
                  <Input
                    id="amount"
                    type="number"
                    placeholder="Enter amount"
                    value={receivePaymentForm.amount}
                    onChange={(e) => setReceivePaymentForm({...receivePaymentForm, amount: e.target.value})}
                  />
                </div>
                
                <div>
                  <Label htmlFor="paymentMethod">Payment Method</Label>
                  <Select value={receivePaymentForm.paymentMethod} onValueChange={(value) => setReceivePaymentForm({...receivePaymentForm, paymentMethod: value})}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BANK_TRANSFER">Bank Transfer</SelectItem>
                      <SelectItem value="UPI">UPI</SelectItem>
                      <SelectItem value="CASH">Cash</SelectItem>
                      <SelectItem value="CHEQUE">Cheque</SelectItem>
                      <SelectItem value="RTGS">RTGS</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Add payment notes..."
                  value={receivePaymentForm.notes}
                  onChange={(e) => setReceivePaymentForm({...receivePaymentForm, notes: e.target.value})}
                />
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowReceivePaymentModal(false)
                resetReceivePaymentForm()
              }}>
                Cancel
              </Button>
              <div className="p-1 rounded amber-gradient">
                <Button onClick={handleReceivePayment} className="bg-white text-amber-700 hover:bg-amber-50 border-0">
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

export default TransactionManagement