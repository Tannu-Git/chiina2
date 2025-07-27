import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  Ship,
  Plane,
  Truck,
  Train,
  Clock,
  DollarSign,
  Package,
  Zap,
  Leaf,
  AlertTriangle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const CarryingBasisSelector = ({ value, onChange, weight, cbm, destination }) => {
  const [isOpen, setIsOpen] = useState(false)

  const carryingMethods = [
    {
      code: 'SEA',
      name: 'Sea Freight',
      description: 'Ocean shipping via container vessels. Most cost-effective for large volumes.',
      icon: Ship,
      transitTime: '15-45 days',
      costLevel: 'low',
      reliability: 'high',
      carbonFootprint: 'low',
      minWeight: 100,
      maxWeight: 50000,
      advantages: ['Lowest cost per kg', 'High capacity', 'Environmentally friendly', 'Suitable for heavy/bulky items'],
      disadvantages: ['Longer transit time', 'Weather dependent', 'Port-to-port only', 'Less frequent departures'],
      bestFor: ['Large volumes', 'Non-urgent shipments', 'Heavy machinery', 'Raw materials']
    },
    {
      code: 'AIR',
      name: 'Air Freight',
      description: 'Air cargo transport. Fastest option but most expensive.',
      icon: Plane,
      transitTime: '1-7 days',
      costLevel: 'high',
      reliability: 'high',
      carbonFootprint: 'high',
      minWeight: 1,
      maxWeight: 5000,
      advantages: ['Fastest delivery', 'High security', 'Frequent departures', 'Global coverage'],
      disadvantages: ['Highest cost', 'Weight/size restrictions', 'High carbon footprint', 'Weather sensitive'],
      bestFor: ['Urgent shipments', 'High-value items', 'Perishables', 'Small packages']
    },
    {
      code: 'ROAD',
      name: 'Road Transport',
      description: 'Truck transportation. Door-to-door delivery for regional shipments.',
      icon: Truck,
      transitTime: '1-10 days',
      costLevel: 'medium',
      reliability: 'high',
      carbonFootprint: 'medium',
      minWeight: 1,
      maxWeight: 25000,
      advantages: ['Door-to-door service', 'Flexible scheduling', 'Good for regional delivery', 'Real-time tracking'],
      disadvantages: ['Limited to connected regions', 'Traffic delays', 'Driver regulations', 'Fuel price sensitive'],
      bestFor: ['Regional delivery', 'Last-mile delivery', 'Time-sensitive goods', 'Partial loads']
    },
    {
      code: 'RAIL',
      name: 'Rail Freight',
      description: 'Railway transportation. Good balance of cost and speed for land routes.',
      icon: Train,
      transitTime: '5-20 days',
      costLevel: 'medium',
      reliability: 'medium',
      carbonFootprint: 'low',
      minWeight: 500,
      maxWeight: 100000,
      advantages: ['Cost-effective for long distances', 'High capacity', 'Environmentally friendly', 'Weather independent'],
      disadvantages: ['Limited routes', 'Requires road transport for final delivery', 'Less flexible', 'Infrastructure dependent'],
      bestFor: ['Long-distance land transport', 'Bulk commodities', 'Container transport', 'Regular schedules']
    },
    {
      code: 'EXPRESS',
      name: 'Express Courier',
      description: 'Express delivery services (DHL, FedEx, UPS). Premium speed and service.',
      icon: Zap,
      transitTime: '1-3 days',
      costLevel: 'very high',
      reliability: 'very high',
      carbonFootprint: 'high',
      minWeight: 0.1,
      maxWeight: 70,
      advantages: ['Fastest delivery', 'Door-to-door', 'Excellent tracking', 'High reliability'],
      disadvantages: ['Very expensive', 'Weight/size limits', 'Limited to small packages', 'High carbon footprint'],
      bestFor: ['Documents', 'Samples', 'Urgent small items', 'High-value small goods']
    },
    {
      code: 'MULTIMODAL',
      name: 'Multimodal',
      description: 'Combination of transport modes. Optimizes cost, speed, and efficiency.',
      icon: Package,
      transitTime: '7-30 days',
      costLevel: 'medium',
      reliability: 'high',
      carbonFootprint: 'medium',
      minWeight: 50,
      maxWeight: 30000,
      advantages: ['Optimized routing', 'Cost-effective', 'Flexible options', 'Single point of contact'],
      disadvantages: ['Complex coordination', 'Multiple handling points', 'Potential delays', 'Higher complexity'],
      bestFor: ['Complex routes', 'Cost optimization', 'Flexible timing', 'Mixed cargo types']
    }
  ]

  const selectedMethod = carryingMethods.find(method => method.code === value) || carryingMethods[0]

  const getCostColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-orange-100 text-orange-800'
      case 'very high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getReliabilityColor = (level) => {
    switch (level) {
      case 'very high': return 'bg-green-100 text-green-800'
      case 'high': return 'bg-blue-100 text-blue-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'low': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getCarbonColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const isMethodSuitable = (method) => {
    if (!weight) return true
    return weight >= method.minWeight && weight <= method.maxWeight
  }

  const selectMethod = (method) => {
    onChange(method.code, method)
    setIsOpen(false)
  }

  const getEstimatedCost = (method) => {
    if (!weight || !cbm) return null
    
    // Simplified cost calculation (in real app, this would come from API)
    const baseCosts = {
      SEA: 2,
      AIR: 15,
      ROAD: 5,
      RAIL: 3,
      EXPRESS: 25,
      MULTIMODAL: 4
    }
    
    const costPerKg = baseCosts[method.code] || 5
    return weight * costPerKg
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          {selectedMethod.icon && <selectedMethod.icon className="h-4 w-4" />}
          <span>{selectedMethod.code}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-[500px] mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Carrying Basis</h3>
              <p className="text-sm text-gray-500">Select the most suitable transportation method</p>
              {weight && cbm && (
                <p className="text-xs text-gray-500 mt-1">
                  Shipment: {weight}kg, {cbm}CBM {destination && `to ${destination}`}
                </p>
              )}
            </div>

            <div className="max-h-80 overflow-y-auto">
              {carryingMethods.map((method, index) => {
                const suitable = isMethodSuitable(method)
                const estimatedCost = getEstimatedCost(method)
                
                return (
                  <motion.div
                    key={method.code}
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.2, delay: index * 0.05 }}
                    className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
                      value === method.code ? 'bg-blue-50 border-blue-200' : ''
                    } ${!suitable ? 'opacity-50' : ''}`}
                    onClick={() => suitable && selectMethod(method)}
                  >
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <method.icon className="h-5 w-5 text-gray-600" />
                        <div>
                          <span className="font-medium text-gray-900">{method.name}</span>
                          <span className="text-sm text-gray-600 ml-2">({method.code})</span>
                        </div>
                      </div>
                      
                      {!suitable && (
                        <AlertTriangle className="h-4 w-4 text-red-500" />
                      )}
                    </div>

                    <p className="text-sm text-gray-600 mb-3">{method.description}</p>

                    <div className="flex items-center space-x-2 mb-3">
                      <Badge className={`text-xs ${getCostColor(method.costLevel)}`}>
                        <DollarSign className="h-3 w-3 mr-1" />
                        {method.costLevel} cost
                      </Badge>
                      
                      <Badge className={`text-xs ${getReliabilityColor(method.reliability)}`}>
                        {method.reliability} reliability
                      </Badge>
                      
                      <Badge className={`text-xs ${getCarbonColor(method.carbonFootprint)}`}>
                        <Leaf className="h-3 w-3 mr-1" />
                        {method.carbonFootprint} carbon
                      </Badge>
                      
                      <Badge variant="outline" className="text-xs">
                        <Clock className="h-3 w-3 mr-1" />
                        {method.transitTime}
                      </Badge>
                    </div>

                    {estimatedCost && (
                      <div className="mb-3 p-2 bg-gray-50 rounded text-sm">
                        <span className="font-medium">Estimated Cost: {formatCurrency(estimatedCost)}</span>
                        <span className="text-gray-500 ml-2">({formatCurrency(estimatedCost / weight)}/kg)</span>
                      </div>
                    )}

                    <div className="grid grid-cols-2 gap-3 text-xs">
                      <div>
                        <div className="font-medium text-green-700 mb-1">Advantages:</div>
                        <ul className="space-y-1">
                          {method.advantages.slice(0, 2).map((item, i) => (
                            <li key={i} className="text-gray-600">• {item}</li>
                          ))}
                        </ul>
                      </div>
                      
                      <div>
                        <div className="font-medium text-red-700 mb-1">Considerations:</div>
                        <ul className="space-y-1">
                          {method.disadvantages.slice(0, 2).map((item, i) => (
                            <li key={i} className="text-gray-600">• {item}</li>
                          ))}
                        </ul>
                      </div>
                    </div>

                    <div className="mt-2 text-xs">
                      <span className="font-medium text-gray-700">Best for: </span>
                      <span className="text-gray-600">{method.bestFor.join(', ')}</span>
                    </div>

                    <div className="mt-2 text-xs text-gray-500">
                      Weight range: {method.minWeight}kg - {method.maxWeight.toLocaleString()}kg
                    </div>
                  </motion.div>
                )
              })}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="text-xs text-gray-600">
                <p className="font-medium mb-1">Transportation Guide</p>
                <p>Choose based on urgency, budget, and shipment characteristics. Consider environmental impact and total logistics cost.</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CarryingBasisSelector
