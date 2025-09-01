import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Search, 
  Package,
  User,
  Boxes,
  Weight,
  DollarSign,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  Filter
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const OrderSelectionStep = ({ data, onUpdate, isLoading }) => {
  const [qcReadyOrders, setQcReadyOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(data.selectedOrders || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const { token, isAuthenticated, user } = useAuthStore();

  const getAuthHeaders = () => {
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  useEffect(() => {
    fetchQcReadyOrders();
  }, []);

  useEffect(() => {
    onUpdate({ selectedOrders });
  }, [selectedOrders]);

  const fetchQcReadyOrders = async () => {
    try {
      if (!isAuthenticated) {
        toast.error('Please log in to access QC ready orders.');
        return;
      }

      const headers = getAuthHeaders();
      const response = await fetch('/api/warehouse/qc-ready-orders?includePartial=true', {
        headers
      });

      if (!response.ok) {
        if (response.status === 401) {
          toast.error('Your session has expired. Please log in again.');
          return;
        }
        if (response.status === 403) {
          toast.error('You need admin or staff permissions to access this feature.');
          return;
        }
        
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        throw new Error(errorData.message || `Failed to fetch QC ready orders: ${response.status}`);
      }

      const result = await response.json();
      setQcReadyOrders(result.orders);
      setSummary(result.summary);
      
      // Validate carton availability and provide detailed feedback
      if (result.orders && result.orders.length > 0) {
        let totalAvailable = 0;
        let ordersWithZeroCartons = 0;
        
        result.orders.forEach(order => {
          let orderHasAvailableCartons = false;
          order.items?.forEach(item => {
            const available = item.availableCartons || 0;
            totalAvailable += available;
            if (available > 0) orderHasAvailableCartons = true;
          });
          if (!orderHasAvailableCartons) ordersWithZeroCartons++;
        });
        
        if (totalAvailable === 0) {
          toast.error(`Found ${result.orders.length} QC ready orders but 0 cartons available for allocation`, {
            duration: 8000
          });
          setTimeout(() => {
            toast.info('This happens when: 1) Orders haven\'t completed QC inspection, 2) All cartons are already allocated, or 3) Database needs initialization', {
              duration: 6000
            });
          }, 2000);
        } else if (ordersWithZeroCartons > 0) {
          toast.warning(`${ordersWithZeroCartons} orders have no available cartons. Total available: ${totalAvailable} cartons`);
        }
      }
    } catch (error) {
      console.error('QC ready orders fetch error:', error);
      toast.error(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId, isSelected) => {
    if (isSelected) {
      const order = qcReadyOrders.find(o => o._id === orderId);
      if (order) {
        // Initialize with all available items
        const orderSelection = {
          orderId,
          items: order.items.map((item, index) => ({
            itemIndex: index,
            allocateQuantity: item.availableQuantity,
            allocateCartons: item.availableCartons
          }))
        };
        setSelectedOrders(prev => [...prev, orderSelection]);
      }
    } else {
      setSelectedOrders(prev => prev.filter(o => o.orderId !== orderId));
    }
  };

  const handleItemAllocationChange = (orderId, itemIndex, field, value) => {
    const numValue = parseInt(value) || 0;
    
    setSelectedOrders(prev => prev.map(order => {
      if (order.orderId === orderId) {
        return {
          ...order,
          items: order.items.map((item, idx) => {
            if (idx === itemIndex) {
              // Get the corresponding order item to check available quantities
              const qcOrder = qcReadyOrders.find(o => o._id === orderId);
              const qcItem = qcOrder?.items[itemIndex];
              
              if (qcItem) {
                const maxQuantity = qcItem.availableQuantity || 0;
                const maxCartons = qcItem.availableCartons || 0;
                
                let validatedValue = Math.max(0, numValue);
                
                // Enforce maximum limits based on field type
                if (field === 'allocateQuantity') {
                  validatedValue = Math.min(validatedValue, maxQuantity);
                  
                  // Show warning if user tried to exceed limit
                  if (numValue > maxQuantity) {
                    toast.error(`Cannot allocate ${numValue} units. Maximum available: ${maxQuantity}`);
                  }
                } else if (field === 'allocateCartons') {
                  validatedValue = Math.min(validatedValue, maxCartons);
                  
                  // Show warning if user tried to exceed limit
                  if (numValue > maxCartons) {
                    toast.error(`Cannot allocate ${numValue} cartons. Maximum available: ${maxCartons}`);
                  }
                }
                
                return { ...item, [field]: validatedValue };
              }
              
              return { ...item, [field]: Math.max(0, numValue) };
            }
            return item;
          })
        };
      }
      return order;
    }));
  };

  const getSelectedOrderData = (orderId) => {
    return selectedOrders.find(o => o.orderId === orderId);
  };

  const isOrderSelected = (orderId) => {
    return selectedOrders.some(o => o.orderId === orderId);
  };

  const filteredOrders = qcReadyOrders.filter(order => {
    const matchesSearch = !searchTerm || 
      order.orderNumber.toLowerCase().includes(searchTerm.toLowerCase()) ||
      order.clientName.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesClient = !clientFilter || 
      order.clientName.toLowerCase().includes(clientFilter.toLowerCase());
    
    return matchesSearch && matchesClient;
  });

  const calculateSelectionTotals = () => {
    let totalCbm = 0;
    let totalWeight = 0;
    let totalCartons = 0;
    let totalCarryingCharges = 0;

    selectedOrders.forEach(orderSelection => {
      const order = qcReadyOrders.find(o => o._id === orderSelection.orderId);
      if (order) {
        orderSelection.items.forEach(itemSelection => {
          const item = order.items[itemSelection.itemIndex];
          if (item) {
            const cbm = itemSelection.allocateCartons * (item.unitCbm || 0);
            const weight = itemSelection.allocateQuantity * (item.unitWeight || 0);
            
            totalCbm += cbm;
            totalWeight += weight;
            totalCartons += itemSelection.allocateCartons;
            
            // Calculate carrying charges
            const carryingCharge = item.carryingCharge || {};
            let charges = 0;
            switch (carryingCharge.basis) {
              case 'carton':
                charges = itemSelection.allocateCartons * (carryingCharge.rate || 0);
                break;
              case 'cbm':
                charges = cbm * (carryingCharge.rate || 0);
                break;
              case 'weight':
                charges = weight * (carryingCharge.rate || 0);
                break;
              default:
                charges = (carryingCharge.amount || 0) * (itemSelection.allocateQuantity / item.quantity);
            }
            totalCarryingCharges += charges;
          }
        });
      }
    });

    return {
      totalCbm: totalCbm.toFixed(2),
      totalWeight: totalWeight.toFixed(1),
      totalCartons,
      totalCarryingCharges: totalCarryingCharges.toFixed(0)
    };
  };

  const selectionTotals = calculateSelectionTotals();
  const uniqueClients = [...new Set(qcReadyOrders.map(order => order.clientName))];

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading QC ready orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Summary Stats */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Orders</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalOrders}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Boxes className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Available CBM</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalCbm.toFixed(1)}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <Weight className="h-8 w-8 text-orange-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Total Cartons</p>
                  <p className="text-2xl font-bold text-gray-900">{summary.totalCartons}</p>
                </div>
              </div>
            </CardContent>
          </Card>
          
          <Card>
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-gray-600">Carrying Charges</p>
                  <p className="text-2xl font-bold text-gray-900">₹{summary.totalCarryingCharges.toLocaleString()}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Orders List */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>QC Ready Orders</CardTitle>
                  <CardDescription>
                    Select orders and specify allocation quantities
                  </CardDescription>
                </div>
                <Badge variant="outline" className="px-3 py-1">
                  {selectedOrders.length} / {filteredOrders.length} selected
                </Badge>
              </div>
              
              {/* Filters */}
              <div className="flex gap-4 mt-4">
                <div className="flex-1">
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                    <Input
                      placeholder="Search orders or clients..."
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      className="pl-10"
                    />
                  </div>
                </div>
                <select
                  value={clientFilter}
                  onChange={(e) => setClientFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Clients</option>
                  {uniqueClients.map(client => (
                    <option key={client} value={client}>{client}</option>
                  ))}
                </select>
              </div>
            </CardHeader>
            
            <CardContent>
              <ScrollArea className="h-96">
                <div className="space-y-4">
                  {filteredOrders.map((order) => {
                    const isSelected = isOrderSelected(order._id);
                    const selectedData = getSelectedOrderData(order._id);
                    
                    return (
                      <motion.div
                        key={order._id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`border rounded-lg p-4 transition-all duration-200 ${
                          isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'
                        }`}
                      >
                        {/* Order Header */}
                        <div className="flex items-center justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <Checkbox
                              checked={isSelected}
                              onCheckedChange={(checked) => handleOrderSelect(order._id, checked)}
                            />
                            <div>
                              <h3 className="font-semibold text-gray-900">{order.orderNumber}</h3>
                              <p className="text-sm text-gray-600 flex items-center">
                                <User className="h-3 w-3 mr-1" />
                                {order.clientName}
                              </p>
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-4 text-sm text-gray-600">
                            <span className="flex items-center">
                              <Boxes className="h-4 w-4 mr-1" />
                              {order.allocationSummary.totalAvailableCbm.toFixed(1)} CBM
                            </span>
                            <span className="flex items-center">
                              <Package className="h-4 w-4 mr-1" />
                              {order.allocationSummary.totalAvailableCartons} cartons
                            </span>
                          </div>
                        </div>
                        
                        {/* Items */}
                        {isSelected && (
                          <motion.div
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: 'auto' }}
                            exit={{ opacity: 0, height: 0 }}
                            className="mt-4 space-y-3"
                          >
                            <Separator />
                            <h4 className="font-medium text-gray-900">Item Allocation</h4>
                            
                            {order.items.map((item, itemIndex) => {
                              const itemSelection = selectedData?.items.find(i => i.itemIndex === itemIndex);
                              
                              return (
                                <div key={itemIndex} className="bg-white rounded border p-3">
                                  <div className="flex items-center justify-between mb-2">
                                    <div>
                                      <p className="font-medium text-sm">{item.itemCode}</p>
                                      <p className="text-xs text-gray-600">{item.description}</p>
                                    </div>
                                    <Badge 
                                      variant={item.allocationStatus.canAllocate ? "default" : "secondary"}
                                      className="text-xs"
                                    >
                                      {item.allocationStatus.percentageAvailable}% available
                                    </Badge>
                                  </div>
                                  
                                  <div className="grid grid-cols-1 gap-3">
                                    {/* Primary Carton-Based Allocation */}
                                    <div>
                                      <Label className="text-xs text-gray-600 font-medium">Allocate Cartons (Primary)</Label>
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          type="number"
                                          value={itemSelection?.allocateCartons || 0}
                                          onChange={(e) => {
                                            const cartonValue = e.target.value;
                                            handleItemAllocationChange(order._id, itemIndex, 'allocateCartons', cartonValue);
                                            
                                            // Auto-calculate quantity based on cartons (carton-based primary)
                                            const qtyPerCarton = item.quantity && item.cartons ? item.quantity / item.cartons : 1;
                                            const calculatedQty = Math.round((parseInt(cartonValue) || 0) * qtyPerCarton);
                                            handleItemAllocationChange(order._id, itemIndex, 'allocateQuantity', calculatedQty);
                                          }}
                                          max={item.availableCartons}
                                          min={0}
                                          step={1}
                                          className={`text-sm font-medium ${
                                            (itemSelection?.allocateCartons || 0) > item.availableCartons 
                                              ? 'border-red-500 focus:border-red-500' 
                                              : 'border-green-300 focus:border-green-500'
                                          }`}
                                          onBlur={(e) => {
                                            const value = parseInt(e.target.value) || 0;
                                            if (value > item.availableCartons) {
                                              handleItemAllocationChange(
                                                order._id, itemIndex, 'allocateCartons', item.availableCartons
                                              );
                                            }
                                          }}
                                        />
                                        <span className={`text-sm font-medium ${
                                          (itemSelection?.allocateCartons || 0) > item.availableCartons 
                                            ? 'text-red-500' 
                                            : 'text-green-600'
                                        }`}>
                                          / {item.availableCartons} cartons
                                        </span>
                                      </div>
                                      {(itemSelection?.allocateCartons || 0) > item.availableCartons && (
                                        <p className="text-xs text-red-500 mt-1 font-medium">
                                          ⚠️ Exceeds available cartons
                                        </p>
                                      )}
                                      
                                      {/* Show calculated quantity for reference only */}
                                      <div className="mt-2 text-xs text-gray-500 bg-gray-50 rounded p-2">
                                        <div className="flex justify-between">
                                          <span>Auto-calculated quantity:</span>
                                          <span className="font-medium">{itemSelection?.allocateQuantity || 0} units</span>
                                        </div>
                                        <div className="text-gray-400 text-xs mt-1">
                                          Based on carton allocation (carton-based tracking)
                                        </div>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Item totals - Carton-focused */}
                                  <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                                    <div className="bg-blue-50 rounded p-2">
                                      <div className="text-blue-700 font-medium">CBM (Primary)</div>
                                      <div className="text-blue-900 font-bold">
                                        {((itemSelection?.allocateCartons || 0) * (item.unitCbm || 0)).toFixed(2)} m³
                                      </div>
                                    </div>
                                    <div className="bg-green-50 rounded p-2">
                                      <div className="text-green-700 font-medium">Payment Type</div>
                                      <div className="text-green-900 font-bold text-xs">
                                        {item.paymentType === 'THROUGH_ME' ? 'Through Me' : 'Direct'}
                                      </div>
                                    </div>
                                  </div>
                                </div>
                              );
                            })}
                          </motion.div>
                        )}
                      </motion.div>
                    );
                  })}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>
        </div>
        
        {/* Selection Summary */}
        <div className="lg:col-span-1">
          <Card className="sticky top-6">
            <CardHeader>
              <CardTitle className="flex items-center">
                <TrendingUp className="h-5 w-5 mr-2" />
                Selection Summary
              </CardTitle>
              <CardDescription>
                Current allocation totals
              </CardDescription>
            </CardHeader>
            
            <CardContent className="space-y-4">
              <div className="grid grid-cols-1 gap-4">
                {/* Primary Carton Metrics */}
                <div className="text-center p-4 bg-gradient-to-r from-blue-50 to-blue-100 rounded-lg border border-blue-200">
                  <div className="flex items-center justify-center mb-2">
                    <Boxes className="h-6 w-6 text-blue-600 mr-2" />
                    <p className="text-lg font-bold text-blue-800">{selectionTotals.totalCartons} Cartons</p>
                  </div>
                  <p className="text-xs text-blue-600 font-medium">Primary tracking unit</p>
                </div>
                
                {/* CBM and Charges */}
                <div className="grid grid-cols-2 gap-3">
                  <div className="text-center p-3 bg-green-50 rounded-lg">
                    <p className="text-xl font-bold text-green-600">{selectionTotals.totalCbm}</p>
                    <p className="text-xs text-green-600">CBM</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <p className="text-xl font-bold text-purple-600">₹{parseInt(selectionTotals.totalCarryingCharges).toLocaleString()}</p>
                    <p className="text-xs text-purple-600">Charges</p>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              <div className="space-y-2">
                <h4 className="font-medium text-gray-900">Container Recommendation</h4>
                {parseFloat(selectionTotals.totalCbm) > 0 && (
                  <div className="p-3 bg-amber-50 rounded-lg">
                    <p className="text-sm font-medium text-amber-800">
                      {parseFloat(selectionTotals.totalCbm) <= 33 ? '20ft Container' :
                       parseFloat(selectionTotals.totalCbm) <= 67 ? '40ft Container' : 
                       '40ft HC Container'}
                    </p>
                    <p className="text-xs text-amber-600">
                      Utilization: {(
                        parseFloat(selectionTotals.totalCbm) / 
                        (parseFloat(selectionTotals.totalCbm) <= 33 ? 33 :
                         parseFloat(selectionTotals.totalCbm) <= 67 ? 67 : 76
                        ) * 100
                      ).toFixed(1)}%
                    </p>
                  </div>
                )}
              </div>
              
              {selectedOrders.length === 0 && (
                <Alert>
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription>
                    Select orders to proceed with allocation
                  </AlertDescription>
                </Alert>
              )}
              
              {selectedOrders.length > 0 && (
                <Alert>
                  <CheckCircle2 className="h-4 w-4" />
                  <AlertDescription>
                    {selectedOrders.length} order(s) selected. Ready to proceed.
                  </AlertDescription>
                </Alert>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default OrderSelectionStep;