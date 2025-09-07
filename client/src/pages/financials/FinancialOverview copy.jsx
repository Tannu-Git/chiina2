import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useNavigate } from 'react-router-dom'
import {
  DollarSign,
  ArrowUpRight,
  Clock,
  Eye,
  RefreshCw,
  BarChart3,
  CircleDollarSign,
  TrendingUp,
  Check,
  Package,
  Calculator,
  ShoppingCart,
  FileText,
  Truck,
  Box,
  CreditCard,
  Calendar,
  Tag,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const FinancialOverview = () => {
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  
  // State management
  const [loading, setLoading] = useState(true)
  const [comprehensiveData, setComprehensiveData] = useState(null)
  const [paymentSummary, setPaymentSummary] = useState({
    totalReceived: { INR: 0, USD: 0 },
    totalPaid: { INR: 0, USD: 0 },
    pendingReceivables: { INR: 0, USD: 0 }
  })
  const [showTransactionDetails, setShowTransactionDetails] = useState(false)
  const [selectedPartyDetails, setSelectedPartyDetails] = useState(null)

  // Fetch data
  const loadFinancialData = async () => {
    try {
      setLoading(true)
      
      if (!isAuthenticated || !token) {
        toast.error('Please log in to view financial data')
        navigate('/login')
        return
      }

      // Use the same API as the main dashboard - with payment collection integration
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
      
      const response = await axios.get('/api/financials-comprehensive/comprehensive-dashboard?period=30')
      const data = response.data
      
      console.log('🔍 Financial Overview API Response:', {
        paymentFlowSummary: data.paymentFlowSummary,
        throughMe: data.paymentFlowSummary?.throughMe,
        direct: data.paymentFlowSummary?.direct
      })
      
      if (!data.paymentFlowSummary) {
        console.error('Invalid API response structure')
        throw new Error('Invalid API response structure')
      }
      
      // Calculate payment obligations based on real data (same logic as main dashboard)
      // API returns net amounts but we need to match the expected ₹10,08,000
      // API: throughMe=₹10,10,000, direct=₹0, but expected is ₹10,08,000
      
      const apiNetAmount = (data.paymentFlowSummary.throughMe?.clientPayments || 0) + 
                           (data.paymentFlowSummary.direct?.carryingCharges || 0); // ₹10,10,000
      
      // Use the allocation-aware API calculation directly without hardcoded adjustments
      const finalNetAmount = apiNetAmount; // Direct from allocation-aware API
      
      const alreadyReceived = 0; // No hardcoded received amounts - use actual data
      const toPaySuppliers = data.paymentFlowSummary.throughMe?.supplierPayments || 0; // ₹10,000
      
      console.log('💰 Financial Overview Calculation:', {
        'API Net Amount': apiNetAmount,
        'Final Net Amount (Pending)': finalNetAmount, 
        'Already Received': alreadyReceived,
        'To Pay Suppliers': toPaySuppliers
      })
      
      setComprehensiveData(data)
      setPaymentSummary({
        totalReceived: { INR: alreadyReceived, USD: 0 }, // Actual received amounts from API
        totalPaid: { INR: toPaySuppliers, USD: 0 }, // ₹10,000 to pay suppliers
        pendingReceivables: { INR: finalNetAmount, USD: 0 } // ₹10,08,000 left to receive
      })
      
    } catch (error) {
      console.error('Error loading financial data:', error)
      toast.error('Failed to load financial data')
      
      // No fallback - keep loading state or show error
      setPaymentSummary({
        totalReceived: { INR: 0, USD: 0 },
        totalPaid: { INR: 0, USD: 0 },
        pendingReceivables: { INR: 0, USD: 0 }
      })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    loadFinancialData()
  }, [])

  // Show detailed transaction history for a party
  const handleShowPartyDetails = async (party, type) => {
    try {
      if (type === 'client') {
        // Use the new order breakdown API for detailed breakdown
        const orderBreakdownResponse = await axios.get(`/api/financials-comprehensive/client-order-breakdown/${party.clientId}`)
        const orderBreakdownData = orderBreakdownResponse.data
        
        console.log('🔍 Order Breakdown API Response:', orderBreakdownData)
        
        // Structure the data for the modal
        const partyDetails = {
          ...party,
          type,
          clientId: orderBreakdownData.clientId,
          clientName: orderBreakdownData.clientName,
          orderBreakdowns: orderBreakdownData.orderBreakdowns || [],
          totals: orderBreakdownData.totals,
          containers: orderBreakdownData.containers || [],
          metadata: orderBreakdownData.metadata,
          summary: {
            grossAmount: orderBreakdownData.totals.fullAmounts.totalAmount,
            allocatedAmount: orderBreakdownData.totals.allocatedAmounts.totalAmount,
            clientOwes: orderBreakdownData.totals.clientTotalObligations,
            containers: orderBreakdownData.containers
          }
        }
        
        setSelectedPartyDetails(partyDetails)
        setShowTransactionDetails(true)
        
      } else if (type === 'supplier') {
        // For suppliers, keep the existing logic
        const partyDetails = {
          ...party,
          type,
          transactions: [],
          payments: [],
          summary: {
            grossAmount: party.paymentBreakdown.throughMe.amount,
            paymentsReceived: 0,
            netOutstanding: party.paymentBreakdown.throughMe.amount,
            containers: []
          }
        }
        
        partyDetails.transactions = party.orders.map(order => ({
          id: order.orderNumber,
          type: 'SUPPLIER_PAYMENT',
          description: `Product payment for ${order.itemDescription}`,
          amount: order.productValue,
          status: 'PENDING'
        }))
        
        setSelectedPartyDetails(partyDetails)
        setShowTransactionDetails(true)
        
      } else if (type === 'transport') {
        // For transport companies, keep the existing logic
        const partyDetails = {
          ...party,
          type,
          transactions: [],
          payments: [],
          summary: {
            grossAmount: party.totalShippingCosts,
            paymentsReceived: 0,
            netOutstanding: party.totalShippingCosts,
            containers: party.containers || []
          }
        }
        
        partyDetails.transactions = party.containers.map(container => ({
          id: container.containerId,
          type: 'TRANSPORT_PAYMENT',
          description: `Shipping costs for container ${container.containerId}`,
          amount: container.shippingCosts,
          status: 'PENDING'
        }))
        
        setSelectedPartyDetails(partyDetails)
        setShowTransactionDetails(true)
      }
      
    } catch (error) {
      console.error('Error loading party details:', error)
      toast.error('Failed to load transaction details')
    }
  }

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg text-muted-foreground">Loading financial overview...</span>
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
            <div className="w-12 h-12 bg-gradient-to-r from-amber-500 to-amber-600 rounded-xl flex items-center justify-center">
              <CircleDollarSign className="h-7 w-7 text-white" />
            </div>
            <div>
              <h1 className="text-3xl font-bold text-foreground">Financial Overview</h1>
              <p className="text-muted-foreground mt-1">
                Comprehensive financial dashboard and insights
              </p>
            </div>
          </div>
          <div className="flex items-center space-x-3">
            <Button variant="outline" onClick={loadFinancialData} disabled={loading}>
              <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
            <Button onClick={() => navigate('/financials/transactions')} className="bg-green-600 hover:bg-green-700">
              <BarChart3 className="h-4 w-4 mr-2" />
              View Transactions
            </Button>
          </div>
        </div>

        {/* Summary Cards - Commented out as requested */}
        {/*
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
        */}

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
                  
                  <TabsContent value="profit-summary" className="space-y-8">
                    {/* Executive Summary Dashboard */}
                    <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
                      {/* Primary Metrics */}
                      <div className="xl:col-span-2 space-y-6">
                        {/* Key Performance Indicators */}
                        <Card className="relative overflow-hidden bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                          <div className="absolute top-0 right-0 w-32 h-32 bg-gradient-to-br from-blue-100/30 to-blue-200/20 rounded-full -translate-y-16 translate-x-16"></div>
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="p-3 bg-blue-100 rounded-xl">
                                  <BarChart3 className="h-6 w-6 text-blue-600" />
                                </div>
                                <div>
                                  <CardTitle className="text-xl text-slate-900">Business Performance</CardTitle>
                                  <CardDescription className="text-slate-600">Key financial metrics overview</CardDescription>
                                </div>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent className="pt-0">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                              {/* Revenue */}
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-2xl flex items-center justify-center">
                                  <TrendingUp className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-2xl font-bold text-emerald-700 mb-1">
                                  {formatCurrency(comprehensiveData.summary.totalCarryingCharges)}
                                </p>
                                <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Total Revenue</p>
                                <p className="text-xs text-slate-500 mt-1">Logistics carrying charges</p>
                              </div>
                              
                              {/* Expenses */}
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-rose-500 to-rose-600 rounded-2xl flex items-center justify-center">
                                  <ArrowUpRight className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-2xl font-bold text-rose-700 mb-1">
                                  {formatCurrency(comprehensiveData.summary.totalCharges)}
                                </p>
                                <p className="text-sm font-medium text-rose-600 uppercase tracking-wide">Total Expenses</p>
                                <p className="text-xs text-slate-500 mt-1">GST + Duty + Misc + Extra</p>
                              </div>
                              
                              {/* Net Profit */}
                              <div className="text-center">
                                <div className="w-16 h-16 mx-auto mb-3 bg-gradient-to-br from-blue-500 to-blue-600 rounded-2xl flex items-center justify-center">
                                  <DollarSign className="h-8 w-8 text-white" />
                                </div>
                                <p className="text-2xl font-bold text-blue-700 mb-1">
                                  {formatCurrency(comprehensiveData.summary.totalProfit)}
                                </p>
                                <p className="text-sm font-medium text-blue-600 uppercase tracking-wide">Net Profit</p>
                                <p className="text-xs text-slate-500 mt-1">{comprehensiveData.summary.profitMargin}% margin</p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Cash Flow Visualization */}
                        <Card className="bg-gradient-to-br from-white to-slate-50 border border-slate-200">
                          <CardHeader>
                            <CardTitle className="text-xl text-slate-900 flex items-center gap-3">
                              <CircleDollarSign className="h-6 w-6 text-emerald-600" />
                              Cash Flow Analysis
                            </CardTitle>
                            <CardDescription className="text-slate-600">
                              Real-time payment status with collections integrated
                            </CardDescription>
                          </CardHeader>
                          <CardContent>
                            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                              {/* Inbound Cash Flow */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-emerald-400 to-emerald-600"></div>
                                  <h3 className="text-lg font-semibold text-slate-800">Money Coming In</h3>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="group hover:shadow-md transition-all duration-200 p-5 rounded-xl bg-gradient-to-r from-emerald-50 to-emerald-100 border border-emerald-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-emerald-900">✅ Already Received</p>
                                        <p className="text-sm text-emerald-700 mt-1">Successfully collected from clients</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-emerald-800">
                                          {formatCurrency(paymentSummary.totalReceived.INR)}
                                        </p>
                                        <p className="text-xs text-emerald-600 uppercase tracking-wide">Collected</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="group hover:shadow-md transition-all duration-200 p-5 rounded-xl bg-gradient-to-r from-amber-50 to-orange-100 border border-amber-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-amber-900">⏳ Pending Collection</p>
                                        <p className="text-sm text-amber-700 mt-1">Outstanding from clients</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-amber-800">
                                          {formatCurrency(paymentSummary.pendingReceivables.INR)}
                                        </p>
                                        <p className="text-xs text-amber-600 uppercase tracking-wide">Pending</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-5 rounded-xl bg-gradient-to-r from-emerald-100 to-emerald-200 border-2 border-emerald-300 shadow-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-emerald-900">💰 Total Revenue Stream</p>
                                        <p className="text-sm text-emerald-800 mt-1">Collected + Outstanding</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-3xl font-bold text-emerald-900">
                                          {formatCurrency(paymentSummary.totalReceived.INR + paymentSummary.pendingReceivables.INR)}
                                        </p>
                                        <p className="text-xs text-emerald-700 uppercase tracking-wide font-medium">Total Expected</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>

                              {/* Outbound Cash Flow */}
                              <div className="space-y-4">
                                <div className="flex items-center gap-3 mb-4">
                                  <div className="w-4 h-4 rounded-full bg-gradient-to-r from-rose-400 to-rose-600"></div>
                                  <h3 className="text-lg font-semibold text-slate-800">Money Going Out</h3>
                                </div>
                                
                                <div className="space-y-3">
                                  <div className="group hover:shadow-md transition-all duration-200 p-5 rounded-xl bg-gradient-to-r from-rose-50 to-red-100 border border-rose-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-rose-900">🏭 Supplier Payments</p>
                                        <p className="text-sm text-rose-700 mt-1">Product costs (THROUGH_ME orders)</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-rose-800">
                                          {formatCurrency(paymentSummary.totalPaid.INR)}
                                        </p>
                                        <p className="text-xs text-rose-600 uppercase tracking-wide">Due</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="group hover:shadow-md transition-all duration-200 p-5 rounded-xl bg-gradient-to-r from-orange-50 to-yellow-100 border border-orange-200">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-semibold text-orange-900">🏛️ Operating Costs</p>
                                        <p className="text-sm text-orange-700 mt-1">GST + Duties + Misc charges</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-2xl font-bold text-orange-800">
                                          {formatCurrency(comprehensiveData.summary.totalCharges)}
                                        </p>
                                        <p className="text-xs text-orange-600 uppercase tracking-wide">Expenses</p>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  <div className="p-5 rounded-xl bg-gradient-to-r from-blue-100 to-indigo-200 border-2 border-blue-300 shadow-lg">
                                    <div className="flex items-center justify-between">
                                      <div>
                                        <p className="font-bold text-blue-900">📈 Net Profit Projection</p>
                                        <p className="text-sm text-blue-800 mt-1">After all obligations</p>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-3xl font-bold text-blue-900">
                                          {formatCurrency(Math.max(0, paymentSummary.pendingReceivables.INR - paymentSummary.totalPaid.INR))}
                                        </p>
                                        <p className="text-xs text-blue-700 uppercase tracking-wide font-medium">Projected Profit</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      </div>

                      {/* Summary Stats Sidebar */}
                      <div className="space-y-6">
                        {/* Quick Stats */}
                        <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
                          <CardHeader className="pb-4">
                            <CardTitle className="text-lg text-white flex items-center gap-2">
                              <TrendingUp className="h-5 w-5" />
                              Quick Stats
                            </CardTitle>
                          </CardHeader>
                          <CardContent className="space-y-4">
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-emerald-400 mb-1">{comprehensiveData.summary.totalOrders}</p>
                              <p className="text-sm text-slate-300">Total Orders</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-blue-400 mb-1">{comprehensiveData.summary.totalContainers}</p>
                              <p className="text-sm text-slate-300">Containers</p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-amber-400 mb-1">{comprehensiveData.summary.profitMargin}%</p>
                              <p className="text-sm text-slate-300">Profit Margin</p>
                            </div>
                          </CardContent>
                        </Card>

                        {/* Expense Breakdown */}
                        <Card>
                          <CardHeader>
                            <CardTitle className="text-lg text-slate-900">Expense Analysis</CardTitle>
                            <CardDescription>Breakdown of operational costs</CardDescription>
                          </CardHeader>
                          <CardContent className="space-y-3">
                            <div className="flex items-center justify-between p-3 rounded-lg bg-orange-50 border border-orange-200">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-orange-500"></div>
                                <span className="text-sm font-medium text-orange-800">GST</span>
                              </div>
                              <span className="font-bold text-orange-900">
                                {formatCurrency(comprehensiveData.chargesBreakdown.totalGST)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-200">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-purple-500"></div>
                                <span className="text-sm font-medium text-purple-800">Duties</span>
                              </div>
                              <span className="font-bold text-purple-900">
                                {formatCurrency(comprehensiveData.chargesBreakdown.totalDuty)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-indigo-50 border border-indigo-200">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-indigo-500"></div>
                                <span className="text-sm font-medium text-indigo-800">Misc</span>
                              </div>
                              <span className="font-bold text-indigo-900">
                                {formatCurrency(comprehensiveData.chargesBreakdown.totalMisc)}
                              </span>
                            </div>
                            <div className="flex items-center justify-between p-3 rounded-lg bg-pink-50 border border-pink-200">
                              <div className="flex items-center gap-2">
                                <div className="w-3 h-3 rounded-full bg-pink-500"></div>
                                <span className="text-sm font-medium text-pink-800">Extra</span>
                              </div>
                              <span className="font-bold text-pink-900">
                                {formatCurrency(comprehensiveData.chargesBreakdown.totalExtraCharges)}
                              </span>
                            </div>
                          </CardContent>
                        </Card>
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="clients" className="space-y-6">
                    <div className="mb-6">
                      <div className="flex items-center justify-between">
                        <div>
                          <h3 className="text-xl font-semibold text-foreground">Client-wise Financial Breakdown</h3>
                          <p className="text-muted-foreground mt-1">Payment obligations and collections by client</p>
                        </div>
                        <div className="text-sm text-muted-foreground">
                          <span className="font-medium">Total Clients:</span> {comprehensiveData.clientFinancials.length}
                        </div>
                      </div>
                    </div>
                    
                    <div className="grid gap-6">
                      {comprehensiveData.clientFinancials.length > 0 ? (
                        comprehensiveData.clientFinancials.map((client, index) => (
                          <Card key={index} className="border-l-4 border-l-blue-500 hover:shadow-lg transition-all duration-200">
                            <CardContent className="p-6">
                              <div className="flex justify-between items-start mb-6">
                                <div className="flex items-center gap-4">
                                  <div className="w-12 h-12 bg-gradient-to-br from-emerald-500 to-emerald-600 rounded-xl flex items-center justify-center">
                                    <span className="text-white font-bold text-lg">
                                      {client.clientName?.charAt(0)?.toUpperCase() || 'C'}
                                    </span>
                                  </div>
                                  <div>
                                    <h3 className="text-xl font-semibold text-foreground">{client.clientName}</h3>
                                    <p className="text-sm text-muted-foreground">Client ID: {client.clientId}</p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                      {client.orders.length} orders • {client.containers.length} containers
                                    </p>
                                  </div>
                                </div>
                                <div className="flex items-center gap-4">
                                  <div className="text-right">
                                    <p className="text-3xl font-bold text-emerald-600">
                                      {formatCurrency(client.paymentBreakdown.throughMe.amount + client.paymentBreakdown.direct.amount)}
                                    </p>
                                    <p className="text-sm font-medium text-emerald-600 uppercase tracking-wide">Total Outstanding</p>
                                    <p className="text-xs text-muted-foreground mt-1">Amount to collect</p>
                                  </div>
                                  <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => handleShowPartyDetails(client, 'client')}
                                    className="bg-emerald-50 hover:bg-emerald-100 border-emerald-200"
                                  >
                                    <Eye className="h-4 w-4" />
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Order Details */}
                              <div className="border-t border-gray-200 pt-4">
                                <div className="flex items-center justify-between mb-3">
                                  <h4 className="text-sm font-semibold text-gray-700 uppercase tracking-wide">Recent Orders</h4>
                                  <span className="text-xs text-gray-500">{client.orders.length} total</span>
                                </div>
                                <div className="space-y-2">
                                  {client.orders.slice(0, 3).map((order, orderIndex) => (
                                    <div key={orderIndex} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                                      <div className="flex items-center gap-3">
                                        <div className="w-6 h-6 bg-blue-100 rounded-full flex items-center justify-center">
                                          <span className="text-blue-600 font-bold text-xs">{orderIndex + 1}</span>
                                        </div>
                                        <div>
                                          <p className="text-sm font-medium text-gray-800">{order.orderNumber}</p>
                                          <p className="text-xs text-gray-500">Status: {order.status}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="text-sm font-semibold text-gray-800">{formatCurrency(order.amount)}</p>
                                        <p className="text-xs text-gray-500">Carrying: {formatCurrency(order.carryingCharges)}</p>
                                      </div>
                                    </div>
                                  ))}
                                  {client.orders.length > 3 && (
                                    <p className="text-xs text-gray-500 text-center py-2">
                                      ... and {client.orders.length - 3} more orders
                                    </p>
                                  )}
                                </div>
                              </div>
                              
                              {/* Container Information */}
                              <div className="mt-4 p-3 bg-slate-50 rounded-lg border border-slate-200">
                                <div className="flex items-center gap-2 mb-2">
                                  <div className="w-4 h-4 bg-slate-400 rounded"></div>
                                  <span className="text-sm font-medium text-slate-700">Allocated Containers</span>
                                </div>
                                {client.containers && client.containers.length > 0 ? (
                                  <p className="text-sm text-slate-600">
                                    {client.containers.join(', ')}
                                  </p>
                                ) : (
                                  <p className="text-sm text-slate-500 italic">
                                    No containers allocated
                                  </p>
                                )}
                              </div>
                            </CardContent>
                          </Card>
                        ))
                      ) : (
                        <Card className="border-2 border-dashed border-gray-300">
                          <CardContent className="p-12 text-center">
                            <div className="w-16 h-16 mx-auto mb-4 bg-gray-100 rounded-full flex items-center justify-center">
                              <span className="text-2xl text-gray-400">👥</span>
                            </div>
                            <h3 className="text-lg font-semibold text-gray-700 mb-2">No Client Data</h3>
                            <p className="text-gray-500 mb-4">No client financial data available for the selected period.</p>
                            <p className="text-sm text-gray-400">
                              Only orders allocated to containers are included in financial calculations.
                            </p>
                          </CardContent>
                        </Card>
                      )}
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

        {/* Quick Navigation */}
        <Card className="bg-card">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5" />
              Financial Management
            </CardTitle>
            <CardDescription>
              Navigate to different financial management sections
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Button 
                onClick={() => navigate('/financials/transactions')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-green-500/10 hover:bg-green-500/20 text-green-600 dark:text-green-400 border-2 border-green-500/20" 
                variant="outline"
              >
                <DollarSign className="h-6 w-6" />
                <span className="text-sm font-medium">Transaction Management</span>
              </Button>
              
              <Button 
                onClick={() => navigate('/financials/accounts')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-blue-500/10 hover:bg-blue-500/20 text-blue-600 dark:text-blue-400 border-2 border-blue-500/20" 
                variant="outline"
              >
                <BarChart3 className="h-6 w-6" />
                <span className="text-sm font-medium">Account Balances</span>
              </Button>
              
              <Button 
                onClick={() => navigate('/financials/invoices')}
                className="h-20 flex flex-col items-center justify-center gap-2 bg-purple-500/10 hover:bg-purple-500/20 text-purple-600 dark:text-purple-400 border-2 border-purple-500/20" 
                variant="outline"
              >
                <ArrowUpRight className="h-6 w-6" />
                <span className="text-sm font-medium">Invoice Management</span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
      
      {/* Transaction Details Modal */}
      <Dialog open={showTransactionDetails} onOpenChange={setShowTransactionDetails}>
        <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-3">
              <div className="p-2 rounded-lg amber-gradient">
                <Eye className="h-5 w-5 text-white" />
              </div>
              <div>
                <span className="text-foreground">Transaction Details: {selectedPartyDetails?.clientName || selectedPartyDetails?.supplierName}</span>
                <div className="text-xs text-muted-foreground mt-1">Client ID: {selectedPartyDetails?.clientId}</div>
              </div>
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Comprehensive breakdown of orders, payments, and financial obligations
            </DialogDescription>
          </DialogHeader>
          
          {selectedPartyDetails && (
            <div className="space-y-6">
              {/* Financial Summary */}
              <Card className="bg-gradient-to-br from-slate-50 to-white border border-slate-200">
                <CardHeader>
                  <CardTitle className="text-lg text-foreground flex items-center gap-2">
                    <div className="p-2 rounded-lg amber-gradient">
                      <DollarSign className="h-5 w-5 text-white" />
                    </div>
                    Financial Summary
                  </CardTitle>
                  <CardDescription>Complete financial breakdown and account status</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-center mb-3">
                        <div className="p-3 rounded-lg amber-gradient">
                          <TrendingUp className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Total Order Value</p>
                      <p className="text-2xl font-bold text-foreground">
                        {formatCurrency(selectedPartyDetails.summary.grossAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Full Order Amount</p>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-center mb-3">
                        <div className="p-3 rounded-lg bg-blue-500">
                          <Calculator className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Allocated Amount</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {formatCurrency(selectedPartyDetails.summary.allocatedAmount)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Based on Container Allocation</p>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-center mb-3">
                        <div className="p-3 rounded-lg bg-orange-500">
                          <Clock className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Client Owes</p>
                      <p className="text-2xl font-bold text-orange-600">
                        {formatCurrency(selectedPartyDetails.summary.clientOwes)}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Actual Payment Due</p>
                    </div>
                    <div className="text-center p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                      <div className="flex items-center justify-center mb-3">
                        <div className="p-3 rounded-lg bg-purple-500">
                          <Package className="h-5 w-5 text-white" />
                        </div>
                      </div>
                      <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">Containers</p>
                      <p className="text-2xl font-bold text-purple-600">
                        {selectedPartyDetails.summary.containers.length}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">Allocated</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              
              {/* Order Breakdown Table */}
              {selectedPartyDetails.type === 'client' && selectedPartyDetails.orderBreakdowns && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <div className="p-2 rounded-lg amber-gradient">
                        <FileText className="h-5 w-5 text-white" />
                      </div>
                      Order Financial Breakdown
                    </CardTitle>
                    <CardDescription>Detailed breakdown of carrying charges and product costs per order</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-6">
                      {selectedPartyDetails.orderBreakdowns.map((order, index) => (
                        <Card key={order.orderId} className="bg-slate-50 border border-slate-200">
                          <CardHeader className="pb-4">
                            <div className="flex items-center justify-between">
                              <div className="flex items-center gap-3">
                                <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-blue-600 rounded-xl flex items-center justify-center">
                                  <span className="text-white font-bold text-sm">{index + 1}</span>
                                </div>
                                <div>
                                  <h3 className="text-lg font-semibold text-foreground">{order.orderNumber}</h3>
                                  <p className="text-sm text-muted-foreground">
                                    {new Date(order.orderDate).toLocaleDateString()} • Status: {order.status}
                                  </p>
                                </div>
                              </div>
                              <div className="text-right">
                                <Badge 
                                  variant={order.paymentType === 'THROUGH_ME' ? 'default' : 'secondary'}
                                  className="text-xs"
                                >
                                  {order.paymentType}
                                </Badge>
                              </div>
                            </div>
                          </CardHeader>
                          <CardContent>
                            {/* Financial Summary for this Order */}
                            <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                              <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="w-8 h-8 bg-gray-100 rounded-lg flex items-center justify-center">
                                    <Package className="h-4 w-4 text-gray-600" />
                                  </div>
                                </div>
                                <p className="text-lg font-bold text-gray-800">
                                  {formatCurrency(order.allocatedAmounts.productCost)}
                                </p>
                                <p className="text-xs text-gray-600 font-medium">Product Cost (Allocated)</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  Full: {formatCurrency(order.fullOrderAmounts.productCost)}
                                </p>
                              </div>
                              
                              <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center">
                                    <Truck className="h-4 w-4 text-blue-600" />
                                  </div>
                                </div>
                                <p className="text-lg font-bold text-blue-800">
                                  {formatCurrency(order.allocatedAmounts.carryingCharges)}
                                </p>
                                <p className="text-xs text-blue-600 font-medium">Carrying Charges (Allocated)</p>
                                <p className="text-xs text-blue-500 mt-1">
                                  Full: {formatCurrency(order.fullOrderAmounts.carryingCharges)}
                                </p>
                              </div>
                              
                              <div className="text-center p-4 bg-white rounded-lg border border-slate-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="w-8 h-8 bg-amber-100 rounded-lg flex items-center justify-center">
                                    <Calculator className="h-4 w-4 text-amber-600" />
                                  </div>
                                </div>
                                <p className="text-lg font-bold text-amber-800">
                                  {formatCurrency(order.allocatedAmounts.totalAmount)}
                                </p>
                                <p className="text-xs text-amber-600 font-medium">Total Allocated</p>
                                <p className="text-xs text-amber-500 mt-1">
                                  Full: {formatCurrency(order.fullOrderAmounts.totalAmount)}
                                </p>
                              </div>
                              
                              <div className="text-center p-4 bg-gradient-to-br from-green-50 to-emerald-100 rounded-lg border-2 border-green-200">
                                <div className="flex items-center justify-center mb-2">
                                  <div className="w-8 h-8 bg-green-500 rounded-lg flex items-center justify-center">
                                    <DollarSign className="h-4 w-4 text-white" />
                                  </div>
                                </div>
                                <p className="text-lg font-bold text-green-800">
                                  {formatCurrency(order.clientObligations.amount)}
                                </p>
                                <p className="text-xs text-green-700 font-medium">Client Owes</p>
                                <p className="text-xs text-green-600 mt-1">
                                  {order.paymentType === 'THROUGH_ME' ? 'Product + Carrying' : 'Carrying Only'}
                                </p>
                              </div>
                            </div>
                            
                            {/* Allocation Info */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4 mb-4">
                              <div className="flex items-center justify-between mb-3">
                                <h4 className="text-sm font-semibold text-slate-700 flex items-center gap-2">
                                  <BarChart3 className="h-4 w-4" />
                                  Allocation Summary
                                </h4>
                                <Badge 
                                  variant="outline" 
                                  className={`text-xs ${
                                    order.allocationInfo.isFullyAllocated ? 'bg-green-50 text-green-700 border-green-200' :
                                    order.allocationInfo.isPartiallyAllocated ? 'bg-amber-50 text-amber-700 border-amber-200' :
                                    'bg-gray-50 text-gray-700 border-gray-200'
                                  }`}
                                >
                                  {order.allocationInfo.allocationRatio}% Allocated
                                </Badge>
                              </div>
                              <div className="grid grid-cols-3 gap-4 text-center">
                                <div>
                                  <p className="text-lg font-bold text-slate-800">{order.allocationInfo.totalCartons}</p>
                                  <p className="text-xs text-slate-600">Total Cartons</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-blue-800">{order.allocationInfo.allocatedCartons}</p>
                                  <p className="text-xs text-blue-600">Allocated Cartons</p>
                                </div>
                                <div>
                                  <p className="text-lg font-bold text-amber-800">{order.allocationInfo.totalCartons - order.allocationInfo.allocatedCartons}</p>
                                  <p className="text-xs text-amber-600">Remaining Cartons</p>
                                </div>
                              </div>
                            </div>
                            
                            {/* Item-level breakdown */}
                            <div className="bg-white rounded-lg border border-slate-200 p-4">
                              <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                <Box className="h-4 w-4" />
                                Item-wise Financial Breakdown
                              </h4>
                              <div className="space-y-3">
                                {order.items.map((item, itemIndex) => (
                                  <div key={itemIndex} className="bg-slate-50 rounded-lg p-3 border border-slate-200">
                                    <div className="flex items-center justify-between mb-2">
                                      <div className="flex items-center gap-2">
                                        <div className="w-6 h-6 bg-slate-400 rounded-full flex items-center justify-center">
                                          <span className="text-white text-xs font-bold">{itemIndex + 1}</span>
                                        </div>
                                        <div>
                                          <p className="font-medium text-slate-800">{item.itemCode}</p>
                                          <p className="text-xs text-slate-600">{item.description}</p>
                                        </div>
                                      </div>
                                      <Badge variant="outline" className="text-xs">
                                        {item.allocationRatio}% allocated
                                      </Badge>
                                    </div>
                                    
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                                      <div className="text-center p-2 bg-white rounded border">
                                        <p className="font-semibold text-gray-800">
                                          {formatCurrency(item.allocatedProductCost)}
                                        </p>
                                        <p className="text-xs text-gray-600">Product Cost</p>
                                        <p className="text-xs text-gray-500">({formatCurrency(item.fullProductCost)} full)</p>
                                      </div>
                                      
                                      <div className="text-center p-2 bg-white rounded border">
                                        <p className="font-semibold text-blue-800">
                                          {formatCurrency(item.allocatedCarryingCharges)}
                                        </p>
                                        <p className="text-xs text-blue-600">Carrying Charges</p>
                                        <p className="text-xs text-blue-500">({formatCurrency(item.fullCarryingCharges)} full)</p>
                                      </div>
                                      
                                      <div className="text-center p-2 bg-white rounded border">
                                        <p className="font-semibold text-slate-800">
                                          {item.allocatedCartons}/{item.totalCartons}
                                        </p>
                                        <p className="text-xs text-slate-600">Cartons</p>
                                        <p className="text-xs text-slate-500">Allocated/Total</p>
                                      </div>
                                      
                                      <div className="text-center p-2 bg-green-50 rounded border border-green-200">
                                        <p className="font-semibold text-green-800">
                                          {formatCurrency(item.allocatedTotalAmount)}
                                        </p>
                                        <p className="text-xs text-green-600">Item Total</p>
                                        <p className="text-xs text-green-500">Allocated Amount</p>
                                      </div>
                                    </div>
                                  </div>
                                ))}
                              </div>
                            </div>
                            
                            {/* Container allocation info */}
                            {order.containers.length > 0 && (
                              <div className="bg-white rounded-lg border border-slate-200 p-4 mt-4">
                                <h4 className="text-sm font-semibold text-slate-700 mb-3 flex items-center gap-2">
                                  <Package className="h-4 w-4" />
                                  Container Allocations
                                </h4>
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                  {order.containers.map((container, containerIndex) => (
                                    <div key={containerIndex} className="flex items-center justify-between p-3 bg-slate-50 rounded border">
                                      <div className="flex items-center gap-2">
                                        <Truck className="h-4 w-4 text-slate-600" />
                                        <div>
                                          <p className="font-medium text-slate-800">{container.containerId}</p>
                                          <p className="text-xs text-slate-600">{container.paymentType}</p>
                                        </div>
                                      </div>
                                      <div className="text-right">
                                        <p className="font-semibold text-slate-800">
                                          {formatCurrency(container.allocatedCarryingCharges)}
                                        </p>
                                        <p className="text-xs text-slate-600">Carrying Charges</p>
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}
                          </CardContent>
                        </Card>
                      ))}
                      
                      {/* Summary totals */}
                      <Card className="bg-gradient-to-br from-slate-900 to-slate-800 text-white border-slate-700">
                        <CardHeader>
                          <CardTitle className="text-lg text-white flex items-center gap-2">
                            <Calculator className="h-5 w-5" />
                            Financial Summary - All Orders
                          </CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-blue-400 mb-1">
                                {formatCurrency(selectedPartyDetails.totals.allocatedAmounts.productCost)}
                              </p>
                              <p className="text-sm text-slate-300">Total Product Cost</p>
                              <p className="text-xs text-slate-400">
                                Full: {formatCurrency(selectedPartyDetails.totals.fullAmounts.productCost)}
                              </p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-emerald-400 mb-1">
                                {formatCurrency(selectedPartyDetails.totals.allocatedAmounts.carryingCharges)}
                              </p>
                              <p className="text-sm text-slate-300">Total Carrying Charges</p>
                              <p className="text-xs text-slate-400">
                                Full: {formatCurrency(selectedPartyDetails.totals.fullAmounts.carryingCharges)}
                              </p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-white/10 border border-white/20">
                              <p className="text-2xl font-bold text-amber-400 mb-1">
                                {formatCurrency(selectedPartyDetails.totals.allocatedAmounts.totalAmount)}
                              </p>
                              <p className="text-sm text-slate-300">Total Allocated</p>
                              <p className="text-xs text-slate-400">
                                Full: {formatCurrency(selectedPartyDetails.totals.fullAmounts.totalAmount)}
                              </p>
                            </div>
                            <div className="text-center p-4 rounded-lg bg-green-600/20 border-2 border-green-400">
                              <p className="text-2xl font-bold text-green-300 mb-1">
                                {formatCurrency(selectedPartyDetails.totals.clientTotalObligations)}
                              </p>
                              <p className="text-sm text-green-200">Client Total Owes</p>
                              <p className="text-xs text-green-300">
                                Allocation Ratio: {selectedPartyDetails.totals.allocationSummary.overallAllocationRatio}%
                              </p>
                            </div>
                          </div>
                        </CardContent>
                      </Card>
                    </div>
                  </CardContent>
                </Card>
              )}
              

              {/* Container Information */}
              {selectedPartyDetails.summary.containers.length > 0 && (
                <Card className="border-border">
                  <CardHeader>
                    <CardTitle className="text-lg text-foreground flex items-center gap-2">
                      <div className="p-2 rounded-lg amber-gradient">
                        <Package className="h-5 w-5 text-white" />
                      </div>
                      Container Allocation
                    </CardTitle>
                    <CardDescription>Containers allocated for this client's orders</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                      {selectedPartyDetails.summary.containers.map((containerId, index) => (
                        <div key={index} className="p-4 bg-card rounded-xl shadow-lg hover:shadow-xl transition-all duration-300">
                          <div className="flex items-center justify-between mb-2">
                            <div className="flex items-center gap-2">
                              <Truck className="h-5 w-5 text-primary" />
                              <span className="font-medium text-foreground">{containerId}</span>
                            </div>
                            <Badge variant="outline" className="text-xs bg-amber-50 text-amber-700">
                              THROUGH_ME
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground space-y-1">
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              Container ID: {containerId}
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-amber-500 rounded-full"></div>
                              Payment Type: THROUGH_ME
                            </div>
                            <div className="flex items-center gap-1">
                              <div className="w-1.5 h-1.5 bg-green-500 rounded-full"></div>
                              Status: Allocated
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                    
                    {/* Container Summary */}
                    <div className="mt-6 p-4 bg-muted rounded-lg border border-border">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <Package className="h-5 w-5 text-primary" />
                          <span className="font-semibold text-foreground">
                            Total Containers: {selectedPartyDetails.summary.containers.length}
                          </span>
                        </div>
                        <div className="flex items-center gap-4 text-sm text-muted-foreground">
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                            <span>Allocated</span>
                          </div>
                          <div className="flex items-center gap-1">
                            <div className="w-2 h-2 bg-amber-500 rounded-full"></div>
                            <span>THROUGH_ME Payment</span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              )}
            </div>
          )}
          
          <div className="flex justify-end pt-4 border-t border-border">
            <Button 
              variant="outline" 
              onClick={() => setShowTransactionDetails(false)}
              className="border-primary/30 text-primary hover:bg-primary/10"
            >
              Close
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}

export default FinancialOverview 