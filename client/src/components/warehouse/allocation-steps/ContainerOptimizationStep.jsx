import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  Ship,
  Package,
  TrendingUp,
  Zap,
  Plus,
  Minus,
  Calculator,
  Lightbulb,
  AlertTriangle,
  CheckCircle2,
  BarChart3
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const ContainerOptimizationStep = React.memo(({ data, onUpdate, isLoading }) => {
  const [optimizationMode, setOptimizationMode] = useState('auto');
  const [selectedContainers, setSelectedContainers] = useState([]);
  const [existingContainers, setExistingContainers] = useState([]);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [customContainers, setCustomContainers] = useState([]);
  const [newCustomContainer, setNewCustomContainer] = useState({ cbm: '', weight: '', quantity: 1 });
  const { token, isAuthenticated } = useAuthStore();

  // Memoized container types
  const containerTypes = useMemo(() => [
    { type: '20ft', maxCbm: 33, maxWeight: 28000, name: '20-foot Container' },
    { type: '40ft', maxCbm: 67, maxWeight: 30000, name: '40-foot Container' },
    { type: '40ft_hc', maxCbm: 76, maxWeight: 30000, name: '40-foot High Cube' },
    { type: '45ft', maxCbm: 86, maxWeight: 30000, name: '45-foot Container' }
  ], []);

  // Memoized auth headers
  const getAuthHeaders = useCallback(() => {
    if (!token) {
      return { 'Content-Type': 'application/json' };
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  }, [token]);

  // Efficiency rating helper
  const calculateEfficiencyRating = useCallback((utilization) => {
    if (utilization > 85) return 'excellent';
    if (utilization > 70) return 'good';
    if (utilization > 50) return 'fair';
    return 'poor';
  }, []);

  // Memoized fetch function
  const fetchExistingContainers = useCallback(async () => {
    try {
      if (!isAuthenticated || !token) {
        return;
      }

      const headers = getAuthHeaders();
      const response = await fetch('/api/containers?status=planning&includeCapacity=true', {
        headers
      });

      if (response.ok) {
        const result = await response.json();
        setExistingContainers(result.containers || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing containers:', error);
      toast.error('Failed to load existing containers');
    }
  }, [isAuthenticated, token, getAuthHeaders]);

  // Enhanced optimization algorithm
  const generateAutoOptimization = useCallback(async () => {
    if (!data.allocationTotals) return;

    setLoading(true);
    try {
      const { totalCbm, totalWeight } = data.allocationTotals;
      const optimizationOptions = [];
      
      // Single container approach
      for (const containerType of containerTypes) {
        if (totalCbm <= containerType.maxCbm && totalWeight <= containerType.maxWeight) {
          const utilization = (totalCbm / containerType.maxCbm) * 100;
          optimizationOptions.push({
            strategy: 'single',
            containers: [{ type: containerType.type, count: 1 }],
            utilization: utilization.toFixed(1),
            efficiency: calculateEfficiencyRating(utilization),
            wastedSpace: (containerType.maxCbm - totalCbm).toFixed(2),
            totalContainers: 1,
            costScore: utilization > 80 ? utilization + 20 : utilization
          });
          break;
        }
      }
      
      // Multi-container approach
      if (totalCbm > 33) {
        const containers40ft = Math.ceil(totalCbm / 67);
        if (containers40ft > 1) {
          const utilization = (totalCbm / (containers40ft * 67)) * 100;
          optimizationOptions.push({
            strategy: 'multi-40ft',
            containers: [{ type: '40ft', count: containers40ft }],
            utilization: utilization.toFixed(1),
            efficiency: 'balanced',
            wastedSpace: ((containers40ft * 67) - totalCbm).toFixed(2),
            totalContainers: containers40ft,
            costScore: utilization - (containers40ft * 5)
          });
        }
      }
      
      // Existing containers
      const existingOptions = existingContainers
        .filter(container => {
          const availableCbm = container.maxCbm - container.currentCbm;
          const availableWeight = container.maxWeight - container.currentWeight;
          return availableCbm >= totalCbm && availableWeight >= totalWeight;
        })
        .map(container => {
          const availableCbm = container.maxCbm - container.currentCbm;
          const utilization = (totalCbm / availableCbm) * 100;
          return {
            strategy: 'existing',
            containers: [{ existingId: container._id, type: container.type, current: true }],
            utilization: utilization.toFixed(1),
            efficiency: 'cost-effective',
            wastedSpace: (availableCbm - totalCbm).toFixed(2),
            totalContainers: 1,
            costScore: utilization + 30, // Bonus for existing
            containerInfo: container
          };
        });
      
      const allOptions = [...optimizationOptions, ...existingOptions];
      
      if (allOptions.length === 0) {
        toast.error('No suitable container configuration found.');
        return;
      }
      
      const bestOption = allOptions.reduce((best, current) => 
        current.costScore > best.costScore ? current : best
      );
      
      setOptimizationResults({
        recommended: bestOption,
        alternatives: allOptions.filter(opt => opt !== bestOption),
        summary: {
          totalCbmToAllocate: totalCbm,
          totalWeightToAllocate: totalWeight,
          recommendedStrategy: bestOption?.strategy
        }
      });
      
      setSelectedContainers(bestOption?.containers || []);
      
      // Only show toast if this is a new optimization (not repeated)
      if (!optimizationResults?.recommended || optimizationResults.recommended.utilization !== bestOption.utilization) {
        toast.success(`Optimization complete: ${bestOption.utilization}% utilization`, {
          duration: 2000,
          id: 'optimization-complete' // Prevent duplicate toasts
        });
      }
      
    } catch (error) {
      toast.error(`Optimization Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }, [data.allocationTotals, existingContainers, containerTypes, calculateEfficiencyRating]);

  // Memoized calculations
  const totalCapacity = useMemo(() => {
    return selectedContainers.reduce((total, container) => {
      if (container.existingId) {
        const existingContainer = container.containerInfo;
        return total + (existingContainer?.maxCbm - existingContainer?.currentCbm || 0);
      } else if (container.isCustom) {
        return total + (container.maxCbm * (container.count || 1));
      } else {
        const containerType = containerTypes.find(ct => ct.type === container.type);
        return total + (containerType?.maxCbm * (container.count || 1) || 0);
      }
    }, 0);
  }, [selectedContainers, containerTypes]);

  const utilization = useMemo(() => {
    const requiredCapacity = data.allocationTotals?.totalCbm || 0;
    return totalCapacity > 0 ? ((requiredCapacity / totalCapacity) * 100).toFixed(1) : 0;
  }, [totalCapacity, data.allocationTotals?.totalCbm]);

  // Memoized handlers
  const addManualContainer = useCallback((type) => {
    setSelectedContainers(prev => {
      const existing = prev.find(c => c.type === type && !c.existingId);
      if (existing) {
        return prev.map(c => 
          c.type === type && !c.existingId 
            ? { ...c, count: (c.count || 1) + 1 }
            : c
        );
      } else {
        return [...prev, { type, count: 1 }];
      }
    });
  }, []);

  const removeManualContainer = useCallback((type) => {
    setSelectedContainers(prev => 
      prev.map(c => {
        if (c.type === type && !c.existingId) {
          const newCount = (c.count || 1) - 1;
          return newCount > 0 ? { ...c, count: newCount } : null;
        }
        return c;
      }).filter(Boolean)
    );
  }, []);

  const updateManualContainerCount = useCallback((type, count) => {
    setSelectedContainers(prev => {
      if (count <= 0) {
        // Remove container if count is 0 or negative
        return prev.filter(c => !(c.type === type && !c.existingId));
      }
      
      const existing = prev.find(c => c.type === type && !c.existingId);
      if (existing) {
        return prev.map(c => 
          c.type === type && !c.existingId 
            ? { ...c, count }
            : c
        );
      } else {
        return [...prev, { type, count }];
      }
    });
  }, []);

  const addCustomContainer = useCallback(() => {
    const cbm = parseFloat(newCustomContainer.cbm);
    const weight = parseFloat(newCustomContainer.weight);
    const quantity = parseInt(newCustomContainer.quantity) || 1;
    
    if (!cbm || cbm <= 0) {
      toast.error('Please enter a valid CBM capacity');
      return;
    }
    
    if (!weight || weight <= 0) {
      toast.error('Please enter a valid weight capacity');
      return;
    }
    
    const customId = `custom_${Date.now()}`;
    const customContainer = {
      id: customId,
      type: customId,
      name: `Custom Container (${cbm} CBM)`,
      maxCbm: cbm,
      maxWeight: weight,
      isCustom: true
    };
    
    setCustomContainers(prev => [...prev, customContainer]);
    setSelectedContainers(prev => [...prev, {
      type: customId,
      count: quantity,
      isCustom: true,
      maxCbm: cbm,
      maxWeight: weight
    }]);
    
    setNewCustomContainer({ cbm: '', weight: '', quantity: 1 });
    toast.success(`Custom container added: ${cbm} CBM`);
  }, [newCustomContainer]);

  const removeCustomContainer = useCallback((customId) => {
    setCustomContainers(prev => prev.filter(c => c.id !== customId));
    setSelectedContainers(prev => prev.filter(c => c.type !== customId));
    toast.info('Custom container removed');
  }, []);

  const updateCustomContainerCount = useCallback((customId, count) => {
    setSelectedContainers(prev => {
      if (count <= 0) {
        return prev.filter(c => c.type !== customId);
      }
      
      const existing = prev.find(c => c.type === customId);
      if (existing) {
        return prev.map(c => 
          c.type === customId ? { ...c, count } : c
        );
      } else {
        const customContainer = customContainers.find(cc => cc.id === customId);
        if (customContainer) {
          return [...prev, {
            type: customId,
            count,
            isCustom: true,
            maxCbm: customContainer.maxCbm,
            maxWeight: customContainer.maxWeight
          }];
        }
        return prev;
      }
    });
  }, [customContainers]);

  const selectExistingContainer = useCallback((containerId) => {
    const container = existingContainers.find(c => c._id === containerId);
    if (container) {
      setSelectedContainers(prev => {
        const hasExisting = prev.some(c => c.existingId === containerId);
        if (hasExisting) {
          return prev.filter(c => c.existingId !== containerId);
        } else {
          return [...prev, { 
            existingId: containerId, 
            type: container.type, 
            current: true,
            containerInfo: container
          }];
        }
      });
    }
  }, [existingContainers]);

  useEffect(() => {
    fetchExistingContainers();
    // Only run optimization once when data changes, mode is auto, and not already optimized
    if (data.allocationTotals && optimizationMode === 'auto' && !optimizationResults?.recommended) {
      generateAutoOptimization();
    }
  }, [data.allocationTotals, optimizationMode, fetchExistingContainers]);

  useEffect(() => {
    onUpdate({ 
      selectedContainers,
      optimizationResults,
      optimizationMode 
    });
  }, [selectedContainers, optimizationResults, optimizationMode, onUpdate]);

  return (
    <div className="space-y-6">
      {/* Allocation Summary */}
      {data.allocationTotals && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Calculator className="h-5 w-5 mr-2" />
              Allocation Requirements
            </CardTitle>
            <CardDescription>
              Summary of selected orders for container allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.allocationTotals.totalCbm?.toFixed(1)}</p>
                <p className="text-sm text-blue-600">Total CBM</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.allocationTotals.totalWeight?.toFixed(0)}</p>
                <p className="text-sm text-green-600">Total Weight (kg)</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{data.allocationTotals.totalCartons}</p>
                <p className="text-sm text-orange-600">Total Cartons</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">₹{parseInt(data.allocationTotals.totalCarryingCharges || 0).toLocaleString()}</p>
                <p className="text-sm text-purple-600">Carrying Charges</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Optimization Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Container Optimization Strategy</CardTitle>
          <CardDescription>
            Choose how to optimize container allocation
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup value={optimizationMode} onValueChange={setOptimizationMode}>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="auto" id="auto" />
              <Label htmlFor="auto" className="flex items-center cursor-pointer">
                <Zap className="h-4 w-4 mr-2 text-blue-500" />
                <div>
                  <p className="font-medium">Auto-Optimization</p>
                  <p className="text-sm text-gray-600">Let the system find the best container combination</p>
                </div>
              </Label>
            </div>
            <div className="flex items-center space-x-2">
              <RadioGroupItem value="manual" id="manual" />
              <Label htmlFor="manual" className="flex items-center cursor-pointer">
                <Ship className="h-4 w-4 mr-2 text-green-500" />
                <div>
                  <p className="font-medium">Manual Selection</p>
                  <p className="text-sm text-gray-600">Manually choose containers and quantities</p>
                </div>
              </Label>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Auto-Optimization Results */}
      {optimizationMode === 'auto' && optimizationResults && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Recommended Option */}
          <Card className="border-green-200 bg-green-50">
            <CardHeader>
              <CardTitle className="flex items-center text-green-800">
                <Lightbulb className="h-5 w-5 mr-2" />
                Recommended Configuration
              </CardTitle>
              <CardDescription className="text-green-700">
                Optimal container allocation based on your requirements
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-green-800">Strategy: {optimizationResults.recommended.strategy}</h4>
                    <p className="text-sm text-green-700">Utilization: {optimizationResults.recommended.utilization}%</p>
                  </div>
                  <Badge className="bg-green-600">
                    {optimizationResults.recommended.efficiency}
                  </Badge>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {optimizationResults.recommended.containers.map((container, index) => (
                    <div key={index} className="p-3 bg-white rounded border border-green-200">
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium">
                            {container.current ? 'Existing ' : 'New '}
                            {containerTypes.find(ct => ct.type === container.type)?.name}
                          </p>
                          {container.count && <p className="text-sm text-gray-600">Quantity: {container.count}</p>}
                          {container.containerInfo && (
                            <p className="text-xs text-gray-500">
                              {container.containerInfo.realContainerId}
                            </p>
                          )}
                        </div>
                        <Ship className="h-6 w-6 text-green-600" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Manual Selection */}
      {optimizationMode === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* Custom Container Input */}
          <Card>
            <CardHeader>
              <CardTitle>Add Custom Container</CardTitle>
              <CardDescription>
                Define your own container with custom CBM and weight capacity
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-4">
                <div>
                  <Label htmlFor="cbm">CBM Capacity</Label>
                  <Input
                    id="cbm"
                    type="number"
                    value={newCustomContainer.cbm}
                    onChange={(e) => setNewCustomContainer(prev => ({ ...prev, cbm: e.target.value }))}
                    placeholder="e.g., 100"
                    min="0.1"
                    step="0.1"
                  />
                </div>
                <div>
                  <Label htmlFor="weight">Weight Capacity (kg)</Label>
                  <Input
                    id="weight"
                    type="number"
                    value={newCustomContainer.weight}
                    onChange={(e) => setNewCustomContainer(prev => ({ ...prev, weight: e.target.value }))}
                    placeholder="e.g., 30000"
                    min="1"
                    step="1"
                  />
                </div>
                <div>
                  <Label htmlFor="quantity">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    value={newCustomContainer.quantity}
                    onChange={(e) => setNewCustomContainer(prev => ({ ...prev, quantity: e.target.value }))}
                    placeholder="1"
                    min="1"
                    max="100"
                  />
                </div>
                <div className="flex items-end">
                  <Button
                    onClick={addCustomContainer}
                    className="w-full"
                    disabled={!newCustomContainer.cbm || !newCustomContainer.weight}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    Add Container
                  </Button>
                </div>
              </div>
              
              {/* Show predefined containers as quick options */}
              <div className="border-t pt-4">
                <h4 className="text-sm font-medium mb-3">Quick Select (Standard Containers):</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
                  {containerTypes.map((containerType) => (
                    <Button
                      key={containerType.type}
                      variant="outline"
                      size="sm"
                      onClick={() => setNewCustomContainer({
                        cbm: containerType.maxCbm.toString(),
                        weight: containerType.maxWeight.toString(),
                        quantity: 1
                      })}
                      className="text-xs p-2 h-auto"
                    >
                      {containerType.maxCbm} CBM
                      <br />
                      {containerType.maxWeight.toLocaleString()} kg
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Selected Custom Containers */}
          {customContainers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Your Custom Containers</CardTitle>
                <CardDescription>
                  Manage your custom container configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {customContainers.map((customContainer) => {
                    const selected = selectedContainers.find(c => c.type === customContainer.id);
                    const count = selected?.count || 0;
                    
                    return (
                      <div key={customContainer.id} className="border rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <h4 className="font-semibold">{customContainer.name}</h4>
                            <p className="text-sm text-gray-600">
                              {customContainer.maxCbm} CBM • {customContainer.maxWeight.toLocaleString()} kg
                            </p>
                          </div>
                          <div className="flex items-center space-x-2">
                            <Input
                              type="number"
                              value={count}
                              onChange={(e) => updateCustomContainerCount(customContainer.id, parseInt(e.target.value) || 0)}
                              className="w-20 text-center"
                              min="0"
                              max="100"
                              placeholder="0"
                            />
                            <Button
                              variant="outline"
                              size="sm"
                              onClick={() => removeCustomContainer(customContainer.id)}
                              className="text-red-600 hover:text-red-700"
                            >
                              <Minus className="h-4 w-4" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Existing Containers */}
          {existingContainers.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle>Use Existing Containers</CardTitle>
                <CardDescription>
                  Select from containers currently in planning phase
                </CardDescription>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-64">
                  <div className="space-y-2">
                    {existingContainers.map((container) => {
                      const isSelected = selectedContainers.some(c => c.existingId === container._id);
                      const availableCbm = container.maxCbm - container.currentCbm;
                      const canFit = availableCbm >= (data.allocationTotals?.totalCbm || 0);
                      
                      return (
                        <div
                          key={container._id}
                          className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 
                            canFit ? 'border-gray-200 hover:border-gray-300' : 
                            'border-red-200 bg-red-50 cursor-not-allowed'
                          }`}
                          onClick={() => canFit && selectExistingContainer(container._id)}
                        >
                          <div className="flex items-center justify-between">
                            <div>
                              <p className="font-medium">{container.realContainerId}</p>
                              <p className="text-sm text-gray-600">
                                {containerTypes.find(ct => ct.type === container.type)?.name}
                              </p>
                            </div>
                            <div className="text-right">
                              <p className="text-sm font-medium">
                                {availableCbm.toFixed(1)} CBM available
                              </p>
                              <p className="text-xs text-gray-500">
                                {((container.currentCbm / container.maxCbm) * 100).toFixed(1)}% used
                              </p>
                            </div>
                          </div>
                          {!canFit && (
                            <p className="text-xs text-red-600 mt-1">
                              Insufficient capacity for allocation
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Selection Summary */}
      {selectedContainers.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <TrendingUp className="h-5 w-5 mr-2" />
              Selection Summary
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{totalCapacity.toFixed(1)}</p>
                <p className="text-sm text-blue-600">Total Capacity (CBM)</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{utilization}%</p>
                <p className="text-sm text-green-600">Utilization</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{selectedContainers.length}</p>
                <p className="text-sm text-orange-600">Total Containers</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {(totalCapacity - (data.allocationTotals?.totalCbm || 0)).toFixed(1)}
                </p>
                <p className="text-sm text-purple-600">Wasted Space (CBM)</p>
              </div>
            </div>
            
            {parseFloat(utilization) < 50 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low utilization detected. Consider using smaller containers or combining with other orders.
                </AlertDescription>
              </Alert>
            )}
            
            {parseFloat(utilization) > 95 && (
              <Alert>
                <CheckCircle2 className="h-4 w-4" />
                <AlertDescription>
                  Excellent utilization! This configuration maximizes container space efficiency.
                </AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Optimizing container allocation...</span>
        </div>
      )}
    </div>
  );
});

ContainerOptimizationStep.displayName = 'ContainerOptimizationStep';

export default ContainerOptimizationStep;