import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, User, Building, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'

const ClientSelector = ({ value, onChange, placeholder = "Select or enter client name", className = "" }) => {
  const [isOpen, setIsOpen] = useState(false)
  const [suggestions, setSuggestions] = useState([])
  const [loading, setLoading] = useState(false)
  const [inputValue, setInputValue] = useState(value || '')
  const [recentClients, setRecentClients] = useState([])
  const inputRef = useRef(null)
  const dropdownRef = useRef(null)

  useEffect(() => {
    setInputValue(value || '')
  }, [value])

  useEffect(() => {
    // Load recent clients on mount
    loadRecentClients()
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

  const loadRecentClients = async () => {
    try {
      const response = await axios.get('/api/orders/recent-clients')
      setRecentClients(response.data.clients || [])
    } catch (error) {
      console.error('Error loading recent clients:', error)
      // Set some default suggestions
      setRecentClients([
        { name: 'ABC Trading Co.', company: 'ABC Trading Co.', phone: '+1-555-0123', email: 'contact@abctrading.com' },
        { name: 'XYZ Imports Ltd.', company: 'XYZ Imports Ltd.', phone: '+1-555-0456', email: 'info@xyzimports.com' },
        { name: 'Global Logistics Pvt Ltd', company: 'Global Logistics Pvt Ltd', phone: '+1-555-0789', email: 'sales@globallogistics.com' }
      ])
    }
  }

  const searchClients = async (query) => {
    if (!query || query.length < 2) {
      setSuggestions(recentClients.slice(0, 5))
      return
    }

    try {
      setLoading(true)
      const response = await axios.get('/api/clients/search', {
        params: { q: query, limit: 10 }
      })
      setSuggestions(response.data.clients || [])
    } catch (error) {
      console.error('Error searching clients:', error)
      // Filter recent clients based on query
      const filtered = recentClients.filter(client => 
        client.name.toLowerCase().includes(query.toLowerCase()) ||
        (client.company && client.company.toLowerCase().includes(query.toLowerCase()))
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
    clearTimeout(window.clientSearchTimeout)
    window.clientSearchTimeout = setTimeout(() => {
      searchClients(newValue)
    }, 300)
  }

  const handleInputFocus = () => {
    setIsOpen(true)
    if (suggestions.length === 0) {
      setSuggestions(recentClients.slice(0, 5))
    }
  }

  const handleClientSelect = (client) => {
    const clientName = typeof client === 'string' ? client : client.name
    setInputValue(clientName)
    onChange(clientName, client)
    setIsOpen(false)
  }

  const handleInputBlur = () => {
    // Delay closing to allow click on suggestions
    setTimeout(() => {
      onChange(inputValue)
    }, 150)
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      e.preventDefault()
      onChange(inputValue)
      setIsOpen(false)
    } else if (e.key === 'Escape') {
      setIsOpen(false)
    }
  }

  const createNewClient = () => {
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
          className="w-full pl-10 pr-4 py-2 border border-stone-300 rounded-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:border-transparent"
        />
      </div>

      {isOpen && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-stone-200 rounded-md shadow-lg max-h-64 overflow-y-auto">
          {loading && (
            <div className="px-3 py-2 text-sm text-stone-500 flex items-center">
              <div className="animate-spin h-4 w-4 border-2 border-amber-500 border-t-transparent rounded-full mr-2"></div>
              Searching...
            </div>
          )}

          {!loading && suggestions.length === 0 && (
            <div className="px-3 py-4 text-center">
              <p className="text-sm text-stone-500 mb-2">No clients found</p>
              {inputValue.trim() && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={createNewClient}
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
                {inputValue ? 'Search Results' : 'Recent Clients'}
              </div>
              {suggestions.map((client, index) => (
                <div
                  key={index}
                  className="px-3 py-2 hover:bg-stone-50 cursor-pointer border-b border-stone-100 last:border-b-0"
                  onClick={() => handleClientSelect(client)}
                >
                  <div className="flex items-start space-x-3">
                    <div className="flex-shrink-0 mt-0.5">
                      <div className="w-8 h-8 bg-amber-100 rounded-full flex items-center justify-center">
                        <User className="h-4 w-4 text-amber-600" />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-stone-900 truncate">
                        {typeof client === 'string' ? client : client.name}
                      </p>
                      {typeof client === 'object' && (
                        <div className="text-xs text-stone-500 space-y-0.5">
                          {client.company && (
                            <div className="flex items-center">
                              <Building className="h-3 w-3 mr-1" />
                              {client.company}
                            </div>
                          )}
                          {client.email && (
                            <div className="flex items-center">
                              <Mail className="h-3 w-3 mr-1" />
                              {client.email}
                            </div>
                          )}
                          {client.phone && (
                            <div className="flex items-center">
                              <Phone className="h-3 w-3 mr-1" />
                              {client.phone}
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
                    onClick={createNewClient}
                    className="w-full text-xs justify-start"
                  >
                    <Plus className="h-3 w-3 mr-2" />
                    Create new client: "{inputValue}"
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

export default ClientSelector