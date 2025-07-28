import React from 'react'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

const ShipmentFilters = ({ 
  data = [], 
  selectedClient, 
  selectedSupplier, 
  onClientChange, 
  onSupplierChange 
}) => {
  // Extract unique clients and suppliers from data
  const clients = [...new Set(data.map(item => item.CLIENT).filter(Boolean))].sort()
  const suppliers = [...new Set(data.map(item => item.SUPPLIER).filter(Boolean))].sort()

  return (
    <section className="mb-8 p-6 bg-white rounded-xl shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Client Filter */}
        <div>
          <label htmlFor="client-filter" className="block text-sm font-medium text-stone-700 mb-2">
            Filter by Client
          </label>
          <Select value={selectedClient} onValueChange={onClientChange}>
            <SelectTrigger className="w-full p-2 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
              <SelectValue placeholder="All Clients" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Clients</SelectItem>
              {clients.map(client => (
                <SelectItem key={client} value={client}>
                  {client}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Supplier Filter */}
        <div>
          <label htmlFor="supplier-filter" className="block text-sm font-medium text-stone-700 mb-2">
            Filter by Supplier
          </label>
          <Select value={selectedSupplier} onValueChange={onSupplierChange}>
            <SelectTrigger className="w-full p-2 border border-stone-300 rounded-lg shadow-sm focus:ring-2 focus:ring-amber-500 focus:border-amber-500">
              <SelectValue placeholder="All Suppliers" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="All">All Suppliers</SelectItem>
              {suppliers.map(supplier => (
                <SelectItem key={supplier} value={supplier}>
                  {supplier}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
    </section>
  )
}

export default ShipmentFilters
