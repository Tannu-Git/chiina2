import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Package, 
  Ship, 
  Plus, 
  Minus, 
  Calculator,
  DollarSign,
  AlertTriangle,
  CheckCircle,
  BarChart3,
  Truck
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const NewContainerAllocation = ({ onComplete, onCancel }) => {
  const { token } = useAuthStore();
  const [step, setStep] = useState(1); // 1: Container Setup, 2: Order Selection, 3: Financial Setup
  const [loading, setLoading] = useState(true);
  const [orders, setOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]); // Selected orders with quantities
  const [containerCapacity, setContainerCapacity] = useState({
    cbm: '',
    weight: '',
    isConfigured: false
  });
  const [utilizationStats, setUtilizationStats] = useState({
    usedCbm: 0,
    usedWeight: 0,
    remainingCbm: 0,
    utilizationPercent: 0
  });
  const [financials, setFinancials] = useState({
    shippingCompany: '',
    baseCharges: {
      gst: 0,
      duty: 0,
      misc: 0,
      extraCharge: 0
    },
    totalCarryingCharges: 0,
    totalBaseCharges: 0,
    profit: 0
  });

  const containerTypes = [
    { type: '20ft', name: '20-foot Container', maxCbm: 33, maxWeight: 28000 },
    { type: '40ft', name: '40-foot Container', maxCbm: 67, maxWeight: 30000 },
    { type: '40ft_hc', name: '40-foot High Cube', maxCbm: 76, maxWeight: 30000 },
    { type: '45ft', name: '45-foot Container', maxCbm: 86, maxWeight: 30000 }
  ];

  const shippingCompanies = [
    { id: 'maersk', name: 'Maersk Line', code: 'MAEU' },
    { id: 'msc', name: 'Mediterranean Shipping Company', code: 'MSCU' },
    { id: 'cosco', name: 'COSCO Shipping', code: 'COSU' }
  ];

  useEffect(() => {
    fetchQcReadyOrders();
  }, []);

  useEffect(() => {
    // Recalculate utilization when orders change
    if (containerCapacity.isConfigured && Object.keys(selectedOrders).length >= 0) {
      calculateUtilization();
    }
  }, [selectedOrders, containerCapacity]);

  const fetchQcReadyOrders = async () => {
    setLoading(true);
    try {
      console.log('📡 [NEW ALLOCATION] Fetching QC ready orders...');
      
      const response = await fetch('/api/warehouse/qc-ready-orders', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (!response.ok) {
        throw new Error('Failed to fetch orders');
      }

      const result = await response.json();
      console.log('📄 [NEW ALLOCATION] API Response:', result);
      
      if (result.orders && result.orders.length > 0) {
        console.log('📦 [NEW ALLOCATION] First order structure:');
        const firstOrder = result.orders[0];
        console.log('Order:', {
          orderNumber: firstOrder.orderNumber,
          status: firstOrder.status,
          itemsCount: firstOrder.items?.length || 0
        });
        
        if (firstOrder.items && firstOrder.items.length > 0) {
          const firstItem = firstOrder.items[0];
          console.log('First item structure:', {
            itemCode: firstItem.itemCode,
            unitCbm: firstItem.unitCbm,
            unitWeight: firstItem.unitWeight,
            availableCartons: firstItem.availableCartons,
            qcPassedCartons: firstItem.qcPassedCartons,
            allocatedCartons: firstItem.allocatedCartons,
            carryingCharge: firstItem.carryingCharge
          });
        }
      }
      
      setOrders(result.orders || []);
      
      if (!result.orders || result.orders.length === 0) {
        toast.error('No QC ready orders found for allocation');
      } else {
        toast.success(`Found ${result.orders.length} QC ready orders`);
      }
    } catch (error) {
      console.error('Fetch orders error:', error);
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  const configureContainer = () => {
    const cbm = parseFloat(containerCapacity.cbm);
    const weight = parseFloat(containerCapacity.weight);
    
    if (!cbm || cbm <= 0) {
      toast.error('Please enter a valid CBM capacity');
      return;
    }
    
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight capacity');
      return;
    }
    
    setContainerCapacity(prev => ({ ...prev, isConfigured: true }));
    setUtilizationStats({
      usedCbm: 0,
      usedWeight: 0,
      remainingCbm: cbm,
      utilizationPercent: 0
    });
    
    setStep(2);
    toast.success(`Container configured: ${cbm} CBM, ${weight} kg`);
  };

  const updateOrderSelection = (orderId, itemId, quantity) => {
    const order = orders.find(o => o._id === orderId);
    const item = order?.items?.find(i => i._id === itemId);
    
    if (!item) {
      console.error('Item not found:', { orderId, itemId });
      return;
    }
    
    const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
    const validQuantity = Math.max(0, Math.min(quantity, maxAvailable));
    
    console.log('Update order selection:', {
      itemCode: item.itemCode,
      maxAvailable,
      requestedQuantity: quantity,
      validQuantity,
      unitCbm: item.unitCbm,
      unitWeight: item.unitWeight
    });
    
    setSelectedOrders(prev => {
      const key = `${orderId}_${itemId}`;
      const newSelection = { ...prev };
      
      if (validQuantity > 0) {
        // Calculate per-carton values properly
        const cbmPerCarton = item.unitCbm || 0;
        const weightPerCarton = item.unitWeight || 0;
        const carryingChargePerCarton = item.carryingCharge?.rate || 0;
        
        newSelection[key] = {
          orderId,
          itemId,
          quantity: validQuantity,
          cbm: validQuantity * cbmPerCarton,
          weight: validQuantity * weightPerCarton,
          charges: validQuantity * carryingChargePerCarton,
          item: {
            ...item,
            orderNumber: order.orderNumber,
            clientName: order.clientName,
            cbmPerCarton,
            weightPerCarton,
            carryingChargePerCarton
          }
        };
        
        console.log('Added to selection:', newSelection[key]);
      } else {
        delete newSelection[key];
        console.log('Removed from selection:', key);
      }
      
      return newSelection;
    });
  };

  const calculateUtilization = () => {
    const totalCbm = Object.values(selectedOrders).reduce((sum, sel) => {
      const cbm = parseFloat(sel.cbm) || 0;
      return sum + cbm;
    }, 0);
    
    const totalWeight = Object.values(selectedOrders).reduce((sum, sel) => {
      const weight = parseFloat(sel.weight) || 0;
      return sum + weight;
    }, 0);
    
    const maxCbm = parseFloat(containerCapacity.cbm) || 0;
    const maxWeight = parseFloat(containerCapacity.weight) || 0;
    
    const utilizationPercent = maxCbm > 0 ? (totalCbm / maxCbm) * 100 : 0;
    
    console.log('Utilization calculation:', {
      totalCbm: totalCbm.toFixed(2),
      totalWeight: totalWeight.toFixed(2),
      maxCbm,
      maxWeight,
      utilizationPercent: utilizationPercent.toFixed(1) + '%'
    });
    
    setUtilizationStats({
      usedCbm: totalCbm,
      usedWeight: totalWeight,
      remainingCbm: maxCbm - totalCbm,
      utilizationPercent
    });
    
    // Update financials
    const totalCharges = Object.values(selectedOrders).reduce((sum, sel) => {
      const charges = parseFloat(sel.charges) || 0;
      return sum + charges;
    }, 0);
    
    const totalBaseCharges = Object.values(financials.baseCharges).reduce((sum, charge) => sum + (parseFloat(charge) || 0), 0);
    
    setFinancials(prev => ({
      ...prev,
      totalCarryingCharges: totalCharges,
      totalBaseCharges,
      profit: totalCharges - totalBaseCharges
    }));
  };

  const autoFillBest = () => {
    console.log('🚀 Auto-fill starting...');
    
    const maxCbm = parseFloat(containerCapacity.cbm);
    const maxWeight = parseFloat(containerCapacity.weight);
    
    if (!maxCbm || !maxWeight) {
      toast.error('Container capacity not configured properly');
      return;
    }
    
    console.log('Container limits:', { maxCbm, maxWeight });
    
    // Clear current selection
    setSelectedOrders({});
    
    // Create list of all available items
    const allItems = [];
    orders.forEach(order => {
      order.items?.forEach(item => {
        const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
        const cbmPerCarton = item.unitCbm || 0;
        const weightPerCarton = item.unitWeight || 0;
        const chargePerCarton = item.carryingCharge?.rate || 0;
        
        console.log(`Item analysis: ${item.itemCode}`, {
          maxAvailable,
          cbmPerCarton,
          weightPerCarton,
          chargePerCarton
        });
        
        if (maxAvailable > 0 && cbmPerCarton > 0) {
          allItems.push({
            orderId: order._id,
            itemId: item._id,
            maxAvailable,
            cbmPerCarton,
            weightPerCarton,
            chargePerCarton,
            efficiency: chargePerCarton / cbmPerCarton, // profit per CBM
            order,
            item
          });
        } else {
          console.log(`Skipping item ${item.itemCode}: maxAvailable=${maxAvailable}, cbmPerCarton=${cbmPerCarton}`);
        }
      });
    });
    
    console.log(`Found ${allItems.length} available items for auto-fill`);
    
    if (allItems.length === 0) {
      toast.error('No items available for auto-fill');
      return;
    }
    
    // Sort by efficiency (profit per CBM)
    allItems.sort((a, b) => b.efficiency - a.efficiency);
    
    // Fill container with best items
    let usedCbm = 0;
    let usedWeight = 0;
    const newSelection = {};
    let itemsAdded = 0;
    
    allItems.forEach(itemData => {
      if (usedCbm >= maxCbm * 0.99) return; // Container nearly full
      
      let canFit = itemData.maxAvailable;
      
      // Check CBM constraint
      const remainingCbm = maxCbm - usedCbm;
      if (itemData.cbmPerCarton > 0) {
        canFit = Math.min(canFit, Math.floor(remainingCbm / itemData.cbmPerCarton));
      }
      
      // Check weight constraint
      if (itemData.weightPerCarton > 0) {
        const remainingWeight = maxWeight - usedWeight;
        canFit = Math.min(canFit, Math.floor(remainingWeight / itemData.weightPerCarton));
      }
      
      console.log(`Item ${itemData.item.itemCode}: canFit=${canFit}, remainingCbm=${remainingCbm.toFixed(2)}`);
      
      if (canFit > 0) {
        const key = `${itemData.orderId}_${itemData.itemId}`;
        newSelection[key] = {
          orderId: itemData.orderId,
          itemId: itemData.itemId,
          quantity: canFit,
          cbm: canFit * itemData.cbmPerCarton,
          weight: canFit * itemData.weightPerCarton,
          charges: canFit * itemData.chargePerCarton,
          item: {
            ...itemData.item,
            orderNumber: itemData.order.orderNumber,
            clientName: itemData.order.clientName,
            cbmPerCarton: itemData.cbmPerCarton,
            weightPerCarton: itemData.weightPerCarton,
            carryingChargePerCarton: itemData.chargePerCarton
          }
        };
        
        usedCbm += canFit * itemData.cbmPerCarton;
        usedWeight += canFit * itemData.weightPerCarton;
        itemsAdded++;
        
        console.log(`Added ${canFit} × ${itemData.item.itemCode}: CBM=${(canFit * itemData.cbmPerCarton).toFixed(2)}, Weight=${(canFit * itemData.weightPerCarton).toFixed(2)}`);
      }
    });
    
    setSelectedOrders(newSelection);
    
    const utilization = maxCbm > 0 ? (usedCbm / maxCbm * 100).toFixed(1) : '0';
    
    console.log('Auto-fill results:', {
      itemsAdded,
      usedCbm: usedCbm.toFixed(2),
      usedWeight: usedWeight.toFixed(2),
      utilization: utilization + '%'
    });
    
    toast.success(`Auto-fill complete! ${itemsAdded} items selected, ${utilization}% utilization`);
  };

  const updateBaseCharge = (chargeType, value) => {
    setFinancials(prev => ({
      ...prev,
      baseCharges: {
        ...prev.baseCharges,
        [chargeType]: parseFloat(value) || 0
      }
    }));
  };

  const proceedToFinancials = () => {
    if (Object.keys(selectedOrders).length === 0) {
      toast.error('Please select at least one item before proceeding to financial setup');
      return;
    }
    setStep(3);
    toast.success('Proceeding to financial setup');
  };

  const completeAllocation = async () => {
    setLoading(true);
    
    console.log('📦 [NEW ALLOCATION] Starting allocation process...');
    
    try {
      // Validate that we have selections
      if (Object.keys(selectedOrders).length === 0) {
        toast.error('Please select at least one item for allocation');
        setLoading(false);
        return;
      }
      
      const allocationData = Object.values(selectedOrders)
        .filter(selection => selection.quantity > 0)
        .map(selection => ({
          orderId: selection.orderId,
          itemId: selection.itemId,
          allocatedCartons: selection.quantity,
          cbmShare: selection.cbm,
          weightShare: selection.weight,
          carryingCharges: selection.charges
        }));
      
      console.log('📄 [NEW ALLOCATION] Allocation data:', {
        allocations: allocationData.length,
        containerSpecs: {
          cbm: containerCapacity.cbm,
          weight: containerCapacity.weight
        },
        shippingCompany: financials.shippingCompany
      });

      const requestBody = {
        containerType: 'custom',
        containerSpecs: {
          cbm: parseFloat(containerCapacity.cbm),
          weight: parseFloat(containerCapacity.weight)
        },
        allocations: allocationData,
        financials: {
          shippingCompany: financials.shippingCompany || 'maersk', // Default fallback
          baseCharges: financials.baseCharges
        }
      };
      
      console.log('📡 [NEW ALLOCATION] Sending request:', requestBody);

      const response = await fetch('/api/warehouse/new-container-allocation', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(requestBody)
      });

      console.log('📊 [NEW ALLOCATION] Response status:', response.status, response.statusText);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
          console.log('❌ [NEW ALLOCATION] Error response:', errorData);
        } catch (parseError) {
          errorData = { 
            message: `HTTP ${response.status}: ${response.statusText}`,
            error: { type: 'NETWORK_ERROR' }
          };
        }
        
        // Show specific error messages based on error type
        if (errorData.error?.type === 'CAPACITY_ERROR') {
          toast.error(`Capacity Error: ${errorData.message}`);
        } else if (errorData.error?.type === 'VALIDATION_ERROR') {
          toast.error(`Validation Error: ${errorData.message}`);
        } else if (errorData.error?.type === 'ORDER_NOT_FOUND' || errorData.error?.type === 'ITEM_NOT_FOUND') {
          toast.error(`Data Error: ${errorData.message}. Please refresh and try again.`);
        } else {
          toast.error(`Error: ${errorData.message || 'Failed to complete allocation'}`);
        }
        
        throw new Error(errorData.message || 'Failed to complete allocation');
      }

      const result = await response.json();
      console.log('✅ [NEW ALLOCATION] Success:', result);
      
      toast.success(`Container allocation completed! Container ID: ${result.container?.realContainerId}`);
      onComplete?.(result);
      
    } catch (error) {
      console.error('❌ [NEW ALLOCATION] Allocation error:', error);
      // Error message already shown above, so don't duplicate
    } finally {
      setLoading(false);
    }
  };

  if (loading && orders.length === 0) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center h-64">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading orders...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Container Allocation</h1>
              <p className="text-gray-600 mt-1">
                {step === 1 ? 'Step 1: Set your container capacity' : 
                 step === 2 ? `Step 2: Select orders (Max: ${containerCapacity.cbm} CBM)` : 
                 'Step 3: Financial setup (optional)'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {step === 2 && (
                <Button variant="outline" onClick={() => setStep(1)}>
                  Change Container
                </Button>
              )}
              {step === 3 && (
                <Button variant="outline" onClick={() => setStep(2)}>
                  Back to Orders
                </Button>
              )}
              <Button variant="outline" onClick={onCancel}>
                Cancel
              </Button>
            </div>
          </div>
          
          {/* Progress Indicator */}
          <div className="flex items-center gap-4 mb-4">
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              step === 1 ? 'bg-blue-100 text-blue-700' : 'bg-green-100 text-green-700'
            }`}>
              <Ship className="h-4 w-4" />
              <span className="text-sm font-medium">Container Setup</span>
              {step > 1 && <CheckCircle className="h-4 w-4" />}
            </div>
            <div className={`w-8 h-0.5 ${
              step > 1 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              step === 2 ? 'bg-blue-100 text-blue-700' : step > 2 ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <Package className="h-4 w-4" />
              <span className="text-sm font-medium">Select Orders</span>
              {step > 2 && <CheckCircle className="h-4 w-4" />}
            </div>
            <div className={`w-8 h-0.5 ${
              step > 2 ? 'bg-green-500' : 'bg-gray-300'
            }`} />
            <div className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
              step === 3 ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-500'
            }`}>
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-medium">Financial Setup</span>
            </div>
          </div>
        </div>

        {/* Step 1: Container Capacity Setup */}
        {step === 1 && (
          <div className="max-w-2xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ship className="h-5 w-5 mr-2" />
                  Container Capacity
                </CardTitle>
                <p className="text-gray-600">Define your container capacity to start order selection</p>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">CBM Capacity</label>
                    <Input
                      type="number"
                      value={containerCapacity.cbm}
                      onChange={(e) => setContainerCapacity(prev => ({ ...prev, cbm: e.target.value }))}
                      placeholder="e.g., 400"
                      min="0.1"
                      step="0.1"
                      className="text-lg"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Weight Capacity (kg)</label>
                    <Input
                      type="number"
                      value={containerCapacity.weight}
                      onChange={(e) => setContainerCapacity(prev => ({ ...prev, weight: e.target.value }))}
                      placeholder="e.g., 30000"
                      min="1"
                      step="1"
                      className="text-lg"
                    />
                  </div>
                </div>

                <div className="flex justify-center">
                  <Button onClick={configureContainer} size="lg" className="px-8">
                    Set Capacity & Continue
                    <Package className="h-4 w-4 ml-2" />
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Step 2: Order Selection */}
        {step === 2 && (
          <div className="grid grid-cols-12 gap-6">
            {/* Left Panel - Orders */}
            <div className="col-span-8 space-y-6">
              {/* Capacity Status */}
              <Card>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle className="flex items-center">
                        <Ship className="h-5 w-5 mr-2" />
                        Container: {containerCapacity.cbm} CBM
                      </CardTitle>
                      <p className="text-sm text-gray-600">
                        Used: {utilizationStats.usedCbm.toFixed(1)} CBM • Remaining: {utilizationStats.remainingCbm.toFixed(1)} CBM
                      </p>
                    </div>
                    <Button onClick={autoFillBest} className="bg-green-600 hover:bg-green-700">
                      <Calculator className="h-4 w-4 mr-2" />
                      Auto Fill Best
                    </Button>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Utilization</span>
                      <span>{utilizationStats.utilizationPercent.toFixed(1)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-3">
                      <div 
                        className={`h-3 rounded-full transition-all ${
                          utilizationStats.utilizationPercent > 100 ? 'bg-red-500' :
                          utilizationStats.utilizationPercent > 95 ? 'bg-green-500' :
                          utilizationStats.utilizationPercent > 50 ? 'bg-blue-500' : 'bg-gray-400'
                        }`}
                        style={{ width: `${Math.min(utilizationStats.utilizationPercent, 100)}%` }}
                      />
                    </div>
                    
                    {utilizationStats.utilizationPercent > 100 && (
                      <Alert className="mt-2">
                        <AlertTriangle className="h-4 w-4" />
                        <AlertDescription>
                          Over capacity! Reduce selection by {(utilizationStats.usedCbm - parseFloat(containerCapacity.cbm)).toFixed(1)} CBM
                        </AlertDescription>
                      </Alert>
                    )}
                  </div>
                </CardContent>
              </Card>

            {/* Orders & Items */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <Package className="h-5 w-5 mr-2" />
                    Available Orders
                  </CardTitle>
                  <p className="text-sm text-gray-600">Select items to fill your container (cannot exceed {containerCapacity.cbm} CBM)</p>
                </CardHeader>
                <CardContent>
                  <div className="space-y-6">
                    {orders.map(order => {
                      const orderTotal = order.items?.reduce((sum, item) => {
                        const key = `${order._id}_${item._id}`;
                        const selection = selectedOrders[key];
                        const cbm = selection ? (parseFloat(selection.cbm) || 0) : 0;
                        return sum + cbm;
                      }, 0) || 0;
                      
                      return (
                        <div key={order._id} className="border rounded-lg p-4">
                          <div className="flex items-center justify-between mb-3">
                            <div>
                              <h3 className="font-semibold text-lg">{order.orderNumber}</h3>
                              <p className="text-sm text-gray-600">{order.clientName}</p>
                            </div>
                            <div className="text-right">
                              <Badge variant="outline">{order.items?.length || 0} items</Badge>
                              {orderTotal > 0 && (
                                <p className="text-sm text-green-600 mt-1">{orderTotal.toFixed(1)} CBM selected</p>
                              )}
                            </div>
                          </div>
                          
                          <div className="space-y-3">
                            {order.items?.map(item => {
                              const key = `${order._id}_${item._id}`;
                              const selection = selectedOrders[key];
                              
                              // Use correct property names from API response
                              const maxAvailable = (item.availableCartons || item.qcPassedCartons || 0) - (item.allocatedCartons || 0);
                              const cbmPerCarton = item.unitCbm || 0;
                              const weightPerCarton = item.unitWeight || 0;
                              const carryingChargePerCarton = item.carryingCharge?.rate || 0;
                              
                              const selected = selection?.quantity || 0;
                              const maxCbm = parseFloat(containerCapacity.cbm);
                              const currentTotal = Object.values(selectedOrders).reduce((sum, sel) => {
                                return sum + (parseFloat(sel.cbm) || 0);
                              }, 0);
                              
                              const maxCanAdd = cbmPerCarton > 0 ? Math.floor((maxCbm - currentTotal + (selected * cbmPerCarton)) / cbmPerCarton) : maxAvailable;
                              const actualMax = Math.min(maxAvailable, maxCanAdd);
                              
                              console.log(`Item ${item.itemCode} display values:`, {
                                cbmPerCarton,
                                weightPerCarton,
                                carryingChargePerCarton,
                                maxAvailable,
                                selected
                              });
                              
                              return (
                                <div key={item._id} className="bg-gray-50 rounded p-3">
                                  <div className="grid grid-cols-12 items-center gap-3">
                                    <div className="col-span-4">
                                      <p className="font-medium">{item.itemCode}</p>
                                      <p className="text-xs text-gray-600">{item.description}</p>
                                    </div>
                                    
                                    <div className="col-span-2 text-center">
                                      <p className="text-sm font-medium">{cbmPerCarton > 0 ? cbmPerCarton.toFixed(2) : '0.00'} CBM</p>
                                      <p className="text-xs text-gray-600">per carton</p>
                                    </div>
                                    
                                    <div className="col-span-2 text-center">
                                      <p className="text-sm font-medium">{maxAvailable}</p>
                                      <p className="text-xs text-gray-600">available</p>
                                    </div>
                                    
                                    <div className="col-span-3">
                                      <div className="flex items-center gap-2">
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateOrderSelection(order._id, item._id, selected - 1)}
                                          disabled={selected <= 0}
                                        >
                                          <Minus className="h-3 w-3" />
                                        </Button>
                                        
                                        <Input
                                          type="number"
                                          value={selected}
                                          onChange={(e) => updateOrderSelection(order._id, item._id, parseInt(e.target.value) || 0)}
                                          className="w-16 text-center"
                                          min="0"
                                          max={actualMax}
                                        />
                                        
                                        <Button
                                          size="sm"
                                          variant="outline"
                                          onClick={() => updateOrderSelection(order._id, item._id, selected + 1)}
                                          disabled={selected >= actualMax}
                                        >
                                          <Plus className="h-3 w-3" />
                                        </Button>
                                      </div>
                                      {actualMax < maxAvailable && (
                                        <p className="text-xs text-red-600 mt-1">CBM limit: max {actualMax}</p>
                                      )}
                                    </div>
                                    
                                    <div className="col-span-1 text-right">
                                      {selected > 0 && (
                                        <CheckCircle className="h-4 w-4 text-green-500" />
                                      )}
                                    </div>
                                  </div>
                                  
                                  {selected > 0 && (
                                    <div className="mt-2 pt-2 border-t border-gray-200">
                                      <div className="grid grid-cols-3 gap-4 text-xs text-gray-600">
                                        <div>CBM: {(selected * cbmPerCarton).toFixed(2)}</div>
                                        <div>Weight: {(selected * weightPerCarton).toFixed(0)} kg</div>
                                        <div>Charges: ₹{(selected * carryingChargePerCarton).toFixed(0)}</div>
                                      </div>
                                    </div>
                                  )}
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* Right Panel - Summary */}
            <div className="col-span-4 space-y-6">
              {/* Selection Summary */}
              <Card>
                <CardHeader>
                  <CardTitle>Selection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4 text-center">
                      <div>
                        <p className="text-lg font-bold text-blue-600">{Object.keys(selectedOrders).length}</p>
                        <p className="text-xs text-gray-600">Items Selected</p>
                      </div>
                      <div>
                        <p className="text-lg font-bold text-green-600">
                          {Object.values(selectedOrders).reduce((sum, sel) => sum + sel.quantity, 0)}
                        </p>
                        <p className="text-xs text-gray-600">Total Cartons</p>
                      </div>
                    </div>
                    
                    <Separator />
                    
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Total CBM:</span>
                        <span className="font-medium">{utilizationStats.usedCbm.toFixed(1)}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Weight:</span>
                        <span className="font-medium">{utilizationStats.usedWeight.toFixed(0)} kg</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Total Charges:</span>
                        <span className="font-medium">₹{Object.values(selectedOrders).reduce((sum, sel) => {
                          const charges = parseFloat(sel.charges) || 0;
                          return sum + charges;
                        }, 0).toFixed(0)}</span>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              {/* Continue/Complete Button */}
              {step === 2 ? (
                <Button 
                  onClick={proceedToFinancials}
                  disabled={Object.keys(selectedOrders).length === 0 || utilizationStats.utilizationPercent > 100}
                  className="w-full bg-blue-600 hover:bg-blue-700"
                  size="lg"
                >
                  Continue to Financial Setup
                </Button>
              ) : (
                <Button 
                  onClick={completeAllocation}
                  disabled={Object.keys(selectedOrders).length === 0 || utilizationStats.utilizationPercent > 100 || loading}
                  className="w-full bg-green-600 hover:bg-green-700"
                  size="lg"
                >
                  {loading ? 'Processing...' : 'Complete Allocation'}
                </Button>
              )}
            </div>
          </div>
        )}

        {/* Step 3: Financial Setup */}
        {step === 3 && (
          <div className="max-w-4xl mx-auto">
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DollarSign className="h-5 w-5 mr-2" />
                  Financial Setup (Optional)
                </CardTitle>
                <p className="text-gray-600">Configure base charges and shipping company. All fields are optional with default value 0.</p>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Base Charges */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Base Charges</h3>
                  <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                    <div>
                      <label className="block text-sm font-medium mb-2">GST</label>
                      <Input
                        type="number"
                        value={financials.baseCharges.gst}
                        onChange={(e) => updateBaseCharge('gst', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Duty</label>
                      <Input
                        type="number"
                        value={financials.baseCharges.duty}
                        onChange={(e) => updateBaseCharge('duty', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Misc</label>
                      <Input
                        type="number"
                        value={financials.baseCharges.misc}
                        onChange={(e) => updateBaseCharge('misc', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium mb-2">Extra Charge</label>
                      <Input
                        type="number"
                        value={financials.baseCharges.extraCharge}
                        onChange={(e) => updateBaseCharge('extraCharge', e.target.value)}
                        placeholder="0"
                        min="0"
                        step="0.01"
                      />
                    </div>
                  </div>
                </div>

                <Separator />

                {/* Shipping Company */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Shipping Company</h3>
                  <Select value={financials.shippingCompany} onValueChange={(value) => setFinancials(prev => ({ ...prev, shippingCompany: value }))}>
                    <SelectTrigger className="w-full">
                      <SelectValue placeholder="Select shipping company (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="maersk">Maersk Line (MAEU)</SelectItem>
                      <SelectItem value="msc">Mediterranean Shipping Company (MSCU)</SelectItem>
                      <SelectItem value="cosco">COSCO Shipping (COSU)</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <Separator />

                {/* Financial Summary */}
                <div>
                  <h3 className="text-lg font-semibold mb-4">Financial Summary</h3>
                  <div className="bg-gray-50 rounded-lg p-4 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span>Total Carrying Charges:</span>
                      <span className="font-medium">₹{Object.values(selectedOrders).reduce((sum, sel) => sum + (parseFloat(sel.charges) || 0), 0).toFixed(0)}</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span>Total Base Charges:</span>
                      <span className="font-medium">₹{(financials.baseCharges.gst + financials.baseCharges.duty + financials.baseCharges.misc + financials.baseCharges.extraCharge).toFixed(0)}</span>
                    </div>
                    <Separator />
                    <div className="flex justify-between text-lg font-semibold">
                      <span>Estimated Profit:</span>
                      <span className="text-green-600">₹{(Object.values(selectedOrders).reduce((sum, sel) => sum + (parseFloat(sel.charges) || 0), 0) - (financials.baseCharges.gst + financials.baseCharges.duty + financials.baseCharges.misc + financials.baseCharges.extraCharge)).toFixed(0)}</span>
                    </div>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="flex justify-center gap-4">
                  <Button variant="outline" onClick={() => setStep(2)}>Back to Orders</Button>
                  <Button 
                    onClick={completeAllocation}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-700 px-8"
                    size="lg"
                  >
                    {loading ? 'Processing...' : 'Complete Allocation'}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
};

export default NewContainerAllocation;