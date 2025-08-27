import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, Package, Building, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

const SupplierSelector = ({ value, onChange, placeholder = "Select or enter supplier name", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState('')
  const [recentSuppliers, setRecentSuppliers] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    // Handle both string and object values
    const displayValue = typeof value === 'string' ? value : (value?.name || '')
    setInputValue(displayValue)
  }, [value])

  useEffect(() => {
    // Load recent suppliers on mount
    loadRecentSuppliers()
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

  const loadRecentSuppliers = async () => {
    try {
      const response = await axios.get('/api/suppliers/recent')
      setRecentSuppliers(response.data.suppliers || [])
    } catch (error) {
      console.error('Error loading recent suppliers:', error)
      // Set some default suggestions
      setRecentSuppliers([
        { name: 'TechSupply Inc.', contact: 'Mike Johnson', email: 'mike@techsupply.com' },
        { name: 'Fabric World Ltd.', contact: 'Sarah Wilson', email: 'sarah@fabricworld.com' },
        { name: 'Global Parts Co.', contact: 'David Chen', email: 'david@globalparts.com' },
        { name: 'Premium Electronics', contact: 'Lisa Rodriguez', email: 'lisa@premiumelec.com' },
        { name: 'Quality Manufacturing', contact: 'James Smith', email: 'james@qualitymfg.com' }
      ])
    }
  }

  const searchSuppliers = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions(recentSuppliers.slice(0, 8))
      return
    }

    try {
      setLoading(true)
      const response = await axios.get('/api/suppliers/search', {
        params: { q: query, limit: 10 }
      })
      setSuggestions(response.data.suppliers || [])
    } catch (error) {
      console.error('Error searching suppliers:', error)
      // Filter recent suppliers based on query
      const filtered = recentSuppliers.filter(supplier => 
        supplier.name.toLowerCase().includes(query.toLowerCase()) ||
        (supplier.contact && supplier.contact.toLowerCase().includes(query.toLowerCase()))
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
    clearTimeout(window.supplierSearchTimeout)
    window.supplierSearchTimeout = setTimeout(() => {
      searchSuppliers(newValue)
    }, 300)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    if (suggestions.length === 0) {
      setSuggestions(recentSuppliers.slice(0, 8))
    }
  }

  const handleSupplierSelect = (supplier) => {
    let supplierName, supplierData
    
    if (typeof supplier === 'string') {
      supplierName = supplier
      supplierData = supplier
    } else {
      supplierName = supplier.name
      supplierData = {
        name: supplier.name,
        contact: supplier.contact || '',
        email: supplier.email || ''
      }
    }
    
    setInputValue(supplierName)
    onChange(supplierData)
    setIsOpen(false)
  }

  const handleInputBlur = () => {
    // Delay closing to allow click on suggestions
    setTimeout(() => {
      if (inputValue.trim()) {
        onChange(inputValue.trim())
      }
    }, 150)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      if (inputValue.trim()) {
        onChange(inputValue.trim())
      }
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const createNewSupplier = () => {
    if (inputValue.trim()) {
      onChange(inputValue.trim())
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
              Searching suppliers...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-stone-500 mb-2">No suppliers found</p>
              {inputValue.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewSupplier}
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
                {inputValue ? 'Search Results' : 'Recent Suppliers'}
              </div>
              {suggestions.map((supplier, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                  onClick={() => handleSupplierSelect(supplier)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                        <Package className="h-4 w-4 text-blue-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {typeof supplier === 'string' ? supplier : supplier.name}
                      </p>
                      {typeof supplier === 'object' && (
                        <div className="text-xs text-stone-500 space-y-0.5">
                          {supplier.contact && (
                            <div className="flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {supplier.contact}
                            </div>
                          )}
                          {supplier.email && (
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {supplier.email}
                            </div>
                          )}
                          {supplier.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {supplier.phone}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
              {inputValue.trim() && !suggestions.find(s => 
                (typeof s === 'string' ? s : s.name).toLowerCase() === inputValue.toLowerCase()
              ) && (
                <div className="px-3 py-2 border-t">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={createNewSupplier}
                    className="w-full text-xs justify-start"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create new: "{inputValue}"
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

export default SupplierSelector