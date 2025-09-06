import React, { useState, useEffect, useRef } from 'react'
import { Search, Plus, User, Building, Phone, Mail } from 'lucide-react'
import { Button } from '@/components/ui/button'
import axios from 'axios'
import toast from 'react-hot-toast'

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
      // Load both recent clients from orders AND registered clients from client management
      const [ordersResponse, clientsResponse] = await Promise.all([
        axios.get('/api/orders/recent-clients'),
        axios.get('/api/clients/recent')
      ])
      
      const orderClients = ordersResponse.data.clients || []
      const registeredClients = clientsResponse.data.clients || []
      
      // Combine and deduplicate clients (prioritize registered clients)
      const clientMap = new Map()
      
      // Add registered clients first (higher priority)
      registeredClients.forEach(client => {
        clientMap.set(client.name.toLowerCase(), {
          ...client,
          type: 'registered',
          isVerified: true
        })
      })
      
      // Add order clients if they don't already exist as registered
      orderClients.forEach(client => {
        if (!clientMap.has(client.name.toLowerCase())) {
          clientMap.set(client.name.toLowerCase(), {
            ...client,
            type: 'order_history',
            isVerified: false
          })
        }
      })
      
      // Convert map to array and sort by registration status, then by usage
      const combinedClients = Array.from(clientMap.values()).sort((a, b) => {
        // Registered clients first
        if (a.type === 'registered' && b.type !== 'registered') return -1
        if (b.type === 'registered' && a.type !== 'registered') return 1
        
        // Then by order count or last used date
        const aScore = (a.orderCount || 0) + (a.lastUsed ? 1 : 0)
        const bScore = (b.orderCount || 0) + (b.lastUsed ? 1 : 0)
        return bScore - aScore
      })
      
      setRecentClients(combinedClients)
      console.log('Loaded combined client list:', {
        registered: registeredClients.length,
        fromOrders: orderClients.length,
        total: combinedClients.length
      })
    } catch (error) {
      console.error('Error loading recent clients:', error)
      // Set some default suggestions as fallback
      setRecentClients([
        { name: 'ABC Trading Co.', company: 'ABC Trading Co.', phone: '+1-555-0123', email: 'contact@abctrading.com', type: 'fallback' },
        { name: 'XYZ Imports Ltd.', company: 'XYZ Imports Ltd.', phone: '+1-555-0456', email: 'info@xyzimports.com', type: 'fallback' },
        { name: 'Global Logistics Pvt Ltd', company: 'Global Logistics Pvt Ltd.', phone: '+1-555-0789', email: 'sales@globallogistics.com', type: 'fallback' }
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
      // Search both registered clients and order history
      const response = await axios.get('/api/clients/search', {
        params: { q: query, limit: 10 }
      })
      
      const searchResults = response.data.clients || []
      
      // Mark client types for better UI representation
      const enhancedResults = searchResults.map(client => ({
        ...client,
        type: client.type || (client.clientId ? 'registered' : 'order_history'),
        isVerified: !!client.clientId
      }))
      
      setSuggestions(enhancedResults)
      console.log('Client search results:', enhancedResults)
    } catch (error) {
      console.error('Error searching clients:', error)
      // Filter recent clients based on query as fallback
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

  const handleClientSelect = async (client) => {
    const clientName = typeof client === 'string' ? client : client.name
    setInputValue(clientName)
    
    // If this is a new client (no clientId), attempt auto-registration
    if (typeof client === 'object' && !client.clientId && client.type !== 'registered') {
      try {
        console.log('Auto-registering new client:', clientName)
        const response = await axios.post('/api/clients/auto-register', {
          clientName: clientName,
          source: 'order_creation'
        })
        
        if (response.data.success && response.data.client) {
          // Update client data with the registered client info
          const registeredClient = {
            ...client,
            clientId: response.data.client.clientId,
            type: 'registered',
            isVerified: true
          }
          console.log('Client auto-registered successfully:', registeredClient)
          console.log('🎯 [CLIENT SELECTOR] Auto-registration response details:', {
            success: response.data.success,
            clientId: response.data.client?.clientId,
            clientName: response.data.client?.name,
            isNew: response.data.isNew,
            fullResponse: response.data
          })
          toast.success(`✓ Client "${clientName}" registered successfully! ID: ${response.data.client?.clientId || 'AUTO-GENERATED'}`)
          
          // Refresh recent clients list to include the new client
          loadRecentClients()
          
          // Dispatch event to notify other components
          console.log('🚀 [CLIENT SELECTOR] Dispatching clientRegistered event for handleClientSelect:', response.data.client)
          const event = new CustomEvent('clientRegistered', { detail: { client: response.data.client } })
          window.dispatchEvent(event)
          console.log('✅ [CLIENT SELECTOR] Event dispatched successfully')
          onChange(clientName, registeredClient)
        } else {
          // Fallback if auto-registration fails
          onChange(clientName, client)
        }
      } catch (error) {
        console.warn('Auto-registration failed, proceeding without registration:', error)
        // Silently continue - don't disrupt user flow
        onChange(clientName, client)
      }
    } else {
      // Existing registered client or simple string
      onChange(clientName, client)
    }
    
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

  const createNewClient = async () => {
    if (inputValue.trim()) {
      try {
        console.log('Creating new client via direct input:', inputValue.trim())
        const response = await axios.post('/api/clients/auto-register', {
          clientName: inputValue.trim(),
          source: 'order_creation'
        })
        
        if (response.data.success && response.data.client) {
          const newClient = {
            name: inputValue.trim(),
            clientId: response.data.client.clientId,
            type: 'registered',
            isVerified: true
          }
          console.log('New client created and registered:', newClient)
          console.log('Client creation response:', response.data)
          toast.success(`✓ Client "${inputValue.trim()}" created successfully! ID: ${response.data.client?.clientId || 'AUTO-GENERATED'}`)
          
          // Refresh recent clients list to include the new client
          loadRecentClients()
          
          // Dispatch event to notify other components
          console.log('🚀 [CLIENT SELECTOR] Dispatching clientRegistered event for createNewClient:', response.data.client)
          const createEvent = new CustomEvent('clientRegistered', { detail: { client: response.data.client } })
          window.dispatchEvent(createEvent)
          console.log('✅ [CLIENT SELECTOR] Create event dispatched successfully')
          onChange(inputValue.trim(), newClient)
        } else {
          // Fallback if auto-registration fails
          onChange(inputValue.trim())
        }
      } catch (error) {
        console.warn('Client creation failed, proceeding without registration:', error)
        // Silently continue - don't disrupt user flow
        onChange(inputValue.trim())
      }
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
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
                        typeof client === 'object' && client.type === 'registered' 
                          ? 'bg-green-100' 
                          : 'bg-amber-100'
                      }`}>
                        <User className={`h-4 w-4 ${
                          typeof client === 'object' && client.type === 'registered' 
                            ? 'text-green-600' 
                            : 'text-amber-600'
                        }`} />
                      </div>
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center space-x-2">
                        <p className="text-sm font-medium text-stone-900 truncate">
                          {typeof client === 'string' ? client : client.name}
                        </p>
                        {typeof client === 'object' && client.type === 'registered' && (
                          <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            Registered
                          </span>
                        )}
                      </div>
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
                          {client.clientId && (
                            <div className="text-xs text-green-600">
                              ID: {client.clientId}
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