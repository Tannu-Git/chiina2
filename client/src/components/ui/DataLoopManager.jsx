import React, { useState, useEffect, useCallback } from 'react'
import { motion } from 'framer-motion'
import { 
  Play, 
  Pause, 
  RotateCcw, 
  Settings, 
  Database,
  TrendingUp,
  Users,
  Package,
  DollarSign
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { Switch } from './switch'
import { Slider } from './slider'

const DataLoopManager = ({ 
  dataSources = [],
  onDataChange = null,
  onSourceChange = null,
  className = "",
  autoStart = false,
  defaultInterval = 3000
}) => {
  const [isLooping, setIsLooping] = useState(autoStart)
  const [currentIndex, setCurrentIndex] = useState(0)
  const [interval, setInterval] = useState(defaultInterval)
  const [showSettings, setShowSettings] = useState(false)
  const [loopCount, setLoopCount] = useState(0)

  // Default data sources if none provided
  const defaultSources = [
    {
      name: 'All Data',
      icon: Database,
      description: 'Complete dataset',
      getData: () => [],
      color: 'blue'
    },
    {
      name: 'Recent Items',
      icon: TrendingUp,
      description: 'Latest entries',
      getData: () => [],
      color: 'green'
    },
    {
      name: 'High Value',
      icon: DollarSign,
      description: 'Premium items',
      getData: () => [],
      color: 'yellow'
    },
    {
      name: 'Popular',
      icon: Users,
      description: 'Most accessed',
      getData: () => [],
      color: 'purple'
    }
  ]

  const sources = dataSources.length > 0 ? dataSources : defaultSources

  // Loop through data sources
  useEffect(() => {
    if (!isLooping || sources.length === 0) return

    const loopInterval = setInterval(() => {
      setCurrentIndex(prev => {
        const nextIndex = (prev + 1) % sources.length
        const nextSource = sources[nextIndex]
        
        // Notify parent components
        if (onSourceChange) {
          onSourceChange(nextSource, nextIndex)
        }
        
        if (onDataChange && nextSource.getData) {
          onDataChange(nextSource.getData(), nextSource)
        }
        
        return nextIndex
      })
      
      setLoopCount(prev => prev + 1)
    }, interval)

    return () => clearInterval(loopInterval)
  }, [isLooping, interval, sources, onDataChange, onSourceChange])

  const handleToggleLoop = useCallback(() => {
    setIsLooping(prev => !prev)
    if (!isLooping) {
      setLoopCount(0)
    }
  }, [isLooping])

  const handleReset = useCallback(() => {
    setCurrentIndex(0)
    setLoopCount(0)
    if (sources[0]) {
      if (onSourceChange) {
        onSourceChange(sources[0], 0)
      }
      if (onDataChange && sources[0].getData) {
        onDataChange(sources[0].getData(), sources[0])
      }
    }
  }, [sources, onDataChange, onSourceChange])

  const handleManualSelect = useCallback((index) => {
    setCurrentIndex(index)
    const source = sources[index]
    if (source) {
      if (onSourceChange) {
        onSourceChange(source, index)
      }
      if (onDataChange && source.getData) {
        onDataChange(source.getData(), source)
      }
    }
  }, [sources, onDataChange, onSourceChange])

  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-100 text-blue-800 border-blue-200',
      green: 'bg-green-100 text-green-800 border-green-200',
      yellow: 'bg-yellow-100 text-yellow-800 border-yellow-200',
      purple: 'bg-purple-100 text-purple-800 border-purple-200',
      red: 'bg-red-100 text-red-800 border-red-200',
      gray: 'bg-gray-100 text-gray-800 border-gray-200'
    }
    return colors[color] || colors.gray
  }

  const currentSource = sources[currentIndex]
  const progress = sources.length > 0 ? ((currentIndex + 1) / sources.length) * 100 : 0

  return (
    <div className={`space-y-4 ${className}`}>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle className="flex items-center gap-2">
              <Database className="h-5 w-5" />
              Data Loop Manager
              {isLooping && (
                <motion.div
                  animate={{ rotate: 360 }}
                  transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                  className="h-4 w-4"
                >
                  <RotateCcw className="h-4 w-4 text-blue-500" />
                </motion.div>
              )}
            </CardTitle>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => setShowSettings(!showSettings)}
              >
                <Settings className="h-4 w-4" />
              </Button>
              <Button
                variant={isLooping ? "destructive" : "default"}
                size="sm"
                onClick={handleToggleLoop}
              >
                {isLooping ? (
                  <>
                    <Pause className="h-4 w-4 mr-1" />
                    Stop
                  </>
                ) : (
                  <>
                    <Play className="h-4 w-4 mr-1" />
                    Start
                  </>
                )}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleReset}
              >
                <RotateCcw className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="space-y-4">
          {/* Current Status */}
          <div className="flex items-center justify-between p-4 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              {currentSource?.icon && (
                <currentSource.icon className="h-6 w-6 text-blue-600" />
              )}
              <div>
                <h3 className="font-semibold text-gray-900">
                  {currentSource?.name || 'No Source Selected'}
                </h3>
                <p className="text-sm text-gray-600">
                  {currentSource?.description || 'Select a data source to begin'}
                </p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-2xl font-bold text-blue-600">
                {currentIndex + 1}/{sources.length}
              </div>
              {isLooping && (
                <div className="text-xs text-gray-500">
                  Loop #{Math.floor(loopCount / sources.length) + 1}
                </div>
              )}
            </div>
          </div>

          {/* Progress Bar */}
          <div className="space-y-2">
            <div className="flex justify-between text-sm text-gray-600">
              <span>Progress</span>
              <span>{progress.toFixed(0)}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-2">
              <motion.div
                className="bg-blue-500 h-2 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.3 }}
              />
            </div>
          </div>

          {/* Settings Panel */}
          {showSettings && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="space-y-4 p-4 bg-gray-50 rounded-lg"
            >
              <div className="space-y-2">
                <label className="text-sm font-medium text-gray-700">
                  Loop Interval: {interval}ms
                </label>
                <Slider
                  value={[interval]}
                  onValueChange={(value) => setInterval(value[0])}
                  min={1000}
                  max={10000}
                  step={500}
                  className="w-full"
                />
              </div>
            </motion.div>
          )}

          {/* Data Sources Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {sources.map((source, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.2, delay: index * 0.05 }}
                className={`
                  p-3 rounded-lg border-2 cursor-pointer transition-all duration-200
                  ${index === currentIndex 
                    ? `${getColorClasses(source.color || 'blue')} border-current` 
                    : 'bg-white border-gray-200 hover:border-gray-300'
                  }
                `}
                onClick={() => handleManualSelect(index)}
              >
                <div className="flex items-center gap-3">
                  {source.icon && (
                    <source.icon className={`h-5 w-5 ${
                      index === currentIndex ? 'text-current' : 'text-gray-500'
                    }`} />
                  )}
                  <div className="flex-1">
                    <h4 className={`font-medium ${
                      index === currentIndex ? 'text-current' : 'text-gray-900'
                    }`}>
                      {source.name}
                    </h4>
                    <p className={`text-xs ${
                      index === currentIndex ? 'text-current opacity-80' : 'text-gray-500'
                    }`}>
                      {source.description}
                    </p>
                  </div>
                  {index === currentIndex && isLooping && (
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ duration: 1, repeat: Infinity }}
                      className="w-2 h-2 bg-current rounded-full"
                    />
                  )}
                </div>
              </motion.div>
            ))}
          </div>

          {/* Statistics */}
          {isLooping && (
            <div className="grid grid-cols-3 gap-4 pt-4 border-t">
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">{loopCount}</div>
                <div className="text-xs text-gray-500">Total Switches</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {Math.floor(loopCount / sources.length)}
                </div>
                <div className="text-xs text-gray-500">Complete Loops</div>
              </div>
              <div className="text-center">
                <div className="text-lg font-bold text-gray-900">
                  {(interval / 1000).toFixed(1)}s
                </div>
                <div className="text-xs text-gray-500">Interval</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}

export default DataLoopManager
