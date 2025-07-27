import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  Search,
  Package,
  Zap,
  Clock,
  TrendingUp,
  Star,
  CheckCircle,
  AlertCircle
} from 'lucide-react'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'

const CodeAutoComplete = ({ value, onChange, onEstimatePrice }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [selectedIndex, setSelectedIndex] = useState(-1)
  const [searchHistory, setSearchHistory] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  // Fetch suggestions from API
  const fetchSuggestions = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions([])
      return
    }

    try {
      setLoading(true)
      const response = await axios.get('/api/orders/item-suggestions', {
        params: { q: query, limit: 10 }
      })
      
      const items = response.data.items || []
      
      // Add AI-powered suggestions
      const aiSuggestions = await getAISuggestions(query)
      
      setSuggestions([...items, ...aiSuggestions])
    } catch (error) {
      console.error('Error fetching suggestions:', error)
      setSuggestions([])
    } finally {
      setLoading(false)
    }
  }

  // AI-powered suggestions based on description
  const getAISuggestions = async (query) => {
    try {
      const response = await axios.post('/api/orders/ai-suggestions', {
        query,
        context: 'item_search'
      })
      
      return response.data.suggestions?.map(item => ({
        ...item,
        isAI: true,
        confidence: item.confidence || 0.8
      })) || []
    } catch (error) {
      return []
    }
  }

  // Handle input change
  const handleInputChange = (e) => {
    const newValue = e.target.value
    onChange(newValue)
    
    if (newValue.length >= 2) {
      setIsOpen(true)
      fetchSuggestions(newValue)
    } else {
      setIsOpen(false)
      setSuggestions([])
    }
    
    setSelectedIndex(-1)
  }

  // Handle suggestion selection
  const selectSuggestion = (item) => {
    onChange(item.itemCode, item)
    setIsOpen(false)
    setSuggestions([])
    setSelectedIndex(-1)
    
    // Add to search history
    const newHistory = [item, ...searchHistory.filter(h => h.itemCode !== item.itemCode)].slice(0, 5)
    setSearchHistory(newHistory)
    localStorage.setItem('itemSearchHistory', JSON.stringify(newHistory))
  }

  // Keyboard navigation
  const handleKeyDown = (e) => {
    if (!isOpen || suggestions.length === 0) return

    switch (e.key) {
      case 'ArrowDown':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev < suggestions.length - 1 ? prev + 1 : 0
        )
        break
      case 'ArrowUp':
        e.preventDefault()
        setSelectedIndex(prev => 
          prev > 0 ? prev - 1 : suggestions.length - 1
        )
        break
      case 'Enter':
        e.preventDefault()
        if (selectedIndex >= 0) {
          selectSuggestion(suggestions[selectedIndex])
        }
        break
      case 'Escape':
        setIsOpen(false)
        setSelectedIndex(-1)
        break
    }
  }

  // Load search history on mount
  useEffect(() => {
    const history = localStorage.getItem('itemSearchHistory')
    if (history) {
      setSearchHistory(JSON.parse(history))
    }
  }, [])

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const SuggestionItem = ({ item, index, isSelected }) => (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.05 }}
      className={`p-3 cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
        isSelected ? 'bg-blue-50 border-blue-200' : ''
      }`}
      onClick={() => selectSuggestion(item)}
    >
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <div className="flex items-center space-x-2">
            <Package className="h-4 w-4 text-gray-400" />
            <span className="font-medium text-gray-900">{item.itemCode}</span>
            {item.isAI && (
              <Badge variant="outline" className="text-xs bg-purple-50 text-purple-700">
                <Zap className="h-3 w-3 mr-1" />
                AI {Math.round(item.confidence * 100)}%
              </Badge>
            )}
            {item.isPopular && (
              <Badge variant="outline" className="text-xs bg-yellow-50 text-yellow-700">
                <Star className="h-3 w-3 mr-1" />
                Popular
              </Badge>
            )}
          </div>
          <p className="text-sm text-gray-600 mt-1 line-clamp-2">{item.description}</p>
          
          <div className="flex items-center space-x-4 mt-2 text-xs text-gray-500">
            {item.price && (
              <span className="flex items-center">
                <TrendingUp className="h-3 w-3 mr-1" />
                {formatCurrency(item.price)}
              </span>
            )}
            {item.lastUsed && (
              <span className="flex items-center">
                <Clock className="h-3 w-3 mr-1" />
                Last used {new Date(item.lastUsed).toLocaleDateString()}
              </span>
            )}
            {item.supplier && (
              <span>Supplier: {item.supplier}</span>
            )}
          </div>
        </div>
        
        <div className="flex flex-col items-end space-y-1">
          {item.inStock !== undefined && (
            <Badge variant={item.inStock ? "default" : "destructive"} className="text-xs">
              {item.inStock ? (
                <>
                  <CheckCircle className="h-3 w-3 mr-1" />
                  In Stock
                </>
              ) : (
                <>
                  <AlertCircle className="h-3 w-3 mr-1" />
                  Out of Stock
                </>
              )}
            </Badge>
          )}
          
          {item.leadTime && (
            <span className="text-xs text-gray-500">
              Lead: {item.leadTime} days
            </span>
          )}
        </div>
      </div>
    </motion.div>
  )

  return (
    <div className="relative" ref={dropdownRef}>
      <div className="relative">
        <Input
          ref={inputRef}
          type="text"
          value={value}
          onChange={handleInputChange}
          onKeyDown={handleKeyDown}
          onFocus={() => {
            if (value.length >= 2) {
              setIsOpen(true)
              fetchSuggestions(value)
            } else if (searchHistory.length > 0) {
              setIsOpen(true)
              setSuggestions(searchHistory)
            }
          }}
          placeholder="Enter item code or description..."
          className="pr-20"
        />
        
        <div className="absolute right-2 top-1/2 transform -translate-y-1/2 flex items-center space-x-1">
          {loading && (
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600"></div>
          )}
          
          <Button
            type="button"
            size="sm"
            variant="ghost"
            onClick={onEstimatePrice}
            className="h-6 w-6 p-0"
            title="AI Price Estimation"
          >
            <Zap className="h-3 w-3" />
          </Button>
          
          <Search className="h-4 w-4 text-gray-400" />
        </div>
      </div>

      <AnimatePresence>
        {isOpen && (suggestions.length > 0 || searchHistory.length > 0) && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-80 overflow-y-auto"
          >
            {/* Search History */}
            {suggestions.length === 0 && searchHistory.length > 0 && (
              <>
                <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                  Recent Searches
                </div>
                {searchHistory.map((item, index) => (
                  <SuggestionItem
                    key={`history-${item.itemCode}`}
                    item={item}
                    index={index}
                    isSelected={index === selectedIndex}
                  />
                ))}
              </>
            )}

            {/* Live Suggestions */}
            {suggestions.length > 0 && (
              <>
                {searchHistory.length > 0 && suggestions.some(s => !searchHistory.find(h => h.itemCode === s.itemCode)) && (
                  <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b">
                    Suggestions
                  </div>
                )}
                {suggestions.map((item, index) => (
                  <SuggestionItem
                    key={item.itemCode}
                    item={item}
                    index={index}
                    isSelected={index === selectedIndex}
                  />
                ))}
              </>
            )}

            {/* No results */}
            {suggestions.length === 0 && searchHistory.length === 0 && value.length >= 2 && !loading && (
              <div className="p-4 text-center text-gray-500">
                <Package className="h-8 w-8 mx-auto mb-2 text-gray-300" />
                <p className="text-sm">No items found</p>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onEstimatePrice}
                  className="mt-2"
                >
                  <Zap className="h-3 w-3 mr-1" />
                  Try AI Estimation
                </Button>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default CodeAutoComplete
