import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Package, Weight, Gauge, DollarSign } from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

const ItemSelector = ({ value, onChange, placeholder = "Select or enter item code", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [recentItems, setRecentItems] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Handle both string and object values
    const displayValue = typeof value === 'string' ? value : (value?.itemCode || '')
    setInputValue(displayValue)
  }, [value])

  useEffect(() => {
    // Load recent items on mount
    loadRecentItems()
  }, [])

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  const loadRecentItems = async () => {
    try {
      const response = await axios.get('/api/items/recent')
      setRecentItems(response.data.items || [])
    } catch (error) {
      console.error('Error loading recent items:', error)
      // Set some default suggestions
      setRecentItems([
        { 
          itemCode: 'ELEC-001', 
          description: 'LED Light Bulb 12W', 
          avgPrice: 150,
          unitWeight: 0.2,
          unitCbm: 0.001,
          lastUsed: new Date()
        },
        { 
          itemCode: 'FURN-002', 
          description: 'Office Chair Ergonomic', 
          avgPrice: 8500,
          unitWeight: 15,
          unitCbm: 0.25,
          lastUsed: new Date()
        },
        { 
          itemCode: 'TEXT-003', 
          description: 'Cotton T-Shirt Medium', 
          avgPrice: 299,
          unitWeight: 0.15,
          unitCbm: 0.002,
          lastUsed: new Date()
        }
      ])
    }
  }

  const searchItems = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions(recentItems.slice(0, 8))
      return
    }

    try {
      setLoading(true)
      const response = await axios.get('/api/items/search', {
        params: { q: query, limit: 10 }
      })
      setSuggestions(response.data.items || [])
    } catch (error) {
      console.error('Error searching items:', error)
      // Filter recent items based on query
      const filtered = recentItems.filter(item => 
        item.itemCode.toLowerCase().includes(query.toLowerCase()) ||
        (item.description && item.description.toLowerCase().includes(query.toLowerCase()))
      )
      setSuggestions(filtered)
    } finally {
      setLoading(false)
    }
  }

  const handleInputChange = (e) => {
    const newValue = e.target.value
    setInputValue(newValue)
    setIsOpen(true)
    
    // Debounce search
    clearTimeout(window.itemSearchTimeout)
    window.itemSearchTimeout = setTimeout(() => {
      searchItems(newValue)
    }, 300)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    if (suggestions.length === 0) {
      setSuggestions(recentItems.slice(0, 8))
    }
  }

  const handleItemSelect = (item) => {
    let itemCode, itemData
    
    if (typeof item === 'string') {
      itemCode = item
      itemData = {
        itemCode: item,
        description: '',
        unitPrice: 0,
        unitWeight: 0,
        unitCbm: 0
      }
    } else {
      itemCode = item.itemCode
      itemData = {
        itemCode: item.itemCode,
        description: item.description || '',
        unitPrice: item.avgPrice || item.unitPrice || 0,
        unitWeight: item.unitWeight || 0,
        unitCbm: item.unitCbm || 0
      }
    }
    
    setInputValue(itemCode)
    onChange(itemData)
    setIsOpen(false)
  }

  const handleInputBlur = () => {
    // Delay closing to allow click on suggestions
    setTimeout(() => {
      if (inputValue.trim()) {
        onChange({
          itemCode: inputValue.trim(),
          description: '',
          unitPrice: 0,
          unitWeight: 0,
          unitCbm: 0
        })
      }
    }, 150)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        onChange({
          itemCode: inputValue.trim(),
          description: '',
          unitPrice: 0,
          unitWeight: 0,
          unitCbm: 0
        })
      }
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const createNewItem = () => {
    if (inputValue.trim()) {
      onChange({
        itemCode: inputValue.trim(),
        description: '',
        unitPrice: 0,
        unitWeight: 0,
        unitCbm: 0
      })
      setIsOpen(false)
    }
  }

  return (
    <div className={`relative ${className}`} ref={dropdownRef}>
      <div className="relative">
        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-stone-400 h-4 w-4" />
        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent text-sm"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-stone-500 flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full mr-2"></div>
              Searching items...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-stone-500 mb-2">No items found</p>
              {inputValue.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewItem}
                  className="text-xs"
                >
                  <Plus className="h-3 w-3 mr-1" />
                  Use "{inputValue}"
                </Button>
              )}
            </div>
          )}

          {!loading && suggestions.length > 0 && (
            <>
              <div className="px-3 py-2 text-xs font-medium text-stone-500 border-b">
                {inputValue ? 'Search Results' : 'Recent Items'}
              </div>
              {suggestions.map((item, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                  onClick={() => handleItemSelect(item)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-green-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {typeof item === 'string' ? item : item.itemCode}
                      </p>
                      {typeof item === 'object' && (
                        <div className="text-xs text-stone-500 space-y-0.5">
                          {item.description && (
                            <div className="truncate font-medium text-stone-700">
                              {item.description}
                            </div>
                          )}
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-3">
                              {item.avgPrice && (
                                <div className="flex items-center">
                                  <DollarSign className="h-3 w-3 mr-1" />
                                  ₹{item.avgPrice}
                                </div>
                              )}
                              {item.unitWeight && (
                                <div className="flex items-center">
                                  <Weight className="h-3 w-3 mr-1" />
                                  {item.unitWeight}kg
                                </div>
                              )}
                              {item.unitCbm && (
                                <div className="flex items-center">
                                  <Gauge className="h-3 w-3 mr-1" />
                                  {item.unitCbm}m³
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {inputValue.trim() && !suggestions.find(s => 
                (typeof s === 'string' ? s : s.itemCode).toLowerCase() === inputValue.toLowerCase()
              ) && (
                <div className="px-3 py-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createNewItem}
                    className="w-full text-xs justify-start"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create new item: "{inputValue}"
                  </Button>
                </div>
              )}
            </>
          )}
        </div>
      )}
    </div>
  )
}

export default ItemSelector