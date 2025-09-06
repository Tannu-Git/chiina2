import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  CreditCard,
  DollarSign,
  CheckCircle,
  Clock,
  AlertCircle,
  Plus,
  Edit,
  RefreshCw,
  Download,
  Receipt,
  Banknote,
  Users,
  TrendingUp,
  Search,
  Filter
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Label } from '@/components/ui/label'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const PaymentCollectionsManager = () => {
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Data states
  const [summary, setSummary] = useState({
    totalToCollect: 0,
    totalReceived: 0,
    totalPending: 0,
    clientCount: 0
  })
  const [clientCollections, setClientCollections] = useState([])
  
  // Modal states
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [recordPaymentModal, setRecordPaymentModal] = useState(false)
  const [bulkPaymentModal, setBulkPaymentModal] = useState(false)
  const [addClientModal, setAddClientModal] = useState(false)
  const [selectedClient, setSelectedClient] = useState(null)
  
  // Form states
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    notes: ''
  })
  const [bulkPaymentForm, setBulkPaymentForm] = useState({
    totalAmountReceived: '',
    notes: ''
  })
  const [addClientForm, setAddClientForm] = useState({
    clientId: '',
    clientName: '',
    totalAmount: '',
    description: '',
    notes: ''
  })

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])

  // Fetch payment collections data
  const fetchPaymentCollections = async () => {
    try {
      setLoading(true)
      console.log('💰 [PAYMENT COLLECTIONS] Fetching payment collections data')
      
      const response = await axios.get('/api/payment-collections')
      const data = response.data
      
      setSummary(data.summary)
      setClientCollections(data.clientCollections)
      
      console.log('✅ [PAYMENT COLLECTIONS] Data loaded successfully')
      
    } catch (error) {
      console.error('❌ [PAYMENT COLLECTIONS] Error:', error)
      toast.error('Failed to load payment collections data')
    } finally {
      setLoading(false)
    }
  }

  // Record individual payment
  const handleRecordPayment = async () => {
    try {
      if (!paymentForm.amount || parseFloat(paymentForm.amount) <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      const response = await axios.post('/api/payment-collections/record-payment', {
        paymentId: selectedPayment.paymentId,
        amount: parseFloat(paymentForm.amount),
        notes: paymentForm.notes
      })

      toast.success(response.data.message)
      setRecordPaymentModal(false)
      setPaymentForm({ amount: '', notes: '' })
      setSelectedPayment(null)
      fetchPaymentCollections()
      
    } catch (error) {
      console.error('Record payment error:', error)
      toast.error(error.response?.data?.message || 'Failed to record payment')
    }
  }

  // Record bulk payment for client
  const handleBulkPayment = async () => {
    try {
      if (!bulkPaymentForm.totalAmountReceived || parseFloat(bulkPaymentForm.totalAmountReceived) <= 0) {
        toast.error('Please enter a valid amount')
        return
      }

      const response = await axios.put('/api/payment-collections/bulk-record', {
        clientId: selectedClient.clientId,
        totalAmountReceived: parseFloat(bulkPaymentForm.totalAmountReceived),
        notes: bulkPaymentForm.notes
      })

      toast.success(response.data.message)
      setBulkPaymentModal(false)
      setBulkPaymentForm({ totalAmountReceived: '', notes: '' })
      setSelectedClient(null)
      fetchPaymentCollections()
      
    } catch (error) {
      console.error('Bulk payment error:', error)
      toast.error(error.response?.data?.message || 'Failed to record bulk payment')
    }
  }

  // Add manual client (not from containers)
  const handleAddManualClient = async () => {
    try {
      if (!addClientForm.clientName || !addClientForm.totalAmount) {
        toast.error('Please fill in client name and amount')
        return
      }

      const response = await axios.post('/api/payment-collections/add-manual-client', {
        clientId: addClientForm.clientId || `manual_${Date.now()}`,
        clientName: addClientForm.clientName,
        totalAmount: parseFloat(addClientForm.totalAmount),
        description: addClientForm.description || 'Manual payment collection entry',
        notes: addClientForm.notes
      })

      toast.success('Manual client added successfully')
      setAddClientModal(false)
      setAddClientForm({
        clientId: '',
        clientName: '',
        totalAmount: '',
        description: '',
        notes: ''
      })
      fetchPaymentCollections()
      
    } catch (error) {
      console.error('Add manual client error:', error)
      toast.error(error.response?.data?.message || 'Failed to add manual client')
    }
  }

  // Filter functions
  const getFilteredClients = () => {
    return clientCollections.filter(client => {
      const matchesSearch = searchTerm === '' || 
        client.clientName.toLowerCase().includes(searchTerm.toLowerCase()) ||
        client.clientId.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || 
        (statusFilter === 'pending' && client.pendingAmount > 0) ||
        (statusFilter === 'received' && client.pendingAmount === 0)
      
      return matchesSearch && matchesStatus
    })
  }

  // Status helper functions
  const getStatusColor = (status) => {
    switch (status) {
      case 'RECEIVED':
        return 'bg-green-100 text-green-800 border-green-300'
      case 'PARTIAL':
        return 'bg-amber-100 text-amber-800 border-amber-300'
      case 'PENDING':
        return 'bg-red-100 text-red-800 border-red-300'
      default:
        return 'bg-stone-100 text-stone-800 border-stone-300'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'RECEIVED':
        return <CheckCircle className="h-4 w-4" />
      case 'PARTIAL':
        return <Clock className="h-4 w-4" />
      case 'PENDING':
        return <AlertCircle className="h-4 w-4" />
      default:
        return <Receipt className="h-4 w-4" />
    }
  }

  // Component lifecycle
  useEffect(() => {
    fetchPaymentCollections()
  }, [])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading payment collections...</span>
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
            <div className="w-12 h-12 bg-gradient-to-r from-green-500 to-green-600 rounded-xl flex items-center justify-center">
              <Banknote className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Payment Collections</h1>
              <p className="text-muted-foreground mt-1">
                Track and record payments received from clients manually
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={fetchPaymentCollections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setAddClientModal(true)} className="bg-blue-600 hover:bg-blue-700">
              <Plus className="h-4 w-4 mr-2" />
              Add Client
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
                    {formatCurrency(summary.totalReceived)}
                  </p>
                  <p className="text-xs text-green-600 mt-1">Money in your account</p>
                </div>
                <CheckCircle className="h-10 w-10 text-green-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-red-600 uppercase tracking-wide">Pending</p>
                  <p className="text-2xl font-bold text-red-800">
                    {formatCurrency(summary.totalPending)}
                  </p>
                  <p className="text-xs text-red-600 mt-1">Awaiting collection</p>
                </div>
                <Clock className="h-10 w-10 text-red-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Total</p>
                  <p className="text-2xl font-bold text-blue-800">
                    {formatCurrency(summary.totalToCollect)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1">Total amount to collect</p>
                </div>
                <DollarSign className="h-10 w-10 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-card">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600 uppercase tracking-wide">Clients</p>
                  <p className="text-2xl font-bold text-purple-800">
                    {summary.clientCount}
                  </p>
                  <p className="text-xs text-purple-600 mt-1">Active clients</p>
                </div>
                <Users className="h-10 w-10 text-purple-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col md:flex-row gap-4">
              <div className="flex-1">
                <Label htmlFor="search">Search Clients</Label>
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    id="search"
                    placeholder="Search by client name or ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="statusFilter">Filter by Status</Label>
                <select
                  id="statusFilter"
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full px-3 py-2 border border-input rounded-md bg-background"
                >
                  <option value="all">All Clients</option>
                  <option value="pending">Pending Payments</option>
                  <option value="received">Fully Paid</option>
                </select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Client Collections */}
        <div className="grid gap-4">
          {getFilteredClients().map((client, index) => (
            <Card key={index} className="border-l-4 border-l-blue-500">
              <CardContent className="p-6">
                <div className="flex justify-between items-start mb-4">
                  <div>
                    <h3 className="text-lg font-semibold text-foreground">{client.clientName}</h3>
                    <p className="text-sm text-muted-foreground">Client ID: {client.clientId}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(client.pendingAmount)}
                    </p>
                    <p className="text-sm text-muted-foreground">Pending Collection</p>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-green-50 rounded-lg border border-green-200">
                    <p className="text-lg font-bold text-green-800">
                      {formatCurrency(client.receivedAmount)}
                    </p>
                    <p className="text-sm text-green-600">Received</p>
                  </div>
                  <div className="text-center p-3 bg-red-50 rounded-lg border border-red-200">
                    <p className="text-lg font-bold text-red-800">
                      {formatCurrency(client.pendingAmount)}
                    </p>
                    <p className="text-sm text-red-600">Pending</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg border border-blue-200">
                    <p className="text-lg font-bold text-blue-800">
                      {formatCurrency(client.totalAmount)}
                    </p>
                    <p className="text-sm text-blue-600">Total</p>
                  </div>
                </div>

                {/* Individual Payments */}
                <div className="space-y-2 mb-4">
                  <h4 className="font-medium text-foreground">Individual Orders:</h4>
                  {client.payments.map((payment, idx) => (
                    <div key={idx} className="flex justify-between items-center p-3 bg-muted rounded-lg">
                      <div className="flex items-center space-x-3">
                        <Badge className={getStatusColor(payment.status)}>
                          {getStatusIcon(payment.status)}
                          <span className="ml-1">{payment.status}</span>
                        </Badge>
                        <span className="font-medium">{payment.orderNumber}</span>
                        <span className="text-sm text-muted-foreground">{payment.containerId}</span>
                        <Badge variant="outline">{payment.paymentType}</Badge>
                        {payment.description && payment.paymentType === 'MANUAL' && (
                          <span className="text-xs text-blue-600 italic">({payment.description})</span>
                        )}
                      </div>
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <p className="font-bold">{formatCurrency(payment.pendingAmount)}</p>
                          <p className="text-xs text-muted-foreground">of {formatCurrency(payment.totalAmount)}</p>
                        </div>
                        {payment.pendingAmount > 0 && (
                          <Button
                            size="sm"
                            onClick={() => {
                              setSelectedPayment(payment)
                              setRecordPaymentModal(true)
                            }}
                          >
                            <Plus className="h-4 w-4 mr-1" />
                            Record Payment
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>

                {/* Bulk Payment Action */}
                {client.pendingAmount > 0 && (
                  <div className="flex justify-end">
                    <Button
                      className="bg-green-600 hover:bg-green-700"
                      onClick={() => {
                        setSelectedClient(client)
                        setBulkPaymentModal(true)
                      }}
                    >
                      <Banknote className="h-4 w-4 mr-2" />
                      Record Bulk Payment
                    </Button>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Record Individual Payment Modal */}
        <Dialog open={recordPaymentModal} onOpenChange={setRecordPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Payment</DialogTitle>
              <DialogDescription>
                Record payment received for {selectedPayment?.orderNumber}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="amount">Amount Received (₹)</Label>
                <Input
                  id="amount"
                  type="number"
                  placeholder="0.00"
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, amount: e.target.value }))}
                  max={selectedPayment?.pendingAmount}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Max: {formatCurrency(selectedPayment?.pendingAmount || 0)}
                </p>
              </div>
              <div>
                <Label htmlFor="notes">Notes (Optional)</Label>
                <Textarea
                  id="notes"
                  placeholder="Payment details, reference number, etc."
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setRecordPaymentModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleRecordPayment}>
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Payment Modal */}
        <Dialog open={bulkPaymentModal} onOpenChange={setBulkPaymentModal}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Record Bulk Payment</DialogTitle>
              <DialogDescription>
                Record total payment received from {selectedClient?.clientName}
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="totalAmount">Total Amount Received (₹)</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="0.00"
                  value={bulkPaymentForm.totalAmountReceived}
                  onChange={(e) => setBulkPaymentForm(prev => ({ ...prev, totalAmountReceived: e.target.value }))}
                />
                <p className="text-xs text-muted-foreground mt-1">
                  Pending: {formatCurrency(selectedClient?.pendingAmount || 0)}
                </p>
              </div>
              <div>
                <Label htmlFor="bulkNotes">Notes (Optional)</Label>
                <Textarea
                  id="bulkNotes"
                  placeholder="Payment details, bank transfer info, etc."
                  value={bulkPaymentForm.notes}
                  onChange={(e) => setBulkPaymentForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setBulkPaymentModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleBulkPayment}>
                  Record Payment
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>

        {/* Add Manual Client Modal */}
        <Dialog open={addClientModal} onOpenChange={setAddClientModal}>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>Add Manual Client</DialogTitle>
              <DialogDescription>
                Add a client who doesn't have containers but owes you money
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div>
                <Label htmlFor="clientName">Client Name *</Label>
                <Input
                  id="clientName"
                  placeholder="Enter client name"
                  value={addClientForm.clientName}
                  onChange={(e) => setAddClientForm(prev => ({ ...prev, clientName: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="clientId">Client ID (Optional)</Label>
                <Input
                  id="clientId"
                  placeholder="Auto-generated if empty"
                  value={addClientForm.clientId}
                  onChange={(e) => setAddClientForm(prev => ({ ...prev, clientId: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="totalAmount">Total Amount Owed (₹) *</Label>
                <Input
                  id="totalAmount"
                  type="number"
                  placeholder="0.00"
                  value={addClientForm.totalAmount}
                  onChange={(e) => setAddClientForm(prev => ({ ...prev, totalAmount: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="description">Description</Label>
                <Input
                  id="description"
                  placeholder="Service description or reason for payment"
                  value={addClientForm.description}
                  onChange={(e) => setAddClientForm(prev => ({ ...prev, description: e.target.value }))}
                />
              </div>
              <div>
                <Label htmlFor="addNotes">Notes (Optional)</Label>
                <Textarea
                  id="addNotes"
                  placeholder="Additional notes about this client or payment"
                  value={addClientForm.notes}
                  onChange={(e) => setAddClientForm(prev => ({ ...prev, notes: e.target.value }))}
                />
              </div>
              <div className="flex justify-end space-x-2">
                <Button variant="outline" onClick={() => setAddClientModal(false)}>
                  Cancel
                </Button>
                <Button onClick={handleAddManualClient}>
                  Add Client
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

export default PaymentCollectionsManager