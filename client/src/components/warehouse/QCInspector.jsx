import React, { useState, useEffect } from 'react'
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
  ThumbsDown
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
    items: order?.items?.map(item => ({
      itemIndex: item._id,
      itemCode: item.itemCode,
      description: item.description,
      expectedQuantity: item.quantity,
      receivedQuantity: item.quantity,
      status: 'pending', // 'ok', 'shortage', 'damaged', 'rejected'
      defects: [],
      notes: '',
      photos: []
    })) || []
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

  const calculateOverallStatus = () => {
    const items = inspectionData.items
    if (items.every(item => item.status === 'ok')) return 'approved'
    if (items.some(item => item.status === 'rejected')) return 'rejected'
    if (items.some(item => item.status === 'shortage' || item.status === 'damaged')) return 'partial'
    return 'pending'
  }

  const handleSubmitInspection = async () => {
    try {
      setLoading(true)
      
      const finalInspectionData = {
        ...inspectionData,
        overallStatus: calculateOverallStatus(),
        completedAt: new Date().toISOString()
      }

      const response = await axios.post('/api/warehouse/qc-inspection', finalInspectionData)
      
      toast.success('QC Inspection completed successfully!')
      
      // Trigger callback with results
      if (onResult) {
        onResult({
          success: true,
          status: finalInspectionData.overallStatus,
          data: response.data,
          needsLoopback: finalInspectionData.items.some(item => 
            item.status === 'shortage' || item.status === 'damaged'
          )
        })
      }
      
      if (onClose) onClose()
    } catch (error) {
      console.error('QC Inspection error:', error)
      toast.error('Failed to submit QC inspection')
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
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'ok': return <CheckCircle className="h-4 w-4 text-green-600" />
      case 'shortage': return <AlertTriangle className="h-4 w-4 text-yellow-600" />
      case 'damaged': return <XCircle className="h-4 w-4 text-red-600" />
      case 'rejected': return <XCircle className="h-4 w-4 text-red-600" />
      default: return <Eye className="h-4 w-4 text-gray-600" />
    }
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.95 }}
        className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden"
      >
        {/* Header */}
        <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold">Quality Control Inspection</h2>
              <p className="text-blue-100">Order: {order?.orderNumber} - {order?.clientName}</p>
            </div>
            <div className="flex items-center space-x-2">
              <Badge variant="secondary" className="bg-white/20 text-white">
                {currentItemIndex + 1} of {inspectionData.items.length}
              </Badge>
              <Button variant="ghost" onClick={onClose} className="text-white hover:bg-white/20">
                ✕
              </Button>
            </div>
          </div>
        </div>

        <div className="flex h-[calc(90vh-120px)]">
          {/* Item List Sidebar */}
          <div className="w-80 border-r bg-gray-50 overflow-y-auto">
            <div className="p-4">
              <h3 className="font-semibold text-gray-900 mb-4">Items to Inspect</h3>
              <div className="space-y-2">
                {inspectionData.items.map((item, index) => (
                  <motion.div
                    key={index}
                    whileHover={{ scale: 1.02 }}
                    className={`p-3 rounded-lg cursor-pointer transition-all ${
                      index === currentItemIndex
                        ? 'bg-blue-100 border-2 border-blue-300'
                        : 'bg-white border border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setCurrentItemIndex(index)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium text-sm">{item.itemCode}</span>
                      {getStatusIcon(item.status)}
                    </div>
                    <p className="text-xs text-gray-600 truncate">{item.description}</p>
                    <div className="flex items-center justify-between mt-2">
                      <span className="text-xs text-gray-500">
                        Qty: {item.receivedQuantity}/{item.expectedQuantity}
                      </span>
                      <Badge className={`text-xs ${getStatusColor(item.status)}`}>
                        {item.status}
                      </Badge>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </div>

          {/* Main Inspection Area */}
          <div className="flex-1 overflow-y-auto">
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentItemIndex}
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -20 }}
                  transition={{ duration: 0.3 }}
                >
                  <Card>
                    <CardHeader>
                      <CardTitle className="flex items-center">
                        <Package className="h-5 w-5 mr-2" />
                        {currentItem?.itemCode}
                      </CardTitle>
                      <CardDescription>{currentItem?.description}</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-6">
                      {/* Quantity Check */}
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Expected Quantity
                          </label>
                          <Input
                            type="number"
                            value={currentItem?.expectedQuantity}
                            disabled
                            className="bg-gray-50"
                          />
                        </div>
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-2">
                            Received Quantity
                          </label>
                          <Input
                            type="number"
                            value={currentItem?.receivedQuantity}
                            onChange={(e) => handleItemInspection(
                              currentItemIndex, 
                              'receivedQuantity', 
                              parseInt(e.target.value) || 0
                            )}
                          />
                        </div>
                      </div>

                      {/* Status Selection */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-3">
                          Inspection Status
                        </label>
                        <div className="grid grid-cols-2 gap-3">
                          {[
                            { value: 'ok', label: 'Approved', icon: ThumbsUp, color: 'green' },
                            { value: 'shortage', label: 'Shortage', icon: AlertTriangle, color: 'yellow' },
                            { value: 'damaged', label: 'Damaged', icon: XCircle, color: 'red' },
                            { value: 'rejected', label: 'Rejected', icon: ThumbsDown, color: 'red' }
                          ].map(({ value, label, icon: Icon, color }) => (
                            <Button
                              key={value}
                              variant={currentItem?.status === value ? 'default' : 'outline'}
                              className={`justify-start ${
                                currentItem?.status === value 
                                  ? `bg-${color}-600 hover:bg-${color}-700` 
                                  : ''
                              }`}
                              onClick={() => handleItemInspection(currentItemIndex, 'status', value)}
                            >
                              <Icon className="h-4 w-4 mr-2" />
                              {label}
                            </Button>
                          ))}
                        </div>
                      </div>

                      {/* Defects Section */}
                      {(currentItem?.status === 'damaged' || currentItem?.status === 'rejected') && (
                        <div>
                          <label className="block text-sm font-medium text-gray-700 mb-3">
                            Defects Found
                          </label>
                          <div className="space-y-2 mb-3">
                            {currentItem?.defects?.map((defect, index) => (
                              <div key={index} className="flex items-center justify-between bg-red-50 p-2 rounded">
                                <span className="text-sm">{defect}</span>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => removeDefect(currentItemIndex, index)}
                                >
                                  ✕
                                </Button>
                              </div>
                            ))}
                          </div>
                          <div className="flex space-x-2">
                            <Input
                              placeholder="Add defect description..."
                              onKeyPress={(e) => {
                                if (e.key === 'Enter' && e.target.value.trim()) {
                                  addDefect(currentItemIndex, e.target.value.trim())
                                  e.target.value = ''
                                }
                              }}
                            />
                            <Button
                              variant="outline"
                              onClick={(e) => {
                                const input = e.target.parentElement.querySelector('input')
                                if (input.value.trim()) {
                                  addDefect(currentItemIndex, input.value.trim())
                                  input.value = ''
                                }
                              }}
                            >
                              Add
                            </Button>
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      <div>
                        <label className="block text-sm font-medium text-gray-700 mb-2">
                          Inspection Notes
                        </label>
                        <Textarea
                          placeholder="Add any additional notes about this item..."
                          value={currentItem?.notes}
                          onChange={(e) => handleItemInspection(currentItemIndex, 'notes', e.target.value)}
                          rows={3}
                        />
                      </div>
                    </CardContent>
                  </Card>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t bg-gray-50 p-4 flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.max(0, currentItemIndex - 1))}
              disabled={currentItemIndex === 0}
            >
              Previous
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentItemIndex(Math.min(inspectionData.items.length - 1, currentItemIndex + 1))}
              disabled={currentItemIndex === inspectionData.items.length - 1}
            >
              Next
            </Button>
          </div>
          
          <div className="flex items-center space-x-3">
            <span className="text-sm text-gray-600">
              Overall Status: <Badge className={getStatusColor(calculateOverallStatus())}>
                {calculateOverallStatus()}
              </Badge>
            </span>
            <Button variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button 
              onClick={handleSubmitInspection}
              disabled={loading || inspectionData.items.some(item => item.status === 'pending')}
              className="bg-gradient-to-r from-blue-600 to-purple-600"
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
      </motion.div>
    </div>
  )
}

export default QCInspector
