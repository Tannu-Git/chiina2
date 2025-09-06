import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { useParams, useNavigate } from 'react-router-dom'
import {
  ArrowLeft,
  Save,
  Trash2,
  RefreshCw,
  Container as ContainerIcon,
  AlertTriangle,
  CheckCircle,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Package,
  Ship,
  TrendingUp,
  Eye,
  Edit3,
  X,
  FileText,
  Settings,
  Plus,
  Minus,
  Search,
  Filter,
  Zap,
  Copy,
  BarChart3,
  Target,
  Layers,
  Clock,
  CheckSquare,
  Calculator,
  Truck
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Separator } from '@/components/ui/separator'
import { Alert, AlertDescription } from '@/components/ui/alert'
import { useAuthStore } from '@/stores/authStore'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const ContainerEdit = () => {
  const { id } = useParams()
  const navigate = useNavigate()
  const { user, isAuthenticated, token } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [deleting, setDeleting] = useState(false)
  const [container, setContainer] = useState(null)
  const [showDeleteDialog, setShowDeleteDialog] = useState(false)
  const [deleteConfirmText, setDeleteConfirmText] = useState('')  
  
  // Order allocation states - Enhanced for item-level selection
  const [showOrderSearch, setShowOrderSearch] = useState(false)
  const [availableOrders, setAvailableOrders] = useState([])
  const [searchingOrders, setSearchingOrders] = useState(false)
  const [orderSearchTerm, setOrderSearchTerm] = useState('')
  const [selectedOrderItems, setSelectedOrderItems] = useState({}) // Item-level selection like warehouse allocation
  const [loadingOrders, setLoadingOrders] = useState(false)
  
  // Utilization stats for real-time capacity tracking
  const [utilizationStats, setUtilizationStats] = useState({
    usedCbm: 0,
    usedWeight: 0,
    remainingCbm: 0,
    utilizationPercent: 0
  })
  
  // Auto-fill and template states
  const [showTemplateDialog, setShowTemplateDialog] = useState(false)
  const [containerTemplates, setContainerTemplates] = useState([])
  const [chargeTemplates, setChargeTemplates] = useState([])
  const [showChargeTemplates, setShowChargeTemplates] = useState(false)
  
  // Optimization states
  const [showOptimization, setShowOptimization] = useState(false)
  const [optimizationSuggestions, setOptimizationSuggestions] = useState(null)
  const [calculating, setCalculating] = useState(false)
  
  // Transport companies state
  const [transportCompanies, setTransportCompanies] = useState([])
  const [loadingTransportCompanies, setLoadingTransportCompanies] = useState(false)

  // Form data state
  const [formData, setFormData] = useState({
    realContainerId: '',
    billNo: '',
    sealNo: '',
    status: 'planning',
    type: '20ft',
    location: { current: '' },
    estimatedArrival: '',
    baseCharges: {
      gst: 0,
      duty: 0,
      misc: 0,
      extraCharge: 0
    },
    notes: ''
  })

  // Container status options
  const statusOptions = [
    { value: 'planning', label: 'Planning' },
    { value: 'loading', label: 'Loading' },
    { value: 'shipped', label: 'Shipped' },
    { value: 'delivered', label: 'Delivered' }
  ]

  // Container type options
  const containerTypes = [
    { value: '20ft', label: '20-foot Container', capacity: '33 CBM, 28,000 kg' },
    { value: '40ft', label: '40-foot Container', capacity: '67 CBM, 30,000 kg' },
    { value: '40ft_hc', label: '40-foot High Cube', capacity: '76 CBM, 30,000 kg' },
    { value: '45ft', label: '45-foot Container', capacity: '86 CBM, 30,000 kg' }
  ]

  // Set up axios defaults
  useEffect(() => {
    if (token) {
      axios.defaults.headers.common['Authorization'] = `Bearer ${token}`
    }
  }, [token])
  // Enhanced utilization calculation with real-time updates
  useEffect(() => {
    if (container?.maxCbm && selectedOrderItems) {
      calculateUtilizationStats()
    }
  }, [selectedOrderItems, container?.maxCbm])

  const calculateUtilizationStats = () => {
    const totalCbm = Object.values(selectedOrderItems).reduce((sum, sel) => {
      const cbm = parseFloat(sel.cbm) || 0
      return sum + cbm
    }, 0)
    
    const totalWeight = Object.values(selectedOrderItems).reduce((sum, sel) => {
      const weight = parseFloat(sel.weight) || 0
      return sum + weight
    }, 0)
    
    const maxCbm = parseFloat(container?.maxCbm) || 0
    const maxWeight = parseFloat(container?.maxWeight) || 0
    
    const utilizationPercent = maxCbm > 0 ? (totalCbm / maxCbm) * 100 : 0
    
    setUtilizationStats({
      usedCbm: totalCbm,
      usedWeight: totalWeight,
      remainingCbm: maxCbm - totalCbm,
      utilizationPercent
    })
  }

  // Item-level selection handler (like warehouse allocation)
  const updateItemSelection = (orderId, itemId, quantity) => {
    const order = availableOrders.find(o => o._id === orderId)
    const item = order?.items?.find(i => i._id === itemId)
    
    if (!item) {
      console.error('Item not found:', { orderId, itemId })
      return
    }
    
    const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
    const validQuantity = Math.max(0, Math.min(quantity, maxAvailable))
    
    setSelectedOrderItems(prev => {
      const key = `${orderId}_${itemId}`
      const newSelection = { ...prev }
      
      if (validQuantity > 0) {
        const cbmPerCarton = item.unitCbm || 0
        const weightPerCarton = item.unitWeight || 0
        const carryingChargePerCarton = item.carryingCharge?.rate || 0
        
        newSelection[key] = {
          orderId,
          itemId,
          quantity: validQuantity,
          cbm: validQuantity * cbmPerCarton,
          weight: validQuantity * weightPerCarton,
          charges: validQuantity * carryingChargePerCarton,
          item: {
            ...item,
            orderNumber: order.orderNumber,
            clientName: order.clientName,
            cbmPerCarton,
            weightPerCarton,
            carryingChargePerCarton
          }
        }
      } else {
        delete newSelection[key]
      }
      
      return newSelection
    })
  }

  // Auto-fill optimization (like warehouse allocation)
  const autoFillBestItems = () => {
    console.log('🚀 Auto-fill starting...')
    
    const maxCbm = parseFloat(container?.maxCbm || 0)
    const maxWeight = parseFloat(container?.maxWeight || 0)
    
    if (!maxCbm || !maxWeight) {
      toast.error('Container capacity not configured properly')
      return
    }
    
    // Clear current selection
    setSelectedOrderItems({})
    
    // Create list of all available items
    const allItems = []
    availableOrders.forEach(order => {
      order.items?.forEach(item => {
        const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
        const cbmPerCarton = item.unitCbm || 0
        const weightPerCarton = item.unitWeight || 0
        const chargePerCarton = item.carryingCharge?.rate || 0
        
        if (maxAvailable > 0 && cbmPerCarton > 0) {
          allItems.push({
            orderId: order._id,
            itemId: item._id,
            maxAvailable,
            cbmPerCarton,
            weightPerCarton,
            chargePerCarton,
            efficiency: chargePerCarton / cbmPerCarton, // profit per CBM
            order,
            item
          })
        }
      })
    })
    
    if (allItems.length === 0) {
      toast.error('No items available for auto-fill')
      return
    }
    
    // Sort by efficiency (profit per CBM)
    allItems.sort((a, b) => b.efficiency - a.efficiency)
    
    // Fill container with best items
    let usedCbm = 0
    let usedWeight = 0
    const newSelection = {}
    let itemsAdded = 0
    
    allItems.forEach(itemData => {
      if (usedCbm >= maxCbm * 0.99) return // Container nearly full
      
      let canFit = itemData.maxAvailable
      
      // Check CBM constraint
      const remainingCbm = maxCbm - usedCbm
      if (itemData.cbmPerCarton > 0) {
        canFit = Math.min(canFit, Math.floor(remainingCbm / itemData.cbmPerCarton))
      }
      
      // Check weight constraint
      if (itemData.weightPerCarton > 0) {
        const remainingWeight = maxWeight - usedWeight
        canFit = Math.min(canFit, Math.floor(remainingWeight / itemData.weightPerCarton))
      }
      
      if (canFit > 0) {
        const key = `${itemData.orderId}_${itemData.itemId}`
        newSelection[key] = {
          orderId: itemData.orderId,
          itemId: itemData.itemId,
          quantity: canFit,
          cbm: canFit * itemData.cbmPerCarton,
          weight: canFit * itemData.weightPerCarton,
          charges: canFit * itemData.chargePerCarton,
          item: {
            ...itemData.item,
            orderNumber: itemData.order.orderNumber,
            clientName: itemData.order.clientName,
            cbmPerCarton: itemData.cbmPerCarton,
            weightPerCarton: itemData.weightPerCarton,
            carryingChargePerCarton: itemData.chargePerCarton
          }
        }
        
        usedCbm += canFit * itemData.cbmPerCarton
        usedWeight += canFit * itemData.weightPerCarton
        itemsAdded++
      }
    })
    
    setSelectedOrderItems(newSelection)
    
    const utilization = maxCbm > 0 ? (usedCbm / maxCbm * 100).toFixed(1) : '0'
    toast.success(`Auto-fill complete! ${itemsAdded} items selected, ${utilization}% utilization`)
  }

  // Apply selected items to container with backend validation
  const applySelectedItemsToContainer = async () => {
    if (Object.keys(selectedOrderItems).length === 0) {
      toast.error('Please select at least one item before proceeding')
      return
    }
    
    if (utilizationStats.utilizationPercent > 100) {
      toast.error('Cannot allocate: Container over capacity!')
      return
    }
    
    try {
      setSaving(true)
      
      // Prepare allocation data with proper validation
      const allocationData = Object.values(selectedOrderItems)
        .filter(selection => selection.quantity > 0)
        .map(selection => ({
          orderId: selection.orderId,
          itemId: selection.itemId,
          allocatedCartons: selection.quantity,
          cbmShare: selection.cbm,
          weightShare: selection.weight,
          carryingCharges: selection.charges
        }))
      
      console.log('🚀 Applying selected items to container:', allocationData)
      
      // Backend validation and allocation
      const response = await axios.post('/api/warehouse/container-item-allocation', {
        containerId: id,
        allocations: allocationData,
        containerSpecs: {
          maxCbm: container?.maxCbm || 67,
          maxWeight: container?.maxWeight || 30000
        }
      })
      
      if (response.data.success) {
        // Update container with new allocations
        setContainer(response.data.container)
        
        // Show success with details
        const itemCount = Object.keys(selectedOrderItems).length
        const totalCbm = Object.values(selectedOrderItems).reduce((sum, sel) => sum + (parseFloat(sel.cbm) || 0), 0)
        const utilization = ((totalCbm / (container?.maxCbm || 67)) * 100).toFixed(1)
        
        toast.success(`✅ Successfully allocated ${itemCount} items (${totalCbm.toFixed(1)} CBM, ${utilization}% utilization)`, {
          duration: 5000
        })
        
        setShowOrderSearch(false)
        setSelectedOrderItems({}) // Clear selection after allocation
      } else {
        toast.error('Failed to allocate items: ' + (response.data.message || 'Unknown error'))
      }
      
    } catch (error) {
      console.error('Error applying item allocations:', error)
      const errorMessage = error.response?.data?.message || 'Failed to allocate items to container'
      toast.error(errorMessage)
    } finally {
      setSaving(false)
    }
  }



  // Handle adding new order allocation (opens order search)
  const handleAddNewOrderAllocation = () => {
    setShowOrderSearch(true)
    if (availableOrders.length === 0) {
      fetchQCReadyOrders()
    }
  }

  // Fetch container details
  const fetchContainer = async () => {
    try {
      setLoading(true)
      console.log('📋 [CONTAINER EDIT] Fetching container:', id)
      
      if (!isAuthenticated || !token) {
        console.error('❌ [CONTAINER EDIT] Not authenticated')
        toast.error('Please log in to edit container')
        navigate('/login')
        return
      }
      
      const response = await axios.get(`/api/containers/${id}`)
      const containerData = response.data
      
      console.log('📋 [CONTAINER EDIT] Container data:', containerData)
      
      // Ensure all items have proper CBM, weight, and value data
      if (containerData.orders && containerData.orders.length > 0) {
        containerData.orders = containerData.orders.map(orderAllocation => {
          if (orderAllocation.orderId && orderAllocation.orderId.items) {
            orderAllocation.orderId.items = orderAllocation.orderId.items.map(item => ({
              ...item,
              // Ensure all fields have proper fallback values
              quantity: item.quantity || 0,
              cartons: item.cartons || 0,
              // Map the correct field names from the order model
              cbm: item.cbm || (item.unitCbm && item.cartons ? item.unitCbm * item.cartons : 0),
              weight: item.weight || (item.unitWeight && item.cartons ? item.unitWeight * item.cartons : 0),
              // Preserve original unit values for calculations
              unitCbm: item.unitCbm || 0,
              unitWeight: item.unitWeight || 0,
              // Map carrying charges correctly
              carryingCharges: item.carryingCharges || item.carryingCharge?.amount || item.totalPrice || item.totalAmount || 0,
              // Add additional fields for better data handling
              itemCode: item.itemCode || item.code || 'N/A',
              description: item.description || item.name || 'No description'
            }))
            
            console.log('🔧 [ITEM DATA] Processed items for order:', {
              orderNumber: orderAllocation.orderId.orderNumber,
              itemCount: orderAllocation.orderId.items.length,
              itemsWithCBM: orderAllocation.orderId.items.filter(item => item.cbm > 0).length,
              totalCBM: orderAllocation.orderId.items.reduce((sum, item) => sum + (item.cbm || 0), 0).toFixed(2)
            })
          }
          return orderAllocation
        })
      }
      
      setContainer(containerData)
      
      // Auto-recalculate utilization on initial load
      if (containerData.orders && containerData.orders.length > 0) {
        recalculateContainerUtilization(containerData.orders)
      }
      
      // Populate form with container data
      setFormData({
        realContainerId: containerData.realContainerId || '',
        billNo: containerData.billNo || '',
        sealNo: containerData.sealNo || '',
        status: containerData.status || 'planning',
        type: containerData.type || '20ft',
        location: { current: containerData.location?.current || '' },
        estimatedArrival: containerData.estimatedArrival ? 
          new Date(containerData.estimatedArrival).toISOString().slice(0, 16) : '',
        baseCharges: {
          gst: containerData.baseCharges?.gst || 0,
          duty: containerData.baseCharges?.duty || 0,
          misc: containerData.baseCharges?.misc || 0,
          extraCharge: containerData.baseCharges?.extraCharge || 0
        },
        notes: containerData.notes || ''
      })
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Error fetching container:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else if (error.response?.status === 404) {
        toast.error('Container not found')
        navigate('/containers')
      } else if (error.response?.status === 403) {
        toast.error('Access denied')
        navigate('/containers')
      } else {
        toast.error('Failed to load container details')
      }
    } finally {
      setLoading(false)
    }
  }

  // Fetch QC-ready orders for allocation
  const fetchQCReadyOrders = async () => {
    try {
      setSearchingOrders(true)
      console.log('🔍 [CONTAINER EDIT] Fetching QC-ready orders')
      
      const response = await axios.get('/api/warehouse/qc-ready-orders?includePartial=true')
      const orders = response.data.orders || []
      
      console.log('📦 [CONTAINER EDIT] Found QC-ready orders:', orders.length)
      
      // Filter out orders already allocated to this container
      const currentOrderIds = container?.orders?.map(o => o.orderId?._id || o.orderId) || []
      const availableOrders = orders.filter(order => !currentOrderIds.includes(order._id))
      
      setAvailableOrders(availableOrders)
      
      if (availableOrders.length === 0) {
        toast('No additional QC-ready orders available for allocation', {
          icon: 'ℹ️',
          duration: 3000
        })
      }
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Error fetching QC-ready orders:', error)
      toast.error('Failed to load available orders')
    } finally {
      setSearchingOrders(false)
    }
  }

  // Load container templates and charge presets
  const loadTemplates = async () => {
    try {
      // Load container templates (could be from API or local storage)
      const templates = [
        {
          id: 'template_1',
          name: '20ft Standard',
          type: '20ft',
          baseCharges: { gst: 5000, duty: 8000, misc: 2000, extraCharge: 1000 },
          description: 'Standard 20ft container charges'
        },
        {
          id: 'template_2', 
          name: '40ft Standard',
          type: '40ft',
          baseCharges: { gst: 8000, duty: 12000, misc: 3000, extraCharge: 2000 },
          description: 'Standard 40ft container charges'
        },
        {
          id: 'template_3',
          name: '40ft High Cube',
          type: '40ft_hc',
          baseCharges: { gst: 9000, duty: 14000, misc: 3500, extraCharge: 2500 },
          description: 'High cube container charges'
        }
      ]
      
      setContainerTemplates(templates)
      
      // Load charge templates for different clients/routes
      const chargePresets = [
        {
          id: 'preset_1',
          name: 'Mumbai Port Standard',
          charges: { gst: 18, duty: 15000, misc: 2500, extraCharge: 1000 },
          description: 'Standard charges for Mumbai port'
        },
        {
          id: 'preset_2',
          name: 'Chennai Port Express',
          charges: { gst: 18, duty: 17000, misc: 3000, extraCharge: 1500 },
          description: 'Express handling charges for Chennai'
        },
        {
          id: 'preset_3',
          name: 'Delhi Inland Container',
          charges: { gst: 18, duty: 12000, misc: 4000, extraCharge: 2000 },
          description: 'Inland container depot charges'
        }
      ]
      
      setChargeTemplates(chargePresets)
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Error loading templates:', error)
    }
  }

  // Fetch transport companies
  const fetchTransportCompanies = async () => {
    try {
      setLoadingTransportCompanies(true)
      console.log('🚛 [CONTAINER EDIT] Fetching transport companies')
      
      const response = await axios.get('/api/companies/transport?status=active&limit=50')
      const companies = response.data.companies || []
      
      console.log('🚛 [CONTAINER EDIT] Found transport companies:', companies.length)
      setTransportCompanies(companies)
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Error fetching transport companies:', error)
      toast.error('Failed to load transport companies')
    } finally {
      setLoadingTransportCompanies(false)
    }
  }

  // Handle transport company assignment
  const handleTransportCompanyUpdate = async (companyId) => {
    if (!companyId || companyId === 'none') {
      // Remove transport company assignment
      try {
        setSaving(true)
        const updatedContainer = { ...container }
        delete updatedContainer.shippingCompany
        
        const response = await axios.put(`/api/containers/${id}`, updatedContainer)
        setContainer(response.data)
        toast.success('Transport company removed successfully')
      } catch (error) {
        console.error('❌ [CONTAINER EDIT] Error removing transport company:', error)
        toast.error('Failed to remove transport company')
      } finally {
        setSaving(false)
      }
      return
    }
    
    try {
      setSaving(true)
      console.log('🚛 [CONTAINER EDIT] Assigning transport company:', companyId)
      
      // Use the dedicated endpoint for shipping company assignment
      const response = await axios.post(`/api/financials/assign-shipping-company/${id}`, {
        companyId: companyId
      })
      
      if (response.data.message) {
        // Refresh container data to get updated shipping company info
        await fetchContainer()
        toast.success('Transport company assigned successfully')
      }
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Error assigning transport company:', error)
      const errorMessage = error.response?.data?.message || 'Failed to assign transport company'
      
      // If no rates found, suggest user to update rates in companies management
      if (errorMessage.includes('No rate found')) {
        toast.error('No rates found for this container type. Please update company rates in Companies Management.')
      } else {
        toast.error(errorMessage)
      }
    } finally {
      setSaving(false)
    }
  }

  useEffect(() => {
    if (id) {
      fetchContainer()
      loadTemplates()
      fetchTransportCompanies()
    }
  }, [id])

  // Handle form input changes
  const handleInputChange = (field, value) => {
    if (field.includes('.')) {
      const [parent, child] = field.split('.')
      setFormData(prev => ({
        ...prev,
        [parent]: {
          ...prev[parent],
          [child]: value
        }
      }))
    } else {
      setFormData(prev => ({
        ...prev,
        [field]: value
      }))
    }
  }

  // Auto-populate missing item data based on realistic calculations
  const autoPopulateItemData = (orderIndex) => {
    setContainer(prev => {
      const updatedContainer = { ...prev }
      updatedContainer.orders = [...prev.orders]
      
      const order = { ...updatedContainer.orders[orderIndex] }
      order.orderId = { ...order.orderId }
      order.orderId.items = order.orderId.items.map(item => {
        // If item has zero or missing CBM/weight/value, auto-calculate using REAL order data
        if ((item.cbm === 0 || !item.cbm) && item.cartons > 0) {
          // Use REAL unitCbm and unitWeight from the original order
          const cbmPerCarton = (item.unitCbm || 0) > 0 ? (item.unitCbm || 0) : 0.1 // Fallback: 0.1 CBM per carton
          const weightPerCarton = (item.unitWeight || 0) > 0 ? (item.unitWeight || 0) : 15 // Fallback: 15 kg per carton
          
          // Calculate value from actual order carrying charges or total price
          let valuePerCarton = 500 // Default fallback
          if (item.carryingCharge?.amount > 0) {
            valuePerCarton = item.carryingCharge.amount / Math.max(item.cartons, 1)
          } else if (item.totalPrice > 0) {
            valuePerCarton = item.totalPrice / Math.max(item.cartons, 1)
          }
          
          console.log('🔧 [AUTO-POPULATE] Using REAL order data for item:', item.itemCode, {
            originalCbmPerCarton: item.unitCbm,
            originalWeightPerCarton: item.unitWeight,
            originalCarryingCharge: item.carryingCharge?.amount,
            originalTotalPrice: item.totalPrice,
            calculatedCbmPerCarton: cbmPerCarton,
            calculatedWeightPerCarton: weightPerCarton,
            calculatedValuePerCarton: valuePerCarton
          })
          
          return {
            ...item,
            cbm: parseFloat((item.cartons * cbmPerCarton).toFixed(3)),
            weight: parseFloat((item.cartons * weightPerCarton).toFixed(2)),
            carryingCharges: item.carryingCharge?.amount || item.carryingCharges || parseFloat((item.cartons * valuePerCarton).toFixed(0))
          }
        }
        return item
      })
      
      updatedContainer.orders[orderIndex] = order
      
      // Recalculate order totals after auto-population
      const orderItems = order.orderId.items
      const totalCartons = orderItems.reduce((sum, item) => sum + (item.cartons || 0), 0)
      const totalCbm = orderItems.reduce((sum, item) => sum + (item.cbm || 0), 0)
      const totalWeight = orderItems.reduce((sum, item) => sum + (item.weight || 0), 0)
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.carryingCharges || 0), 0)
      
      updatedContainer.orders[orderIndex] = {
        ...updatedContainer.orders[orderIndex],
        cartonShare: totalCartons,
        cbmShare: totalCbm,
        weightShare: totalWeight,
        carryingCharges: totalRevenue
      }
      
      // Auto-recalculate container utilization
      const containerTotalCbm = updatedContainer.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const containerTotalWeight = updatedContainer.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      
      updatedContainer.currentCbm = containerTotalCbm
      updatedContainer.currentWeight = containerTotalWeight
      
      console.log('🧮 [AUTO-POPULATE] Fixed items with missing data:', {
        orderIndex,
        itemsFixed: orderItems.filter(item => item.cbm > 0).length,
        newTotals: { totalCartons, totalCbm, totalWeight, totalRevenue }
      })
      
      return updatedContainer
    })
    
    toast.success('🧮 Auto-populated missing item data using REAL order specifications (unitCbm, unitWeight)', { duration: 4000 })
  }

  // Auto-recalculate container utilization whenever orders change
  const recalculateContainerUtilization = (orders) => {
    if (!orders || orders.length === 0) {
      setContainer(prev => ({
        ...prev,
        currentCbm: 0,
        currentWeight: 0
      }))
      return
    }

    const totalCbm = orders.reduce((sum, order) => sum + (parseFloat(order.cbmShare) || 0), 0)
    const totalWeight = orders.reduce((sum, order) => sum + (parseFloat(order.weightShare) || 0), 0)
    
    console.log('🔄 [AUTO-UPDATE] Recalculating container utilization:', {
      totalCbm: totalCbm.toFixed(2),
      totalWeight: totalWeight.toFixed(0),
      orderCount: orders.length
    })
    
    setContainer(prev => ({
      ...prev,
      currentCbm: totalCbm,
      currentWeight: totalWeight
    }))
  }

  // Smart proportional calculation when cartons change (UI-level validation already applied)
  const handleProportionalUpdate = (orderIndex, field, value, orderAllocation) => {
    const newValue = parseFloat(value) || 0
    
    if (field === 'cartonShare') {
      const originalOrder = orderAllocation.orderId
      const originalCartons = originalOrder?.allocationSummary?.totalAvailableCartons || 
                            orderAllocation.cartonShare || 1
      const originalCBM = originalOrder?.allocationSummary?.totalAvailableCbm || 
                         orderAllocation.cbmShare || 0
      const originalWeight = originalOrder?.allocationSummary?.totalAvailableWeight || 
                           orderAllocation.weightShare || 0
      const originalRevenue = originalOrder?.allocationSummary?.totalCarryingCharges || 
                            orderAllocation.carryingCharges || 0
      
      // Calculate ratios per carton
      const cbmPerCarton = originalCBM / Math.max(originalCartons, 1)
      const weightPerCarton = originalWeight / Math.max(originalCartons, 1)
      const revenuePerCarton = originalRevenue / Math.max(originalCartons, 1)
      
      // Calculate new proportional values
      const newCBM = newValue * cbmPerCarton
      const newWeight = newValue * weightPerCarton
      const newRevenue = newValue * revenuePerCarton
      
      console.log('📊 [PROPORTIONAL UPDATE] Carton change triggered recalculation:', {
        orderIndex,
        oldCartons: orderAllocation.cartonShare,
        newCartons: newValue,
        cbmPerCarton: cbmPerCarton.toFixed(3),
        weightPerCarton: weightPerCarton.toFixed(2),
        revenuePerCarton: revenuePerCarton.toFixed(2),
        newCBM: newCBM.toFixed(2),
        newWeight: newWeight.toFixed(0),
        newRevenue: newRevenue.toFixed(0)
      })
      
      // Update all related fields proportionally
      setContainer(prev => {
        const updatedContainer = { ...prev }
        updatedContainer.orders = [...prev.orders]
        updatedContainer.orders[orderIndex] = {
          ...updatedContainer.orders[orderIndex],
          cartonShare: newValue,
          cbmShare: newCBM,
          weightShare: newWeight,
          carryingCharges: newRevenue
        }
        
        // Auto-recalculate container utilization
        const totalCbm = updatedContainer.orders.reduce((sum, order) => sum + (parseFloat(order.cbmShare) || 0), 0)
        const totalWeight = updatedContainer.orders.reduce((sum, order) => sum + (parseFloat(order.weightShare) || 0), 0)
        
        updatedContainer.currentCbm = totalCbm
        updatedContainer.currentWeight = totalWeight
        
        return updatedContainer
      })
      
      toast.success(`📦 Updated allocation: ${newValue} cartons → ${newCBM.toFixed(1)} CBM, ${newWeight.toFixed(0)} kg, ₹${newRevenue.toFixed(0)}`, {
        duration: 3000
      })
      
    } else {
      // For non-carton fields, use the existing function
      handleUpdateOrderAllocation(orderIndex, field, value)
    }
  }

  // Update order allocation in real-time with auto-recalculation
  const handleUpdateOrderAllocation = (orderIndex, field, value) => {
    setContainer(prev => {
      const updatedContainer = { ...prev }
      updatedContainer.orders = [...prev.orders]
      updatedContainer.orders[orderIndex] = {
        ...updatedContainer.orders[orderIndex],
        [field]: parseFloat(value) || 0
      }
      
      // Auto-recalculate container utilization
      const totalCbm = updatedContainer.orders.reduce((sum, order) => sum + (parseFloat(order.cbmShare) || 0), 0)
      const totalWeight = updatedContainer.orders.reduce((sum, order) => sum + (parseFloat(order.weightShare) || 0), 0)
      
      updatedContainer.currentCbm = totalCbm
      updatedContainer.currentWeight = totalWeight
      
      console.log('⚡ [REAL-TIME UPDATE] Container utilization updated:', {
        field,
        newValue: value,
        totalCbm: totalCbm.toFixed(2),
        totalWeight: totalWeight.toFixed(0),
        utilizationCBM: ((totalCbm / (updatedContainer.maxCbm || 67)) * 100).toFixed(1) + '%',
        utilizationWeight: ((totalWeight / (updatedContainer.maxWeight || 30000)) * 100).toFixed(1) + '%'
      })
      
      return updatedContainer
    })
  }

  // Update individual item within an order with smart auto-calculation (UI-level QC validation already applied)
  const handleUpdateItemInOrder = (orderIndex, itemIndex, field, value) => {
    setContainer(prev => {
      const updatedContainer = { ...prev }
      updatedContainer.orders = [...prev.orders]
      
      // Update the specific item
      const order = { ...updatedContainer.orders[orderIndex] }
      order.orderId = { ...order.orderId }
      order.orderId.items = [...order.orderId.items]
      
      const currentItem = order.orderId.items[itemIndex]
      let updatedItem = { ...currentItem, [field]: value }
      
      // Smart auto-calculation based on field type using ACTUAL order data
      if (field === 'cartons' && value > 0) {
        // Use REAL data from the original order instead of hardcoded values
        const originalCartons = currentItem.cartons || 1
        const cbmPerCarton = (currentItem.unitCbm || 0) > 0 ? (currentItem.unitCbm || 0) : 0.1 // Fallback: 0.1 CBM per carton
        const weightPerCarton = (currentItem.unitWeight || 0) > 0 ? (currentItem.unitWeight || 0) : 15 // Fallback: 15 kg per carton
        
        // Calculate carrying charges from original order data
        let valuePerCarton = 500 // Default fallback
        if (currentItem.carryingCharge?.amount > 0 && originalCartons > 0) {
          valuePerCarton = currentItem.carryingCharge.amount / originalCartons
        } else if (currentItem.totalPrice > 0 && originalCartons > 0) {
          valuePerCarton = currentItem.totalPrice / originalCartons
        }
        
        updatedItem = {
          ...updatedItem,
          cbm: parseFloat((value * cbmPerCarton).toFixed(3)),
          weight: parseFloat((value * weightPerCarton).toFixed(2)),
          carryingCharges: parseFloat((value * valuePerCarton).toFixed(0))
        }
        
        console.log('🧮 [SMART CALC] Auto-calculated item values using REAL order data:', {
          cartons: value,
          originalCartons,
          cbmPerCarton: cbmPerCarton.toFixed(3),
          weightPerCarton: weightPerCarton.toFixed(2),
          valuePerCarton: valuePerCarton.toFixed(2),
          newCbm: updatedItem.cbm,
          newWeight: updatedItem.weight,
          newValue: updatedItem.carryingCharges
        })
        
      } else if (field === 'quantity' && value > 0) {
        // Calculate cartons based on original quantity-to-carton ratio
        const originalQuantity = currentItem.quantity || 10
        const originalCartons = currentItem.cartons || 1
        const itemsPerCarton = originalQuantity / originalCartons
        const newCartons = Math.ceil(value / itemsPerCarton)
        
        // Use REAL CBM and weight from order
        const cbmPerCarton = (currentItem.unitCbm || 0) > 0 ? (currentItem.unitCbm || 0) : 0.1
        const weightPerCarton = (currentItem.unitWeight || 0) > 0 ? (currentItem.unitWeight || 0) : 15
        
        // Calculate value from original order data
        let valuePerCarton = 500 // Default fallback
        if (currentItem.carryingCharge?.amount > 0 && originalCartons > 0) {
          valuePerCarton = currentItem.carryingCharge.amount / originalCartons
        } else if (currentItem.totalPrice > 0 && originalCartons > 0) {
          valuePerCarton = currentItem.totalPrice / originalCartons
        }
        
        updatedItem = {
          ...updatedItem,
          cartons: newCartons,
          cbm: parseFloat((newCartons * cbmPerCarton).toFixed(3)),
          weight: parseFloat((newCartons * weightPerCarton).toFixed(2)),
          carryingCharges: parseFloat((newCartons * valuePerCarton).toFixed(0))
        }
        
        console.log('🧮 [SMART CALC] Auto-calculated using REAL quantity-to-carton ratio:', {
          quantity: value,
          originalQuantity,
          originalCartons,
          itemsPerCarton: itemsPerCarton.toFixed(2),
          newCartons: updatedItem.cartons,
          cbmPerCarton: cbmPerCarton.toFixed(3),
          weightPerCarton: weightPerCarton.toFixed(2),
          valuePerCarton: valuePerCarton.toFixed(2),
          newCbm: updatedItem.cbm,
          newWeight: updatedItem.weight,
          newValue: updatedItem.carryingCharges
        })
      }
      
      order.orderId.items[itemIndex] = updatedItem
      
      updatedContainer.orders[orderIndex] = order
      
      // Recalculate order-level totals based on items
      const orderItems = order.orderId.items
      const totalCartons = orderItems.reduce((sum, item) => sum + (item.cartons || 0), 0)
      const totalCbm = orderItems.reduce((sum, item) => sum + (item.cbm || 0), 0)
      const totalWeight = orderItems.reduce((sum, item) => sum + (item.weight || 0), 0)
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.carryingCharges || 0), 0)
      
      // Update order allocation with new totals
      updatedContainer.orders[orderIndex] = {
        ...updatedContainer.orders[orderIndex],
        cartonShare: totalCartons,
        cbmShare: totalCbm,
        weightShare: totalWeight,
        carryingCharges: totalRevenue
      }
      
      // Auto-recalculate container utilization
      const containerTotalCbm = updatedContainer.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const containerTotalWeight = updatedContainer.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      
      updatedContainer.currentCbm = containerTotalCbm
      updatedContainer.currentWeight = containerTotalWeight
      
      console.log('🔧 [ITEM UPDATE] Item-level change recalculated:', {
        orderIndex,
        itemIndex,
        field,
        value,
        newOrderTotals: { totalCartons, totalCbm, totalWeight, totalRevenue },
        containerUtilization: {
          cbm: containerTotalCbm.toFixed(2),
          weight: containerTotalWeight.toFixed(0)
        }
      })
      
      return updatedContainer
    })
    
    // Show appropriate success message
    if (field === 'cartons' || field === 'quantity') {
      console.log(`✅ [QC VALIDATED] ${field} updated to ${value} (respecting QC limits)`)
    } else {
      toast.success(`📦 Item ${field} updated: ${value}`, { duration: 2000 })
    }
  }
  
  // Remove item from order
  const handleRemoveItemFromOrder = (orderIndex, itemIndex) => {
    const orderAllocation = container.orders[orderIndex]
    const item = orderAllocation.orderId.items[itemIndex]
    
    if (!confirm(`Remove "${item.itemCode} - ${item.description}" from this order?`)) {
      return
    }
    
    setContainer(prev => {
      const updatedContainer = { ...prev }
      updatedContainer.orders = [...prev.orders]
      
      const order = { ...updatedContainer.orders[orderIndex] }
      order.orderId = { ...order.orderId }
      order.orderId.items = order.orderId.items.filter((_, i) => i !== itemIndex)
      
      updatedContainer.orders[orderIndex] = order
      
      // Recalculate order totals after item removal
      const orderItems = order.orderId.items
      const totalCartons = orderItems.reduce((sum, item) => sum + (item.cartons || 0), 0)
      const totalCbm = orderItems.reduce((sum, item) => sum + (item.cbm || 0), 0)
      const totalWeight = orderItems.reduce((sum, item) => sum + (item.weight || 0), 0)
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.carryingCharges || 0), 0)
      
      updatedContainer.orders[orderIndex] = {
        ...updatedContainer.orders[orderIndex],
        cartonShare: totalCartons,
        cbmShare: totalCbm,
        weightShare: totalWeight,
        carryingCharges: totalRevenue
      }
      
      // Auto-recalculate container utilization
      const containerTotalCbm = updatedContainer.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const containerTotalWeight = updatedContainer.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      
      updatedContainer.currentCbm = containerTotalCbm
      updatedContainer.currentWeight = containerTotalWeight
      
      return updatedContainer
    })
    
    toast.success(`Item "${item.itemCode}" removed from order`)
  }
  
  // Add new item to order with realistic default values
  const handleAddNewItemToOrder = (orderIndex) => {
    const newItem = {
      itemCode: `ITEM-${Date.now()}`,
      description: 'New Item',
      quantity: 10,       // 10 pieces
      cartons: 1,         // 1 carton (10 pieces per carton)
      cbm: 0.1,          // 0.1 CBM per carton
      weight: 15.0,      // 15 kg per carton
      carryingCharges: 500  // ₹500 per carton
    }
    
    setContainer(prev => {
      const updatedContainer = { ...prev }
      updatedContainer.orders = [...prev.orders]
      
      const order = { ...updatedContainer.orders[orderIndex] }
      order.orderId = { ...order.orderId }
      order.orderId.items = [...order.orderId.items, newItem]
      
      updatedContainer.orders[orderIndex] = order
      
      // Recalculate order totals after adding item
      const orderItems = order.orderId.items
      const totalCartons = orderItems.reduce((sum, item) => sum + (item.cartons || 0), 0)
      const totalCbm = orderItems.reduce((sum, item) => sum + (item.cbm || 0), 0)
      const totalWeight = orderItems.reduce((sum, item) => sum + (item.weight || 0), 0)
      const totalRevenue = orderItems.reduce((sum, item) => sum + (item.carryingCharges || 0), 0)
      
      updatedContainer.orders[orderIndex] = {
        ...updatedContainer.orders[orderIndex],
        cartonShare: totalCartons,
        cbmShare: totalCbm,
        weightShare: totalWeight,
        carryingCharges: totalRevenue
      }
      
      // Auto-recalculate container utilization
      const containerTotalCbm = updatedContainer.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const containerTotalWeight = updatedContainer.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      
      updatedContainer.currentCbm = containerTotalCbm
      updatedContainer.currentWeight = containerTotalWeight
      
      return updatedContainer
    })
    
    toast.success('New item added to order')
  }

  // Edit order allocation
  const handleEditOrderAllocation = (orderAllocation, index) => {
    toast(`Editing allocation for ${orderAllocation.orderId?.orderNumber || 'Order ' + (index + 1)}. Modify the values directly in the form.`, {
      icon: 'ℹ️',
      duration: 4000
    })
  }

  // Remove order allocation
  const handleRemoveOrderAllocation = async (orderAllocation, index) => {
    if (!confirm(`Are you sure you want to remove ${orderAllocation.orderId?.orderNumber || 'this order'} from the container?`)) {
      return
    }

    try {
      // Remove order from container
      const updatedOrders = container.orders.filter((_, i) => i !== index)
      
      const updatedContainer = {
        ...container,
        orders: updatedOrders
      }
      
      // Update container
      const response = await axios.put(`/api/containers/${id}`, {
        orders: updatedOrders
      })
      
      setContainer(response.data.container)
      
      // Auto-recalculate utilization after removal
      recalculateContainerUtilization(updatedOrders)
      
      toast.success('Order removed from container successfully')
      
    } catch (error) {
      console.error('Error removing order allocation:', error)
      toast.error('Failed to remove order allocation')
    }
  }



  // Handle order selection for allocation
  const handleSelectOrderForAllocation = (order) => {
    const isSelected = selectedOrdersForAllocation.find(o => o._id === order._id)
    
    if (isSelected) {
      setSelectedOrdersForAllocation(prev => prev.filter(o => o._id !== order._id))
    } else {
      setSelectedOrdersForAllocation(prev => [...prev, order])
    }
  }

  // Auto-calculate allocation for selected orders with enhanced logic
  const calculateOptimalAllocation = (orders) => {
    console.log('🧠 [OPTIMIZE] Starting allocation calculation for', orders.length, 'orders')
    
    const remainingCBM = (container?.maxCbm || 67) - (container?.currentCbm || 0)
    const remainingWeight = (container?.maxWeight || 30000) - (container?.currentWeight || 0)
    
    console.log('📦 [OPTIMIZE] Container capacity:', {
      maxCbm: container?.maxCbm || 67,
      currentCbm: container?.currentCbm || 0,
      remainingCBM,
      maxWeight: container?.maxWeight || 30000,
      currentWeight: container?.currentWeight || 0,
      remainingWeight
    })
    
    let allocatedCBM = 0
    let allocatedWeight = 0
    const allocations = []
    
    // Sort orders by efficiency (revenue per CBM) for better optimization
    const sortedOrders = orders.sort((a, b) => {
      const efficiencyA = (a.allocationSummary?.totalCarryingCharges || 0) / Math.max(a.allocationSummary?.totalAvailableCbm || 1, 0.1)
      const efficiencyB = (b.allocationSummary?.totalCarryingCharges || 0) / Math.max(b.allocationSummary?.totalAvailableCbm || 1, 0.1)
      return efficiencyB - efficiencyA
    })
    
    for (const order of sortedOrders) {
      const orderCBM = order.allocationSummary?.totalAvailableCbm || 0
      const orderWeight = order.allocationSummary?.totalAvailableWeight || 0
      const orderCartons = order.allocationSummary?.totalAvailableCartons || 0
      const orderRevenue = order.allocationSummary?.totalCarryingCharges || 0
      
      console.log('📦 [OPTIMIZE] Processing order:', order.orderNumber, {
        orderCBM,
        orderWeight,
        orderCartons,
        orderRevenue,
        efficiency: orderRevenue / Math.max(orderCBM, 0.1)
      })
      
      // Check if order fits completely in remaining capacity
      if ((allocatedCBM + orderCBM) <= remainingCBM && 
          (allocatedWeight + orderWeight) <= remainingWeight) {
        
        console.log('✓ [OPTIMIZE] Order fits completely')
        allocations.push({
          orderId: order._id,
          clientId: order.clientId,
          clientName: order.clientName,
          cbmShare: orderCBM,
          weightShare: orderWeight,
          cartonShare: orderCartons,
          carryingCharges: orderRevenue,
          paymentType: order.paymentType || 'THROUGH_ME',
          allocatedAt: new Date().toISOString(),
          allocationMethod: 'complete'
        })
        
        allocatedCBM += orderCBM
        allocatedWeight += orderWeight
        
      } else {
        // Try partial allocation with smart ratio calculation
        const cbmRatio = orderCBM > 0 ? Math.min(1, (remainingCBM - allocatedCBM) / orderCBM) : 0
        const weightRatio = orderWeight > 0 ? Math.min(1, (remainingWeight - allocatedWeight) / orderWeight) : 0
        const allocationRatio = Math.min(cbmRatio, weightRatio)
        
        console.log('🔀 [OPTIMIZE] Trying partial allocation:', {
          cbmRatio,
          weightRatio,
          allocationRatio,
          threshold: 0.15
        })
        
        // Only allocate if at least 15% can fit (better than 10% threshold)
        if (allocationRatio >= 0.15) {
          console.log('✓ [OPTIMIZE] Partial allocation viable')
          allocations.push({
            orderId: order._id,
            clientId: order.clientId,
            clientName: order.clientName,
            cbmShare: orderCBM * allocationRatio,
            weightShare: orderWeight * allocationRatio,
            cartonShare: Math.floor(orderCartons * allocationRatio),
            carryingCharges: orderRevenue * allocationRatio,
            paymentType: order.paymentType || 'THROUGH_ME',
            allocatedAt: new Date().toISOString(),
            isPartialAllocation: true,
            allocationRatio: allocationRatio,
            allocationMethod: 'partial',
            allocationPercentage: Math.round(allocationRatio * 100)
          })
          
          allocatedCBM += orderCBM * allocationRatio
          allocatedWeight += orderWeight * allocationRatio
        } else {
          console.log('❌ [OPTIMIZE] Order cannot fit even partially (ratio too low)')
        }
        
        break // Stop allocation as container is at/near capacity
      }
    }
    
    console.log('🎆 [OPTIMIZE] Allocation complete:', {
      totalAllocations: allocations.length,
      totalCBM: allocatedCBM.toFixed(2),
      totalWeight: allocatedWeight.toFixed(0),
      utilizationCBM: ((allocatedCBM + (container?.currentCbm || 0)) / (container?.maxCbm || 67) * 100).toFixed(1) + '%',
      utilizationWeight: ((allocatedWeight + (container?.currentWeight || 0)) / (container?.maxWeight || 30000) * 100).toFixed(1) + '%'
    })
    
    return allocations
  }

  // Apply selected order allocations
  const applySelectedOrderAllocations = async () => {
    if (selectedOrdersForAllocation.length === 0) {
      toast.error('Please select at least one order to allocate')
      return
    }
    
    try {
      setSaving(true)
      
      // Calculate optimal allocation
      const newAllocations = calculateOptimalAllocation(selectedOrdersForAllocation)
      
      if (newAllocations.length === 0) {
        toast.error('Selected orders do not fit in the remaining container capacity')
        return
      }
      
      // Combine with existing allocations
      const updatedOrders = [...(container.orders || []), ...newAllocations]
      
      // Update container
      const response = await axios.put(`/api/containers/${id}`, {
        orders: updatedOrders
      })
      
      setContainer(response.data.container)
      
      // Auto-recalculate utilization after adding new orders
      recalculateContainerUtilization(updatedOrders)
      
      setSelectedOrdersForAllocation([])
      setShowOrderSearch(false)
      
      toast.success(`Successfully allocated ${newAllocations.length} orders to container`)
      
    } catch (error) {
      console.error('Error applying order allocations:', error)
      toast.error('Failed to allocate orders to container')
    } finally {
      setSaving(false)
    }
  }

  // Apply container template
  const applyContainerTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      type: template.type,
      baseCharges: { ...template.baseCharges }
    }))
    
    // Update container capacity based on type
    const capacityInfo = Container.getCapacityInfo ? Container.getCapacityInfo(template.type) : {
      '20ft': { maxWeight: 28000, maxCbm: 33 },
      '40ft': { maxWeight: 30000, maxCbm: 67 },
      '40ft_hc': { maxWeight: 30000, maxCbm: 76 },
      '45ft': { maxWeight: 30000, maxCbm: 86 }
    }[template.type] || { maxWeight: 30000, maxCbm: 67 }
    
    setContainer(prev => ({
      ...prev,
      type: template.type,
      maxCbm: capacityInfo.maxCbm,
      maxWeight: capacityInfo.maxWeight,
      baseCharges: { ...template.baseCharges }
    }))
    
    setShowTemplateDialog(false)
    toast.success(`Applied template: ${template.name}`)
  }

  // Apply charge template
  const applyChargeTemplate = (template) => {
    setFormData(prev => ({
      ...prev,
      baseCharges: { ...prev.baseCharges, ...template.charges }
    }))
    
    setShowChargeTemplates(false)
    toast.success(`Applied charge template: ${template.name}`)
  }

  // Generate optimization suggestions
  const generateOptimizationSuggestions = async () => {
    if (!container?.orders || container.orders.length === 0) {
      toast('No orders allocated to optimize', {
        icon: 'ℹ️',
        duration: 3000
      })
      return
    }
    
    try {
      setCalculating(true)
      
      // Calculate current utilization
      const currentCBM = container.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const currentWeight = container.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      const currentRevenue = container.orders.reduce((sum, order) => sum + (order.carryingCharges || 0), 0)
      
      const cbmUtilization = (currentCBM / container.maxCbm) * 100
      const weightUtilization = (currentWeight / container.maxWeight) * 100
      
      const suggestions = {
        current: {
          cbmUtilization: cbmUtilization.toFixed(1),
          weightUtilization: weightUtilization.toFixed(1),
          revenue: currentRevenue,
          orders: container.orders.length
        },
        recommendations: []
      }
      
      // Generate suggestions based on utilization
      if (cbmUtilization < 80) {
        suggestions.recommendations.push({
          type: 'capacity',
          priority: 'high',
          title: 'Low CBM Utilization',
          description: `Container is only ${cbmUtilization.toFixed(1)}% full by volume. Consider adding more orders.`,
          action: 'Add more orders to improve space utilization'
        })
      }
      
      if (weightUtilization < 70) {
        suggestions.recommendations.push({
          type: 'weight',
          priority: 'medium',
          title: 'Low Weight Utilization',
          description: `Container weight is only ${weightUtilization.toFixed(1)}% of capacity. Consider heavier items.`,
          action: 'Look for denser cargo to optimize weight capacity'
        })
      }
      
      if (currentRevenue < 50000) {
        suggestions.recommendations.push({
          type: 'revenue',
          priority: 'high',
          title: 'Low Revenue Container',
          description: `Current revenue is ₹${currentRevenue.toLocaleString()}. Consider higher-value cargo.`,
          action: 'Add orders with better carrying charge rates'
        })
      }
      
      const profitMargin = ((currentRevenue - (formData.baseCharges.gst + formData.baseCharges.duty + formData.baseCharges.misc + formData.baseCharges.extraCharge)) / currentRevenue) * 100
      
      if (profitMargin < 20) {
        suggestions.recommendations.push({
          type: 'profit',
          priority: 'critical',
          title: 'Low Profit Margin',
          description: `Profit margin is only ${profitMargin.toFixed(1)}%. Review charges and rates.`,
          action: 'Optimize base charges or negotiate better carrying rates'
        })
      }
      
      setOptimizationSuggestions(suggestions)
      setShowOptimization(true)
      
    } catch (error) {
      console.error('Error generating optimization suggestions:', error)
      toast.error('Failed to generate optimization suggestions')
    } finally {
      setCalculating(false)
    }
  }

  // Save container changes
  const handleSave = async () => {
    try {
      setSaving(true)
      console.log('💾 [CONTAINER EDIT] Saving changes:', formData)
      console.log('📦 [CONTAINER EDIT] Updated orders:', container.orders)

      // Validate container capacity
      const totalCbm = container.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0)
      const totalWeight = container.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0)
      
      if (totalCbm > container.maxCbm) {
        toast.error(`Total CBM (${totalCbm.toFixed(1)}) exceeds container capacity (${container.maxCbm})`)
        setSaving(false)
        return
      }
      
      if (totalWeight > container.maxWeight) {
        toast.error(`Total weight (${totalWeight.toLocaleString()}kg) exceeds container capacity (${container.maxWeight.toLocaleString()}kg)`)
        setSaving(false)
        return
      }

      // Prepare update data
      const updateData = {
        realContainerId: formData.realContainerId,
        billNo: formData.billNo,
        sealNo: formData.sealNo,
        status: formData.status,
        type: formData.type,
        location: { current: formData.location.current },
        estimatedArrival: formData.estimatedArrival ? new Date(formData.estimatedArrival) : null,
        notes: formData.notes,
        orders: container.orders, // Include updated order allocations
        maxCbm: container.maxCbm, // Include updated max CBM
        maxWeight: container.maxWeight // Include updated max weight
      }

      // Update container basic info and orders
      await axios.put(`/api/containers/${id}`, updateData)

      // Update financial charges
      await axios.post(`/api/financials/container-charges/${id}`, {
        gst: parseFloat(formData.baseCharges.gst) || 0,
        duty: parseFloat(formData.baseCharges.duty) || 0,
        misc: parseFloat(formData.baseCharges.misc) || 0,
        extraCharge: parseFloat(formData.baseCharges.extraCharge) || 0,
        currency: 'INR'
      })

      toast.success('Container and order allocations updated successfully')
      navigate(`/containers/${id}`)
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Save failed:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else if (error.response?.status === 403) {
        toast.error('Access denied')
      } else {
        toast.error('Failed to save changes: ' + (error.response?.data?.message || error.message))
      }
    } finally {
      setSaving(false)
    }
  }

  // Delete container
  const handleDelete = async () => {
    if (deleteConfirmText !== container?.realContainerId) {
      toast.error('Please type the container ID correctly to confirm deletion')
      return
    }

    try {
      setDeleting(true)
      console.log('🗑️ [CONTAINER EDIT] Deleting container:', id)

      // First deallocate all orders with comprehensive cleanup
      if (container.orders && container.orders.length > 0) {
        // Reset orders to ready status and clear ALL allocation data
        for (const orderAllocation of container.orders) {
          try {
            // Request comprehensive cleanup including item-level allocation data
            await axios.patch(`/api/orders/${orderAllocation.orderId}`, {
              status: 'ready',
              containerId: null,
              // Request backend to clear item-level allocations
              clearItemAllocations: true
            })
            console.log(`✅ [CONTAINER EDIT] Reset order ${orderAllocation.orderId} and cleared allocations`)
          } catch (orderError) {
            console.warn('Warning: Failed to reset order status:', orderError)
          }
        }
        
        // Additional safety: Ensure container deletion will handle any missed cleanup
        console.log('📦 [CONTAINER EDIT] All orders reset, proceeding with container deletion')
      }

      // Delete the container
      await axios.delete(`/api/containers/${id}`)

      toast.success('Container deleted successfully. Associated orders have been reset to ready status.')
      navigate('/containers')
      
    } catch (error) {
      console.error('❌ [CONTAINER EDIT] Delete failed:', error)
      
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.')
        navigate('/login')
      } else if (error.response?.status === 403) {
        toast.error('Access denied')
      } else {
        toast.error('Failed to delete container: ' + (error.response?.data?.message || error.message))
      }
    } finally {
      setDeleting(false)
      setShowDeleteDialog(false)
      setDeleteConfirmText('')
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
          <span className="text-lg">Loading container...</span>
        </div>
      </div>
    )
  }

  if (!container) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <ContainerIcon className="h-16 w-16 text-stone-400 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-stone-900 mb-2">Container not found</h3>
          <p className="text-stone-500 mb-6">The container you're looking for doesn't exist.</p>
          <Button onClick={() => navigate('/containers')} variant="outline">
            <ArrowLeft className="h-4 w-4 mr-2" />
            Back to Containers
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-6xl">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={() => navigate('/containers')}>
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-stone-900">Edit Container</h1>
              <p className="text-stone-600">
                Modify container details and settings
                {user?.role !== 'client' && (
                  <span className="ml-2 font-mono text-sm bg-stone-100 px-2 py-1 rounded">
                    {container.realContainerId}
                  </span>
                )}
              </p>
            </div>
          </div>
          
          <div className="flex items-center space-x-3">
            {/* <Button variant="outline" onClick={() => setShowTemplateDialog(true)}>
              <Copy className="h-4 w-4 mr-2" />
              Templates
            </Button> */}
{/*             
            <Button variant="outline" onClick={() => setShowChargeTemplates(true)}>
              <Calculator className="h-4 w-4 mr-2" />
              Charge Presets
            </Button> */}
            
            {/* <Button variant="outline" onClick={generateOptimizationSuggestions} disabled={calculating}>
              {calculating ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                  Analyzing...
                </>
              ) : (
                <>
                  <Target className="h-4 w-4 mr-2" />
                  Optimize
                </>
              )}
            </Button> */}
            
            <Button variant="outline" onClick={() => navigate(`/containers/${id}`)}>
              <Eye className="h-4 w-4 mr-2" />
              View Details
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Saving...
                </>
              ) : (
                <>
                  <Save className="h-4 w-4 mr-2" />
                  Save Changes
                </>
              )}
            </Button>
            {(user?.role === 'admin' || user?.role === 'staff') && (
              <Button 
                variant="destructive" 
                onClick={() => setShowDeleteDialog(true)}
                disabled={deleting}
              >
                <Trash2 className="h-4 w-4 mr-2" />
                Delete
              </Button>
            )}
          </div>
        </div>

        {/* Main Content */}
        <Tabs defaultValue="basic" className="space-y-6">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="basic">
              <Settings className="h-4 w-4 mr-2" />
              Basic Info
            </TabsTrigger>
            <TabsTrigger value="financials">
              <DollarSign className="h-4 w-4 mr-2" />
              Financials
            </TabsTrigger>
            <TabsTrigger value="orders">
              <Package className="h-4 w-4 mr-2" />
              Orders ({container.orders?.length || 0})
            </TabsTrigger>
          </TabsList>

          {/* Basic Information Tab */}
          <TabsContent value="basic">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <ContainerIcon className="h-5 w-5 mr-2" />
                  Container Information
                </CardTitle>
                <CardDescription>
                  Basic container details and identification
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="realContainerId">Container ID</Label>
                      <Input
                        id="realContainerId"
                        value={formData.realContainerId}
                        onChange={(e) => handleInputChange('realContainerId', e.target.value)}
                        placeholder="CONT-12345"
                      />
                    </div>
                    
                    <div>
                      <Label htmlFor="type">Container Type</Label>
                      <Select value={formData.type} onValueChange={(value) => {
                        handleInputChange('type', value)
                        // Update capacity when type changes
                        const selectedType = containerTypes.find(t => t.value === value)
                        if (selectedType) {
                          const capacity = selectedType.capacity.match(/([0-9.]+)\s*CBM.*?([0-9,]+)\s*kg/)
                          if (capacity) {
                            setContainer(prev => ({
                              ...prev,
                              maxCbm: parseFloat(capacity[1]),
                              maxWeight: parseFloat(capacity[2].replace(/,/g, ''))
                            }))
                          }
                        }
                      }}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select container type" />
                        </SelectTrigger>
                        <SelectContent>
                          {containerTypes.map((type) => (
                            <SelectItem key={type.value} value={type.value}>
                              <div>
                                <div className="font-medium">{type.label}</div>
                                <div className="text-sm text-stone-500">{type.capacity}</div>
                              </div>
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    {/* Editable Container Capacity */}
                    <div className="space-y-3 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                      <h5 className="font-medium text-blue-900 flex items-center">
                        <ContainerIcon className="h-4 w-4 mr-2" />
                        Container Capacity (Editable)
                      </h5>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="maxCbm" className="text-sm font-medium text-blue-700">Max CBM</Label>
                          <Input
                            id="maxCbm"
                            type="text"
                            value={container?.maxCbm || 0}
                            onChange={(e) => setContainer(prev => ({ ...prev, maxCbm: parseFloat(e.target.value) || 0 }))}
                            className="border-blue-300 focus:border-blue-500"
                          />
                        </div>
                        <div>
                          <Label htmlFor="maxWeight" className="text-sm font-medium text-blue-700">Max Weight (kg)</Label>
                          <Input
                            id="maxWeight"
                            type="text"
                            value={container?.maxWeight || 0}
                            onChange={(e) => setContainer(prev => ({ ...prev, maxWeight: parseFloat(e.target.value) || 0 }))}
                            className="border-blue-300 focus:border-blue-500"
                          />
                        </div>
                      </div>
                      <div className="text-xs text-blue-600">
                        💡 Tip: Modify these values to customize container capacity beyond standard types
                      </div>
                    </div>

                    {/* Transport Company Selection */}
                    <div>
                      <Label htmlFor="transportCompany" className="text-sm font-medium text-stone-700">
                        Transport Company
                      </Label>
                      <Select 
                        value={container?.shippingCompany?.id || 'none'} 
                        onValueChange={handleTransportCompanyUpdate}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select transport company" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="none">No transport company</SelectItem>
                          {transportCompanies.map((company) => (
                            <SelectItem key={company.companyId} value={company.companyId}>
                              {company.companyName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="status">Status</Label>
                      <Select value={formData.status} onValueChange={(value) => handleInputChange('status', value)}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select status" />
                        </SelectTrigger>
                        <SelectContent>
                          {statusOptions.map((status) => (
                            <SelectItem key={status.value} value={status.value}>
                              {status.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div>
                      <Label htmlFor="currentLocation">Current Location</Label>
                      <Input
                        id="currentLocation"
                        value={formData.location.current}
                        onChange={(e) => handleInputChange('location.current', e.target.value)}
                        placeholder="Port/City/Terminal"
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <Label htmlFor="billNo">Bill Number</Label>
                      <Input
                        id="billNo"
                        value={formData.billNo}
                        onChange={(e) => handleInputChange('billNo', e.target.value)}
                        placeholder="B/L 12345"
                      />
                    </div>

                    <div>
                      <Label htmlFor="sealNo">Seal Number</Label>
                      <Input
                        id="sealNo"
                        value={formData.sealNo}
                        onChange={(e) => handleInputChange('sealNo', e.target.value)}
                        placeholder="SEAL-12345"
                      />
                    </div>

                    <div>
                      <Label htmlFor="estimatedArrival">Estimated Arrival</Label>
                      <Input
                        id="estimatedArrival"
                        type="datetime-local"
                        value={formData.estimatedArrival}
                        onChange={(e) => handleInputChange('estimatedArrival', e.target.value)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="notes">Notes</Label>
                      <Textarea
                        id="notes"
                        value={formData.notes}
                        onChange={(e) => handleInputChange('notes', e.target.value)}
                        placeholder="Additional notes about this container..."
                        rows={3}
                      />
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Financials Tab */}
          <TabsContent value="financials">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Information
                </CardTitle>
                <CardDescription>
                  Base charges and financial settings
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <h4 className="font-medium text-stone-900">Base Charges</h4>
                    
                    <div>
                      <Label htmlFor="gst">GST Amount (₹)</Label>
                      <Input
                        id="gst"
                        type="text"
                        value={formData.baseCharges.gst}
                        onChange={(e) => handleInputChange('baseCharges.gst', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="duty">Duty Amount (₹)</Label>
                      <Input
                        id="duty"
                        type="text"
                        value={formData.baseCharges.duty}
                        onChange={(e) => handleInputChange('baseCharges.duty', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="misc">Miscellaneous Charges (₹)</Label>
                      <Input
                        id="misc"
                        type="text"
                        value={formData.baseCharges.misc}
                        onChange={(e) => handleInputChange('baseCharges.misc', parseFloat(e.target.value) || 0)}
                      />
                    </div>

                    <div>
                      <Label htmlFor="extraCharge">Extra Charges (₹)</Label>
                      <Input
                        id="extraCharge"
                        type="text"
                        value={formData.baseCharges.extraCharge}
                        onChange={(e) => handleInputChange('baseCharges.extraCharge', parseFloat(e.target.value) || 0)}
                      />
                    </div>
                  </div>

                  <div className="space-y-4">
                    <h4 className="font-medium text-stone-900">Financial Summary</h4>
                    
                    <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-green-700">Total Revenue</span>
                        <span className="font-bold text-green-900">
                          {formatCurrency(container.totalRevenue || 0)}
                        </span>
                      </div>
                      <div className="flex justify-between items-center mb-2">
                        <span className="text-green-700">Total Base Charges</span>
                        <span className="font-bold text-green-900">
                          {formatCurrency(
                            (formData.baseCharges.gst || 0) + 
                            (formData.baseCharges.duty || 0) + 
                            (formData.baseCharges.misc || 0) + 
                            (formData.baseCharges.extraCharge || 0)
                          )}
                        </span>
                      </div>
                      <Separator className="my-2" />
                      <div className="flex justify-between items-center">
                        <span className="text-green-700 font-medium">Estimated Profit</span>
                        <span className="font-bold text-green-900">
                          {formatCurrency(
                            (container.totalRevenue || 0) - 
                            ((formData.baseCharges.gst || 0) + 
                             (formData.baseCharges.duty || 0) + 
                             (formData.baseCharges.misc || 0) + 
                             (formData.baseCharges.extraCharge || 0))
                          )}
                        </span>
                      </div>
                    </div>

                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                      <h5 className="font-medium text-blue-900 mb-2">Container Capacity</h5>
                      <div className="grid grid-cols-1 gap-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">CBM Used:</span>
                          <span className="font-medium">{container.currentCbm || 0} / {container.maxCbm}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Weight Used:</span>
                          <span className="font-medium">{(container.currentWeight || 0).toLocaleString()} / {(container.maxWeight || 0).toLocaleString()} kg</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Orders:</span>
                          <span className="font-medium">{container.orders?.length || 0}</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          {/* Orders Tab - Clean Order Selection like NewContainerAllocation Phase 2 */}
          <TabsContent value="orders">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Container Order Allocation
                </CardTitle>
                <CardDescription>
                  Select items from QC-ready orders to optimize container utilization
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Show Order Search Modal */}
                {showOrderSearch ? (
                  <div className="grid grid-cols-12 gap-6">
                    {/* Left Panel - Available Orders */}
                    <div className="col-span-8 space-y-6">
                      {/* Container Capacity Status */}
                      <Card>
                        <CardHeader>
                          <div className="flex items-center justify-between">
                            <div>
                              <CardTitle className="flex items-center">
                                <ContainerIcon className="h-5 w-5 mr-2" />
                                Container: {container?.maxCbm || 67} CBM
                              </CardTitle>
                              <p className="text-sm text-gray-600">
                                Used: {utilizationStats.usedCbm.toFixed(1)} CBM • Remaining: {utilizationStats.remainingCbm.toFixed(1)} CBM
                              </p>
                            </div>
                            <Button onClick={autoFillBestItems} className="bg-green-600 hover:bg-green-700">
                              <Calculator className="h-4 w-4 mr-2" />
                              Auto Fill Best
                            </Button>
                          </div>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Utilization</span>
                              <span>{utilizationStats.utilizationPercent.toFixed(1)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-3">
                              <div 
                                className={`h-3 rounded-full transition-all ${
                                  utilizationStats.utilizationPercent > 100 ? 'bg-red-500' :
                                  utilizationStats.utilizationPercent > 95 ? 'bg-green-500' :
                                  utilizationStats.utilizationPercent > 50 ? 'bg-blue-500' : 'bg-gray-400'
                                }`}
                                style={{ width: `${Math.min(utilizationStats.utilizationPercent, 100)}%` }}
                              />
                            </div>
                            
                            {utilizationStats.utilizationPercent > 100 && (
                              <Alert className="mt-2">
                                <AlertTriangle className="h-4 w-4" />
                                <AlertDescription>
                                  Over capacity! Reduce selection by {(utilizationStats.usedCbm - (container?.maxCbm || 67)).toFixed(1)} CBM
                                </AlertDescription>
                              </Alert>
                            )}
                          </div>
                        </CardContent>
                      </Card>

                      {/* Search and Filter */}
                      <div className="flex items-center space-x-4">
                        <div className="flex-1">
                          <Input
                            placeholder="Search orders by number, client name..."
                            value={orderSearchTerm}
                            onChange={(e) => setOrderSearchTerm(e.target.value)}
                            className="w-full"
                          />
                        </div>
                        <Button variant="outline" onClick={fetchQCReadyOrders} disabled={searchingOrders}>
                          {searchingOrders ? (
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                          ) : (
                            <RefreshCw className="h-4 w-4 mr-2" />
                          )}
                          Refresh
                        </Button>
                      </div>

                      {/* Available Orders & Items - Editable Interface */}
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Available Orders
                          </CardTitle>
                          <p className="text-sm text-gray-600">Select items to add to your container (cannot exceed {container?.maxCbm || 67} CBM)</p>
                        </CardHeader>
                        <CardContent>
                          {loadingOrders ? (
                            <div className="flex items-center justify-center py-8">
                              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
                              <span className="ml-2">Loading orders...</span>
                            </div>
                          ) : availableOrders.length === 0 ? (
                            <div className="text-center py-8">
                              <Package className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                              <p className="text-gray-600">No additional QC-ready orders available</p>
                              <Button variant="outline" onClick={fetchQCReadyOrders} className="mt-2">
                                <RefreshCw className="h-4 w-4 mr-2" />
                                Refresh Orders
                              </Button>
                            </div>
                          ) : (
                            <div className="space-y-6">
                              {availableOrders
                                .filter(order => 
                                  orderSearchTerm === '' ||
                                  order.orderNumber?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                                  order.clientName?.toLowerCase().includes(orderSearchTerm.toLowerCase())
                                )
                                .map(order => {
                                  const orderTotal = order.items?.reduce((sum, item) => {
                                    const key = `${order._id}_${item._id}`
                                    const selection = selectedOrderItems[key]
                                    const cbm = selection ? (parseFloat(selection.cbm) || 0) : 0
                                    return sum + cbm
                                  }, 0) || 0
                                  
                                  return (
                                    <div key={order._id} className="border rounded-lg p-4">
                                      <div className="flex items-center justify-between mb-3">
                                        <div>
                                          <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                                          <p className="text-sm text-gray-600">{order.clientName}</p>
                                        </div>
                                        <div className="text-right">
                                          <Badge variant="outline">{order.items?.length || 0} items</Badge>
                                          {orderTotal > 0 && (
                                            <p className="text-sm text-green-600 mt-1">{orderTotal.toFixed(1)} CBM selected</p>
                                          )}
                                        </div>
                                      </div>
                                      
                                      <div className="space-y-3">
                                        {order.items?.map(item => {
                                          const key = `${order._id}_${item._id}`
                                          const selection = selectedOrderItems[key]
                                          
                                          const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
                                          const cbmPerCarton = item.unitCbm || 0
                                          const weightPerCarton = item.unitWeight || 0
                                          const carryingChargePerCarton = item.carryingCharge?.rate || 0
                                          
                                          const selected = selection?.quantity || 0
                                          const maxCbm = parseFloat(container?.maxCbm || 67)
                                          const currentTotal = Object.values(selectedOrderItems).reduce((sum, sel) => {
                                            return sum + (parseFloat(sel.cbm) || 0)
                                          }, 0)
                                          
                                          const maxCanAdd = cbmPerCarton > 0 ? Math.floor((maxCbm - currentTotal + (selected * cbmPerCarton)) / cbmPerCarton) : maxAvailable
                                          const actualMax = Math.min(maxAvailable, maxCanAdd)
                                          
                                          return (
                                            <div key={item._id} className="bg-gray-50 rounded p-3">
                                              <div className="grid grid-cols-12 items-center gap-3">
                                                <div className="col-span-4">
                                                  <p className="font-medium">{item.itemCode}</p>
                                                  <p className="text-xs text-gray-600">{item.description}</p>
                                                </div>
                                                
                                                <div className="col-span-2 text-center">
                                                  <p className="text-sm font-medium">{cbmPerCarton > 0 ? cbmPerCarton.toFixed(2) : '0.00'} CBM</p>
                                                  <p className="text-xs text-gray-600">per carton</p>
                                                </div>
                                                
                                                <div className="col-span-2 text-center">
                                                  <p className="text-sm font-medium">{maxAvailable}</p>
                                                  <p className="text-xs text-gray-600">available</p>
                                                </div>
                                                
                                                <div className="col-span-3">
                                                  <div className="flex items-center gap-2">
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => updateItemSelection(order._id, item._id, selected - 1)}
                                                      disabled={selected <= 0}
                                                    >
                                                      <Minus className="h-3 w-3" />
                                                    </Button>
                                                    
                                                    <Input
                                                      type="text"
                                                      value={selected}
                                                      onChange={(e) => updateItemSelection(order._id, item._id, parseInt(e.target.value) || 0)}
                                                      className="w-16 text-center"
                                                      
                                                      max={actualMax}
                                                    />
                                                    
                                                    <Button
                                                      size="sm"
                                                      variant="outline"
                                                      onClick={() => updateItemSelection(order._id, item._id, selected + 1)}
                                                      disabled={selected >= actualMax}
                                                    >
                                                      <Plus className="h-3 w-3" />
                                                    </Button>
                                                  </div>
                                                  {actualMax < maxAvailable && (
                                                    <p className="text-xs text-red-600 mt-1">CBM limit: max {actualMax}</p>
                                                  )}
                                                </div>
                                                
                                                <div className="col-span-1 text-right">
                                                  {selected > 0 && (
                                                    <CheckCircle className="h-4 w-4 text-green-500" />
                                                  )}
                                                </div>
                                              </div>
                                              
                                              {selected > 0 && (
                                                <div className="mt-2 pt-2 border-t border-gray-200">
                                                  <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                                                    <div>CBM: {(selected * cbmPerCarton).toFixed(2)}</div>
                                                    <div>Weight: {(selected * weightPerCarton).toFixed(0)} kg</div>
                                                    <div>Charges: ₹{(selected * carryingChargePerCarton).toFixed(0)}</div>
                                                  </div>
                                                </div>
                                              )}
                                            </div>
                                          )
                                        })},
                                      </div>
                                    </div>
                                  )
                                })}
                            </div>
                          )}
                        </CardContent>
                      </Card>
                    </div>

                    {/* Right Panel - Selection Summary */}
                    <div className="col-span-4 space-y-6">
                      {/* Selection Summary */}
                      <Card>
                        <CardHeader>
                          <CardTitle>Selection Summary</CardTitle>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-4">
                            <div className="grid grid-cols-2 gap-4 text-center">
                              <div>
                                <p className="text-lg font-bold text-blue-600">{Object.keys(selectedOrderItems).length}</p>
                                <p className="text-xs text-gray-600">Items Selected</p>
                              </div>
                              <div>
                                <p className="text-lg font-bold text-green-600">
                                  {Object.values(selectedOrderItems).reduce((sum, sel) => sum + sel.quantity, 0)}
                                </p>
                                <p className="text-xs text-gray-600">Total Cartons</p>
                              </div>
                            </div>
                            
                            <Separator />
                            
                            <div className="space-y-2 text-sm">
                              <div className="flex justify-between">
                                <span>Total CBM:</span>
                                <span className="font-medium">{utilizationStats.usedCbm.toFixed(1)}</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Weight:</span>
                                <span className="font-medium">{utilizationStats.usedWeight.toFixed(0)} kg</span>
                              </div>
                              <div className="flex justify-between">
                                <span>Total Charges:</span>
                                <span className="font-medium">₹{Object.values(selectedOrderItems).reduce((sum, sel) => {
                                  const charges = parseFloat(sel.charges) || 0
                                  return sum + charges
                                }, 0).toFixed(0)}</span>
                              </div>
                            </div>
                          </div>
                        </CardContent>
                      </Card>

                      {/* Apply Changes Button */}
                      <Button 
                        onClick={applySelectedItemsToContainer}
                        disabled={Object.keys(selectedOrderItems).length === 0 || utilizationStats.utilizationPercent > 100 || saving}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding to Container...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Selected Items to Container
                          </>
                        )}
                      </Button>
                      
                      <Button 
                        onClick={() => {
                          setShowOrderSearch(false)
                          setSelectedOrderItems({})
                        }}
                        variant="outline"
                        className="w-full"
                      >
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-6">
                    {/* Container Utilization Summary */}
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <Card className="bg-blue-50 border-blue-200">
                        <CardContent className="p-4 text-center">
                          <Layers className="h-6 w-6 text-blue-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-blue-800">
                            {(container.currentCbm || 0).toFixed(1)} / {container.maxCbm || 67}
                          </p>
                          <p className="text-sm text-blue-600">CBM Used</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {container.maxCbm > 0 ? ((container.currentCbm || 0) / container.maxCbm * 100).toFixed(1) : 0}% utilized
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-green-50 border-green-200">
                        <CardContent className="p-4 text-center">
                          <Package className="h-6 w-6 text-green-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-green-800">
                            {(container.currentWeight || 0).toLocaleString()} / {(container.maxWeight || 0).toLocaleString()}
                          </p>
                          <p className="text-sm text-green-600">Weight (kg)</p>
                          <p className="text-xs text-gray-500 mt-1">
                            {container.maxWeight > 0 ? ((container.currentWeight || 0) / container.maxWeight * 100).toFixed(1) : 0}% utilized
                          </p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-purple-50 border-purple-200">
                        <CardContent className="p-4 text-center">
                          <Users className="h-6 w-6 text-purple-600 mx-auto mb-2" />
                          <p className="text-2xl font-bold text-purple-800">{container.orders?.length || 0}</p>
                          <p className="text-sm text-purple-600">Orders Allocated</p>
                        </CardContent>
                      </Card>
                      
                      <Card className="bg-orange-50 border-orange-200">
                        <CardContent className="p-4 text-center">
                          <DollarSign className="h-6 w-6 text-orange-600 mx-auto mb-2" />
                          <p className="text-xl font-bold text-orange-800">
                            {formatCurrency(container.totalRevenue || 0)}
                          </p>
                          <p className="text-sm text-orange-600">Total Revenue</p>
                        </CardContent>
                      </Card>
                    </div>

                    {/* Add New Order/Item Button */}
                    <div className="flex justify-between items-center">
                      <h3 className="text-lg font-semibold">Allocated Orders</h3>
                      <Button onClick={handleAddNewOrderAllocation} className="bg-blue-600 hover:bg-blue-700">
                        <Plus className="h-4 w-4 mr-2" />
                        Add Items from Orders
                      </Button>
                    </div>

                    {/* Main Container View */}
                    {/* Simple Container Capacity Overview */}
                    <Card className="bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200">
                      <CardContent className="pt-6">
                        <div className="flex items-center justify-between mb-4">
                          <h4 className="font-semibold text-blue-900 flex items-center">
                            <ContainerIcon className="h-5 w-5 mr-2" />
                            Container Capacity: {container?.maxCbm || 67} CBM, {(container?.maxWeight || 30000).toLocaleString()} kg
                          </h4>
                          <Badge variant={container.orders?.length > 0 ? 'default' : 'secondary'}>
                            {container.orders?.length || 0} Orders Allocated
                          </Badge>
                        </div>
                        
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                          {/* CBM Utilization */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>CBM Used:</span>
                              <span className="font-medium">
                                {(container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0) || 0).toFixed(1)} / {container?.maxCbm || 67} CBM
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-blue-500 h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(
                                    ((container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0) || 0) / (container?.maxCbm || 67)) * 100, 
                                    100
                                  )}%` 
                                }}
                              />
                            </div>
                          </div>
                          
                          {/* Weight Utilization */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm">
                              <span>Weight Used:</span>
                              <span className="font-medium">
                                {(container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0) || 0).toLocaleString()} / {(container?.maxWeight || 30000).toLocaleString()} kg
                              </span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div 
                                className="bg-green-500 h-2 rounded-full transition-all"
                                style={{ 
                                  width: `${Math.min(
                                    ((container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0) || 0) / (container?.maxWeight || 30000)) * 100, 
                                    100
                                  )}%` 
                                }}
                              />
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Allocated Orders List - Now Editable */}
                    {container.orders && container.orders.length > 0 ? (
                      <div className="space-y-4">
                        <div className="flex justify-between items-center">
                          <h4 className="text-lg font-semibold">Allocated Orders (Editable)</h4>
                          <p className="text-sm text-gray-600">Click on values to edit allocation quantities</p>
                        </div>
                        
                        {container.orders.map((orderAllocation, orderIndex) => {
                          // Calculate max available cartons for this order - FIXED QC VALIDATION
                          const orderItems = orderAllocation.orderId?.items || []
                          const totalQcPassed = orderItems.reduce((sum, item) => sum + (item.qcPassedCartons || 0), 0)
                          const totalAllocated = orderItems.reduce((sum, item) => sum + (item.allocatedCartons || 0), 0)
                          const currentOrderAllocation = orderAllocation.cartonShare || 0
                                    
                          // FIXED: Simplified QC calculation - allow up to full QC passed quantity
                          const alreadyAllocatedElsewhere = Math.max(0, totalAllocated - currentOrderAllocation)
                          const maxAvailableCartons = totalQcPassed
                          
                          return (
                          <Card key={orderIndex} className="hover:shadow-md transition-shadow border-l-4 border-l-blue-500">
                            <CardContent className="pt-6">
                              <div className="flex justify-between items-start mb-4">
                                <div className="flex-1">
                                  <div className="flex items-center gap-3 mb-2">
                                    <h4 className="font-medium text-stone-900">
                                      {orderAllocation.orderId?.orderNumber || `Order ${orderIndex + 1}`}
                                    </h4>
                                    <Badge variant="outline" className="text-xs">
                                      {orderAllocation.paymentType === 'THROUGH_ME' ? 'Through Agent' : 'Direct Payment'}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-stone-600 flex items-center">
                                    <Users className="h-4 w-4 mr-1" />
                                    Client: {orderAllocation.clientName}
                                  </p>
                                </div>
                                
                                <div className="flex items-center space-x-2">
                                  <Button 
                                    variant="outline" 
                                    size="sm"
                                    onClick={() => navigate(`/orders/${orderAllocation.orderId?._id || orderAllocation.orderId}`)}
                                  >
                                    <Eye className="h-4 w-4 mr-1" />
                                    View Order
                                  </Button>
                                  <Button 
                                    variant="destructive" 
                                    size="sm"
                                    onClick={() => handleRemoveOrderAllocation(orderAllocation, orderIndex)}
                                  >
                                    <X className="h-4 w-4 mr-1" />
                                    Remove
                                  </Button>
                                </div>
                              </div>
                              
                              {/* Editable Order Allocation Summary */}
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
                                <div className="bg-blue-50 p-3 rounded-lg text-center">
                                  <Label className="text-xs text-blue-700 block mb-1">CBM</Label>
                                  <Input
                                    type="text"
                                    value={orderAllocation.cbmShare || 0}
                                    readOnly
                                    className="text-center font-bold text-blue-600 border-blue-300 bg-blue-100 cursor-not-allowed"
                                  />
                                  <p className="text-xs text-blue-600 mt-1">Cubic Meters</p>
                                </div>
                                <div className="bg-green-50 p-3 rounded-lg text-center">
                                  <Label className="text-xs text-green-700 block mb-1">Weight (kg)</Label>
                                  <Input
                                    type="text"
                                    value={orderAllocation.weightShare || 0}
                                    readOnly
                                    className="text-center font-bold text-green-600 border-green-300 bg-green-100 cursor-not-allowed"
                                  />
                                  <p className="text-xs text-green-600 mt-1">Kilograms</p>
                                </div>
                                <div className="bg-orange-50 p-3 rounded-lg text-center">
                                  <Label className="text-xs text-orange-700 block mb-1">
                                    Cartons 🔒 
                                    <span className="text-xs text-red-600 font-medium">(QC Protected)</span>
                                  </Label>
                                  <Input
                                    type="text"
                                    value={orderAllocation.cartonShare || ''}
                                    readOnly
                                    className="text-center font-bold text-orange-600 border-orange-300 bg-orange-100 cursor-not-allowed"
                                    placeholder={`QC Passed: ${totalQcPassed}`}
                                  />
                                  <p className="text-xs text-orange-600 mt-1">
                                    Total Cartons
                                    <br />
                                    <span className="text-red-600 font-medium">
                                      Max: {maxAvailableCartons}
                                    </span>
                                  </p>
                                </div>
                                <div className="bg-purple-50 p-3 rounded-lg text-center">
                                  <Label className="text-xs text-purple-700 block mb-1">Revenue (₹)</Label>
                                  <Input
                                    type="text"
                                    value={orderAllocation.carryingCharges || 0}
                                    readOnly
                                    className="text-center font-bold text-purple-600 border-purple-300 bg-purple-100 cursor-not-allowed"
                                  />
                                  <p className="text-xs text-purple-600 mt-1">Carrying Charges</p>
                                </div>
                              </div>

                              {/* Editable Item-Level Details */}
                              {orderAllocation.orderId?.items && orderAllocation.orderId.items.length > 0 && (
                                <div className="space-y-3">
                                  <div className="flex justify-between items-center">
                                    <h5 className="font-medium text-stone-800">Order Items (Editable)</h5>
                                    <div className="flex space-x-2">
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => autoPopulateItemData(orderIndex)}
                                        className="text-xs"
                                      >
                                        <Zap className="h-3 w-3 mr-1" />
                                        Auto-Fix Data
                                      </Button>
                                      <Button 
                                        variant="outline" 
                                        size="sm"
                                        onClick={() => handleAddNewItemToOrder(orderIndex)}
                                        className="text-xs"
                                      >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Item
                                      </Button>
                                    </div>
                                  </div>
                                  
                                  {/* QC Validation Summary Panel */}
                                  {(() => {
                                    const allItems = orderAllocation.orderId.items || [];
                                    const itemsWithViolations = allItems.filter(item => (item.cartons || 0) > (item.qcPassedCartons || 0));
                                    const totalViolations = itemsWithViolations.length;
                                    const hasAnyViolations = totalViolations > 0;
                                    
                                    if (hasAnyViolations) {
                                      return (
                                        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-lg">
                                          <div className="flex items-center justify-between mb-2">
                                            <div className="flex items-center text-red-700">
                                              <AlertTriangle className="h-4 w-4 mr-2" />
                                              <span className="font-medium">QC Validation Issues Detected</span>
                                            </div>
                                            <Badge variant="destructive" className="text-xs">
                                              {totalViolations} {totalViolations === 1 ? 'Issue' : 'Issues'}
                                            </Badge>
                                          </div>
                                          <div className="text-sm text-red-600 space-y-1">
                                            {itemsWithViolations.map((item, idx) => {
                                              const allocated = item.cartons || 0;
                                              const qcPassed = item.qcPassedCartons || 0;
                                              const excess = allocated - qcPassed;
                                              return (
                                                <div key={idx} className="flex justify-between">
                                                  <span>• {item.itemCode}: {allocated} allocated, {qcPassed} QC passed</span>
                                                  <span className="font-medium text-red-700">+{excess} excess</span>
                                                </div>
                                              );
                                            })}
                                          </div>
                                          <div className="mt-3 flex gap-2">
                                            <Button
                                              size="sm"
                                              variant="outline"
                                              onClick={() => {
                                                // Auto-fix QC violations
                                                itemsWithViolations.forEach((item, itemIdx) => {
                                                  const actualItemIndex = allItems.findIndex(i => i._id === item._id);
                                                  if (actualItemIndex !== -1) {
                                                    const qcPassed = item.qcPassedCartons || 0;
                                                    handleUpdateItemInOrder(orderIndex, actualItemIndex, 'cartons', qcPassed);
                                                  }
                                                });
                                                toast.success(`✅ Fixed ${totalViolations} QC ${totalViolations === 1 ? 'issue' : 'issues'}!`);
                                              }}
                                              className="text-red-700 border-red-300 hover:bg-red-100"
                                            >
                                              <Zap className="h-3 w-3 mr-1" />
                                              Auto-Fix Issues
                                            </Button>
                                            <div className="text-xs text-red-600 flex items-center">
                                              <span>📝 Fix will set allocations to match QC passed quantities</span>
                                            </div>
                                          </div>
                                        </div>
                                      );
                                    } else {
                                      return (
                                        <div className="mb-4 p-2 bg-green-50 border border-green-200 rounded-lg">
                                          <div className="flex items-center text-green-700">
                                            <CheckCircle className="h-4 w-4 mr-2" />
                                            <span className="text-sm font-medium">✅ All allocations respect QC limits</span>
                                          </div>
                                        </div>
                                      );
                                    }
                                  })()}
                                  <div className="grid grid-cols-12 gap-2 text-xs font-medium text-gray-700 bg-gray-100 p-2 rounded">
                                    <div className="col-span-3">Item Code</div>
                                    <div className="col-span-2 text-center">Qty</div>
                                    <div className="col-span-2 text-center">
                                      Cartons 🔒 
                                      <span className="text-red-600 font-medium">(QC)</span>
                                    </div>
                                    <div className="col-span-2 text-center">CBM</div>
                                    <div className="col-span-2 text-center">Weight (kg)</div>
                                    <div className="col-span-1 text-center">Actions</div>
                                  </div>
                                  
                                  {/* Editable Items */}
                                  <div className="space-y-2">
                                    {orderAllocation.orderId.items.map((item, itemIndex) => {
                                      // Calculate QC available for this specific item - SIMPLIFIED VALIDATION
                                      const qcPassed = item.qcPassedCartons || 0;
                                      const allocated = item.allocatedCartons || 0;
                                      const currentAllocation = item.cartons || 0;
                                      
                                      // Simple calculation: allow up to QC passed quantity
                                      // Don't restrict based on other allocations since user needs flexibility
                                      const maxAvailableForItem = qcPassed;
                                      
                                      // QC Violation Detection
                                      const hasQCViolation = currentAllocation > qcPassed;
                                      const qcViolationAmount = hasQCViolation ? currentAllocation - qcPassed : 0;
                                      
                                      return (
                                      <div key={itemIndex} className={`grid grid-cols-12 gap-2 items-center p-3 border rounded hover:bg-stone-100 transition-colors ${
                                        hasQCViolation 
                                          ? 'bg-red-50 border-red-300 shadow-sm' 
                                          : 'bg-stone-50 border-stone-200'
                                      }`}>
                                        <div className="col-span-3">
                                          <div className="flex items-center gap-2">
                                            <div>
                                              <p className="font-medium text-sm">{item.itemCode || 'N/A'}</p>
                                              <p className="text-xs text-gray-600 truncate">{item.description || 'No description'}</p>
                                            </div>
                                            {hasQCViolation && (
                                              <div className="flex items-center text-red-600">
                                                <AlertTriangle className="h-4 w-4" />
                                                <span className="text-xs ml-1 font-medium">QC Issue</span>
                                              </div>
                                            )}
                                          </div>
                                          {hasQCViolation && (
                                            <div className="mt-1 text-xs text-red-700 bg-red-100 px-2 py-1 rounded">
                                              ⚠️ Allocated {qcViolationAmount} more than QC passed
                                            </div>
                                          )}
                                        </div>
                                        
                                        <div className="col-span-2">
                                          <Input
                                            type="text"
                                            value={item.quantity || ''}
                                            onChange={(e) => handleUpdateItemInOrder(orderIndex, itemIndex, 'quantity', parseInt(e.target.value) || 0)}
                                            className="text-center text-sm h-8"
                                          />
                                        </div>
                                        
                                        <div className="col-span-2">
                                          <Input
                                            type="text"
                                            value={item.cartons || ''}
                                            onChange={(e) => {
                                              const value = parseInt(e.target.value) || 0
                                              
                                              // QC VALIDATION: Show informative messages but allow input for user flexibility
                                              if (value > maxAvailableForItem) {
                                                toast.error(`${item.itemCode}: You're allocating ${value} cartons, but only ${qcPassed} cartons passed QC`, { duration: 4000 })
                                              }
                                              
                                              // QC violation notice (non-blocking)
                                              if (value > qcPassed) {
                                                toast.error(`⚠️ QC NOTICE: Allocating ${value} cartons, but only ${qcPassed} passed QC for ${item.itemCode}`, { duration: 4000 })
                                              }
                                              
                                              // Allow any positive value - no restrictions
                                              handleUpdateItemInOrder(orderIndex, itemIndex, 'cartons', value)
                                            }}
                                            className={`text-center text-sm h-8 focus:border-orange-500 ${
                                              hasQCViolation 
                                                ? 'border-orange-400 bg-orange-50 text-orange-700' 
                                                : 'border-orange-300'
                                            }`}
                                            placeholder={`QC Passed: ${qcPassed}`}
                                          />
                                        </div>
                                        
                                        <div className="col-span-2">
                                          <Input
                                            type="text"
                                            value={item.cbm || ''}
                                            onChange={(e) => handleUpdateItemInOrder(orderIndex, itemIndex, 'cbm', parseFloat(e.target.value) || 0)}
                                            className="text-center text-sm h-8 border-blue-300 focus:border-blue-500"
                                          />
                                        </div>
                                        
                                        <div className="col-span-2">
                                          <Input
                                            type="text"
                                            value={item.weight || ''}
                                            onChange={(e) => handleUpdateItemInOrder(orderIndex, itemIndex, 'weight', parseFloat(e.target.value) || 0)}
                                            className="text-center text-sm h-8 border-green-300 focus:border-green-500"
                                          />
                                        </div>
                                        
                                        <div className="col-span-1 text-center">
                                          <Button
                                            variant="ghost"
                                            size="sm"
                                            onClick={() => handleRemoveItemFromOrder(orderIndex, itemIndex)}
                                            className="h-8 w-8 p-0 text-red-600 hover:text-red-800 hover:bg-red-50"
                                          >
                                            <Trash2 className="h-3 w-3" />
                                          </Button>
                                        </div>
                                      </div>
                                    )})}
                                  </div>
                                  
                                  {/* Items Summary */}
                                  <div className="bg-stone-100 p-3 rounded-lg">
                                    <div className="grid grid-cols-4 gap-4 text-sm">
                                      <div className="text-center">
                                        <p className="font-medium text-blue-600">
                                          {orderAllocation.orderId.items.reduce((sum, item) => sum + (item.quantity || 0), 0)}
                                        </p>
                                        <p className="text-xs text-gray-600">Total Quantity</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="font-medium text-orange-600">
                                          {orderAllocation.orderId.items.reduce((sum, item) => sum + (item.cartons || 0), 0)}
                                        </p>
                                        <p className="text-xs text-gray-600">Total Cartons</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="font-medium text-blue-600">
                                          {orderAllocation.orderId.items.reduce((sum, item) => sum + (item.cbm || 0), 0).toFixed(2)}
                                        </p>
                                        <p className="text-xs text-gray-600">Total CBM</p>
                                      </div>
                                      <div className="text-center">
                                        <p className="font-medium text-green-600">
                                          {orderAllocation.orderId.items.reduce((sum, item) => sum + (item.weight || 0), 0).toFixed(1)}
                                        </p>
                                        <p className="text-xs text-gray-600">Total Weight (kg)</p>
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </CardContent>
                          </Card>
                        )
                      })}
                        
                        {/* Container Utilization After Changes */}
                        <Card className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200">
                          <CardContent className="pt-6">
                            <h4 className="font-semibold text-green-900 mb-4 flex items-center">
                              <BarChart3 className="h-5 w-5 mr-2" />
                              Real-Time Container Utilization
                            </h4>
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                                <p className="text-2xl font-bold text-green-800">
                                  {((container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0) || 0) / (container?.maxCbm || 67) * 100).toFixed(1)}%
                                </p>
                                <p className="text-sm text-green-600">CBM Utilization</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(container.orders?.reduce((sum, order) => sum + (order.cbmShare || 0), 0) || 0).toFixed(1)} / {container?.maxCbm || 67} CBM
                                </p>
                              </div>
                              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                                <p className="text-2xl font-bold text-green-800">
                                  {((container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0) || 0) / (container?.maxWeight || 30000) * 100).toFixed(1)}%
                                </p>
                                <p className="text-sm text-green-600">Weight Utilization</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {(container.orders?.reduce((sum, order) => sum + (order.weightShare || 0), 0) || 0).toLocaleString()} / {(container?.maxWeight || 30000).toLocaleString()} kg
                                </p>
                              </div>
                              <div className="text-center p-4 bg-white rounded-lg border border-green-200">
                                <p className="text-2xl font-bold text-green-800">
                                  ₹{(container.orders?.reduce((sum, order) => sum + (order.carryingCharges || 0), 0) || 0).toLocaleString()}
                                </p>
                                <p className="text-sm text-green-600">Total Revenue</p>
                                <p className="text-xs text-gray-500 mt-1">
                                  {container.orders?.length || 0} orders allocated
                                </p>
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                        
                        {/* Add More Orders Button */}
                        <div className="flex justify-center pt-4">
                          <Button 
                            onClick={handleAddNewOrderAllocation}
                            className="px-6 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800"
                          >
                            <Plus className="h-4 w-4 mr-2" />
                            Add More Orders
                          </Button>
                        </div>
                      </div>
                    ) : (
                      <div className="text-center py-12">
                        <Package className="h-16 w-16 text-stone-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-stone-900 mb-2">No Orders Allocated</h3>
                        <p className="text-stone-500 mb-6">This container doesn't have any orders allocated yet.</p>
                        <Button onClick={handleAddNewOrderAllocation}>
                          <Plus className="h-4 w-4 mr-2" />
                          Add Orders to Container
                        </Button>
                      </div>
                    )}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>

        {/* Delete Confirmation Dialog */}
        {showDeleteDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-md mx-4">
              <CardHeader>
                <CardTitle className="flex items-center text-red-600">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Delete Container
                </CardTitle>
                <CardDescription>
                  This action cannot be undone. All allocated orders will be reset to ready status.
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Alert>
                    <AlertTriangle className="h-4 w-4" />
                    <AlertDescription>
                      Type <strong>{container.realContainerId}</strong> below to confirm deletion.
                    </AlertDescription>
                  </Alert>
                  
                  <Input
                    placeholder={container.realContainerId}
                    value={deleteConfirmText}
                    onChange={(e) => setDeleteConfirmText(e.target.value)}
                  />
                  
                  <div className="flex justify-end space-x-2">
                    <Button 
                      variant="outline" 
                      onClick={() => {
                        setShowDeleteDialog(false)
                        setDeleteConfirmText('')
                      }}
                    >
                      Cancel
                    </Button>
                    <Button 
                      variant="destructive" 
                      onClick={handleDelete}
                      disabled={deleting || deleteConfirmText !== container.realContainerId}
                    >
                      {deleting ? (
                        <>
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                          Deleting...
                        </>
                      ) : (
                        <>
                          <Trash2 className="h-4 w-4 mr-2" />
                          Delete Container
                        </>
                      )}
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Enhanced Order Search Dialog - Like Warehouse Allocation */}
        {showOrderSearch && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-7xl mx-4 max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Search className="h-5 w-5 mr-2" />
                      Select Orders for Container Allocation
                    </CardTitle>
                    <CardDescription>
                      Item-level selection with quantity controls - like warehouse allocation interface
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowOrderSearch(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[70vh]">
                <div className="grid grid-cols-12 gap-6">
                  {/* Left Panel - Orders & Items */}
                  <div className="col-span-8 space-y-4">
                    {/* Container Capacity Status */}
                    <Card>
                      <CardHeader>
                        <div className="flex items-center justify-between">
                          <div>
                            <CardTitle className="flex items-center">
                              <Ship className="h-5 w-5 mr-2" />
                              Container: {container?.maxCbm || 67} CBM
                            </CardTitle>
                            <p className="text-sm text-gray-600">
                              Used: {utilizationStats.usedCbm.toFixed(1)} CBM • Remaining: {utilizationStats.remainingCbm.toFixed(1)} CBM
                            </p>
                          </div>
                          <Button onClick={autoFillBestItems} className="bg-green-600 hover:bg-green-700">
                            <Calculator className="h-4 w-4 mr-2" />
                            Auto Fill Best
                          </Button>
                        </div>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Utilization</span>
                            <span>{utilizationStats.utilizationPercent.toFixed(1)}%</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-3">
                            <div 
                              className={`h-3 rounded-full transition-all ${
                                utilizationStats.utilizationPercent > 100 ? 'bg-red-500' :
                                utilizationStats.utilizationPercent > 95 ? 'bg-green-500' :
                                utilizationStats.utilizationPercent > 50 ? 'bg-blue-500' : 'bg-gray-400'
                              }`}
                              style={{ width: `${Math.min(utilizationStats.utilizationPercent, 100)}%` }}
                            />
                          </div>
                          
                          {utilizationStats.utilizationPercent > 100 && (
                            <Alert className="mt-2">
                              <AlertTriangle className="h-4 w-4" />
                              <AlertDescription>
                                Over capacity! Reduce selection by {(utilizationStats.usedCbm - (container?.maxCbm || 67)).toFixed(1)} CBM
                              </AlertDescription>
                            </Alert>
                          )}
                        </div>
                      </CardContent>
                    </Card>

                    {/* Search and Filter */}
                    <div className="flex items-center space-x-4">
                      <div className="flex-1">
                        <Input
                          placeholder="Search orders by number, client name..."
                          value={orderSearchTerm}
                          onChange={(e) => setOrderSearchTerm(e.target.value)}
                          className="w-full"
                        />
                      </div>
                      <Button variant="outline" onClick={fetchQCReadyOrders} disabled={searchingOrders}>
                        {searchingOrders ? (
                          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
                        ) : (
                          <RefreshCw className="h-4 w-4 mr-2" />
                        )}
                        Refresh
                      </Button>
                    </div>

                    {/* Available Orders & Items */}
                    {searchingOrders ? (
                      <div className="text-center py-8">
                        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
                        <p>Loading QC-ready orders...</p>
                      </div>
                    ) : availableOrders.length === 0 ? (
                      <div className="text-center py-8">
                        <Package className="h-12 w-12 text-stone-400 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-stone-900 mb-2">No QC-Ready Orders</h3>
                        <p className="text-stone-500">No additional orders available for allocation</p>
                      </div>
                    ) : (
                      <Card>
                        <CardHeader>
                          <CardTitle className="flex items-center">
                            <Package className="h-5 w-5 mr-2" />
                            Available Orders
                          </CardTitle>
                          <p className="text-sm text-gray-600">Select items to fill your container (cannot exceed {(container?.maxCbm || 67)} CBM)</p>
                        </CardHeader>
                        <CardContent>
                          <div className="space-y-6">
                            {availableOrders
                              .filter(order => 
                                orderSearchTerm === '' ||
                                order.orderNumber?.toLowerCase().includes(orderSearchTerm.toLowerCase()) ||
                                order.clientName?.toLowerCase().includes(orderSearchTerm.toLowerCase())
                              )
                              .map(order => {
                                const orderTotal = order.items?.reduce((sum, item) => {
                                  const key = `${order._id}_${item._id}`
                                  const selection = selectedOrderItems[key]
                                  const cbm = selection ? (parseFloat(selection.cbm) || 0) : 0
                                  return sum + cbm
                                }, 0) || 0
                                
                                return (
                                  <div key={order._id} className="border rounded-lg p-4">
                                    <div className="flex items-center justify-between mb-3">
                                      <div>
                                        <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                                        <p className="text-sm text-gray-600">{order.clientName}</p>
                                      </div>
                                      <div className="text-right">
                                        <Badge variant="outline">{order.items?.length || 0} items</Badge>
                                        {orderTotal > 0 && (
                                          <p className="text-sm text-green-600 mt-1">{orderTotal.toFixed(1)} CBM selected</p>
                                        )}
                                      </div>
                                    </div>
                                    
                                    <div className="space-y-3">
                                      {order.items?.map(item => {
                                        const key = `${order._id}_${item._id}`
                                        const selection = selectedOrderItems[key]
                                        
                                        // Use correct property names from API response
                                        const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0)
                                        const cbmPerCarton = item.unitCbm || 0
                                        const weightPerCarton = item.unitWeight || 0
                                        const carryingChargePerCarton = item.carryingCharge?.rate || 0
                                        
                                        const selected = selection?.quantity || 0
                                        const maxCbm = (container?.maxCbm || 67) - utilizationStats.usedCbm
                                        const currentTotal = Object.values(selectedOrderItems).reduce((sum, sel) => {
                                          return sum + (parseFloat(sel.cbm) || 0)
                                        }, 0)
                                        
                                        const maxCanAdd = cbmPerCarton > 0 ? Math.floor((maxCbm + (selected * cbmPerCarton)) / cbmPerCarton) : maxAvailable
                                        const actualMax = Math.min(maxAvailable, maxCanAdd)
                                        
                                        return (
                                          <div key={item._id} className="bg-gray-50 rounded p-3">
                                            <div className="grid grid-cols-12 items-center gap-3">
                                              <div className="col-span-4">
                                                <p className="font-medium">{item.itemCode}</p>
                                                <p className="text-xs text-gray-600">{item.description}</p>
                                              </div>
                                              
                                              <div className="col-span-2 text-center">
                                                <p className="text-sm font-medium">{cbmPerCarton > 0 ? cbmPerCarton.toFixed(2) : '0.00'} CBM</p>
                                                <p className="text-xs text-gray-600">per carton</p>
                                              </div>
                                              
                                              <div className="col-span-2 text-center">
                                                <p className="text-sm font-medium">{maxAvailable}</p>
                                                <p className="text-xs text-gray-600">available</p>
                                              </div>
                                              
                                              <div className="col-span-3">
                                                <div className="flex items-center gap-2">
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateItemSelection(order._id, item._id, selected - 1)}
                                                    disabled={selected <= 0}
                                                  >
                                                    <Minus className="h-3 w-3" />
                                                  </Button>
                                                  
                                                  <Input
                                                    type="text"
                                                    value={selected}
                                                    onChange={(e) => updateItemSelection(order._id, item._id, parseInt(e.target.value) || 0)}
                                                    className="w-16 text-center"
                                                    max={actualMax}
                                                  />
                                                  
                                                  <Button
                                                    size="sm"
                                                    variant="outline"
                                                    onClick={() => updateItemSelection(order._id, item._id, selected + 1)}
                                                    disabled={selected >= actualMax}
                                                  >
                                                    <Plus className="h-3 w-3" />
                                                  </Button>
                                                </div>
                                                {actualMax < maxAvailable && (
                                                  <p className="text-xs text-red-600 mt-1">CBM limit: max {actualMax}</p>
                                                )}
                                              </div>
                                              
                                              <div className="col-span-1 text-right">
                                                {selected > 0 && (
                                                  <CheckCircle className="h-4 w-4 text-green-500" />
                                                )}
                                              </div>
                                            </div>
                                            
                                            {selected > 0 && (
                                              <div className="mt-2 pt-2 border-t border-gray-200">
                                                <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                                                  <div>CBM: {(selected * cbmPerCarton).toFixed(2)}</div>
                                                  <div>Weight: {(selected * weightPerCarton).toFixed(0)} kg</div>
                                                  <div>Charges: ₹{(selected * carryingChargePerCarton).toFixed(0)}</div>
                                                </div>
                                              </div>
                                            )}
                                          </div>
                                        )
                                      })}
                                    </div>
                                  </div>
                                )
                              })
                            }
                          </div>
                        </CardContent>
                      </Card>
                    )}
                  </div>

                  {/* Right Panel - Selection Summary */}
                  <div className="col-span-4 space-y-6">
                    {/* Selection Summary */}
                    <Card>
                      <CardHeader>
                        <CardTitle>Selection Summary</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-4">
                          <div className="grid grid-cols-2 gap-4 text-center">
                            <div>
                              <p className="text-lg font-bold text-blue-600">{Object.keys(selectedOrderItems).length}</p>
                              <p className="text-xs text-gray-600">Items Selected</p>
                            </div>
                            <div>
                              <p className="text-lg font-bold text-green-600">
                                {Object.values(selectedOrderItems).reduce((sum, sel) => sum + sel.quantity, 0)}
                              </p>
                              <p className="text-xs text-gray-600">Total Cartons</p>
                            </div>
                          </div>
                          
                          <Separator />
                          
                          <div className="space-y-2 text-sm">
                            <div className="flex justify-between">
                              <span>Total CBM:</span>
                              <span className="font-medium">
                                {Object.values(selectedOrderItems).reduce((sum, sel) => sum + (parseFloat(sel.cbm) || 0), 0).toFixed(1)}
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Weight:</span>
                              <span className="font-medium">
                                {Object.values(selectedOrderItems).reduce((sum, sel) => sum + (parseFloat(sel.weight) || 0), 0).toFixed(0)} kg
                              </span>
                            </div>
                            <div className="flex justify-between">
                              <span>Total Charges:</span>
                              <span className="font-medium">
                                ₹{Object.values(selectedOrderItems).reduce((sum, sel) => sum + (parseFloat(sel.charges) || 0), 0).toFixed(0)}
                              </span>
                            </div>
                          </div>
                        </div>
                      </CardContent>
                    </Card>

                    {/* Action Buttons */}
                    <div className="space-y-3">
                      <Button 
                        onClick={applySelectedItemsToContainer}
                        disabled={Object.keys(selectedOrderItems).length === 0 || utilizationStats.utilizationPercent > 100 || saving}
                        className="w-full bg-green-600 hover:bg-green-700"
                        size="lg"
                      >
                        {saving ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                            Adding to Container...
                          </>
                        ) : (
                          <>
                            <Plus className="h-4 w-4 mr-2" />
                            Add Selected Items to Container
                          </>
                        )}
                      </Button>
                      
                      <Button variant="outline" onClick={() => setShowOrderSearch(false)} className="w-full">
                        Cancel
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Container Templates Dialog */}
        {showTemplateDialog && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Copy className="h-5 w-5 mr-2" />
                      Container Templates
                    </CardTitle>
                    <CardDescription>
                      Choose a template to auto-fill container details
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowTemplateDialog(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {containerTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => applyContainerTemplate(template)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-stone-900">{template.name}</h4>
                          <p className="text-sm text-stone-600">{template.description}</p>
                          <div className="grid grid-cols-4 gap-4 mt-2 text-xs">
                            <div>GST: ₹{template.baseCharges.gst}</div>
                            <div>Duty: ₹{template.baseCharges.duty}</div>
                            <div>Misc: ₹{template.baseCharges.misc}</div>
                            <div>Extra: ₹{template.baseCharges.extraCharge}</div>
                          </div>
                        </div>
                        <Badge variant="outline">{template.type}</Badge>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Charge Templates Dialog */}
        {showChargeTemplates && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-2xl mx-4">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Calculator className="h-5 w-5 mr-2" />
                      Charge Presets
                    </CardTitle>
                    <CardDescription>
                      Apply predefined charge templates
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowChargeTemplates(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {chargeTemplates.map(template => (
                    <div 
                      key={template.id}
                      className="border rounded-lg p-4 cursor-pointer hover:border-blue-300 transition-colors"
                      onClick={() => applyChargeTemplate(template)}
                    >
                      <div>
                        <h4 className="font-medium text-stone-900">{template.name}</h4>
                        <p className="text-sm text-stone-600 mb-2">{template.description}</p>
                        <div className="grid grid-cols-4 gap-4 text-sm">
                          <div>
                            <span className="text-stone-500">GST:</span>
                            <span className="font-medium ml-1">
                              {template.charges.gst}%
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500">Duty:</span>
                            <span className="font-medium ml-1">
                              ₹{template.charges.duty}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500">Misc:</span>
                            <span className="font-medium ml-1">
                              ₹{template.charges.misc}
                            </span>
                          </div>
                          <div>
                            <span className="text-stone-500">Extra:</span>
                            <span className="font-medium ml-1">
                              ₹{template.charges.extraCharge}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Optimization Suggestions Dialog */}
        {showOptimization && optimizationSuggestions && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <Card className="w-full max-w-3xl mx-4 max-h-[90vh] overflow-hidden">
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center">
                      <Target className="h-5 w-5 mr-2" />
                      Container Optimization Analysis
                    </CardTitle>
                    <CardDescription>
                      Suggestions to improve container efficiency and profitability
                    </CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => setShowOptimization(false)}>
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="overflow-y-auto max-h-[70vh]">
                <div className="space-y-6">
                  {/* Current Status */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="text-center p-4 bg-blue-50 rounded-lg">
                      <p className="text-2xl font-bold text-blue-600">
                        {optimizationSuggestions.current.cbmUtilization}%
                      </p>
                      <p className="text-sm text-blue-700">CBM Utilization</p>
                    </div>
                    <div className="text-center p-4 bg-green-50 rounded-lg">
                      <p className="text-2xl font-bold text-green-600">
                        {optimizationSuggestions.current.weightUtilization}%
                      </p>
                      <p className="text-sm text-green-700">Weight Utilization</p>
                    </div>
                    <div className="text-center p-4 bg-yellow-50 rounded-lg">
                      <p className="text-2xl font-bold text-yellow-600">
                        ₹{optimizationSuggestions.current.revenue.toLocaleString()}
                      </p>
                      <p className="text-sm text-yellow-700">Revenue</p>
                    </div>
                    <div className="text-center p-4 bg-purple-50 rounded-lg">
                      <p className="text-2xl font-bold text-purple-600">
                        {optimizationSuggestions.current.orders}
                      </p>
                      <p className="text-sm text-purple-700">Orders</p>
                    </div>
                  </div>

                  {/* Recommendations */}
                  <div>
                    <h4 className="font-medium text-stone-900 mb-4 flex items-center">
                      <BarChart3 className="h-4 w-4 mr-2" />
                      Optimization Recommendations
                    </h4>
                    {optimizationSuggestions.recommendations.length === 0 ? (
                      <div className="text-center py-8">
                        <CheckCircle className="h-12 w-12 text-green-500 mx-auto mb-4" />
                        <h3 className="text-lg font-medium text-green-900 mb-2">Container Optimized!</h3>
                        <p className="text-green-700">Your container allocation is already well-optimized.</p>
                      </div>
                    ) : (
                      <div className="space-y-4">
                        {optimizationSuggestions.recommendations.map((rec, index) => {
                          const priorityColors = {
                            critical: 'border-red-200 bg-red-50',
                            high: 'border-orange-200 bg-orange-50',
                            medium: 'border-yellow-200 bg-yellow-50',
                            low: 'border-blue-200 bg-blue-50'
                          }
                          
                          return (
                            <div key={index} className={`border rounded-lg p-4 ${priorityColors[rec.priority]}`}>
                              <div className="flex items-start justify-between">
                                <div className="flex-1">
                                  <div className="flex items-center gap-2 mb-2">
                                    <h5 className="font-medium text-stone-900">{rec.title}</h5>
                                    <Badge 
                                      variant={rec.priority === 'critical' ? 'destructive' : 'secondary'}
                                      className="text-xs"
                                    >
                                      {rec.priority.toUpperCase()}
                                    </Badge>
                                  </div>
                                  <p className="text-sm text-stone-600 mb-2">{rec.description}</p>
                                  <p className="text-sm font-medium text-stone-800">
                                    🎯 {rec.action}
                                  </p>
                                </div>
                              </div>
                            </div>
                          )
                        })}
                      </div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </motion.div>
    </div>
  )
}

export default ContainerEdit