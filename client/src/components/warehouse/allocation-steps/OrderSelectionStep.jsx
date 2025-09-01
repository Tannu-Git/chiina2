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
import { useToast } from '@/hooks/use-toast';

const OrderSelectionStep = ({ data, onUpdate, isLoading }) => {
  const [qcReadyOrders, setQcReadyOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState(data.selectedOrders || []);
  const [searchTerm, setSearchTerm] = useState('');
  const [clientFilter, setClientFilter] = useState('');
  const [loading, setLoading] = useState(true);
  const [summary, setSummary] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    fetchQcReadyOrders();
  }, []);

  useEffect(() => {
    onUpdate({ selectedOrders });
  }, [selectedOrders]);

  const fetchQcReadyOrders = async () => {
    try {
      const response = await fetch('/api/warehouse/qc-ready-orders?includePartial=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch QC ready orders');
      }

      const result = await response.json();
      setQcReadyOrders(result.orders);
      setSummary(result.summary);
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Error",
        description: error.message,
      });
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
    setSelectedOrders(prev => prev.map(order => {
      if (order.orderId === orderId) {
        return {
          ...order,
          items: order.items.map((item, idx) => {
            if (idx === itemIndex) {
              return { ...item, [field]: Math.max(0, parseInt(value) || 0) };
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
                                  
                                  <div className="grid grid-cols-2 gap-3">
                                    <div>
                                      <Label className="text-xs text-gray-600">Allocate Quantity</Label>
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          type="number"
                                          value={itemSelection?.allocateQuantity || 0}
                                          onChange={(e) => handleItemAllocationChange(
                                            order._id, itemIndex, 'allocateQuantity', e.target.value
                                          )}
                                          max={item.availableQuantity}
                                          min={0}
                                          className="text-sm"
                                        />
                                        <span className="text-xs text-gray-500">/ {item.availableQuantity}</span>
                                      </div>
                                    </div>
                                    
                                    <div>
                                      <Label className="text-xs text-gray-600">Allocate Cartons</Label>
                                      <div className="flex items-center space-x-2">
                                        <Input
                                          type="number"
                                          value={itemSelection?.allocateCartons || 0}
                                          onChange={(e) => handleItemAllocationChange(
                                            order._id, itemIndex, 'allocateCartons', e.target.value
                                          )}
                                          max={item.availableCartons}
                                          min={0}
                                          className="text-sm"
                                        />
                                        <span className="text-xs text-gray-500">/ {item.availableCartons}</span>
                                      </div>
                                    </div>
                                  </div>
                                  
                                  {/* Item totals */}
                                  <div className="mt-2 grid grid-cols-3 gap-2 text-xs text-gray-600">
                                    <span>CBM: {((itemSelection?.allocateCartons || 0) * (item.unitCbm || 0)).toFixed(2)}</span>
                                    <span>Weight: {((itemSelection?.allocateQuantity || 0) * (item.unitWeight || 0)).toFixed(1)}</span>
                                    <span>Payment: {item.paymentType === 'THROUGH_ME' ? 'Through Me' : 'Direct'}</span>
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
              <div className="grid grid-cols-2 gap-4">
                <div className="text-center p-3 bg-blue-50 rounded-lg">
                  <p className="text-2xl font-bold text-blue-600">{selectionTotals.totalCbm}</p>
                  <p className="text-xs text-blue-600">Total CBM</p>
                </div>
                <div className="text-center p-3 bg-green-50 rounded-lg">
                  <p className="text-2xl font-bold text-green-600">{selectionTotals.totalCartons}</p>
                  <p className="text-xs text-green-600">Total Cartons</p>
                </div>
              </div>
              
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">₹{parseInt(selectionTotals.totalCarryingCharges).toLocaleString()}</p>
                <p className="text-xs text-purple-600">Carrying Charges</p>
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