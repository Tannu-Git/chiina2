import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  MapPin,
  Ship,
  Truck,
  Plane,
  Clock,
  Navigation,
  Zap,
  AlertTriangle,
  CheckCircle,
  Info,
  Maximize,
  Minimize,
  RefreshCw,
  Filter
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { formatCurrency, formatDate } from '@/lib/utils'

const ContainerMap = ({ containers = [], realTimeUpdates = true, showFinancials = true }) => {
  const [selectedContainer, setSelectedContainer] = useState(null)
  const [mapView, setMapView] = useState('world') // 'world', 'region', 'route'
  const [filterStatus, setFilterStatus] = useState('all')
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [lastUpdate, setLastUpdate] = useState(new Date())

  // Sample container tracking data
  const trackingData = [
    {
      id: 'CONT-001',
      clientFacingId: 'C-2024-001',
      status: 'in_transit',
      currentLocation: { lat: 31.2304, lng: 121.4737, name: 'Shanghai Port, China' },
      destination: { lat: 33.7490, lng: -118.2437, name: 'Los Angeles Port, USA' },
      route: [
        { lat: 31.2304, lng: 121.4737, name: 'Shanghai Port', timestamp: '2024-01-15T08:00:00Z', status: 'departed' },
        { lat: 35.6762, lng: 139.6503, name: 'Tokyo Bay', timestamp: '2024-01-17T14:30:00Z', status: 'passed' },
        { lat: 21.3099, lng: -157.8581, name: 'Honolulu', timestamp: '2024-01-22T09:15:00Z', status: 'current' },
        { lat: 33.7490, lng: -118.2437, name: 'Los Angeles Port', timestamp: '2024-01-25T16:00:00Z', status: 'estimated' }
      ],
      vessel: 'MV Ocean Pioneer',
      eta: '2024-01-25T16:00:00Z',
      progress: 65,
      totalValue: 125000,
      transportMode: 'sea'
    },
    {
      id: 'CONT-002',
      clientFacingId: 'C-2024-002',
      status: 'loading',
      currentLocation: { lat: 22.3193, lng: 114.1694, name: 'Hong Kong Port' },
      destination: { lat: 51.5074, lng: -0.1278, name: 'London, UK' },
      route: [
        { lat: 22.3193, lng: 114.1694, name: 'Hong Kong Port', timestamp: '2024-01-20T10:00:00Z', status: 'current' }
      ],
      vessel: 'MV Global Express',
      eta: '2024-02-15T12:00:00Z',
      progress: 5,
      totalValue: 89000,
      transportMode: 'sea'
    },
    {
      id: 'CONT-003',
      clientFacingId: 'C-2024-003',
      status: 'delivered',
      currentLocation: { lat: 40.7128, lng: -74.0060, name: 'New York Port, USA' },
      destination: { lat: 40.7128, lng: -74.0060, name: 'New York Port, USA' },
      route: [
        { lat: 31.2304, lng: 121.4737, name: 'Shanghai Port', timestamp: '2024-01-01T08:00:00Z', status: 'departed' },
        { lat: 40.7128, lng: -74.0060, name: 'New York Port', timestamp: '2024-01-18T14:00:00Z', status: 'delivered' }
      ],
      vessel: 'MV Atlantic Carrier',
      eta: '2024-01-18T14:00:00Z',
      progress: 100,
      totalValue: 156000,
      transportMode: 'sea'
    }
  ]

  // Filter containers based on status
  const filteredContainers = trackingData.filter(container => 
    filterStatus === 'all' || container.status === filterStatus
  )

  // Simulate real-time updates
  useEffect(() => {
    if (!realTimeUpdates) return

    const interval = setInterval(() => {
      setLastUpdate(new Date())
      // In real app, this would fetch latest tracking data
    }, 30000) // Update every 30 seconds

    return () => clearInterval(interval)
  }, [realTimeUpdates])

  const getStatusColor = (status) => {
    switch (status) {
      case 'loading': return 'bg-amber-100 text-amber-800'
      case 'in_transit': return 'bg-yellow-100 text-yellow-800'
      case 'delivered': return 'bg-green-100 text-green-800'
      case 'delayed': return 'bg-red-100 text-red-800'
      default: return 'bg-stone-100 text-stone-800'
    }
  }

  const getTransportIcon = (mode) => {
    switch (mode) {
      case 'sea': return Ship
      case 'air': return Plane
      case 'road': return Truck
      default: return Ship
    }
  }

  const MapVisualization = () => (
    <div className="relative bg-gradient-to-br from-stone-50 to-stone-100 rounded-lg overflow-hidden h-96">
      {/* World Map Background (simplified) */}
      <svg
        viewBox="0 0 1000 500"
        className="w-full h-full"
        style={{ background: 'linear-gradient(to bottom, #dbeafe, #bfdbfe)' }}
      >
        {/* Simplified world map paths */}
        <path
          d="M150,200 Q300,180 450,200 Q600,220 750,200 Q850,180 950,200"
          stroke="#94a3b8"
          strokeWidth="2"
          fill="none"
          strokeDasharray="5,5"
        />
        
        {/* Container routes */}
        {filteredContainers.map((container, index) => {
          const startX = 200 + index * 100
          const endX = 800 - index * 50
          const y = 200 + index * 50
          
          return (
            <g key={container.id}>
              {/* Route line */}
              <motion.path
                d={`M${startX},${y} Q${(startX + endX) / 2},${y - 50} ${endX},${y}`}
                stroke="#3b82f6"
                strokeWidth="3"
                fill="none"
                initial={{ pathLength: 0 }}
                animate={{ pathLength: container.progress / 100 }}
                transition={{ duration: 2, ease: "easeInOut" }}
              />
              
              {/* Container position */}
              <motion.circle
                cx={startX + (endX - startX) * (container.progress / 100)}
                cy={y}
                r="8"
                fill={container.status === 'delivered' ? '#10b981' : '#3b82f6'}
                className="cursor-pointer"
                onClick={() => setSelectedContainer(container)}
                whileHover={{ scale: 1.2 }}
                whileTap={{ scale: 0.9 }}
              />
              
              {/* Origin and destination markers */}
              <circle cx={startX} cy={y} r="4" fill="#6b7280" />
              <circle cx={endX} cy={y} r="4" fill="#ef4444" />
            </g>
          )
        })}
      </svg>
      
      {/* Legend */}
      <div className="absolute bottom-4 left-4 bg-white/90 backdrop-blur-sm rounded-lg p-3">
        <div className="text-xs font-medium text-stone-700 mb-2">Legend</div>
        <div className="space-y-1 text-xs">
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-amber-500 rounded-full"></div>
            <span>In Transit</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <span>Delivered</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-stone-500 rounded-full"></div>
            <span>Origin</span>
          </div>
          <div className="flex items-center space-x-2">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <span>Destination</span>
          </div>
        </div>
      </div>
      
      {/* Real-time indicator */}
      {realTimeUpdates && (
        <div className="absolute top-4 right-4 flex items-center space-x-2 bg-white/90 backdrop-blur-sm rounded-lg px-3 py-2">
          <motion.div
            className="w-2 h-2 bg-green-500 rounded-full"
            animate={{ opacity: [1, 0.5, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
          />
          <span className="text-xs text-stone-700">Live Tracking</span>
        </div>
      )}
    </div>
  )

  const ContainerDetails = ({ container }) => {
    const TransportIcon = getTransportIcon(container.transportMode)
    
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="bg-white border rounded-lg p-4"
      >
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center space-x-2">
            <TransportIcon className="h-5 w-5 text-amber-600" />
            <span className="font-medium">{container.clientFacingId}</span>
          </div>
          <Badge className={getStatusColor(container.status)}>
            {container.status.replace('_', ' ')}
          </Badge>
        </div>
        
        <div className="space-y-2 text-sm">
          <div className="flex justify-between">
            <span className="text-stone-600">Current Location:</span>
            <span className="font-medium">{container.currentLocation.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Destination:</span>
            <span className="font-medium">{container.destination.name}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Vessel:</span>
            <span className="font-medium">{container.vessel}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">ETA:</span>
            <span className="font-medium">{formatDate(container.eta)}</span>
          </div>
          <div className="flex justify-between">
            <span className="text-stone-600">Progress:</span>
            <span className="font-medium">{container.progress}%</span>
          </div>
          {showFinancials && (
            <div className="flex justify-between">
              <span className="text-stone-600">Total Value:</span>
              <span className="font-medium">{formatCurrency(container.totalValue)}</span>
            </div>
          )}
        </div>
        
        {/* Progress bar */}
        <div className="mt-3">
          <div className="flex justify-between text-xs text-stone-500 mb-1">
            <span>Progress</span>
            <span>{container.progress}%</span>
          </div>
          <div className="w-full bg-stone-200 rounded-full h-2">
            <motion.div
              className="bg-gradient-to-r from-amber-500 to-amber-600 h-2 rounded-full"
              initial={{ width: 0 }}
              animate={{ width: `${container.progress}%` }}
              transition={{ duration: 1 }}
            />
          </div>
        </div>
      </motion.div>
    )
  }

  return (
    <Card className={isFullscreen ? 'fixed inset-4 z-50' : ''}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <MapPin className="h-5 w-5 mr-2" />
              Container Tracking Map
            </CardTitle>
            <CardDescription>
              Real-time container locations and shipping progress
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Select value={filterStatus} onValueChange={setFilterStatus}>
              <SelectTrigger className="w-32">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                <SelectItem value="loading">Loading</SelectItem>
                <SelectItem value="in_transit">In Transit</SelectItem>
                <SelectItem value="delivered">Delivered</SelectItem>
                <SelectItem value="delayed">Delayed</SelectItem>
              </SelectContent>
            </Select>
            
            <Button variant="outline" size="sm">
              <RefreshCw className="h-4 w-4 mr-1" />
              Refresh
            </Button>
            
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsFullscreen(!isFullscreen)}
            >
              {isFullscreen ? <Minimize className="h-4 w-4" /> : <Maximize className="h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Map */}
          <div className="lg:col-span-2">
            <MapVisualization />
          </div>
          
          {/* Container List */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium text-stone-900">Active Containers</h3>
              <Badge variant="outline">{filteredContainers.length} containers</Badge>
            </div>
            
            <div className="space-y-3 max-h-80 overflow-y-auto">
              {filteredContainers.map((container) => (
                <ContainerDetails key={container.id} container={container} />
              ))}
            </div>
            
            {/* Summary Stats */}
            <div className="pt-4 border-t">
              <div className="grid grid-cols-2 gap-4 text-center">
                <div>
                  <div className="text-lg font-bold text-amber-600">
                    {filteredContainers.filter(c => c.status === 'in_transit').length}
                  </div>
                  <div className="text-xs text-stone-600">In Transit</div>
                </div>
                <div>
                  <div className="text-lg font-bold text-green-600">
                    {filteredContainers.filter(c => c.status === 'delivered').length}
                  </div>
                  <div className="text-xs text-stone-600">Delivered</div>
                </div>
              </div>
            </div>
          </div>
        </div>
        
        {/* Last Update */}
        <div className="mt-4 pt-4 border-t flex items-center justify-between text-sm text-stone-500">
          <div className="flex items-center space-x-2">
            <Clock className="h-4 w-4" />
            <span>Last updated: {formatDate(lastUpdate)}</span>
          </div>
          
          {realTimeUpdates && (
            <div className="flex items-center space-x-2">
              <motion.div
                className="w-2 h-2 bg-green-500 rounded-full"
                animate={{ opacity: [1, 0.5, 1] }}
                transition={{ duration: 2, repeat: Infinity }}
              />
              <span>Real-time updates active</span>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  )
}

export default ContainerMap
