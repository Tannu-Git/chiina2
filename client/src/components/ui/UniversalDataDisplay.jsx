import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { 
  Table, 
  Grid3X3, 
  LayoutGrid, 
  Play, 
  Pause, 
  RotateCcw,
  Eye,
  Filter,
  Search
} from 'lucide-react'
import { Button } from './button'
import { Card, CardContent, CardHeader, CardTitle } from './card'
import { SearchInput } from './input'
import { Switch } from './switch'

const UniversalDataDisplay = ({ 
  data = [], 
  title = "Data Display",
  columns = [],
  onItemClick = null,
  enableLoop = true,
  enableAutoSwitch = true,
  loopInterval = 3000,
  autoSwitchInterval = 4000,
  className = ""
}) => {
  const [currentView, setCurrentView] = useState('table')
  const [isLooping, setIsLooping] = useState(false)
  const [isAutoSwitching, setIsAutoSwitching] = useState(false)
  const [currentDataIndex, setCurrentDataIndex] = useState(0)
  const [searchTerm, setSearchTerm] = useState('')
  const [filteredData, setFilteredData] = useState(data)

  // Data sources for looping
  const dataSources = [
    { name: 'All Data', data: () => data },
    { name: 'Recent Items', data: () => data.slice(0, 10) },
    { name: 'High Value', data: () => data.filter(item => {
      const value = getItemValue(item)
      return value > getAverageValue(data)
    })},
    { name: 'Random Sample', data: () => {
      const shuffled = [...data].sort(() => 0.5 - Math.random())
      return shuffled.slice(0, Math.min(5, data.length))
    }}
  ]

  // Filter data based on search term
  useEffect(() => {
    if (!searchTerm) {
      setFilteredData(data)
    } else {
      const filtered = data.filter(item => 
        Object.values(item).some(value => 
          String(value).toLowerCase().includes(searchTerm.toLowerCase())
        )
      )
      setFilteredData(filtered)
    }
  }, [data, searchTerm])

  // Loop through data sources
  useEffect(() => {
    if (!isLooping) return

    const interval = setInterval(() => {
      setCurrentDataIndex(prev => (prev + 1) % dataSources.length)
    }, loopInterval)

    return () => clearInterval(interval)
  }, [isLooping, loopInterval])

  // Auto switch views
  useEffect(() => {
    if (!isAutoSwitching) return

    const views = ['table', 'cards', 'grid']
    const interval = setInterval(() => {
      setCurrentView(prev => {
        const currentIndex = views.indexOf(prev)
        return views[(currentIndex + 1) % views.length]
      })
    }, autoSwitchInterval)

    return () => clearInterval(interval)
  }, [isAutoSwitching, autoSwitchInterval])

  // Get current data based on loop state
  const getCurrentData = () => {
    if (isLooping && dataSources[currentDataIndex]) {
      return dataSources[currentDataIndex].data()
    }
    return filteredData
  }

  const getItemValue = (item) => {
    // Try to find a numeric value in the item
    const numericFields = ['amount', 'value', 'price', 'total', 'AMOUNT', 'VALUE', 'PRICE', 'TOTAL']
    for (const field of numericFields) {
      if (item[field] && typeof item[field] === 'number') {
        return item[field]
      }
    }
    return 0
  }

  const getAverageValue = (items) => {
    if (items.length === 0) return 0
    const total = items.reduce((sum, item) => sum + getItemValue(item), 0)
    return total / items.length
  }

  const renderTableView = (displayData) => (
    <div className="overflow-x-auto max-h-[600px]">
      <table className="w-full text-sm text-left">
        <thead className="text-xs uppercase bg-gray-100 sticky top-0">
          <tr>
            {columns.length > 0 ? columns.map((col, index) => (
              <th key={index} className="px-6 py-3 font-medium text-gray-700">
                {col.label || col.key}
              </th>
            )) : Object.keys(displayData[0] || {}).map((key, index) => (
              <th key={index} className="px-6 py-3 font-medium text-gray-700">
                {key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {displayData.map((item, index) => (
            <motion.tr
              key={index}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: index * 0.02 }}
              className="border-b hover:bg-gray-50 cursor-pointer"
              onClick={() => onItemClick?.(item)}
            >
              {columns.length > 0 ? columns.map((col, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  {col.render ? col.render(item[col.key], item) : String(item[col.key] || '')}
                </td>
              )) : Object.values(item).map((value, colIndex) => (
                <td key={colIndex} className="px-6 py-4">
                  {String(value || '')}
                </td>
              ))}
            </motion.tr>
          ))}
        </tbody>
      </table>
    </div>
  )

  const renderCardsView = (displayData) => (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 max-h-[600px] overflow-y-auto">
      {displayData.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.05 }}
        >
          <Card 
            className="cursor-pointer hover:shadow-lg transition-all duration-200 hover:-translate-y-1"
            onClick={() => onItemClick?.(item)}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-lg">
                {item.name || item.title || item.description || `Item ${index + 1}`}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {Object.entries(item).slice(0, 4).map(([key, value]) => (
                  <div key={key} className="flex justify-between text-sm">
                    <span className="text-gray-500 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="font-medium">{String(value || 'N/A')}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )

  const renderGridView = (displayData) => (
    <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-6 gap-3 max-h-[600px] overflow-y-auto">
      {displayData.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2, delay: index * 0.03 }}
          className="bg-white border border-gray-200 rounded-lg p-3 text-center cursor-pointer hover:border-blue-500 hover:bg-blue-50 transition-all"
          onClick={() => onItemClick?.(item)}
        >
          <div className="text-xs text-gray-500 mb-1">
            {Object.keys(item)[0]?.replace(/_/g, ' ')}
          </div>
          <div className="font-semibold text-sm mb-1">
            {String(Object.values(item)[0] || '').substring(0, 15)}
            {String(Object.values(item)[0] || '').length > 15 ? '...' : ''}
          </div>
          <div className="text-xs text-blue-600 font-medium">
            {getItemValue(item) > 0 ? `$${getItemValue(item).toLocaleString()}` : ''}
          </div>
        </motion.div>
      ))}
    </div>
  )

  const currentData = getCurrentData()
  const currentSource = isLooping ? dataSources[currentDataIndex] : null

  return (
    <div className={`space-y-6 ${className}`}>
      {/* Header with Controls */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">
            {isLooping && currentSource ? `${title} - ${currentSource.name}` : title}
          </h2>
          <p className="text-gray-600">
            Showing {currentData.length} items
            {isLooping && (
              <span className="ml-2 text-blue-600 font-medium">
                (Loop {currentDataIndex + 1}/{dataSources.length})
              </span>
            )}
          </p>
        </div>

        <div className="flex items-center gap-2">
          {/* Search */}
          <SearchInput
            placeholder="Search data..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="w-48"
          />

          {/* Loop Controls */}
          {enableLoop && (
            <Button
              variant={isLooping ? "destructive" : "outline"}
              size="sm"
              onClick={() => setIsLooping(!isLooping)}
            >
              {isLooping ? <Pause className="h-4 w-4 mr-1" /> : <Play className="h-4 w-4 mr-1" />}
              {isLooping ? 'Stop' : 'Loop'}
            </Button>
          )}

          {/* Auto Switch */}
          {enableAutoSwitch && (
            <div className="flex items-center gap-2">
              <Switch
                checked={isAutoSwitching}
                onCheckedChange={setIsAutoSwitching}
              />
              <span className="text-sm text-gray-600">Auto</span>
            </div>
          )}
        </div>
      </div>

      {/* View Toggle Buttons */}
      <div className="flex items-center justify-between">
        <div className="flex space-x-1 bg-gray-100 rounded-lg p-1">
          <Button
            variant={currentView === 'table' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('table')}
          >
            <Table className="h-4 w-4 mr-1" />
            Table
          </Button>
          <Button
            variant={currentView === 'cards' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('cards')}
          >
            <LayoutGrid className="h-4 w-4 mr-1" />
            Cards
          </Button>
          <Button
            variant={currentView === 'grid' ? 'default' : 'ghost'}
            size="sm"
            onClick={() => setCurrentView('grid')}
          >
            <Grid3X3 className="h-4 w-4 mr-1" />
            Grid
          </Button>
        </div>

        {isLooping && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <div className="w-32 bg-gray-200 rounded-full h-2">
              <div 
                className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                style={{ width: `${((currentDataIndex + 1) / dataSources.length) * 100}%` }}
              />
            </div>
            <span>{currentDataIndex + 1}/{dataSources.length}</span>
          </div>
        )}
      </div>

      {/* Data Display */}
      <Card>
        <CardContent className="p-6">
          <AnimatePresence mode="wait">
            <motion.div
              key={`${currentView}-${currentDataIndex}`}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3 }}
            >
              {currentData.length === 0 ? (
                <div className="text-center py-12">
                  <div className="text-gray-400 mb-4">
                    <Eye className="h-16 w-16 mx-auto" />
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No data found</h3>
                  <p className="text-gray-500">
                    {searchTerm ? 'Try adjusting your search criteria' : 'No data available to display'}
                  </p>
                </div>
              ) : (
                <>
                  {currentView === 'table' && renderTableView(currentData)}
                  {currentView === 'cards' && renderCardsView(currentData)}
                  {currentView === 'grid' && renderGridView(currentData)}
                </>
              )}
            </motion.div>
          </AnimatePresence>
        </CardContent>
      </Card>
    </div>
  )
}

export default UniversalDataDisplay
