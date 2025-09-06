import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  CheckCircle,
  XCircle,
  AlertTriangle,
  Camera,
  FileText,
  Package,
  Scale,
  Ruler,
  Save,
  RotateCcw,
  Eye,
  ThumbsUp,
  ThumbsDown,
  X,
  Container
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Textarea } from '@/components/ui/textarea'
import { Badge } from '@/components/ui/badge'
import { useAuthStore } from '@/stores/authStore'
import axios from 'axios'
import toast from 'react-hot-toast'

const QCInspector = ({ order, onResult, onClose }) => {
  const { user } = useAuthStore()
  const [inspectionData, setInspectionData] = useState({
    orderId: order?._id,
    inspectorId: user?.id,
    inspectionDate: new Date().toISOString().split('T')[0],
    overallStatus: 'pending',
    isReInspection: order?.qcCompletedAt ? true : false, // Track if this is a re-inspection
    items: order?.items?.map(item => {
      // CARTON-BASED QC TRACKING (PRIMARY)
      const qcPassedCtn = item.qcPassedCartons || 0
      const expectedCtn = item.cartons || 0
      const loopBackCtn = item.loopBackCartons || Math.max(0, expectedCtn - qcPassedCtn)
      
      // QUANTITY-BASED QC TRACKING (LEGACY COMPATIBILITY)
      const qcPassed = item.qcPassedQuantity || 0
      const expectedQty = item.quantity || 0
      const loopBack = item.loopBackQuantity || Math.max(0, expectedQty - qcPassed)
      
      return {
        itemIndex: item._id,
        itemCode: item.itemCode,
        description: item.description,
        // Carton-based tracking (primary)
        expectedCartons: expectedCtn,
        qcPassedCartons: qcPassedCtn,
        loopBackCartons: loopBackCtn,
        // Quantity-based tracking (legacy)
        expectedQuantity: expectedQty,
        qcPassedQuantity: qcPassed,
        loopBackQuantity: loopBack,
        // Container allocation data
        allocatedCartons: item.allocatedCartons || 0,
        allocatedQuantity: item.allocatedQuantity || 0,
        containerId: item.containerId || null,
        // Use carton-based calculation for status (primary)
        status: qcPassedCtn === expectedCtn ? 'approved' : 
               qcPassedCtn > 0 ? 'partial' : 'pending',
        notes: item.qcNotes || '',
        defects: item.qcDefects || []
      }
    }) || []
  })
  const [currentItemIndex, setCurrentItemIndex] = useState(0)
  const [loading, setLoading] = useState(false)

  const currentItem = inspectionData.items[currentItemIndex]

  const handleItemInspection = (itemIndex, field, value) => {
    setInspectionData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === itemIndex ? { ...item, [field]: value } : item
      )
    }))
  }

  const handleQuantityChange = (itemIndex, qcPassedQuantity, loopBackQuantity, qcPassedCartons, loopBackCartons) => {
    // CARTON-BASED HANDLING (PRIMARY)
    const qcPassedCtn = Math.max(0, parseInt(qcPassedCartons) || 0)
    const expectedCtn = inspectionData.items[itemIndex]?.expectedCartons || 0
    const calculatedLoopBackCtn = Math.max(0, expectedCtn - qcPassedCtn)
    
    // QUANTITY-BASED HANDLING (LEGACY COMPATIBILITY)
    const qcPassed = Math.max(0, parseInt(qcPassedQuantity) || 0)
    const expectedQty = inspectionData.items[itemIndex]?.expectedQuantity || 0
    const calculatedLoopBack = Math.max(0, expectedQty - qcPassed)
    
    setInspectionData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === itemIndex 
          ? { 
              ...item,
              // Carton-based updates (primary)
              qcPassedCartons: qcPassedCtn,
              loopBackCartons: loopBackCartons !== undefined ? loopBackCartons : calculatedLoopBackCtn,
              // Quantity-based updates (legacy)
              qcPassedQuantity: qcPassed,
              loopBackQuantity: loopBackQuantity !== undefined ? loopBackQuantity : calculatedLoopBack,
              // Update status based on carton completion (primary)
              status: qcPassedCtn === expectedCtn ? 'approved' : 
                     qcPassedCtn > 0 ? 'partial' : 'pending'
            } 
          : item
      )
    }))
  }

  const addDefect = (itemIndex, defect) => {
    setInspectionData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === itemIndex
          ? { ...item, defects: [...item.defects, defect] }
          : item
      )
    }))
  }

  const removeDefect = (itemIndex, defectIndex) => {
    setInspectionData(prev => ({
      ...prev,
      items: prev.items.map((item, idx) =>
        idx === itemIndex
          ? { ...item, defects: item.defects.filter((_, dIdx) => dIdx !== defectIndex) }
          : item
      )
    }))
  }

  const calculateOverallStatus = (items = inspectionData.items) => {
    // Use carton-based calculation as primary, fall back to quantity-based
    const allCompletedCartons = items.every(item => {
      const qcPassedCtn = item.qcPassedCartons || 0
      const expectedCtn = item.expectedCartons || 0
      return expectedCtn > 0 ? qcPassedCtn === expectedCtn : (item.qcPassedQuantity || 0) === item.expectedQuantity
    })
    
    const hasLoopBackCartons = items.some(item => (item.loopBackCartons || 0) > 0)
    const hasLoopBackQuantity = items.some(item => (item.loopBackQuantity || 0) > 0)
    const hasLoopBack = hasLoopBackCartons || hasLoopBackQuantity
    
    const hasQcPassedCartons = items.some(item => (item.qcPassedCartons || 0) > 0)
    const hasQcPassedQuantity = items.some(item => (item.qcPassedQuantity || 0) > 0)
    const hasQcPassed = hasQcPassedCartons || hasQcPassedQuantity
    
    if (allCompletedCartons && !hasLoopBack) return 'approved'
    if (hasLoopBack || hasQcPassed) return 'partial'
    return 'pending'
  }

  const handleSubmitInspection = async () => {
    try {
      setLoading(true)

      // Prepare data in the format backend expects (carton-based primary)
      const inspectionPayload = {
        orderId: inspectionData.orderId,
        inspectorId: inspectionData.inspectorId,
        items: inspectionData.items.map(item => ({
          itemIndex: item.itemIndex,
          itemCode: item.itemCode,
          description: item.description,
          // Carton-based data (primary)
          expectedCartons: item.expectedCartons,
          qcPassedCartons: item.qcPassedCartons || 0,
          loopBackCartons: item.loopBackCartons || 0,
          // Quantity-based data (legacy compatibility)
          expectedQuantity: item.expectedQuantity,
          qcPassedQuantity: item.qcPassedQuantity || 0,
          loopBackQuantity: item.loopBackQuantity || 0,
          // Metadata
          notes: item.notes,
          defects: item.defects || []
        }))
      }

      console.log('Submitting QC inspection:', inspectionPayload)

      const response = await axios.post('/api/warehouse/qc-inspection', inspectionPayload)

      // Enhanced success message with loop-back info
      const summary = response.data.summary
      const isReInspection = response.data.isReInspection
      
      let successMessage = isReInspection ? 
        'QC Re-inspection completed successfully!' : 
        'QC Inspection completed successfully!'
      
      const updates = []
      
      // Use carton-based summary (primary) with quantity fallback
      if (summary.loopBackItemsCartons > 0 || summary.loopBackItems > 0) {
        const cartonLoopBacks = summary.loopBackItemsCartons || 0
        const quantityLoopBacks = summary.loopBackItems || 0
        updates.push(`⚠️ ${Math.max(cartonLoopBacks, quantityLoopBacks)} item(s) with loop-back quantities`)
      }
      
      if (summary.qcPassedItemsCartons > 0 || summary.qcPassedItems > 0) {
        const cartonPassed = summary.qcPassedItemsCartons || 0
        const quantityPassed = summary.qcPassedItems || 0
        updates.push(`✅ ${Math.max(cartonPassed, quantityPassed)} item(s) passed QC`)
      }
      
      if ((summary.completedItemsCartons || summary.completedItems) === summary.totalItems) {
        updates.push(`✨ All items completed!`)
      }
      
      if (updates.length > 0) {
        successMessage += `\n\nSummary:\n${updates.join('\n')}`
      }
      
      toast.success(successMessage, {
        duration: isReInspection ? 8000 : 6000, // Longer duration for re-inspection messages
        style: {
          minWidth: '400px',
          whiteSpace: 'pre-line' // Allow line breaks in toast
        }
      })

      // Trigger callback with results
      if (onResult) {
        const overallStatus = calculateOverallStatus()
        onResult({
          success: true,
          status: overallStatus,
          data: response.data,
          needsLoopback: inspectionData.items.some(item =>
            (item.loopBackCartons || 0) > 0 || (item.loopBackQuantity || 0) > 0
          ),
          summary: response.data.summary
        })
      }

      if (onClose) onClose()
    } catch (error) {
      console.error('QC Inspection error:', error)
      const errorMessage = error.response?.data?.message || error.message || 'Failed to submit QC inspection'
      toast.error(errorMessage)
    } finally {
      setLoading(false)
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'ok': return 'bg-green-100 text-green-800'
      case 'shortage': return 'bg-yellow-100 text-yellow-800'
      case 'damaged': return 'bg-red-100 text-red-800'
      case 'rejected': return 'bg-red-100 text-red-800'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'shortage': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'damaged': return <XCircle className="h-4 w-4 text-red-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Eye className="h-4 w-4 text-stone-600" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-card rounded-lg shadow-xl max-w-6xl w-full max-h-[95vh] flex flex-col"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-amber-500 to-amber-600 text-white p-6 flex-shrink-0">
          <div className="flex items-center justify-between">
            <div className="flex-1">
              <h2 className="text-2xl font-bold">
                {inspectionData.isReInspection ? 'Re-QC Inspection' : 'Quality Control Inspection'}
              </h2>
              <p className="text-amber-100 mt-1">Order: {order?.orderNumber} - {order?.clientName}</p>
              {inspectionData.isReInspection && (
                <div className="mt-2 bg-amber-700/50 rounded-lg p-2 border border-amber-400/30">
                  <p className="text-amber-100 text-sm flex items-center">
                    <AlertTriangle className="h-4 w-4 mr-2" />
                    Re-inspection Mode: Previous QC data loaded. Changes will override existing results and may affect related loop-back orders.
                  </p>
                </div>
              )}
            </div>
            <div className="flex items-center space-x-3 flex-shrink-0">
              <Badge variant="secondary" className="bg-white/20 text-white border-white/30">
                {currentItemIndex + 1} of {inspectionData.items.length}
              </Badge>
              <Button 
                variant="ghost" 
                onClick={onClose} 
                className="text-white hover:bg-white/20 p-2 rounded-lg transition-colors duration-200"
                title="Close QC Inspector"
              >
                <X className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>

        {/* Main Content Area - Horizontal Layout */}
        <div className="flex flex-1 overflow-hidden">
          {/* Left Sidebar - Items to Inspect */}
          <div className="w-80 border-r bg-stone-50 overflow-y-auto flex-shrink-0">
            <div className="p-4">
              <h3 className="font-semibold text-stone-900 mb-4 flex items-center">
                <Package className="h-5 w-5 mr-2 text-amber-600" />
                Items to Inspect
              </h3>
              <div className="space-y-2">
                {inspectionData.items.map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all duration-200 ${
                      index === currentItemIndex
                        ? 'bg-amber-100 border-2 border-amber-300 shadow-sm'
                        : 'bg-white border border-stone-200 hover:border-amber-200 hover:bg-amber-50'
                    }`}
                    onClick={() => setCurrentItemIndex(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm text-stone-900">{item.itemCode}</span>
                      {getStatusIcon(item.status)}
                    </div>
                    <p className="text-xs text-stone-600 truncate mb-2">{item.description}</p>
                    <div className="flex items-center justify-between">
                      <span className="text-xs text-stone-500">
                        QC: {item.qcPassedCartons || 0} | Loop: {item.loopBackCartons || 0} / {item.expectedCartons} cartons
                      </span>
                      <Badge className={`text-xs px-2 py-1 ${
                        (item.qcPassedCartons || 0) === (item.expectedCartons || 0) ? 'bg-green-100 text-green-800' :
                        (item.qcPassedCartons || 0) > 0 || (item.loopBackCartons || 0) > 0 ? 'bg-amber-100 text-amber-800' :
                        'bg-stone-100 text-stone-800'
                      }`}>
                        {(item.qcPassedCartons || 0) === (item.expectedCartons || 0) ? 'Completed' :
                         (item.qcPassedCartons || 0) > 0 || (item.loopBackCartons || 0) > 0 ? 'Partial' : 'Pending'}
                      </Badge>
                    </div>
                    
                    {/* Container Allocation Indicator */}
                    {(item.allocatedCartons > 0 || item.allocatedQuantity > 0 || item.containerId) && (
                      <div className="mt-2 flex items-center text-xs text-blue-700 bg-blue-50 rounded px-2 py-1">
                        <Container className="h-3 w-3 mr-1" />
                        <span className="font-medium">Allocated: {item.allocatedCartons || 0} cartons</span>
                      </div>
                    )}
                    {index === currentItemIndex && (
                      <div className="mt-2 text-xs text-amber-700 font-medium">
                        ← Currently Inspecting
                      </div>
                    )}
                  </motion.div>
                ))}
              </div>
              
              {/* Inspection Progress */}
              <div className="mt-6 p-3 bg-white rounded-lg border">
                <h4 className="font-medium text-sm text-stone-700 mb-2">Progress</h4>
                <div className="space-y-1 text-xs">
                  <div className="flex justify-between">
                    <span>Completed:</span>
                    <span className="font-medium">
                      {inspectionData.items.filter(item => 
                        (item.qcPassedCartons || 0) > 0 || (item.loopBackCartons || 0) > 0
                      ).length} / {inspectionData.items.length}
                    </span>
                  </div>
                  <div className="w-full bg-muted rounded-full h-2">
                    <div 
                      className="bg-amber-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${(inspectionData.items.filter(item => 
                        (item.qcPassedCartons || 0) > 0 || (item.loopBackCartons || 0) > 0
                      ).length / inspectionData.items.length) * 100}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Main Inspection Area */}
          <div className="flex-1 overflow-y-auto bg-card">
            <div className="p-6 h-full">
              {currentItem ? (
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentItemIndex}
                    initial={{ opacity: 0, x: 20 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -20 }}
                    transition={{ duration: 0.3 }}
                    className="h-full"
                  >
                    <Card className="h-full flex flex-col shadow-lg border-amber-200">
                      <CardHeader className="border-b bg-gradient-to-r from-amber-50 to-orange-50">
                        <CardTitle className="flex items-center text-xl">
                          <Package className="h-6 w-6 mr-3 text-amber-600" />
                          {currentItem?.itemCode}
                          <Badge className="ml-3 px-3 py-1">
                            Item {currentItemIndex + 1} of {inspectionData.items.length}
                          </Badge>
                        </CardTitle>
                        <CardDescription className="text-base text-stone-600">
                          {currentItem?.description}
                        </CardDescription>
                        
                        {/* Container Allocation Status */}
                        {(currentItem?.allocatedCartons > 0 || currentItem?.allocatedQuantity > 0 || currentItem?.containerId) && (
                          <div className="bg-blue-50 border-l-4 border-blue-400 p-4 mt-3">
                            <div className="flex items-start">
                              <Container className="h-5 w-5 text-blue-500 mr-2 flex-shrink-0 mt-0.5" />
                              <div className="flex-1">
                                <h4 className="font-medium text-blue-800 mb-1">⚠️ Allocated to Container</h4>
                                <div className="text-sm text-blue-700 space-y-1">
                                  <p>
                                    <strong>Allocated:</strong> {currentItem?.allocatedCartons || 0} cartons, {currentItem?.allocatedQuantity || 0} quantity
                                  </p>
                                  <p>
                                    <strong>Available for Edit:</strong> {Math.max(0, (currentItem?.qcPassedCartons || 0) - (currentItem?.allocatedCartons || 0))} cartons
                                  </p>
                                  {currentItem?.containerId && (
                                    <p>
                                      <strong>Container ID:</strong> {currentItem.containerId}
                                    </p>
                                  )}
                                  <p className="text-blue-600 font-medium">
                                    🔒 Cannot reduce QC passed quantity below allocated amount. Remove from container first to edit.
                                  </p>
                                </div>
                              </div>
                            </div>
                          </div>
                        )}
                      </CardHeader>
                      <CardContent className="space-y-6 flex-1 p-6">
                        {/* CARTON-BASED QC SYSTEM (PRIMARY) */}
                        <div className="space-y-4">
                          <h4 className="font-semibold text-stone-800 flex items-center">
                            <Container className="h-5 w-5 mr-2 text-amber-600" />
                            Carton-based QC Tracking (Primary)
                          </h4>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-stone-700">
                                <Scale className="inline h-4 w-4 mr-1" />
                                Expected Cartons
                              </label>
                              <Input
                                type="number"
                                value={currentItem?.expectedCartons || ''}
                                disabled
                                className="bg-stone-50 font-medium text-lg text-center"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-green-700">
                                <CheckCircle className="inline h-4 w-4 mr-1" />
                                QC Passed Cartons
                              </label>
                              {/* Check if item is allocated to container */}
                              {(() => {
                                const allocatedCartons = currentItem?.allocatedCartons || 0
                                const currentQcPassed = currentItem?.qcPassedCartons || 0
                                const minAllowedValue = Math.max(allocatedCartons, 0)
                                const isAllocated = allocatedCartons > 0
                                
                                return (
                                  <div className="space-y-2">
                                    <Input
                                      type="number"
                                      min={minAllowedValue}
                                      max={currentItem?.expectedCartons || 0}
                                      value={currentQcPassed}
                                      onChange={(e) => {
                                        const newValue = parseInt(e.target.value) || 0
                                        
                                        // Prevent reducing below allocated amount
                                        if (newValue < minAllowedValue) {
                                          toast.error(`Cannot reduce QC passed cartons below ${minAllowedValue} (allocated to container)`)
                                          return
                                        }
                                        
                                        const qcPassedCtn = newValue
                                        const expectedCtn = currentItem?.expectedCartons || 0
                                        const loopBackCtn = Math.max(0, expectedCtn - qcPassedCtn)
                                        
                                        // Calculate equivalent quantities based on carton inputs
                                        const totalQty = currentItem?.expectedQuantity || 0
                                        const totalCtn = currentItem?.expectedCartons || 0
                                        const qtyPerCarton = totalCtn > 0 ? totalQty / totalCtn : 1
                                        
                                        const qcPassedQty = Math.round(qcPassedCtn * qtyPerCarton)
                                        const loopBackQty = Math.round(loopBackCtn * qtyPerCarton)
                                        
                                        handleQuantityChange(currentItemIndex, qcPassedQty, loopBackQty, qcPassedCtn, loopBackCtn)
                                      }}
                                      className={`font-medium text-lg text-center border-green-300 focus:border-green-500 ${
                                        isAllocated ? 'bg-yellow-50 border-yellow-300' : ''
                                      }`}
                                      placeholder="Enter cartons passed"
                                    />
                                    {isAllocated && (
                                      <div className="flex items-center text-xs text-yellow-700">
                                        <Container className="h-3 w-3 mr-1" />
                                        <span>Min: {minAllowedValue} (alloc ated)</span>
                                      </div>
                                    )}
                                  </div>
                                )
                              })()}
                            </div>
                            <div className="space-y-2">
                              <label className="block text-sm font-semibold text-orange-700">
                                <AlertTriangle className="inline h-4 w-4 mr-1" />
                                Loop-back Cartons
                              </label>
                              <Input
                                type="number"
                                value={currentItem?.loopBackCartons || ''}
                                disabled
                                className="bg-orange-50 font-medium text-lg text-center text-orange-800"
                                title="Automatically calculated as Expected - QC Passed"
                              />
                            </div>
                          </div>

                          {/* Carton Progress Visualization */}
                          <div className="space-y-2">
                            <div className="flex justify-between text-sm text-stone-600">
                              <span>Carton Progress: {Math.round(((currentItem?.qcPassedCartons || 0) / (currentItem?.expectedCartons || 1)) * 100)}%</span>
                              <span>{(currentItem?.qcPassedCartons || 0) + (currentItem?.loopBackCartons || 0)} / {currentItem?.expectedCartons || 0} cartons</span>
                            </div>
                            <div className="w-full bg-stone-200 rounded-full h-3 overflow-hidden">
                              <div className="h-full flex">
                                {/* QC Passed portion */}
                                <div 
                                  className="bg-green-500 transition-all duration-300"
                                  style={{ width: `${((currentItem?.qcPassedCartons || 0) / (currentItem?.expectedCartons || 1)) * 100}%` }}
                                ></div>
                                {/* Loop-back portion */}
                                <div 
                                  className="bg-orange-500 transition-all duration-300"
                                  style={{ width: `${((currentItem?.loopBackCartons || 0) / (currentItem?.expectedCartons || 1)) * 100}%` }}
                                ></div>
                              </div>
                            </div>
                            <div className="flex justify-between text-xs">
                              <span className="text-green-600">✓ QC Done: {currentItem?.qcPassedCartons || 0} cartons</span>
                              <span className="text-orange-600">⚠ Loop-back: {currentItem?.loopBackCartons || 0} cartons</span>
                            </div>
                          </div>

                          {/* Carton-based Alerts */}
                          {(currentItem?.loopBackCartons || 0) > 0 && (
                            <div className="bg-orange-50 border border-orange-200 rounded-lg p-3">
                              <div className="flex items-center text-orange-800">
                                <AlertTriangle className="h-5 w-5 mr-2" />
                                <span className="font-medium">
                                  Shortage Detected: {currentItem?.loopBackCartons} cartons will go to loop-back
                                </span>
                              </div>
                              <p className="text-sm text-orange-600 mt-1">
                                These cartons represent the quantity not received and will be tracked for future delivery.
                              </p>
                            </div>
                          )}

                          {/* Carton Completion Status */}
                          {(currentItem?.qcPassedCartons || 0) === (currentItem?.expectedCartons || 0) && (
                            <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                              <div className="flex items-center text-green-800">
                                <CheckCircle className="h-5 w-5 mr-2" />
                                <span className="font-medium">
                                  Complete: All {currentItem?.expectedCartons} cartons have passed QC
                                </span>
                              </div>
                            </div>
                          )}
                        </div>

                        {/* QUANTITY-BASED QC SYSTEM (LEGACY COMPATIBILITY) */}
                        <div className="space-y-4 pt-4 border-t border-stone-200">
                          <div className="flex items-center justify-between">
                            <h4 className="font-semibold text-stone-600 flex items-center">
                              <Scale className="h-5 w-5 mr-2 text-stone-500" />
                              Quantity-based Tracking (Auto-calculated)
                            </h4>
                            <Badge variant="secondary" className="text-xs">Legacy Support</Badge>
                          </div>
                          <div className="grid grid-cols-3 gap-4">
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-stone-600">
                                Expected Quantity
                              </label>
                              <Input
                                type="number"
                                value={currentItem?.expectedQuantity || ''}
                                disabled
                                className="bg-stone-50 text-sm text-center border-stone-200"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-stone-600">
                                QC Passed Quantity
                              </label>
                              <Input
                                type="number"
                                value={currentItem?.qcPassedQuantity || ''}
                                disabled
                                className="bg-green-50 text-sm text-center border-green-200"
                                title="Auto-calculated from carton data"
                              />
                            </div>
                            <div className="space-y-2">
                              <label className="block text-xs font-medium text-stone-600">
                                Loop-back Quantity
                              </label>
                              <Input
                                type="number"
                                value={currentItem?.loopBackQuantity || ''}
                                disabled
                                className="bg-orange-50 text-sm text-center border-orange-200"
                                title="Auto-calculated from carton data"
                              />
                            </div>
                          </div>
                        </div>

                        {/* Notes */}
                        <div className="space-y-2">
                          <label className="block text-sm font-semibold text-stone-700">
                            <FileText className="inline h-4 w-4 mr-1" />
                            Inspection Notes
                          </label>
                          <Textarea
                            placeholder="Add any additional notes about this item inspection..."
                            value={currentItem?.notes || ''}
                            onChange={(e) => handleItemInspection(currentItemIndex, 'notes', e.target.value)}
                            rows={4}
                            className="resize-none"
                          />
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                </AnimatePresence>
              ) : (
                <div className="flex items-center justify-center h-full text-stone-500">
                  <div className="text-center">
                    <Package className="h-16 w-16 mx-auto mb-4 text-stone-300" />
                    <p className="text-lg font-medium">No Item Selected</p>
                    <p className="text-sm">Select an item from the left panel to start inspection</p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Enhanced Footer */}
        <div className="border-t bg-gradient-to-r from-stone-50 to-stone-100 p-6 flex items-center justify-between shadow-lg">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
              disabled={currentItemIndex === 0}
              className="hover:bg-stone-50 px-6 py-2 font-medium"
            >
              <RotateCcw className="h-4 w-4 mr-2" />
              Previous Item
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.min(inspectionData.items.length - 1, currentItemIndex + 1))}
              disabled={currentItemIndex === inspectionData.items.length - 1}
              className="hover:bg-stone-50 px-6 py-2 font-medium"
            >
              Next Item
              <RotateCcw className="h-4 w-4 ml-2 rotate-180" />
            </Button>
          </div>

          <div className="flex items-center space-x-6">
            {/* Inspection Summary */}
            <div className="text-sm text-stone-600 bg-white px-4 py-2 rounded-lg border">
              <div className="flex items-center space-x-4">
                <span>Overall Status:</span>
                <Badge className={`px-3 py-1 ${getStatusColor(calculateOverallStatus())}`}>
                  {calculateOverallStatus().toUpperCase()}
                </Badge>
                <span className="text-stone-400">|</span>
                <span>
                  Progress: {inspectionData.items.filter(item => 
                    (item.qcPassedCartons || 0) > 0 || (item.loopBackCartons || 0) > 0
                  ).length} / {inspectionData.items.length} items
                </span>
              </div>
            </div>
            
            {/* Action Buttons */}
            <div className="flex items-center space-x-3">
              <Button 
                variant="outline" 
                onClick={onClose} 
                className="hover:bg-stone-50 px-6 py-2"
              >
                Cancel
              </Button>
              <Button
                onClick={handleSubmitInspection}
                disabled={loading}
                className={`px-8 py-2 font-semibold shadow-lg transition-all duration-200 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-600 hover:to-amber-700 text-white hover:shadow-xl`}
              >
                {loading ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Submitting...
                  </>
                ) : (
                  <>
                    <Save className="h-4 w-4 mr-2" />
                    Complete Inspection
                  </>
                )}
              </Button>
            </div>
          </div>
        </div>
      </motion.div>
    </div>
  )
}

export default QCInspector
