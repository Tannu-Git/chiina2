import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Card, 
  CardContent, 
  CardDescription, 
  CardHeader, 
  CardTitle 
} from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu'
import { 
  BarChart3,
  CircleDollarSign,
  DollarSign,
  Clock,
  RefreshCw,
  Plus,
  Eye,
  CreditCard,
  FileText,
  Calculator,
  Users,
  Building,
  ChevronDown,
  Download,
  Filter,
  Calendar,
  ArrowUpRight,
  ArrowDownLeft,
  Package,
  Truck,
  AlertCircle,
  AlertTriangle,
  Shield,
  Database,
  Receipt
} from 'lucide-react'
import { useToast } from '@/hooks/use-toast'
import { useAuthStore } from '@/stores/authStore'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'

const TransactionManagement = () => {
  const { toast } = useToast()
  const navigate = useNavigate()
  const { user, token, isAuthenticated } = useAuthStore()

  // State management
  const [loading, setLoading] = useState(true)
  const [paymentCollections, setPaymentCollections] = useState([])
  const [allClients, setAllClients] = useState([])
  const [showAllClients, setShowAllClients] = useState(false)
  const [paymentSummary, setPaymentSummary] = useState({
    totalToCollect: 0,
    totalReceived: 0,
    totalPending: 0,
    clientCount: 0,
    dataIntegrity: {
      systemHealth: { status: 'UNKNOWN' },
      hasNegativeBalances: false,
      hasOrphanedData: false,
      criticalIssues: 0
    }
  })

  // Modal states
  const [showPaymentModal, setShowPaymentModal] = useState(false)
  const [showBulkPaymentModal, setShowBulkPaymentModal] = useState(false)
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [showManualTransactionModal, setShowManualTransactionModal] = useState(false)
  const [selectedPayment, setSelectedPayment] = useState(null)
  const [selectedClient, setSelectedClient] = useState(null)
  const [selectedPartyDetails, setSelectedPartyDetails] = useState(null)

  // Form states
  const [paymentAmount, setPaymentAmount] = useState('')
  const [paymentNotes, setPaymentNotes] = useState('')
  const [bulkPaymentAmount, setBulkPaymentAmount] = useState('')
  const [bulkPaymentNotes, setBulkPaymentNotes] = useState('')
  const [manualTransaction, setManualTransaction] = useState({
    clientId: '',
    clientName: '',
    amount: '',
    transactionType: 'PAYMENT_RECEIVED',
    description: '',
    notes: ''
  })

  // Helper function to format currency
  const formatCurrency = (amount) => {
    if (amount === null || amount === undefined || isNaN(amount)) return '₹0.00'
    return `₹${parseFloat(amount).toLocaleString('en-IN', { 
      minimumFractionDigits: 2, 
      maximumFractionDigits: 2 
    })}`
  }

  // API headers with authentication
  const getAuthHeaders = () => {
    if (!token) {
      console.error('No authentication token available')
      return { headers: { 'Content-Type': 'application/json' } }
    }
    return {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }
  }

  // Load payment collections data using comprehensive API for consistency
  const loadPaymentCollections = async () => {
    try {
      setLoading(true)
      
      // Check authentication first
      if (!isAuthenticated || !token) {
        console.error('🚫 [TRANSACTION MANAGEMENT] Not authenticated')
        toast({
          title: "Authentication Required",
          description: "Please log in to view payment collections",
          variant: "destructive"
        })
        navigate('/login')
        return
      }
      
      console.log('📊 [TRANSACTION MANAGEMENT] Loading payment collections for user:', user?.name, 'Role:', user?.role)
      
      // Use payment collections API for consistent data
      const paymentsResponse = await axios.get('/api/payment-collections', getAuthHeaders())
      
      if (paymentsResponse.data) {
        console.log('✅ [TRANSACTION MANAGEMENT] Payment collections loaded successfully')
        console.log('🔍 [DEBUG] Raw payment data:', paymentsResponse.data)
        
        // Enhanced data validation and integrity checking
        if (paymentsResponse.data.clientCollections) {
          paymentsResponse.data.clientCollections.forEach(client => {
            const hasNegativeAmounts = client.pendingAmount < 0 || client.totalAmount < 0 || client.receivedAmount < 0;
            const isOrphaned = client.isOrphaned || false;
            const hasNegativeBalance = client.hasNegativeBalance || false;
            
            if (hasNegativeAmounts || isOrphaned || hasNegativeBalance) {
              console.error(`🚨 [DATA INTEGRITY] Issues found for client ${client.clientName}:`, {
                totalAmount: client.totalAmount,
                receivedAmount: client.receivedAmount,
                pendingAmount: client.pendingAmount,
                isOrphaned,
                hasNegativeBalance,
                payments: client.payments?.map(p => ({
                  orderNumber: p.orderNumber,
                  totalAmount: p.totalAmount,
                  pendingAmount: p.pendingAmount,
                  receivedAmount: p.receivedAmount
                }))
              });
            }
          });
        }
        
        setPaymentCollections(paymentsResponse.data.clientCollections || [])
        setAllClients(paymentsResponse.data.allClients || [])
        
        // Enhanced summary with data integrity information - FIXED: Map backend summary fields
        const enhancedSummary = {
          totalToCollect: paymentsResponse.data.summary?.totalToCollect || 0,
          totalReceived: paymentsResponse.data.summary?.totalReceived || 0,
          totalPending: paymentsResponse.data.summary?.totalPending || 0,
          clientCount: paymentsResponse.data.summary?.clientCount || 0,
          dataIntegrity: paymentsResponse.data.summary?.dataIntegrity || {
            systemHealth: { status: 'UNKNOWN' },
            hasNegativeBalances: false,
            hasOrphanedData: false,
            criticalIssues: 0
          }
        };
        
        setPaymentSummary(enhancedSummary)
        
        console.log('✅ [TRANSACTION MANAGEMENT] Data successfully loaded and processed')
      }
    } catch (error) {
      console.error('❌ [TRANSACTION MANAGEMENT] Error loading payment collections:', error)
      
      // Handle authentication errors
      if (error.response?.status === 401) {
        console.error('🔑 [TRANSACTION MANAGEMENT] 401 Unauthorized - Token invalid or user role insufficient')
        console.error('Current user role:', user?.role)
        console.error('Required roles: admin or staff')
        
        if (user?.role && ['client'].includes(user.role)) {
          toast({
            title: "Access Denied",
            description: `Your role (${user.role}) doesn't have permission to access transaction management. Admin or staff role required.`,
            variant: "destructive"
          })
        } else {
          toast({
            title: "Authentication Error",
            description: "Your session has expired. Please log in again.",
            variant: "destructive"
          })
          navigate('/login')
        }
        return
      }
      
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to load payment collections data",
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Record manual transaction
  const handleManualTransaction = async () => {
    // Enhanced validation with better error messages
    const validationErrors = []
    
    if (!manualTransaction.clientId.trim()) {
      validationErrors.push("Client ID is required")
    }
    if (!manualTransaction.clientName.trim()) {
      validationErrors.push("Client name is required")
    }
    if (!manualTransaction.amount || manualTransaction.amount.trim() === '') {
      validationErrors.push("Amount is required")
    }
    // REMOVED: Description validation - now optional
    
    if (validationErrors.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: validationErrors.join(", "),
        variant: "destructive"
      })
      return
    }

    const amount = parseFloat(manualTransaction.amount)
    if (isNaN(amount) || amount <= 0) {
      toast({
        title: "Invalid Amount",
        description: "Amount must be a valid number greater than zero",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await axios.post('/api/payment-collections/add-manual-transaction', {
        clientId: manualTransaction.clientId,
        clientName: manualTransaction.clientName,
        amount: amount,
        transactionType: manualTransaction.transactionType,
        description: manualTransaction.description,
        notes: manualTransaction.notes
      }, getAuthHeaders())

      const isPaymentGiven = manualTransaction.transactionType === 'PAYMENT_GIVEN'
      toast({
        title: "Success",
        description: isPaymentGiven ? 
          `Recorded payment of ${formatCurrency(amount)} given to ${manualTransaction.clientName}` :
          `Recorded payment of ${formatCurrency(amount)} received from ${manualTransaction.clientName}`,
        variant: "default"
      })

      // Reset form and close modal
      setManualTransaction({
        clientId: '',
        clientName: '',
        amount: '',
        transactionType: 'PAYMENT_RECEIVED',
        description: '',
        notes: ''
      })
      setShowManualTransactionModal(false)

      // Reload data to reflect changes
      await loadPaymentCollections()
    } catch (error) {
      console.error('Error recording manual transaction:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to record manual transaction",
        variant: "destructive"
      })
    }
  }

  // Record individual payment
  const handleRecordPayment = async () => {
    if (!selectedPayment || !paymentAmount) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      })
      return
    }

    // REMOVED CLIENT-SIDE OVERPAYMENT VALIDATION - Let server handle it properly
    const amount = parseFloat(paymentAmount)
    if (amount <= 0) {
      toast({
        title: "Error",
        description: "Payment amount must be greater than zero",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await axios.post('/api/payment-collections/record-payment', {
        paymentId: selectedPayment.paymentId,
        amount: amount,
        notes: paymentNotes
      }, getAuthHeaders())

      // Success message (server prevents overpayments now)
      toast({
        title: "Success",
        description: `Payment of ${formatCurrency(amount)} recorded successfully`,
        variant: "default"
      })

      // Reset form and close modal
      setPaymentAmount('')
      setPaymentNotes('')
      setShowPaymentModal(false)
      setSelectedPayment(null)

      // Reload data to reflect changes
      await loadPaymentCollections()
    } catch (error) {
      console.error('Error recording payment:', error)
      
      // Enhanced error handling for overpayment validation
      const errorMessage = error.response?.data?.message || "Failed to record payment";
      const isOverpaymentError = error.response?.data?.error === 'OVERPAYMENT_NOT_ALLOWED';
      
      if (isOverpaymentError) {
        const maxAllowed = error.response.data.maxAllowed;
        toast({
          title: "Payment Exceeds Outstanding Balance",
          description: `Maximum allowed: ${formatCurrency(maxAllowed)}. ${error.response.data.suggestion}`,
          variant: "destructive"
        });
      } else {
        toast({
          title: "Error",
          description: errorMessage,
          variant: "destructive"
        });
      }
    }
  }

  // Record bulk payment for client
  const handleBulkPayment = async () => {
    if (!selectedClient || !bulkPaymentAmount) {
      toast({
        title: "Error",
        description: "Please enter a valid payment amount",
        variant: "destructive"
      })
      return
    }

    try {
      const response = await axios.put('/api/payment-collections/bulk-record', {
        clientId: selectedClient.clientId,
        totalAmountReceived: parseFloat(bulkPaymentAmount),
        notes: bulkPaymentNotes
      }, getAuthHeaders())

      toast({
        title: "Success",
        description: response.data.message,
        variant: "default"
      })

      // Reset form and close modal
      setBulkPaymentAmount('')
      setBulkPaymentNotes('')
      setShowBulkPaymentModal(false)
      setSelectedClient(null)

      // Reload data
      await loadPaymentCollections()
    } catch (error) {
      console.error('Error recording bulk payment:', error)
      toast({
        title: "Error",
        description: error.response?.data?.message || "Failed to record bulk payment",
        variant: "destructive"
      })
    }
  }

  // Load transaction details for a specific client
  const handleShowPartyDetails = async (client, partyType = 'client') => {
    try {
      setLoading(true)
      
      console.log('🔍 [TRANSACTION DETAILS] Loading details for client:', client.clientId)
      
      // Get detailed transaction records
      const response = await axios.get(
        `/api/financials-comprehensive/payment-records/${client.clientId}`,
        getAuthHeaders()
      )
      
      if (response.data) {
        console.log('✅ [TRANSACTION DETAILS] API Response:', response.data)
        
        // Fix: response.data is an object, not an array
        const apiData = response.data
        
        const partyDetails = {
          ...client,
          partyType,
          clientId: apiData.clientId,
          clientName: apiData.clientName,
          accountSummary: {
            totalInvoiced: apiData.accountSummary?.totalInvoiced || 0,
            totalReceived: apiData.accountSummary?.totalReceived || 0,
            currentBalance: apiData.accountSummary?.currentBalance || 0,
            totalTransactions: apiData.accountSummary?.totalTransactions || 0,
            totalOrders: apiData.accountSummary?.totalOrders || 0,
            totalPaymentCollections: apiData.accountSummary?.totalPaymentCollections || 0
          },
          // Fix: Get paymentRecords from the API response object
          paymentRecords: (apiData.paymentRecords || []).map(record => ({
            ...record,
            // Map API fields to what the modal expects
            orderNumber: record.reference || 'N/A',
            containerId: record.particulars?.container || 'N/A',
            totalAmount: record.debit || record.credit || 0,
            receivedAmount: record.credit || 0,
            pendingAmount: record.debit || 0,
            // Keep original status or mark as PENDING
            status: record.status || 'PENDING'
          })),
          containers: apiData.containers || [],
          metadata: apiData.metadata
        }
        
        console.log('📊 [TRANSACTION DETAILS] Processed party details:', partyDetails)
        
        setSelectedPartyDetails(partyDetails)
        setShowTransactionDetails(true)
      }
      
    } catch (error) {
      console.error('❌ [TRANSACTION DETAILS] Error loading party details:', error)
      
      // Enhanced error handling
      let errorMessage = "Failed to load transaction details"
      if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please log in again."
      } else if (error.response?.status === 403) {
        errorMessage = "Access denied. Insufficient permissions."
      } else if (error.response?.status === 404) {
        errorMessage = "Client not found or no transaction records available."
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    } finally {
      setLoading(false)
    }
  }

  // Fetch payment history for a specific client
  const fetchPaymentHistory = async (clientId) => {
    try {
      console.log('🔍 [TRANSACTION MANAGEMENT] Fetching payment history for client:', clientId)
      
      // FIXED: Use the same API as the transaction details modal
      const response = await axios.get(
        `/api/financials-comprehensive/payment-records/${clientId}`,
        getAuthHeaders()
      )
      
      if (response.data) {
        console.log('✅ [PAYMENT HISTORY] API Response:', response.data)
        
        // Transform the comprehensive API response to payment history format
        const paymentHistory = (response.data.paymentRecords || []).map(record => {
          return {
            date: record.date,
            type: record.type,
            amount: record.type === 'PAYMENT_RECEIVED' ? record.credit : 
                   record.type === 'PAYMENT_GIVEN' ? -record.debit : 
                   record.type === 'ORDER_INVOICE' ? record.debit : 0, // FIXED: Remove negative sign for ORDER_INVOICE
            description: record.description || record.notes || '',
            runningBalance: record.balance,
            reference: record.reference,
            status: record.status
          }
        }).reverse() // Show latest first
        
        // Update the specific client with payment history
        setPaymentCollections(prevClients => 
          prevClients.map(client => {
            if (client.clientId === clientId) {
              return {
                ...client,
                paymentHistory: paymentHistory,
                paymentHistoryLoaded: true,
                historySummary: {
                  totalInvoiced: response.data.accountSummary?.totalInvoiced || 0,
                  totalReceived: response.data.accountSummary?.totalReceived || 0,
                  currentBalance: response.data.accountSummary?.currentBalance || 0,
                  totalTransactions: response.data.accountSummary?.totalTransactions || 0
                }
              }
            }
            return client
          })
        )
        
        toast({
          title: "Success",
          description: `Loaded ${paymentHistory.length} payment history records`,
          variant: "default"
        })
      }
    } catch (error) {
      console.error('❌ [PAYMENT HISTORY] Error fetching payment history:', error)
      
      // Enhanced error handling
      let errorMessage = "Failed to load payment history"
      if (error.response?.status === 401) {
        errorMessage = "Authentication error. Please log in again."
      } else if (error.response?.status === 403) {
        errorMessage = "Access denied. Insufficient permissions."
      } else if (error.response?.status === 404) {
        errorMessage = "Client not found or no payment records available."
      } else if (error.response?.data?.message) {
        errorMessage = error.response.data.message
      }
      
      toast({
        title: "Error",
        description: errorMessage,
        variant: "destructive"
      })
    }
  }

  // Legacy fallback method for payment history
  const fetchPaymentHistoryLegacy = async (clientId) => {
    try {
      const response = await axios.get(
        `/api/financials-comprehensive/payment-records/${clientId}`,
        getAuthHeaders()
      )
      
      if (response.data) {
        // Update the specific client with payment history
        setPaymentCollections(prevClients => 
          prevClients.map(client => {
            if (client.clientId === clientId) {
              // Transform the response data into payment history format
              const paymentHistory = response.data.map((record, index) => {
                let runningBalance = 0
                if (index === 0) {
                  runningBalance = record.amount || 0
                } else {
                  // Calculate running balance based on previous entries
                  runningBalance = response.data.slice(0, index + 1)
                    .reduce((sum, r) => sum + (r.amount || 0), 0)
                }
                
                return {
                  date: record.date || record.createdAt,
                  type: record.type || 'PAYMENT',
                  amount: record.amount || 0,
                  description: record.description || record.notes || '',
                  runningBalance: runningBalance
                }
              })
              
              return {
                ...client,
                paymentHistory: paymentHistory.reverse(), // Show latest first
                paymentHistoryLoaded: true
              }
            }
            return client
          })
        )
        
        toast({
          title: "Success",
          description: `Loaded ${response.data.length} payment history records`,
          variant: "default"
        })
      }
    } catch (error) {
      console.error('Error fetching legacy payment history:', error)
      toast({
        title: "Error",
        description: "Failed to load payment history",
        variant: "destructive"
      })
    }
  }

  // Load data on component mount
  useEffect(() => {
    // Set up axios defaults if token is available
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      console.log('🔑 [TRANSACTION MANAGEMENT] Token set for user:', user?.name, 'Role:', user?.role)
    } else {
      console.warn('⚠️ [TRANSACTION MANAGEMENT] No token available')
    }
    
    // Use standard payment collections loading for now
    loadPaymentCollections()
  }, [token, isAuthenticated])

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-500"></div>
          <span className="text-lg text-muted-foreground">Loading transaction management...</span>
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
            <div className="w-12 h-12 bg-gradient-to-r from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
              <BarChart3 className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">📊 Money Management Dashboard</h1>
              <p className="text-muted-foreground mt-1">
                💰 Track who owes money to whom. Collect payments and manage client accounts easily.
              </p>
              <div className="flex items-center gap-4 mt-2 text-sm">
                <span className="inline-flex items-center gap-1">
                  <div className="w-3 h-3 bg-red-200 rounded border border-red-300"></div>
                  <span className="text-red-700 font-medium">Red cards = Clients owe us money</span>
                </span>
                <span className="inline-flex items-center gap-1">
                  <div className="w-3 h-3 bg-green-200 rounded border border-green-300"></div>
                  <span className="text-green-700 font-medium">Green cards = We owe clients money</span>
                </span>
              </div>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadPaymentCollections} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            {/* Prominent Manual Transaction Button */}
            <Button 
              onClick={() => {
                // Reset manual transaction form
                setManualTransaction({
                  clientId: '',
                  clientName: '',
                  amount: '',
                  transactionType: 'PAYMENT_RECEIVED',
                  description: '',
                  notes: ''
                })
                setShowManualTransactionModal(true)
              }}
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              💰 Add Manual Payment
            </Button>
            
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  More Actions
                  <ChevronDown className="h-4 w-4 ml-2" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent>
                <DropdownMenuItem>
                  <Download className="h-4 w-4 mr-2" />
                  Download Report
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => setShowAllClients(!showAllClients)}>
                  <Users className="h-4 w-4 mr-2" />
                  {showAllClients ? 'Show Only Clients with Balances' : 'Show All Clients'}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* User-Friendly Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-6">
          {/* Money Clients Owe Us */}
          <Card className="bg-gradient-to-br from-red-50 to-red-100 border-red-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-red-700 uppercase tracking-wide">💸 CLIENTS OWE US</p>
                  <p className="text-3xl font-bold text-red-800">
                    {formatCurrency(Math.max(0, paymentSummary.totalPending))}
                  </p>
                  <p className="text-xs text-red-600 mt-1 font-medium">Money we need to collect</p>
                  <p className="text-xs text-red-500 mt-1">Action: Follow up for payment</p>
                </div>
                <div className="bg-red-200 p-3 rounded-full">
                  <ArrowUpRight className="h-8 w-8 text-red-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Money We Owe to Clients (only show if applicable) */}
          {paymentSummary.totalPending < 0 && (
            <Card className="bg-gradient-to-br from-green-50 to-green-100 border-green-200">
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-sm font-bold text-green-700 uppercase tracking-wide">💰 WE OWE CLIENTS</p>
                    <p className="text-3xl font-bold text-green-800">
                      {formatCurrency(Math.abs(Math.min(0, paymentSummary.totalPending)))}
                    </p>
                    <p className="text-xs text-green-600 mt-1 font-medium">Credit balances to refund</p>
                    <p className="text-xs text-green-500 mt-1">Action: Process refunds</p>
                  </div>
                  <div className="bg-green-200 p-3 rounded-full">
                    <DollarSign className="h-8 w-8 text-green-600" />
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Money Successfully Collected */}
          <Card className="bg-gradient-to-br from-blue-50 to-blue-100 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-blue-700 uppercase tracking-wide">✅ MONEY RECEIVED</p>
                  <p className="text-3xl font-bold text-blue-800">
                    {formatCurrency(paymentSummary.totalReceived)}
                  </p>
                  <p className="text-xs text-blue-600 mt-1 font-medium">Successfully collected</p>
                  <p className="text-xs text-blue-500 mt-1">Status: Completed payments</p>
                </div>
                <div className="bg-blue-200 p-3 rounded-full">
                  <DollarSign className="h-8 w-8 text-blue-600" />
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Total Active Clients */}
          <Card className="bg-gradient-to-br from-purple-50 to-purple-100 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-bold text-purple-700 uppercase tracking-wide">👥 ACTIVE CLIENTS</p>
                  <p className="text-3xl font-bold text-purple-800">
                    {paymentSummary.clientCount}
                  </p>
                  <p className="text-xs text-purple-600 mt-1 font-medium">Total client accounts</p>
                  <p className="text-xs text-purple-500 mt-1">Manage their payments below</p>
                </div>
                <div className="bg-purple-200 p-3 rounded-full">
                  <Users className="h-8 w-8 text-purple-600" />
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Client Accounts - Easy to Understand */}
        <Card className="mb-8">
          <CardHeader>
            <CardTitle className="text-xl text-foreground flex items-center">
              <Building className="h-6 w-6 mr-2" />
              Client Payment Accounts
            </CardTitle>
            <CardDescription>
              📊 Track who owes money and who has overpaid. Red cards = clients owe us money. Green cards = we owe them money.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {/* Toggle for showing all clients */}
            <div className="flex items-center justify-between mb-4 p-3 bg-blue-50 rounded-lg border border-blue-200">
              <div>
                <p className="text-sm font-medium text-blue-800">
                  {showAllClients ? `Showing all ${allClients.length} clients` : `Showing ${paymentCollections.length} clients with balances`}
                </p>
                <p className="text-xs text-blue-600">
                  {showAllClients ? 'Includes clients without payment obligations' : 'Only clients with outstanding balances or credit balances'}
                </p>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowAllClients(!showAllClients)}
                className="bg-blue-100 hover:bg-blue-200 border-blue-300 text-blue-700"
              >
                {showAllClients ? 'Show Only With Balances' : 'Show All Clients'}
              </Button>
            </div>
            
            <div className="space-y-6">
              {(() => {
                // Determine which clients to show
                const clientsToShow = showAllClients ? 
                  // Show all clients (merge payment collections with all clients)
                  allClients.map(client => {
                    const existingPayment = paymentCollections.find(p => p.clientId === client.clientId);
                    return existingPayment || {
                      clientId: client.clientId,
                      clientName: client.clientName,
                      totalAmount: 0,
                      receivedAmount: 0,
                      pendingAmount: 0,
                      payments: [],
                      source: client.source
                    };
                  }) :
                  // Show only clients with balances
                  paymentCollections;

                return clientsToShow.length > 0 ? (
                  clientsToShow.map((client, index) => {
                  // FIXED: Use actual values without Math.abs() masking
                  const pendingAmount = client.pendingAmount || 0;
                  const receivedAmount = client.receivedAmount || 0;
                  const totalAmount = client.totalAmount || 0;
                  
                  // Enhanced integrity checking - FIXED: Negative pending amounts are GOOD (credit balances)
                  const hasCreditBalance = pendingAmount < 0; // This is GOOD - they overpaid
                  const isOrphaned = client.isOrphaned || false;
                  // FIXED: Don't treat credit balances as data issues - they're healthy financial status
                  const hasDataIssues = false; // Only use actual data corruption issues, not credit balances
                  const hasSystemIssues = isOrphaned || hasDataIssues; // Only actual data issues, not credit balances
                  
                  // Dynamic styling based on financial status - FIXED: Credit balances should be green
                  // Green for good (credit balance or low outstanding), Red for concerning (high outstanding or data issues)
                  const isHealthyBalance = hasCreditBalance || (pendingAmount <= 1000 && !hasSystemIssues);
                  const cardStyle = isHealthyBalance ? 'border-l-green-500 bg-green-50' : 'border-l-red-500 bg-red-50';
                  const textColor = isHealthyBalance ? 'text-green' : 'text-red';
                  
                  return (
                  <Card key={index} className={`transition-all duration-200 hover:shadow-lg ${
                    hasCreditBalance ? 'border-l-4 border-l-green-500 bg-green-50' :
                    pendingAmount > 5000 ? 'border-l-4 border-l-red-500 bg-red-50' :
                    pendingAmount > 1000 ? 'border-l-4 border-l-orange-500 bg-orange-50' :
                    'border-l-4 border-l-green-500 bg-green-50'
                  }`}>
                    <CardContent className="p-6">
                      <div className="flex justify-between items-start mb-6">
                        {/* Client Info */}
                        <div className="flex items-center gap-4">
                          <div className={`w-16 h-16 rounded-full flex items-center justify-center text-white font-bold text-xl ${
                            hasCreditBalance ? 'bg-gradient-to-br from-green-500 to-green-600' :
                            pendingAmount > 5000 ? 'bg-gradient-to-br from-red-500 to-red-600' :
                            pendingAmount > 1000 ? 'bg-gradient-to-br from-orange-500 to-orange-600' :
                            'bg-gradient-to-br from-green-500 to-green-600'
                          }`}>
                            {client.clientName?.charAt(0)?.toUpperCase() || 'C'}
                          </div>
                          <div>
                            <h3 className="text-2xl font-bold text-gray-800">{client.clientName}</h3>
                            <p className="text-sm text-gray-600">ID: {client.clientId}</p>
                            <p className="text-xs text-gray-500 mt-1">
                              {client.payments?.length || 0} payment records
                            </p>
                          </div>
                        </div>

                        {/* Financial Status */}
                        <div className="text-right">
                          {hasCreditBalance ? (
                            /* Client has overpaid - we owe them */
                            <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">💰</span>
                                <span className="text-sm font-bold text-green-700 uppercase">WE OWE CLIENT</span>
                              </div>
                              <p className="text-3xl font-bold text-green-800">
                                {formatCurrency(pendingAmount)}
                              </p>
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                Credit balance to refund
                              </p>
                              <p className="text-xs text-green-500 mt-1">
                                Client overpaid by this amount
                              </p>
                            </div>
                          ) : pendingAmount > 0 ? (
                            /* Client owes us money */
                            <div className={`rounded-lg p-4 border ${
                              pendingAmount > 5000 ? 'bg-red-100 border-red-200' :
                              pendingAmount > 1000 ? 'bg-orange-100 border-orange-200' :
                              'bg-yellow-100 border-yellow-200'
                            }`}>
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">📈</span>
                                <span className={`text-sm font-bold uppercase ${
                                  pendingAmount > 5000 ? 'text-red-700' :
                                  pendingAmount > 1000 ? 'text-orange-700' :
                                  'text-yellow-700'
                                }`}>CLIENT OWES US</span>
                              </div>
                              <p className={`text-3xl font-bold ${
                                pendingAmount > 5000 ? 'text-red-800' :
                                pendingAmount > 1000 ? 'text-orange-800' :
                                'text-yellow-800'
                              }`}>
                                {formatCurrency(pendingAmount)}
                              </p>
                              <p className={`text-xs mt-1 font-medium ${
                                pendingAmount > 5000 ? 'text-red-600' :
                                pendingAmount > 1000 ? 'text-orange-600' :
                                'text-yellow-600'
                              }`}>
                                {pendingAmount > 5000 ? 'HIGH PRIORITY - Follow up urgently' :
                                 pendingAmount > 1000 ? 'MEDIUM PRIORITY - Follow up soon' :
                                 'LOW PRIORITY - Follow up when convenient'}
                              </p>
                              <p className={`text-xs mt-1 ${
                                pendingAmount > 5000 ? 'text-red-500' :
                                pendingAmount > 1000 ? 'text-orange-500' :
                                'text-yellow-500'
                              }`}>
                                Received: {formatCurrency(receivedAmount)} of {formatCurrency(totalAmount)}
                              </p>
                            </div>
                          ) : (
                            /* Fully paid */
                            <div className="bg-green-100 rounded-lg p-4 border border-green-200">
                              <div className="flex items-center gap-2 mb-2">
                                <span className="text-2xl">✅</span>
                                <span className="text-sm font-bold text-green-700 uppercase">FULLY PAID</span>
                              </div>
                              <p className="text-3xl font-bold text-green-800">
                                {formatCurrency(0)}
                              </p>
                              <p className="text-xs text-green-600 mt-1 font-medium">
                                No outstanding balance
                              </p>
                              <p className="text-xs text-green-500 mt-1">
                                All payments completed
                              </p>
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Action Buttons */}
                      <div className="flex gap-3 mb-4">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleShowPartyDetails(client, 'client')}
                          className="flex-1 bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                        >
                          <Eye className="h-4 w-4 mr-2" />
                          View Transaction History
                        </Button>
                        
                        {hasCreditBalance ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              className="flex-1 bg-green-50 hover:bg-green-100 border-green-200 text-green-700"
                              onClick={() => {
                                // Handle refund process
                                setSelectedClient(client)
                                setShowBulkPaymentModal(true)
                              }}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Process Refund
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              onClick={() => {
                                // Pre-fill manual transaction with client details
                                setManualTransaction({
                                  clientId: client.clientId,
                                  clientName: client.clientName,
                                  amount: '',
                                  transactionType: 'PAYMENT_RECEIVED',
                                  description: '',
                                  notes: ''
                                })
                                setShowManualTransactionModal(true)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Payment
                            </Button>
                          </>
                        ) : pendingAmount > 0 ? (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => {
                                setSelectedClient(client)
                                setShowBulkPaymentModal(true)
                              }}
                              className={`flex-1 ${
                                pendingAmount > 5000 ? 'bg-red-50 hover:bg-red-100 border-red-200 text-red-700' :
                                pendingAmount > 1000 ? 'bg-orange-50 hover:bg-orange-100 border-orange-200 text-orange-700' :
                                'bg-yellow-50 hover:bg-yellow-100 border-yellow-200 text-yellow-700'
                              }`}
                            >
                              <DollarSign className="h-4 w-4 mr-2" />
                              Collect Payment
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              onClick={() => {
                                // Pre-fill manual transaction with client details
                                setManualTransaction({
                                  clientId: client.clientId,
                                  clientName: client.clientName,
                                  amount: '',
                                  transactionType: 'PAYMENT_RECEIVED',
                                  description: '',
                                  notes: ''
                                })
                                setShowManualTransactionModal(true)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Payment
                            </Button>
                          </>
                        ) : (
                          <>
                            <Button
                              variant="outline"
                              size="sm"
                              disabled
                              className="flex-1 bg-gray-50 border-gray-200 text-gray-500"
                            >
                              <span className="text-green-600">✓</span>
                              <span className="ml-2">No Action Needed</span>
                            </Button>
                            <Button
                              variant="outline"
                              size="sm"
                              className="bg-blue-50 hover:bg-blue-100 border-blue-200 text-blue-700"
                              onClick={() => {
                                // Pre-fill manual transaction with client details
                                setManualTransaction({
                                  clientId: client.clientId,
                                  clientName: client.clientName,
                                  amount: '',
                                  transactionType: 'PAYMENT_RECEIVED',
                                  description: '',
                                  notes: ''
                                })
                                setShowManualTransactionModal(true)
                              }}
                            >
                              <Plus className="h-4 w-4 mr-2" />
                              Add Payment
                            </Button>
                          </>
                        )}
                      </div>
                      
                      {/* Individual Payment Records */}
                      {client.payments && client.payments.length > 0 && (
                        <div className="border-t border-gray-200 pt-4">
                          <div className="flex items-center justify-between mb-3">
                            <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Payment Records</h4>
                            <span className="text-xs text-gray-500">{client.payments.length} records</span>
                          </div>
                          <div className="space-y-2">
                            {client.payments.slice(0, 3).map((payment, paymentIndex) => {
                              // FIXED: Use actual values without Math.abs() masking
                              const paymentPending = payment.pendingAmount || 0;
                              const paymentTotal = payment.totalAmount || 0;
                              const paymentReceived = payment.receivedAmount || 0;
                              const hasPaymentIssues = paymentPending < 0;
                              
                              return (
                              <div key={paymentIndex} className={`flex items-center justify-between p-3 rounded-lg transition-colors border ${
                                paymentPending <= 0 ? 'bg-green-100 border-green-200 hover:bg-green-150' : // Paid/overpaid = green
                                paymentPending > 2000 ? 'bg-red-100 border-red-200 hover:bg-red-150' : // High outstanding = red
                                'bg-orange-100 border-orange-200 hover:bg-orange-150' // Some outstanding = orange
                              }`}>
                                <div className="flex items-center gap-3">
                                  <div className={`w-3 h-3 rounded-full ${
                                    payment.status === 'RECEIVED' ? 'bg-green-500' :
                                    payment.status === 'PARTIAL' ? 'bg-yellow-500' : 
                                    hasPaymentIssues ? 'bg-red-500' : 'bg-orange-500'
                                  }`}></div>
                                  <div>
                                    <p className={`text-sm font-medium ${
                                      paymentPending <= 0 ? 'text-green-800' : // Paid/overpaid = green
                                      paymentPending > 2000 ? 'text-red-800' : // High outstanding = red  
                                      'text-orange-800' // Some outstanding = orange
                                    }`}>
                                      {payment.orderNumber !== 'MANUAL' ? payment.orderNumber : 'Manual Payment'}
                                      {hasPaymentIssues && <span className="ml-2 text-xs text-red-600">⚠️ Issues</span>}
                                    </p>
                                    <p className={`text-xs ${
                                      hasPaymentIssues ? 'text-red-600' : hasSystemIssues ? 'text-red-600' : 'text-green-600'
                                    }`}>
                                      Container: {payment.containerId !== 'N/A' ? payment.containerId : 'N/A'}
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-3">
                                  <div className="text-right">
                                    <p className={`text-sm font-semibold ${
                                      paymentPending < 0 ? 'text-green-800' : // Overpaid = green
                                      paymentPending > 2000 ? 'text-red-800' : // High outstanding = red
                                      paymentPending > 0 ? 'text-orange-700' : // Some outstanding = orange
                                      'text-green-800' // Fully paid = green
                                    }`}>
                                      {formatCurrency(paymentPending)}
                                      {paymentPending < 0 && <span className="text-xs text-green-600 block">Overpaid</span>}
                                    </p>
                                    <p className={`text-xs ${
                                      paymentPending <= 0 ? 'text-green-600' : // Paid/overpaid = green
                                      paymentPending > 2000 ? 'text-red-600' : // High outstanding = red
                                      'text-orange-600' // Some outstanding = orange  
                                    }`}>
                                      of {formatCurrency(paymentTotal)}
                                    </p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => {
                                      setSelectedPayment(payment)
                                      setShowPaymentModal(true)
                                    }}
                                    className={`${
                                      paymentPending <= 0 ? 'bg-green-50 hover:bg-green-100 border-green-300 text-green-700' : // Paid = green
                                      paymentPending > 2000 ? 'bg-red-50 hover:bg-red-100 border-red-300 text-red-700' : // High outstanding = red
                                      'bg-orange-50 hover:bg-orange-100 border-orange-300 text-orange-700' // Some outstanding = orange
                                    }`}
                                    disabled={paymentPending <= 0 || hasPaymentIssues}
                                  >
                                    <CreditCard className="h-3 w-3 mr-1" />
                                    {paymentPending <= 0 ? 'Paid' : hasPaymentIssues ? 'Fix' : 'Pay'}
                                  </Button>
                                </div>
                              </div>
                              )
                            })}
                            {client.payments.length > 3 && (
                              <p className="text-xs text-gray-500 text-center py-2">
                                ... and {client.payments.length - 3} more payment records
                              </p>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Payment History Section */}
                      <div className="border-t border-gray-200 pt-4 mt-4">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide flex items-center gap-2">
                            <FileText className="h-4 w-4" />
                            Payment History
                          </h4>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => fetchPaymentHistory(client.clientId)}
                            className="text-xs bg-gray-50 hover:bg-gray-100 border-gray-200 text-gray-700"
                          >
                            <RefreshCw className="h-3 w-3 mr-1" />
                            Load History
                          </Button>
                        </div>
                        
                        {/* Payment History Table */}
                        <div className="bg-gray-50 rounded-lg p-3 border border-gray-200">
                          <div className="overflow-x-auto">
                            <table className="w-full text-xs">
                              <thead>
                                <tr className="border-b border-gray-200">
                                  <th className="text-left py-2 px-2 font-medium text-gray-700">Date</th>
                                  <th className="text-left py-2 px-2 font-medium text-gray-700">Type</th>
                                  <th className="text-right py-2 px-2 font-medium text-gray-700">Amount</th>
                                  <th className="text-left py-2 px-2 font-medium text-gray-700">Notes</th>
                                  <th className="text-right py-2 px-2 font-medium text-gray-700">Balance</th>
                                </tr>
                              </thead>
                              <tbody>
                                {client.paymentHistoryLoaded ? (
                                  client.paymentHistory && client.paymentHistory.length > 0 ? (
                                    client.paymentHistory.slice(0, 5).map((history, historyIndex) => (
                                      <tr key={historyIndex} className="border-b border-gray-100 hover:bg-gray-100">
                                        <td className="py-2 px-2 text-gray-800">
                                          {new Date(history.date || history.receivedDate).toLocaleDateString()}
                                        </td>
                                        <td className="py-2 px-2">
                                          <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                                            history.type === 'PAYMENT' ? 'bg-green-100 text-green-700' :
                                            history.type === 'INVOICE' ? 'bg-blue-100 text-blue-700' :
                                            'bg-gray-100 text-gray-700'
                                          }`}>
                                            {history.type || 'PAYMENT'}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 text-right font-medium">
                                          <span className={history.amount > 0 ? 'text-green-600' : 'text-red-600'}>
                                            {history.amount > 0 ? '+' : '-'}{formatCurrency(Math.abs(history.amount))}
                                          </span>
                                        </td>
                                        <td className="py-2 px-2 text-gray-700 max-w-24 truncate">
                                          {history.notes || history.description || '-'}
                                        </td>
                                        <td className="py-2 px-2 text-right font-medium text-gray-800">
                                          {formatCurrency(history.runningBalance || 0)}
                                        </td>
                                      </tr>
                                    ))
                                  ) : (
                                    <tr>
                                      <td colSpan="5" className="py-4 text-center text-gray-600">
                                        No payment history available
                                      </td>
                                    </tr>
                                  )
                                ) : (
                                  <tr>
                                    <td colSpan="5" className="py-4 text-center text-gray-600">
                                      Click "Load History" to view payment records
                                    </td>
                                  </tr>
                                )}
                              </tbody>
                            </table>
                          </div>
                          {client.paymentHistory && client.paymentHistory.length > 5 && (
                            <div className="mt-2 text-center">
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleShowPartyDetails(client, 'client')}
                                className="text-xs text-gray-700 hover:bg-gray-100"
                              >
                                View All {client.paymentHistory.length} Records
                              </Button>
                            </div>
                          )}
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  )
                  })
                ) : (
                  <Card className="border-2 border-dashed border-gray-300">
                    <CardContent className="p-12 text-center">
                      <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                        <Building className="h-8 w-8 text-gray-400" />
                      </div>
                      <h3 className="text-lg font-semibold text-gray-700 mb-2">👥 No Client Accounts Yet</h3>
                      <p className="text-gray-500 mb-4">No clients with payment obligations found. This could mean:</p>
                      <div className="text-left max-w-sm mx-auto mb-4">
                        <p className="text-sm text-gray-600">• All clients have paid their bills ✅</p>
                        <p className="text-sm text-gray-600">• No orders have been processed yet</p>
                        <p className="text-sm text-gray-600">• System needs to sync with latest data</p>
                      </div>
                      <Button variant="outline" onClick={loadPaymentCollections}>
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Refresh & Check Again
                      </Button>
                    </CardContent>
                  </Card>
                );
              })()}
            </div>
          </CardContent>
        </Card>

        {/* Payment Recording Modal */}
        <Dialog open={showPaymentModal} onOpenChange={setShowPaymentModal}>
          <DialogContent className="sm:max-w-[425px]">
            <DialogHeader>
              <DialogTitle>💳 Record Payment Received</DialogTitle>
              <DialogDescription>
                Record money received from {selectedPayment ? (selectedPayment.orderNumber !== 'MANUAL' ? selectedPayment.orderNumber : 'Manual Payment') : 'Selected Payment'}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-amount" className="text-right">
                  Amount Received (₹)
                </Label>
                <Input
                  id="payment-amount"
                  type="number"
                  placeholder="₹0.00"
                  className="col-span-3"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="payment-notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="payment-notes"
                  placeholder="Optional payment notes..."
                  className="col-span-3"
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                />
              </div>
              {selectedPayment && (
                <div className="bg-gray-50 p-3 rounded-lg">
                  <p className="text-sm text-gray-700">
                    <strong>Outstanding:</strong> {formatCurrency(selectedPayment.pendingAmount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Total Amount:</strong> {formatCurrency(selectedPayment.totalAmount)}
                  </p>
                  {paymentAmount && parseFloat(paymentAmount) > selectedPayment.pendingAmount && (
                  <div className="mt-2 p-2 bg-amber-50 border border-amber-200 rounded">
                    <p className="text-xs text-amber-700">
                      ⚠️ <strong>Note:</strong> Payment amount exceeds outstanding balance. 
                      Server will validate and prevent overpayments.
                    </p>
                  </div>
                  )}
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleRecordPayment}>
                💳 Record This Payment
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Bulk Payment Modal */}
        <Dialog open={showBulkPaymentModal} onOpenChange={setShowBulkPaymentModal}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>💰 Collect Multiple Payments</DialogTitle>
              <DialogDescription>
                Record multiple payments received from {selectedClient?.clientName}
              </DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bulk-amount" className="text-right">
                  Total Amount Received (₹)
                </Label>
                <Input
                  id="bulk-amount"
                  type="number"
                  placeholder="₹0.00"
                  className="col-span-3"
                  value={bulkPaymentAmount}
                  onChange={(e) => setBulkPaymentAmount(e.target.value)}
                />
              </div>
              <div className="grid grid-cols-4 items-center gap-4">
                <Label htmlFor="bulk-notes" className="text-right">
                  Notes
                </Label>
                <Textarea
                  id="bulk-notes"
                  placeholder="Optional payment notes..."
                  className="col-span-3"
                  value={bulkPaymentNotes}
                  onChange={(e) => setBulkPaymentNotes(e.target.value)}
                />
              </div>
              {selectedClient && (
                <div className="bg-gray-50 p-4 rounded-lg">
                  <h4 className="font-semibold text-gray-800 mb-2">Client Summary</h4>
                  <p className="text-sm text-gray-700">
                    <strong>Outstanding:</strong> {formatCurrency(selectedClient.pendingAmount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Total Amount:</strong> {formatCurrency(selectedClient.totalAmount)}
                  </p>
                  <p className="text-sm text-gray-700">
                    <strong>Payment Records:</strong> {selectedClient.payments?.length || 0}
                  </p>
                </div>
              )}
            </div>
            <div className="flex justify-end space-x-2">
              <Button variant="outline" onClick={() => setShowBulkPaymentModal(false)}>
                Cancel
              </Button>
              <Button onClick={handleBulkPayment}>
                💰 Record All Payments
              </Button>
            </div>
          </DialogContent>
        </Dialog>

        {/* Transaction Details Modal */}
        <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
          <DialogContent className="sm:max-w-[800px] max-h-[90vh] overflow-y-auto">
            <DialogHeader>
              <DialogTitle>📋 Complete Transaction History</DialogTitle>
              <DialogDescription>
                All financial transactions for {selectedPartyDetails?.clientName}
              </DialogDescription>
            </DialogHeader>
            {selectedPartyDetails && (
              <div className="space-y-6">
                {/* Account Summary */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="bg-blue-50 p-4 rounded-lg text-center border border-blue-200">
                    <p className="text-2xl font-bold text-blue-600">
                      {formatCurrency(selectedPartyDetails.accountSummary.totalInvoiced)}
                    </p>
                    <p className="text-sm text-blue-600">Total Invoiced</p>
                  </div>
                  <div className="bg-green-50 p-4 rounded-lg text-center border border-green-200">
                    <p className="text-2xl font-bold text-green-600">
                      {formatCurrency(selectedPartyDetails.accountSummary.totalReceived)}
                    </p>
                    <p className="text-sm text-green-600">Total Received</p>
                  </div>
                  <div className={`p-4 rounded-lg text-center border ${
                    selectedPartyDetails.accountSummary.currentBalance <= 0 ? 
                    'bg-green-50 border-green-200' : 'bg-orange-50 border-orange-200'
                  }`}>
                    <p className={`text-2xl font-bold ${
                      selectedPartyDetails.accountSummary.currentBalance <= 0 ? 
                      'text-green-600' : 'text-orange-600'
                    }`}>
                      {formatCurrency(selectedPartyDetails.accountSummary.currentBalance)}
                    </p>
                    <p className={`text-sm ${
                      selectedPartyDetails.accountSummary.currentBalance <= 0 ? 
                      'text-green-600' : 'text-orange-600'
                    }`}>Outstanding</p>
                  </div>
                  <div className="bg-gray-50 p-4 rounded-lg text-center border border-gray-200">
                    <p className="text-2xl font-bold text-gray-600">
                      {selectedPartyDetails.accountSummary.totalTransactions}
                    </p>
                    <p className="text-sm text-gray-600">Transactions</p>
                  </div>
                </div>

                {/* Payment Records Ledger */}
                <div>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="p-2 rounded-lg bg-blue-100">
                      <FileText className="h-5 w-5 text-blue-600" />
                    </div>
                    <div>
                      <h4 className="text-lg font-semibold text-gray-800">Payment Ledger</h4>
                      <p className="text-sm text-gray-600">Complete transaction ledger with running balance</p>
                    </div>
                  </div>
                  <div className="bg-white border border-gray-200 rounded-lg shadow-sm overflow-hidden">
                    {selectedPartyDetails.paymentRecords && selectedPartyDetails.paymentRecords.length > 0 ? (
                      <div className="overflow-x-auto">
                        <table className="w-full text-sm">
                          <thead>
                            <tr className="border-b-2 border-gray-200 bg-gray-100">
                              <th className="text-left py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center gap-2">
                                  <Calendar className="h-4 w-4" />
                                  Date
                                </div>
                              </th>
                              <th className="text-left py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center gap-2">
                                  <FileText className="h-4 w-4" />
                                  Type
                                </div>
                              </th>
                              <th className="text-left py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Reference
                                </div>
                              </th>
                              <th className="text-right py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center justify-end gap-2">
                                  <ArrowUpRight className="h-4 w-4 text-red-600" />
                                  Debit
                                </div>
                              </th>
                              <th className="text-right py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center justify-end gap-2">
                                  <ArrowDownLeft className="h-4 w-4 text-green-600" />
                                  Credit
                                </div>
                              </th>
                              <th className="text-right py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center justify-end gap-2">
                                  <Calculator className="h-4 w-4" />
                                  Balance
                                </div>
                              </th>
                              <th className="text-center py-3 px-3 font-semibold text-gray-800">
                                <div className="flex items-center justify-center gap-2">
                                  <Clock className="h-4 w-4" />
                                  Status
                                </div>
                              </th>
                            </tr>
                          </thead>
                          <tbody>
                            {selectedPartyDetails.paymentRecords.map((record, index) => {
                              const isOrderRecord = record.type === 'ORDER_INVOICE'
                              const isPaymentRecord = record.type === 'PAYMENT_RECEIVED'
                              
                              return (
                                <tr key={record.id || index} className={`border-b border-gray-100 hover:bg-gray-50 transition-colors ${
                                  isOrderRecord ? 'bg-amber-50/30' : isPaymentRecord ? 'bg-green-50/30' : 'bg-gray-50/20'
                                }`}>
                                  <td className="py-2 px-2 text-gray-800">
                                    <div className="flex items-center gap-2">
                                      <div className={`w-2 h-2 rounded-full ${
                                        isOrderRecord ? 'bg-amber-500' : isPaymentRecord ? 'bg-green-500' : 'bg-gray-400'
                                      }`}></div>
                                      {new Date(record.date || record.createdAt).toLocaleDateString()}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2">
                                    <Badge variant="outline" className={`text-xs ${
                                      isOrderRecord ? 'bg-amber-50 text-amber-700 border-amber-200' : 
                                      isPaymentRecord ? 'bg-green-50 text-green-700 border-green-200' : 
                                      'bg-gray-50 text-gray-600 border-gray-200'
                                    }`}>
                                      {record.type === 'ORDER_INVOICE' ? 'INVOICE' : 
                                       record.type === 'PAYMENT_RECEIVED' ? 'PAYMENT' : 
                                       record.type || 'UNKNOWN'}
                                    </Badge>
                                  </td>
                                  <td className="py-2 px-2 text-gray-800 font-medium">
                                    <div className="flex items-center gap-2">
                                      {isOrderRecord ? (
                                        <FileText className="h-4 w-4 text-amber-600" />
                                      ) : isPaymentRecord ? (
                                        <ArrowDownLeft className="h-4 w-4 text-green-600" />
                                      ) : (
                                        <Receipt className="h-4 w-4 text-gray-500" />
                                      )}
                                      {record.reference || record.orderNumber || 'N/A'}
                                    </div>
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono">
                                    {record.debit > 0 ? (
                                      <span className="text-red-600 font-semibold">+{formatCurrency(Math.abs(record.debit))}</span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono">
                                    {record.credit > 0 ? (
                                      <span className="text-green-600 font-semibold">-{formatCurrency(Math.abs(record.credit))}</span>
                                    ) : (
                                      <span className="text-gray-400">—</span>
                                    )}
                                  </td>
                                  <td className="py-2 px-2 text-right font-mono font-bold">
                                    <span className={`${
                                      record.balance > 0 ? 'text-red-700' : 
                                      record.balance < 0 ? 'text-green-700' : 
                                      'text-gray-800'
                                    }`}>
                                      {formatCurrency(record.balance || 0)}
                                    </span>
                                  </td>
                                  <td className="py-2 px-2 text-center">
                                    <Badge 
                                      variant={record.status === 'RECEIVED' || record.status === 'COMPLETE' ? 'default' : 'secondary'}
                                      className={`text-xs ${
                                        record.status === 'RECEIVED' || record.status === 'COMPLETE' ? 
                                          'bg-green-100 text-green-700 border-green-200' : 
                                          'bg-gray-100 text-gray-600 border-gray-200'
                                      }`}
                                    >
                                      {record.status || 'PENDING'}
                                    </Badge>
                                  </td>
                                </tr>
                              )
                            })}
                          </tbody>
                          <tfoot>
                            <tr className="border-t-2 border-gray-300 bg-gray-100">
                              <td className="py-3 px-3 font-bold text-gray-800" colSpan="3">
                                <div className="flex items-center gap-2">
                                  <Calculator className="h-4 w-4" />
                                  FINAL BALANCE
                                </div>
                              </td>
                              <td className="text-right py-3 px-3 font-bold text-red-600">
                                <span className="font-mono">
                                  +{formatCurrency(selectedPartyDetails.accountSummary?.totalInvoiced || 0)}
                                </span>
                              </td>
                              <td className="text-right py-3 px-3 font-bold text-green-600">
                                <span className="font-mono">
                                  -{formatCurrency(selectedPartyDetails.accountSummary?.totalReceived || 0)}
                                </span>
                              </td>
                              <td className="text-right py-3 px-3 font-bold">
                                <span className={`font-mono text-lg ${
                                  (selectedPartyDetails.accountSummary?.currentBalance || 0) > 0 ? 'text-red-700' :
                                  (selectedPartyDetails.accountSummary?.currentBalance || 0) < 0 ? 'text-green-700' :
                                  'text-gray-800'
                                }`}>
                                  {formatCurrency(selectedPartyDetails.accountSummary?.currentBalance || 0)}
                                </span>
                                <div className="text-xs text-gray-600 mt-1">Outstanding</div>
                              </td>
                              <td className="text-center py-3 px-3 font-bold text-gray-700">
                                {(selectedPartyDetails.accountSummary?.totalTransactions || 0)} records
                              </td>
                            </tr>
                          </tfoot>
                        </table>
                      </div>
                    ) : (
                      <p className="text-center text-gray-600 py-8">No payment records found</p>
                    )}
                  </div>
                </div>

                {/* Additional Information */}
                {selectedPartyDetails.containers && selectedPartyDetails.containers.length > 0 && (
                  <div>
                    <h4 className="text-lg font-semibold mb-4 text-gray-800">Containers</h4>
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <div className="space-y-2">
                        {selectedPartyDetails.containers.map((container, index) => (
                          <div key={index} className="flex justify-between items-center p-2 bg-blue-100 rounded">
                            <span className="text-blue-800 font-medium">{container.containerId}</span>
                            <span className="text-blue-600 text-sm">{container.orders} orders</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                )}

                {/* Metadata */}
                {selectedPartyDetails.metadata && (
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <h4 className="text-sm font-semibold mb-2 text-gray-700">Report Information</h4>
                    <div className="text-xs text-gray-600 space-y-1">
                      <p><span className="font-medium">Generated:</span> {new Date(selectedPartyDetails.metadata.generatedAt).toLocaleString()}</p>
                      <p><span className="font-medium">Period:</span> {selectedPartyDetails.metadata.period}</p>
                      <p><span className="font-medium">Currency:</span> {selectedPartyDetails.metadata.currency}</p>
                      <p><span className="font-medium">Type:</span> {selectedPartyDetails.metadata.recordType}</p>
                    </div>
                  </div>
                )}
              </div>
            )}
            <div className="flex justify-end">
              <Button variant="outline" onClick={() => setShowTransactionDetails(false)}>
                Close
              </Button>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Enhanced Manual Transaction Modal */}
        <Dialog open={showManualTransactionModal} onOpenChange={setShowManualTransactionModal}>
          <DialogContent className="sm:max-w-[700px] max-h-[90vh] overflow-y-auto">
            <DialogHeader className="pb-6">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                  <CircleDollarSign className="h-6 w-6 text-white" />
                </div>
                <div>
                  <DialogTitle className="text-2xl font-bold text-gray-800">Add Manual Transaction</DialogTitle>
                  <DialogDescription className="text-gray-600 mt-1">
                    Record payments or receipts outside of regular order processing
                  </DialogDescription>
                </div>
              </div>
            </DialogHeader>
            
            <div className="space-y-6 py-2">
              {/* Transaction Type Selection - Prominent */}
              <div className="space-y-3">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Calculator className="h-4 w-4" />
                  Transaction Type *
                </Label>
                <div className="grid grid-cols-2 gap-3">
                  <div 
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      manualTransaction.transactionType === 'PAYMENT_RECEIVED' 
                        ? 'border-green-500 bg-green-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => setManualTransaction({...manualTransaction, transactionType: 'PAYMENT_RECEIVED'})}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'bg-green-100' : 'bg-gray-100'
                        }`}>
                          <ArrowUpRight className={`h-5 w-5 ${
                            manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'text-green-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Money Received</p>
                          <p className="text-xs text-gray-500">Client paid us money</p>
                        </div>
                      </div>
                      {manualTransaction.transactionType === 'PAYMENT_RECEIVED' && (
                        <div className="w-4 h-4 bg-green-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div 
                    className={`relative cursor-pointer rounded-lg border-2 p-4 transition-all ${
                      manualTransaction.transactionType === 'PAYMENT_GIVEN' 
                        ? 'border-red-500 bg-red-50' 
                        : 'border-gray-200 hover:border-gray-300 bg-white'
                    }`}
                    onClick={() => setManualTransaction({...manualTransaction, transactionType: 'PAYMENT_GIVEN'})}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-3">
                        <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                          manualTransaction.transactionType === 'PAYMENT_GIVEN' ? 'bg-red-100' : 'bg-gray-100'
                        }`}>
                          <DollarSign className={`h-5 w-5 ${
                            manualTransaction.transactionType === 'PAYMENT_GIVEN' ? 'text-red-600' : 'text-gray-500'
                          }`} />
                        </div>
                        <div>
                          <p className="font-medium text-gray-800">Money Given</p>
                          <p className="text-xs text-gray-500">We paid client money</p>
                        </div>
                      </div>
                      {manualTransaction.transactionType === 'PAYMENT_GIVEN' && (
                        <div className="w-4 h-4 bg-red-500 rounded-full flex items-center justify-center">
                          <span className="text-white text-xs">✓</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>

              {/* Client Selection Section */}
              <div className="space-y-3">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Select Client *
                </Label>
                <div className="space-y-3">
                  {/* Dropdown Selection */}
                  <div className="relative">
                    <select
                      className="w-full px-4 py-3 border border-gray-300 rounded-lg bg-white focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 text-sm appearance-none cursor-pointer"
                      value={manualTransaction.clientId}
                      onChange={(e) => {
                        const selectedClientId = e.target.value
                        const selectedClient = allClients.find(c => c.clientId === selectedClientId)
                        setManualTransaction({
                          ...manualTransaction,
                          clientId: selectedClientId,
                          clientName: selectedClient?.clientName || ''
                        })
                      }}
                    >
                      <option value="">🔍 Choose from existing clients...</option>
                      {allClients.map(client => (
                        <option key={client.clientId} value={client.clientId}>
                          {client.clientName} • {client.clientId}
                        </option>
                      ))}
                    </select>
                    <ChevronDown className="absolute right-3 top-3 h-5 w-5 text-gray-400 pointer-events-none" />
                  </div>
                  
                  {/* Manual Entry Section */}
                  <div className="border-t pt-3">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-4 h-px bg-gray-300"></div>
                      <span className="text-xs text-gray-500 font-medium">OR ENTER NEW CLIENT</span>
                      <div className="flex-1 h-px bg-gray-300"></div>
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Client ID</Label>
                        <Input
                          placeholder="CLI-NEW001"
                          className="mt-1"
                          value={manualTransaction.clientId}
                          onChange={(e) => setManualTransaction({...manualTransaction, clientId: e.target.value})}
                        />
                      </div>
                      <div>
                        <Label className="text-sm font-medium text-gray-700">Client Name</Label>
                        <Input
                          placeholder="New Client Ltd."
                          className="mt-1"
                          value={manualTransaction.clientName}
                          onChange={(e) => setManualTransaction({...manualTransaction, clientName: e.target.value})}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              </div>

              {/* Amount and Description Section */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <DollarSign className="h-4 w-4" />
                    Amount (₹) *
                  </Label>
                  <div className="relative">
                    <span className="absolute left-3 top-3 text-gray-500 font-medium">₹</span>
                    <Input
                      type="number"
                      placeholder="0.00"
                      className="pl-8 text-lg font-semibold"
                      value={manualTransaction.amount}
                      onChange={(e) => setManualTransaction({...manualTransaction, amount: e.target.value})}
                      min="0.01"
                      step="0.01"
                    />
                  </div>
                  {manualTransaction.amount && (
                    <p className="text-xs text-gray-500 mt-1">
                      Amount: {new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(parseFloat(manualTransaction.amount) || 0)}
                    </p>
                  )}
                </div>
                
                <div className="space-y-2">
                  <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                    <FileText className="h-4 w-4" />
                    Purpose/Description <span className="text-sm font-normal text-gray-500">(Optional)</span>
                  </Label>
                  <Input
                    placeholder="e.g., Emergency payment, Advance, Refund..."
                    value={manualTransaction.description}
                    onChange={(e) => setManualTransaction({...manualTransaction, description: e.target.value})}
                  />
                </div>
              </div>

              {/* Additional Notes */}
              <div className="space-y-2">
                <Label className="text-base font-semibold text-gray-800 flex items-center gap-2">
                  <FileText className="h-4 w-4" />
                  Additional Notes <span className="text-sm font-normal text-gray-500">(Optional)</span>
                </Label>
                <Textarea
                  placeholder="Add any additional context, reference numbers, or details..."
                  className="resize-none"
                  rows={3}
                  value={manualTransaction.notes}
                  onChange={(e) => setManualTransaction({...manualTransaction, notes: e.target.value})}
                />
              </div>

              {/* Dynamic Preview/Status */}
              {manualTransaction.amount && manualTransaction.clientName ? (
                <div className={`rounded-lg border-2 p-4 ${
                  manualTransaction.transactionType === 'PAYMENT_RECEIVED' 
                    ? 'border-green-200 bg-green-50' 
                    : 'border-red-200 bg-red-50'
                }`}>
                  <div className="flex items-start gap-3">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                      manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'bg-green-100' : 'bg-red-100'
                    }`}>
                      {manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? (
                        <ArrowUpRight className="h-5 w-5 text-green-600" />
                      ) : (
                        <DollarSign className="h-5 w-5 text-red-600" />
                      )}
                    </div>
                    <div className="flex-1">
                      <h4 className={`font-semibold ${
                        manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'text-green-800' : 'text-red-800'
                      }`}>
                        Transaction Preview
                      </h4>
                      <p className={`text-sm mt-1 ${
                        manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'text-green-700' : 'text-red-700'
                      }`}>
                        {manualTransaction.transactionType === 'PAYMENT_RECEIVED' 
                          ? `Record ₹${parseFloat(manualTransaction.amount).toLocaleString('en-IN')} received from ${manualTransaction.clientName}` 
                          : `Record ₹${parseFloat(manualTransaction.amount).toLocaleString('en-IN')} given to ${manualTransaction.clientName}`
                        }
                      </p>
                      <div className={`text-xs mt-2 space-y-1 ${
                        manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? 'text-green-600' : 'text-red-600'
                      }`}>
                        {manualTransaction.description && (
                          <p><strong>Purpose:</strong> {manualTransaction.description}</p>
                        )}
                        <p><strong>Impact:</strong> {manualTransaction.transactionType === 'PAYMENT_RECEIVED' 
                          ? 'Will reduce client\'s outstanding balance or create credit' 
                          : 'Will create a credit balance (we owe them money)'
                        }</p>
                        {manualTransaction.notes && (
                          <p><strong>Notes:</strong> {manualTransaction.notes}</p>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8">
                  <div className="text-center text-gray-500">
                    <AlertCircle className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <p className="text-lg font-medium mb-2">Transaction Preview</p>
                    <p className="text-sm">Complete the form above to see transaction details</p>
                  </div>
                </div>
              )}
            </div>
            
            {/* Action Buttons */}
            <div className="flex justify-between items-center pt-6 border-t">
              <Button variant="outline" onClick={() => setShowManualTransactionModal(false)} className="px-6">
                <span>Cancel</span>
              </Button>
              <div className="flex gap-3">
                <Button 
                  variant="outline" 
                  onClick={() => {
                    setManualTransaction({
                      clientId: '',
                      clientName: '',
                      amount: '',
                      transactionType: 'PAYMENT_RECEIVED',
                      description: '',
                      notes: ''
                    })
                  }}
                  className="px-6"
                >
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Reset Form
                </Button>
                <Button 
                  onClick={handleManualTransaction}
                  disabled={!manualTransaction.clientId || !manualTransaction.clientName || !manualTransaction.amount}
                  className={`px-8 ${
                    manualTransaction.transactionType === 'PAYMENT_RECEIVED' 
                      ? 'bg-green-600 hover:bg-green-700' 
                      : 'bg-red-600 hover:bg-red-700'
                  }`}
                >
                  {manualTransaction.transactionType === 'PAYMENT_RECEIVED' ? (
                    <ArrowUpRight className="h-4 w-4 mr-2" />
                  ) : (
                    <DollarSign className="h-4 w-4 mr-2" />
                  )}
                  Record Transaction
                </Button>
              </div>
            </div>
          </DialogContent>
        </Dialog>
        
        {/* Floating Quick Add Button */}
        <div className="fixed bottom-6 right-6 z-50">
          <Button 
            onClick={() => {
              // Reset manual transaction form
              setManualTransaction({
                clientId: '',
                clientName: '',
                amount: '',
                transactionType: 'PAYMENT_RECEIVED',
                description: '',
                notes: ''
              })
              setShowManualTransactionModal(true)
            }}
            className="w-16 h-16 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white shadow-2xl hover:shadow-3xl transition-all duration-200 flex items-center justify-center"
            title="Quick Add Manual Payment"
          >
            <Plus className="h-8 w-8" />
          </Button>
        </div>
      </motion.div>
    </div>
  )
}

export default TransactionManagement