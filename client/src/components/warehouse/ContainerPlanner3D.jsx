import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Box,
  Maximize,
  Minimize,
  RotateCw,
  Layers,
  Package,
  Ruler,
  Weight,
  AlertTriangle,
  CheckCircle,
  Settings,
  Eye,
  EyeOff,
  Zap,
  Save
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import { Slider } from '@/components/ui/slider'
import { Switch } from '@/components/ui/switch'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const ContainerPlanner3D = ({ items = [], containers = [], onAllocationChange, onOptimize }) => {
  const canvasRef = useRef(null)
  const [selectedContainer, setSelectedContainer] = useState(containers[0] || null)
  const [allocatedItems, setAllocatedItems] = useState([])
  const [viewMode, setViewMode] = useState('3d') // '3d', 'top', 'side'
  const [showDimensions, setShowDimensions] = useState(true)
  const [showWeight, setShowWeight] = useState(true)
  const [autoOptimize, setAutoOptimize] = useState(false)
  const [zoom, setZoom] = useState([50])
  const [rotation, setRotation] = useState({ x: 0, y: 0, z: 0 })
  const [loading, setLoading] = useState(false)

  // Container types with dimensions (in meters)
  const containerTypes = {
    '20ft': { length: 6.058, width: 2.438, height: 2.591, maxWeight: 28230 },
    '40ft': { length: 12.192, width: 2.438, height: 2.591, maxWeight: 28750 },
    '40ft_hc': { length: 12.192, width: 2.438, height: 2.896, maxWeight: 28750 },
    '45ft': { length: 13.716, width: 2.438, height: 2.896, maxWeight: 29500 }
  }

  const getContainerDimensions = (type) => {
    return containerTypes[type] || containerTypes['20ft']
  }

  // Calculate container utilization
  const calculateUtilization = (container) => {
    if (!container) return { cbm: 0, weight: 0, percentage: 0 }
    
    const dims = getContainerDimensions(container.type)
    const maxCbm = dims.length * dims.width * dims.height
    const maxWeight = dims.maxWeight
    
    const usedCbm = container.currentCbm || 0
    const usedWeight = container.currentWeight || 0
    
    return {
      cbm: (usedCbm / maxCbm) * 100,
      weight: (usedWeight / maxWeight) * 100,
      percentage: Math.max((usedCbm / maxCbm) * 100, (usedWeight / maxWeight) * 100)
    }
  }

  // 3D Visualization Component
  const Container3DView = () => {
    const containerDims = selectedContainer ? getContainerDimensions(selectedContainer.type) : containerTypes['20ft']
    const utilization = calculateUtilization(selectedContainer)
    
    // Scale factor for display
    const scale = 50
    const containerWidth = containerDims.length * scale
    const containerHeight = containerDims.width * scale
    const containerDepth = containerDims.height * scale

    return (
      <div className="relative bg-gradient-to-br from-gray-100 to-gray-200 rounded-lg overflow-hidden">
        <svg
          ref={canvasRef}
          width="100%"
          height="400"
          viewBox={`0 0 ${containerWidth + 100} ${containerHeight + 100}`}
          className="w-full h-full"
        >
          {/* Container outline */}
          <rect
            x="50"
            y="50"
            width={containerWidth}
            height={containerHeight}
            fill="none"
            stroke="#374151"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Container fill based on utilization */}
          <rect
            x="50"
            y="50"
            width={containerWidth * (utilization.percentage / 100)}
            height={containerHeight}
            fill={utilization.percentage > 90 ? '#ef4444' : utilization.percentage > 70 ? '#f59e0b' : '#10b981'}
            opacity="0.3"
          />
          
          {/* Items visualization */}
          {allocatedItems.map((item, index) => {
            const itemWidth = (item.unitCbm * 100) || 20
            const itemHeight = 30
            const x = 60 + (index % 10) * (itemWidth + 5)
            const y = 60 + Math.floor(index / 10) * (itemHeight + 5)
            
            return (
              <g key={item._id || index}>
                <rect
                  x={x}
                  y={y}
                  width={itemWidth}
                  height={itemHeight}
                  fill="#3b82f6"
                  stroke="#1e40af"
                  strokeWidth="1"
                  rx="2"
                />
                <text
                  x={x + itemWidth / 2}
                  y={y + itemHeight / 2}
                  textAnchor="middle"
                  dominantBaseline="middle"
                  fontSize="8"
                  fill="white"
                >
                  {item.itemCode?.substring(0, 6) || `Item ${index + 1}`}
                </text>
              </g>
            )
          })}
          
          {/* Dimensions */}
          {showDimensions && (
            <g>
              <text x="50" y="40" fontSize="12" fill="#6b7280">
                {containerDims.length}m × {containerDims.width}m × {containerDims.height}m
              </text>
              <text x="50" y={containerHeight + 80} fontSize="12" fill="#6b7280">
                Max CBM: {(containerDims.length * containerDims.width * containerDims.height).toFixed(2)}
              </text>
            </g>
          )}
        </svg>
        
        {/* Utilization overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
          <div className="text-sm font-medium text-gray-900 mb-2">Utilization</div>
          <div className="space-y-1">
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">CBM:</span>
              <span className="text-xs font-medium">{utilization.cbm.toFixed(1)}%</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-xs text-gray-600">Weight:</span>
              <span className="text-xs font-medium">{utilization.weight.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </div>
    )
  }

  // Auto-optimization algorithm
  const optimizeAllocation = async () => {
    if (!selectedContainer || items.length === 0) return
    
    try {
      setLoading(true)
      const response = await axios.post('/api/warehouse/container-allocation', {
        orderIds: items.map(item => item.orderId),
        containerIds: [selectedContainer._id]
      })
      
      if (response.data.allocationPlan) {
        const plan = response.data.allocationPlan[0]
        if (plan) {
          setAllocatedItems(plan.items)
          toast.success('Container allocation optimized!')
          if (onOptimize) onOptimize(plan)
        }
      }
    } catch (error) {
      console.error('Optimization error:', error)
      toast.error('Failed to optimize allocation')
    } finally {
      setLoading(false)
    }
  }

  // Handle item allocation
  const handleItemAllocation = (item, allocated) => {
    if (allocated) {
      setAllocatedItems(prev => [...prev, item])
    } else {
      setAllocatedItems(prev => prev.filter(i => i._id !== item._id))
    }
    
    if (onAllocationChange) {
      onAllocationChange(item, allocated ? item.quantity : 0)
    }
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-xl font-bold text-gray-900">Container Planner 3D</h3>
          <p className="text-gray-600">Visualize and optimize container loading</p>
        </div>
        <div className="flex items-center space-x-2">
          <Button
            variant="outline"
            onClick={optimizeAllocation}
            disabled={loading || !selectedContainer}
          >
            {loading ? (
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            ) : (
              <Zap className="h-4 w-4 mr-2" />
            )}
            Auto Optimize
          </Button>
          <Button variant="outline">
            <Save className="h-4 w-4 mr-2" />
            Save Plan
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Container Selection & Controls */}
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Box className="h-5 w-5 mr-2" />
                Container Selection
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {containers.map(container => {
                const utilization = calculateUtilization(container)
                return (
                  <div
                    key={container._id}
                    className={`p-3 border rounded-lg cursor-pointer transition-all ${
                      selectedContainer?._id === container._id
                        ? 'border-blue-500 bg-blue-50'
                        : 'border-gray-200 hover:border-gray-300'
                    }`}
                    onClick={() => setSelectedContainer(container)}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <span className="font-medium">{container.clientFacingId || container.realContainerId}</span>
                      <Badge variant="outline">{container.type}</Badge>
                    </div>
                    <div className="text-sm text-gray-600">
                      <div>Status: {container.status}</div>
                      <div>Utilization: {utilization.percentage.toFixed(1)}%</div>
                    </div>
                  </div>
                )
              })}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Settings className="h-5 w-5 mr-2" />
                View Controls
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Zoom Level
                </label>
                <Slider
                  value={zoom}
                  onValueChange={setZoom}
                  max={100}
                  min={10}
                  step={10}
                  className="w-full"
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Show Dimensions</label>
                <Switch
                  checked={showDimensions}
                  onCheckedChange={setShowDimensions}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Show Weight</label>
                <Switch
                  checked={showWeight}
                  onCheckedChange={setShowWeight}
                />
              </div>
              
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-gray-700">Auto Optimize</label>
                <Switch
                  checked={autoOptimize}
                  onCheckedChange={setAutoOptimize}
                />
              </div>
            </CardContent>
          </Card>
        </div>

        {/* 3D Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                <div className="flex items-center">
                  <Layers className="h-5 w-5 mr-2" />
                  3D Container View
                </div>
                {selectedContainer && (
                  <Badge variant="outline">
                    {selectedContainer.type} - {selectedContainer.clientFacingId || selectedContainer.realContainerId}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Container3DView />
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Items List */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <Package className="h-5 w-5 mr-2" />
            Available Items ({items.length})
          </CardTitle>
          <CardDescription>
            Drag items to allocate them to the selected container
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {items.map(item => {
              const isAllocated = allocatedItems.some(allocated => allocated._id === item._id)
              return (
                <motion.div
                  key={item._id}
                  whileHover={{ scale: 1.02 }}
                  className={`p-4 border rounded-lg cursor-pointer transition-all ${
                    isAllocated
                      ? 'border-green-500 bg-green-50'
                      : 'border-gray-200 hover:border-gray-300'
                  }`}
                  onClick={() => handleItemAllocation(item, !isAllocated)}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className="font-medium text-sm">{item.itemCode}</span>
                    {isAllocated ? (
                      <CheckCircle className="h-4 w-4 text-green-600" />
                    ) : (
                      <div className="w-4 h-4 border border-gray-300 rounded"></div>
                    )}
                  </div>
                  <p className="text-xs text-gray-600 mb-2">{item.description}</p>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-500">Qty:</span>
                      <span className="ml-1 font-medium">{item.quantity}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">CBM:</span>
                      <span className="ml-1 font-medium">{(item.unitCbm * item.quantity).toFixed(2)}</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Weight:</span>
                      <span className="ml-1 font-medium">{(item.unitWeight * item.quantity).toFixed(1)}kg</span>
                    </div>
                    <div>
                      <span className="text-gray-500">Value:</span>
                      <span className="ml-1 font-medium">{formatCurrency(item.totalPrice || 0)}</span>
                    </div>
                  </div>
                </motion.div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}

export default ContainerPlanner3D
