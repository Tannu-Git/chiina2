import React, { useState, useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { 
  Package, 
  Maximize, 
  RotateCcw, 
  Zap, 
  AlertTriangle,
  CheckCircle,
  Info
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import toast from 'react-hot-toast'

const ContainerPlanner3D = ({ 
  items = [], 
  containers = [], 
  onAllocationChange, 
  onOptimize 
}) => {
  const canvasRef = useRef(null)
  const [selectedContainer, setSelectedContainer] = useState(0)
  const [isOptimizing, setIsOptimizing] = useState(false)
  const [allocatedItems, setAllocatedItems] = useState([])

  // Standard container dimensions (in cm)
  const containerTypes = {
    '20ft': { length: 590, width: 235, height: 239, maxWeight: 28200 },
    '40ft': { length: 1200, width: 235, height: 239, maxWeight: 30480 },
    '40hc': { length: 1200, width: 235, height: 269, maxWeight: 30480 }
  }

  const currentContainer = containers[selectedContainer] || {
    id: 'DEMO001',
    type: '40ft',
    status: 'planning',
    currentCbm: 45.2,
    maxCbm: 67.5,
    currentWeight: 15000,
    maxWeight: 30480
  }

  const containerDims = containerTypes[currentContainer.type] || containerTypes['40ft']
  
  // Calculate utilization
  const utilization = {
    volume: (currentContainer.currentCbm / currentContainer.maxCbm) * 100,
    weight: (currentContainer.currentWeight / currentContainer.maxWeight) * 100,
    percentage: Math.max(
      (currentContainer.currentCbm / currentContainer.maxCbm) * 100,
      (currentContainer.currentWeight / currentContainer.maxWeight) * 100
    )
  }

  // 3D Visualization Component
  const Container3DView = () => {
    const scale = 0.3
    const containerWidth = containerDims.length * scale
    const containerHeight = containerDims.width * scale
    const containerDepth = containerDims.height * scale

    return (
      <div className="relative bg-gradient-to-br from-stone-100 to-stone-200 rounded-lg overflow-hidden">
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
            stroke="#57534e"
            strokeWidth="2"
            strokeDasharray="5,5"
          />
          
          {/* Container fill based on utilization */}
          <rect
            x="50"
            y="50"
            width={containerWidth * (utilization.percentage / 100)}
            height={containerHeight}
            fill={utilization.percentage > 90 ? '#ef4444' : utilization.percentage > 70 ? '#f59e0b' : '#f59e0b'}
            opacity="0.3"
          />

          {/* Items visualization */}
          {allocatedItems.map((item, index) => {
            const itemX = 50 + (index % 8) * 40
            const itemY = 50 + Math.floor(index / 8) * 30
            return (
              <g key={index}>
                <rect
                  x={itemX}
                  y={itemY}
                  width="35"
                  height="25"
                  fill="#f59e0b"
                  stroke="#d97706"
                  strokeWidth="1"
                  rx="2"
                />
                <text
                  x={itemX + 17.5}
                  y={itemY + 15}
                  textAnchor="middle"
                  fontSize="8"
                  fill="white"
                  fontWeight="bold"
                >
                  {item.code?.substring(0, 3) || 'ITM'}
                </text>
              </g>
            )
          })}

          {/* Container label */}
          <text
            x={containerWidth / 2 + 50}
            y="40"
            textAnchor="middle"
            fontSize="14"
            fill="#57534e"
            fontWeight="bold"
          >
            {currentContainer.id} ({currentContainer.type})
          </text>
        </svg>

        {/* Utilization overlay */}
        <div className="absolute top-4 right-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
          <div className="text-xs font-medium text-stone-700 mb-1">Utilization</div>
          <div className="flex items-center space-x-2">
            <div className="w-16 bg-stone-200 rounded-full h-2">
              <div 
                className={`h-2 rounded-full transition-all duration-300 ${
                  utilization.percentage > 90 ? 'bg-red-500' : 
                  utilization.percentage > 70 ? 'bg-amber-500' : 'bg-amber-500'
                }`}
                style={{ width: `${Math.min(utilization.percentage, 100)}%` }}
              />
            </div>
            <span className="text-xs font-bold text-stone-900">
              {utilization.percentage.toFixed(1)}%
            </span>
          </div>
        </div>
      </div>
    )
  }

  // Optimization function
  const handleOptimize = async () => {
    setIsOptimizing(true)
    
    // Simulate optimization process
    await new Promise(resolve => setTimeout(resolve, 2000))
    
    // Mock optimization result
    const optimizedPlan = {
      containerId: currentContainer.id,
      efficiency: 92.5,
      itemsAllocated: items.slice(0, 15),
      recommendations: [
        'Rotate large items for better space utilization',
        'Group similar items together',
        'Place heavy items at the bottom'
      ]
    }
    
    setAllocatedItems(optimizedPlan.itemsAllocated)
    setIsOptimizing(false)
    
    if (onOptimize) {
      onOptimize(optimizedPlan)
    }
    
    toast.success(`Optimization complete! ${optimizedPlan.efficiency}% efficiency achieved.`)
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-stone-900">3D Container Planner</h2>
          <p className="text-stone-600">Optimize container space allocation with AI-powered planning</p>
        </div>
        <div className="flex items-center space-x-3">
          <Button
            onClick={handleOptimize}
            disabled={isOptimizing}
            className="bg-amber-500 hover:bg-amber-600 text-white"
          >
            {isOptimizing ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-amber-600 mr-2"></div>
                Optimizing...
              </>
            ) : (
              <>
                <Zap className="h-4 w-4 mr-2" />
                AI Optimize
              </>
            )}
          </Button>
          <Button variant="outline" size="sm">
            <RotateCcw className="h-4 w-4 mr-2" />
            Reset
          </Button>
        </div>
      </div>

      {/* Container Selection */}
      <div className="flex space-x-4 overflow-x-auto pb-2">
        {containers.length > 0 ? containers.map((container, index) => (
          <motion.div
            key={container.id}
            whileHover={{ scale: 1.02 }}
            className={`flex-shrink-0 p-3 rounded-lg border-2 cursor-pointer transition-all ${
              selectedContainer === index
                ? 'border-amber-500 bg-amber-50'
                : 'border-stone-200 bg-white hover:border-stone-300'
            }`}
            onClick={() => setSelectedContainer(index)}
          >
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-stone-900">{container.id}</span>
            </div>
            <div className="text-xs text-stone-500 mt-1">{container.type}</div>
          </motion.div>
        )) : (
          <div className="flex-shrink-0 p-3 rounded-lg border-2 border-amber-500 bg-amber-50">
            <div className="flex items-center space-x-2">
              <Package className="h-4 w-4 text-amber-600" />
              <span className="font-medium text-stone-900">DEMO001</span>
            </div>
            <div className="text-xs text-stone-500 mt-1">40ft</div>
          </div>
        )}
      </div>

      {/* Main Content */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 3D Visualization */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Maximize className="h-5 w-5 mr-2 text-amber-600" />
                3D Container View
              </CardTitle>
              <CardDescription>
                Interactive visualization of container space allocation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Container3DView />
            </CardContent>
          </Card>
        </div>

        {/* Stats and Controls */}
        <div className="space-y-6">
          {/* Utilization Stats */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Container Stats</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Volume</span>
                  <span className="font-medium">{utilization.volume.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(utilization.volume, 100)}%` }}
                  />
                </div>
              </div>
              
              <div>
                <div className="flex justify-between text-sm mb-1">
                  <span className="text-stone-600">Weight</span>
                  <span className="font-medium">{utilization.weight.toFixed(1)}%</span>
                </div>
                <div className="w-full bg-stone-200 rounded-full h-2">
                  <div 
                    className="bg-amber-500 h-2 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(utilization.weight, 100)}%` }}
                  />
                </div>
              </div>

              <div className="pt-2 border-t border-stone-200">
                <div className="text-xs text-stone-500 space-y-1">
                  <div>CBM: {currentContainer.currentCbm} / {currentContainer.maxCbm}</div>
                  <div>Weight: {currentContainer.currentWeight} / {currentContainer.maxWeight} kg</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Optimization Status */}
          <Card>
            <CardHeader>
              <CardTitle className="text-lg flex items-center">
                <CheckCircle className="h-5 w-5 mr-2 text-green-500" />
                Optimization Status
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">Efficiency</span>
                  <span className="font-bold text-amber-600">
                    {utilization.percentage > 0 ? utilization.percentage.toFixed(1) : '0.0'}%
                  </span>
                </div>
                
                <div className="flex items-center justify-between">
                  <span className="text-sm text-stone-600">Items Allocated</span>
                  <span className="font-medium">{allocatedItems.length}</span>
                </div>

                {utilization.percentage > 90 && (
                  <div className="flex items-start space-x-2 p-2 bg-red-50 rounded-lg">
                    <AlertTriangle className="h-4 w-4 text-red-500 mt-0.5" />
                    <div className="text-xs text-red-700">
                      Container is over capacity. Consider using additional containers.
                    </div>
                  </div>
                )}

                {utilization.percentage > 70 && utilization.percentage <= 90 && (
                  <div className="flex items-start space-x-2 p-2 bg-amber-50 rounded-lg">
                    <Info className="h-4 w-4 text-amber-500 mt-0.5" />
                    <div className="text-xs text-amber-700">
                      Good utilization. Consider optimizing for better efficiency.
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}

export default ContainerPlanner3D
