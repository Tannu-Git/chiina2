import React from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { 
  Users, 
  Package, 
  Weight, 
  DollarSign,
  Layers,
  BarChart3,
  TrendingUp,
  Building2
} from 'lucide-react'
import { formatCurrency } from '@/lib/utils'

const ClientAllocationSummary = ({ 
  container, 
  showTitle = true, 
  className = "", 
  compact = false,
  showPercentages = true 
}) => {
  if (!container || !container.orders || container.orders.length === 0) {
    return (
      <Card className={className}>
        <CardContent className="p-6 text-center">
          <Package className="h-12 w-12 text-stone-400 mx-auto mb-3" />
          <p className="text-stone-500">No orders allocated to this container</p>
        </CardContent>
      </Card>
    )
  }

  // Group orders by client and calculate totals
  const clientAllocations = container.orders.reduce((clientMap, order) => {
    const orderDetails = order.orderId || order
    const clientName = orderDetails?.clientName || order.clientName || 'Unknown Client'
    const clientId = orderDetails?.clientId || order.clientId || 'unknown'

    if (!clientMap[clientId]) {
      clientMap[clientId] = {
        clientId,
        clientName,
        orders: [],
        totals: {
          cbm: 0,
          weight: 0,
          cartons: 0,
          revenue: 0,
          orderCount: 0
        }
      }
    }

    // Add order to client
    clientMap[clientId].orders.push(order)
    
    // Calculate totals
    clientMap[clientId].totals.cbm += order.cbmShare || 0
    clientMap[clientId].totals.weight += order.weightShare || 0
    clientMap[clientId].totals.cartons += order.cartonShare || 0
    clientMap[clientId].totals.revenue += order.carryingCharges || 0
    clientMap[clientId].totals.orderCount += 1

    return clientMap
  }, {})

  const clients = Object.values(clientAllocations)

  // Calculate container totals for percentages
  const containerTotals = {
    cbm: container.orders.reduce((sum, order) => sum + (order.cbmShare || 0), 0),
    weight: container.orders.reduce((sum, order) => sum + (order.weightShare || 0), 0),
    cartons: container.orders.reduce((sum, order) => sum + (order.cartonShare || 0), 0),
    revenue: container.orders.reduce((sum, order) => sum + (order.carryingCharges || 0), 0)
  }

  return (
    <Card className={className}>
      {showTitle && (
        <CardHeader className="pb-4">
          <CardTitle className="flex items-center text-lg">
            <Users className="h-5 w-5 mr-2 text-blue-600" />
            Client Allocation Summary
            <Badge variant="outline" className="ml-3">
              {clients.length} {clients.length === 1 ? 'Client' : 'Clients'}
            </Badge>
          </CardTitle>
          {!compact && (
            <div className="flex items-center justify-between text-sm text-stone-600">
              <span>Container: {container.realContainerId || container.clientFacingId}</span>
              <span>{container.orders.length} orders allocated</span>
            </div>
          )}
        </CardHeader>
      )}
      
      <CardContent className={compact ? "p-4" : "p-6"}>
        <div className="space-y-4">
          {clients.map((client, index) => (
            <div 
              key={client.clientId}
              className="p-4 bg-gradient-to-r from-blue-50 to-indigo-50 border border-blue-200 rounded-lg hover:shadow-md transition-shadow"
            >
              {/* Client Header */}
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center space-x-3">
                  <div className="p-2 bg-blue-100 rounded-full">
                    <Building2 className="h-4 w-4 text-blue-600" />
                  </div>
                  <div>
                    <h4 className="font-semibold text-blue-900 text-lg">{client.clientName}</h4>
                    <p className="text-sm text-blue-600">
                      {client.totals.orderCount} order{client.totals.orderCount !== 1 ? 's' : ''} allocated
                    </p>
                  </div>
                </div>
                <Badge 
                  variant="secondary" 
                  className="bg-blue-100 text-blue-800 border-blue-300"
                >
                  Client #{index + 1}
                </Badge>
              </div>

              {/* Client Allocation Metrics */}
              <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {/* CBM Allocation */}
                <div className="bg-white p-3 rounded-lg border border-blue-100 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Layers className="h-5 w-5 text-blue-600 mr-1" />
                    <span className="text-xs font-medium text-blue-700">CBM</span>
                  </div>
                  <p className="text-xl font-bold text-blue-800">
                    {client.totals.cbm.toFixed(1)} m³
                  </p>
                  {showPercentages && (
                    <div className="mt-1">
                      <p className="text-xs text-blue-600">
                        {containerTotals.cbm > 0 ? ((client.totals.cbm / containerTotals.cbm) * 100).toFixed(1) : 0}% of total
                      </p>
                      {container.maxCbm && (
                        <p className="text-xs text-stone-500">
                          {((client.totals.cbm / container.maxCbm) * 100).toFixed(1)}% of container
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Weight Allocation */}
                <div className="bg-white p-3 rounded-lg border border-green-100 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Weight className="h-5 w-5 text-green-600 mr-1" />
                    <span className="text-xs font-medium text-green-700">Weight</span>
                  </div>
                  <p className="text-xl font-bold text-green-800">
                    {client.totals.weight.toLocaleString()} kg
                  </p>
                  {showPercentages && (
                    <div className="mt-1">
                      <p className="text-xs text-green-600">
                        {containerTotals.weight > 0 ? ((client.totals.weight / containerTotals.weight) * 100).toFixed(1) : 0}% of total
                      </p>
                      {container.maxWeight && (
                        <p className="text-xs text-stone-500">
                          {((client.totals.weight / container.maxWeight) * 100).toFixed(1)}% of container
                        </p>
                      )}
                    </div>
                  )}
                </div>

                {/* Cartons Allocation */}
                <div className="bg-white p-3 rounded-lg border border-orange-100 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Package className="h-5 w-5 text-orange-600 mr-1" />
                    <span className="text-xs font-medium text-orange-700">Cartons</span>
                  </div>
                  <p className="text-xl font-bold text-orange-800">
                    {client.totals.cartons.toLocaleString()}
                  </p>
                  {showPercentages && (
                    <div className="mt-1">
                      <p className="text-xs text-orange-600">
                        {containerTotals.cartons > 0 ? ((client.totals.cartons / containerTotals.cartons) * 100).toFixed(1) : 0}% of total
                      </p>
                      <p className="text-xs text-stone-500">
                        Total cartons
                      </p>
                    </div>
                  )}
                </div>

                {/* Revenue Allocation */}
                <div className="bg-white p-3 rounded-lg border border-purple-100 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <DollarSign className="h-5 w-5 text-purple-600 mr-1" />
                    <span className="text-xs font-medium text-purple-700">Revenue</span>
                  </div>
                  <p className="text-lg font-bold text-purple-800">
                    {formatCurrency(client.totals.revenue)}
                  </p>
                  {showPercentages && (
                    <div className="mt-1">
                      <p className="text-xs text-purple-600">
                        {containerTotals.revenue > 0 ? ((client.totals.revenue / containerTotals.revenue) * 100).toFixed(1) : 0}% of total
                      </p>
                      <p className="text-xs text-stone-500">
                        Carrying charges
                      </p>
                    </div>
                  )}
                </div>
              </div>

              {/* Order Details Summary */}
              {!compact && (
                <div className="mt-4 pt-3 border-t border-blue-200">
                  <h5 className="text-sm font-medium text-blue-800 mb-2">Order Breakdown:</h5>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-xs">
                    {client.orders.map((order, orderIndex) => {
                      const orderDetails = order.orderId || order
                      return (
                        <div key={orderIndex} className="flex justify-between bg-white p-2 rounded border border-blue-100">
                          <span className="font-medium text-blue-700">
                            {orderDetails?.orderNumber || `Order ${orderIndex + 1}`}
                          </span>
                          <span className="text-blue-600">
                            {(order.cbmShare || 0).toFixed(1)} m³ • {formatCurrency(order.carryingCharges || 0)}
                          </span>
                        </div>
                      )
                    })}
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Container Summary Footer */}
        {!compact && (
          <div className="mt-6 pt-4 border-t border-stone-200">
            <div className="bg-stone-50 p-4 rounded-lg">
              <h4 className="font-medium text-stone-900 mb-3 flex items-center">
                <BarChart3 className="h-4 w-4 mr-2" />
                Container Totals
              </h4>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div className="text-center">
                  <p className="font-bold text-blue-600 text-lg">{containerTotals.cbm.toFixed(1)} m³</p>
                  <p className="text-stone-600">Total CBM</p>
                  {container.maxCbm && (
                    <p className="text-xs text-stone-500">
                      {((containerTotals.cbm / container.maxCbm) * 100).toFixed(1)}% utilized
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-green-600 text-lg">{containerTotals.weight.toLocaleString()} kg</p>
                  <p className="text-stone-600">Total Weight</p>
                  {container.maxWeight && (
                    <p className="text-xs text-stone-500">
                      {((containerTotals.weight / container.maxWeight) * 100).toFixed(1)}% utilized
                    </p>
                  )}
                </div>
                <div className="text-center">
                  <p className="font-bold text-orange-600 text-lg">{containerTotals.cartons.toLocaleString()}</p>
                  <p className="text-stone-600">Total Cartons</p>
                  <p className="text-xs text-stone-500">
                    {clients.length} clients
                  </p>
                </div>
                <div className="text-center">
                  <p className="font-bold text-purple-600 text-lg">{formatCurrency(containerTotals.revenue)}</p>
                  <p className="text-stone-600">Total Revenue</p>
                  <p className="text-xs text-stone-500">
                    All clients
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ClientAllocationSummary