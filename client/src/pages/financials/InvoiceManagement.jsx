import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  FileText,
  Plus,
  RefreshCw,
  Download,
  Search,
  Eye,
  ArrowLeft,
  Minus
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
  getStatusIcon
} from './utils/financialUtils'
import axios from 'axios'
import toast from 'react-hot-toast'

const InvoiceManagement = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [invoices, setInvoices] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Modal states
  const [showCreateInvoiceModal, setShowCreateInvoiceModal] = useState(false)
  const [showInvoiceDetailsModal, setShowInvoiceDetailsModal] = useState(false)
  const [selectedInvoice, setSelectedInvoice] = useState(null)
  
  // Form state
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

  // Fetch data
  const loadInvoiceData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view invoice data')
        navigate('/login')
        return
      }

      const data = await fetchPaymentData(token, navigate)
      if (data) {
        setInvoices(data.invoices)
      }
    } catch (error) {
      console.error('Error loading invoice data:', error)
      toast.error('Failed to load invoice data')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadInvoiceData()
  }, [])

  // Filter functions
  const getFilteredInvoices = () => {
    return invoices.filter(invoice => {
      const matchesSearch = searchTerm === '' || 
        invoice.party.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        invoice.invoiceNumber.toLowerCase().includes(searchTerm.toLowerCase())
      
      const matchesStatus = statusFilter === 'all' || invoice.status === statusFilter
      
      return matchesSearch && matchesStatus
    })
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
      loadInvoiceData()
    } catch (error) {
      console.error('Create invoice error:', error)
      toast.error('Failed to create invoice')
    }
  }

  // Utility functions
  const resetInvoiceForm = () => {
    setInvoiceForm({
      party: { id: '', name: '', type: 'CLIENT', address: '', contactInfo: { email: '', phone: '' } },
      items: [{ description: '', quantity: 1, unitPrice: '', totalPrice: '' }],
      currency: 'INR',
      dueDate: '',
      notes: ''
    })
  }

  const addInvoiceItem = () => {
    setInvoiceForm({
      ...invoiceForm,
      items: [...invoiceForm.items, { description: '', quantity: 1, unitPrice: '', totalPrice: '' }]
    })
  }

  const removeInvoiceItem = (index) => {
    if (invoiceForm.items.length > 1) {
      const newItems = invoiceForm.items.filter((_, i) => i !== index)
      setInvoiceForm({ ...invoiceForm, items: newItems })
    }
  }

  const updateInvoiceItem = (index, field, value) => {
    const newItems = [...invoiceForm.items]
    newItems[index] = { ...newItems[index], [field]: value }
    
    // Auto-calculate total price when quantity or unit price changes
    if (field === 'quantity' || field === 'unitPrice') {
      const quantity = field === 'quantity' ? parseFloat(value) || 0 : parseFloat(newItems[index].quantity) || 0
      const unitPrice = field === 'unitPrice' ? parseFloat(value) || 0 : parseFloat(newItems[index].unitPrice) || 0
      newItems[index].totalPrice = (quantity * unitPrice).toString()
    }
    
    setInvoiceForm({ ...invoiceForm, items: newItems })
  }

  // Calculate summary statistics
  const calculateSummary = () => {
    const filteredInvoices = getFilteredInvoices()
    const totalAmount = filteredInvoices.reduce((sum, invoice) => sum + invoice.amounts.totalAmount, 0)
    const pendingAmount = filteredInvoices
      .filter(invoice => invoice.status === 'SENT' || invoice.status === 'DRAFT')
      .reduce((sum, invoice) => sum + invoice.amounts.totalAmount, 0)
    const paidAmount = filteredInvoices
      .filter(invoice => invoice.status === 'PAID')
      .reduce((sum, invoice) => sum + invoice.amounts.totalAmount, 0)
    const overdueAmount = filteredInvoices
      .filter(invoice => invoice.status === 'OVERDUE')
      .reduce((sum, invoice) => sum + invoice.amounts.totalAmount, 0)
    
    return { totalAmount, pendingAmount, paidAmount, overdueAmount }
  }

  const summary = calculateSummary()

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading invoices...</span>
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
              <h1 className="text-3xl font-bold text-foreground">Invoice Management</h1>
              <p className="text-muted-foreground mt-1">
                Create, manage and track invoices and billing
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadInvoiceData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => setShowCreateInvoiceModal(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </div>
        </div>

        {/* Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <Card className="bg-blue-50 border-blue-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-blue-800">
                {formatCurrency(summary.totalAmount)}
              </p>
              <p className="text-sm text-blue-600">Total Invoice Value</p>
            </CardContent>
          </Card>
          
          <Card className="bg-amber-50 border-amber-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-amber-800">
                {formatCurrency(summary.pendingAmount)}
              </p>
              <p className="text-sm text-amber-600">Pending Amount</p>
            </CardContent>
          </Card>
          
          <Card className="bg-green-50 border-green-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-green-800">
                {formatCurrency(summary.paidAmount)}
              </p>
              <p className="text-sm text-green-600">Paid Amount</p>
            </CardContent>
          </Card>
          
          <Card className="bg-red-50 border-red-200">
            <CardContent className="p-4 text-center">
              <p className="text-2xl font-bold text-red-800">
                {formatCurrency(summary.overdueAmount)}
              </p>
              <p className="text-sm text-red-600">Overdue Amount</p>
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
                  placeholder="Search by invoice number or party name..."
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
                  <SelectItem value="DRAFT">Draft</SelectItem>
                  <SelectItem value="SENT">Sent</SelectItem>
                  <SelectItem value="PAID">Paid</SelectItem>
                  <SelectItem value="OVERDUE">Overdue</SelectItem>
                  <SelectItem value="CANCELLED">Cancelled</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Invoices List */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Invoices</CardTitle>
              <CardDescription>Manage invoices and billing ({getFilteredInvoices().length} invoices)</CardDescription>
            </div>
            <Button onClick={() => setShowCreateInvoiceModal(true)} className="bg-amber-600 hover:bg-amber-700">
              <Plus className="h-4 w-4 mr-2" />
              Create Invoice
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {getFilteredInvoices().map((invoice) => (
                <Card key={invoice._id} className="border-l-4 border-l-blue-500">
                  <CardContent className="p-4">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4">
                        <div className="p-3 bg-blue-100 rounded-full">
                          <FileText className="h-6 w-6 text-blue-600" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-stone-900">{invoice.invoiceNumber}</h3>
                            <Badge variant="outline" className="text-xs">
                              {invoice.party.type}
                            </Badge>
                          </div>
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
                        <div className="flex items-center gap-2 mt-1">
                          <Badge className={getStatusColor(invoice.status)}>
                            {getStatusIcon(invoice.status)}
                            <span className="ml-1">{invoice.status}</span>
                          </Badge>
                          <Button 
                            variant="outline" 
                            size="sm"
                            onClick={() => {
                              setSelectedInvoice(invoice)
                              setShowInvoiceDetailsModal(true)
                            }}
                          >
                            <Eye className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
              {getFilteredInvoices().length === 0 && (
                <div className="text-center py-8 text-stone-500">
                  <FileText className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                  <p>No invoices found</p>
                  <p className="text-sm mt-2">Try adjusting your filters or create a new invoice</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Create Invoice Modal */}
        <Dialog open={showCreateInvoiceModal} onOpenChange={setShowCreateInvoiceModal}>
          <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>Create New Invoice</DialogTitle>
              <DialogDescription>
                Generate a new invoice for your client
              </DialogDescription>
            </DialogHeader>
            
            <div className="space-y-6">
              {/* Party Information */}
              <div className="space-y-4">
                <h4 className="font-semibold">Party Information</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="partyName">Party Name</Label>
                    <Input
                      id="partyName"
                      placeholder="Enter party name"
                      value={invoiceForm.party.name}
                      onChange={(e) => setInvoiceForm({
                        ...invoiceForm, 
                        party: {...invoiceForm.party, name: e.target.value}
                      })}
                    />
                  </div>
                  
                  <div>
                    <Label htmlFor="partyType">Party Type</Label>
                    <Select value={invoiceForm.party.type} onValueChange={(value) => setInvoiceForm({
                      ...invoiceForm, 
                      party: {...invoiceForm.party, type: value}
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
              </div>

              {/* Invoice Items */}
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                  <h4 className="font-semibold">Invoice Items</h4>
                  <Button type="button" onClick={addInvoiceItem} variant="outline" size="sm">
                    <Plus className="h-4 w-4 mr-1" />
                    Add Item
                  </Button>
                </div>
                
                {invoiceForm.items.map((item, index) => (
                  <div key={index} className="grid grid-cols-12 gap-2 items-end">
                    <div className="col-span-5">
                      <Label>Description</Label>
                      <Input
                        placeholder="Item description"
                        value={item.description}
                        onChange={(e) => updateInvoiceItem(index, 'description', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Quantity</Label>
                      <Input
                        type="number"
                        placeholder="Qty"
                        value={item.quantity}
                        onChange={(e) => updateInvoiceItem(index, 'quantity', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Unit Price</Label>
                      <Input
                        type="number"
                        placeholder="Price"
                        value={item.unitPrice}
                        onChange={(e) => updateInvoiceItem(index, 'unitPrice', e.target.value)}
                      />
                    </div>
                    <div className="col-span-2">
                      <Label>Total</Label>
                      <Input
                        type="number"
                        placeholder="Total"
                        value={item.totalPrice}
                        readOnly
                        className="bg-gray-50"
                      />
                    </div>
                    <div className="col-span-1">
                      <Button 
                        type="button" 
                        variant="outline" 
                        size="sm"
                        onClick={() => removeInvoiceItem(index)}
                        disabled={invoiceForm.items.length === 1}
                      >
                        <Minus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Invoice Details */}
              <div className="space-y-4">
                <h4 className="font-semibold">Invoice Details</h4>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label htmlFor="currency">Currency</Label>
                    <Select value={invoiceForm.currency} onValueChange={(value) => setInvoiceForm({...invoiceForm, currency: value})}>
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="INR">INR</SelectItem>
                        <SelectItem value="USD">USD</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="dueDate">Due Date</Label>
                    <Input
                      id="dueDate"
                      type="date"
                      value={invoiceForm.dueDate}
                      onChange={(e) => setInvoiceForm({...invoiceForm, dueDate: e.target.value})}
                    />
                  </div>
                </div>

                <div>
                  <Label htmlFor="notes">Notes (Optional)</Label>
                  <Textarea
                    id="notes"
                    placeholder="Add any additional notes"
                    value={invoiceForm.notes}
                    onChange={(e) => setInvoiceForm({...invoiceForm, notes: e.target.value})}
                  />
                </div>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t">
              <Button variant="outline" onClick={() => {
                setShowCreateInvoiceModal(false)
                resetInvoiceForm()
              }}>
                Cancel
              </Button>
              <Button onClick={handleCreateInvoice} className="bg-amber-600 hover:bg-amber-700">
                Create Invoice
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Invoice Details Modal */}
        <Dialog open={showInvoiceDetailsModal} onOpenChange={setShowInvoiceDetailsModal}>
          <DialogContent className="max-w-2xl">
            <DialogHeader>
              <DialogTitle>Invoice Details</DialogTitle>
              <DialogDescription>
                {selectedInvoice?.invoiceNumber} - {selectedInvoice?.party.name}
              </DialogDescription>
            </DialogHeader>
            
            {selectedInvoice && (
              <div className="space-y-4">
                {/* Invoice Summary */}
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Invoice Number</p>
                    <p className="font-semibold">{selectedInvoice.invoiceNumber}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <Badge className={getStatusColor(selectedInvoice.status)}>
                      {selectedInvoice.status}
                    </Badge>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Due Date</p>
                    <p>{new Date(selectedInvoice.dueDate).toLocaleDateString()}</p>
                  </div>
                  <div>
                    <p className="text-sm font-medium text-gray-600">Total Amount</p>
                    <p className="font-bold text-lg">₹{formatCurrency(selectedInvoice.amounts.totalAmount)}</p>
                  </div>
                </div>

                {/* Party Information */}
                <div>
                  <p className="text-sm font-medium text-gray-600 mb-2">Bill To</p>
                  <div className="p-3 bg-gray-50 rounded">
                    <p className="font-semibold">{selectedInvoice.party.name}</p>
                    <p className="text-sm text-gray-600">{selectedInvoice.party.type}</p>
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end pt-4 border-t">
              <Button variant="outline" onClick={() => setShowInvoiceDetailsModal(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </motion.div>
    </div>
  )
}

export default InvoiceManagement