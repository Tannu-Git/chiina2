import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Separator } from '@/components/ui/separator';
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
import { useToast } from '@/hooks/use-toast';

const ContainerOptimizationStep = ({ data, onUpdate, isLoading }) => {
  const [optimizationMode, setOptimizationMode] = useState('auto'); // 'auto' or 'manual'
  const [selectedContainers, setSelectedContainers] = useState([]);
  const [existingContainers, setExistingContainers] = useState([]);
  const [optimizationResults, setOptimizationResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const containerTypes = [
    { type: '20ft', maxCbm: 33, maxWeight: 28000, name: '20-foot Container' },
    { type: '40ft', maxCbm: 67, maxWeight: 30000, name: '40-foot Container' },
    { type: '40ft_hc', maxCbm: 76, maxWeight: 30000, name: '40-foot High Cube' },
    { type: '45ft', maxCbm: 86, maxWeight: 30000, name: '45-foot Container' }
  ];

  useEffect(() => {
    fetchExistingContainers();
    if (data.allocationTotals && optimizationMode === 'auto') {
      generateAutoOptimization();
    }
  }, [data.allocationTotals, optimizationMode]);

  useEffect(() => {
    onUpdate({ 
      selectedContainers,
      optimizationResults,
      optimizationMode 
    });
  }, [selectedContainers, optimizationResults, optimizationMode]);

  const fetchExistingContainers = async () => {
    try {
      const response = await fetch('/api/containers?status=planning&includeCapacity=true', {
        headers: {
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setExistingContainers(result.containers || []);
      }
    } catch (error) {
      console.error('Failed to fetch existing containers:', error);
    }
  };

  const generateAutoOptimization = async () => {
    if (!data.allocationTotals) return;

    setLoading(true);
    try {
      const { totalCbm, totalWeight } = data.allocationTotals;
      
      // Calculate optimal container combination
      const optimizationOptions = [];
      
      // Option 1: Single container approach
      for (const containerType of containerTypes) {
        if (totalCbm <= containerType.maxCbm && totalWeight <= containerType.maxWeight) {
          const utilization = (totalCbm / containerType.maxCbm) * 100;
          optimizationOptions.push({
            strategy: 'single',
            containers: [{ type: containerType.type, count: 1 }],
            utilization: utilization.toFixed(1),
            efficiency: utilization > 85 ? 'excellent' : utilization > 70 ? 'good' : utilization > 50 ? 'fair' : 'poor',
            wastedSpace: (containerType.maxCbm - totalCbm).toFixed(2),
            totalContainers: 1
          });
          break; // Use the smallest suitable container
        }
      }
      
      // Option 2: Multiple container approach
      if (totalCbm > 33) { // If doesn't fit in 20ft
        const containers40ft = Math.ceil(totalCbm / 67);
        const containers20ft = Math.ceil((totalCbm - (containers40ft - 1) * 67) / 33);
        
        if (containers40ft > 1) {
          optimizationOptions.push({
            strategy: 'multi-40ft',
            containers: [{ type: '40ft', count: containers40ft }],
            utilization: ((totalCbm / (containers40ft * 67)) * 100).toFixed(1),
            efficiency: 'balanced',
            wastedSpace: ((containers40ft * 67) - totalCbm).toFixed(2),
            totalContainers: containers40ft
          });
        }
        
        // Mixed approach
        if (totalCbm > 67) {
          const mixed40ft = Math.floor(totalCbm / 67);
          const remaining = totalCbm - (mixed40ft * 67);
          const mixed20ft = remaining > 0 ? Math.ceil(remaining / 33) : 0;
          
          if (mixed20ft > 0) {
            const totalCapacity = (mixed40ft * 67) + (mixed20ft * 33);
            optimizationOptions.push({
              strategy: 'mixed',
              containers: [
                ...(mixed40ft > 0 ? [{ type: '40ft', count: mixed40ft }] : []),
                ...(mixed20ft > 0 ? [{ type: '20ft', count: mixed20ft }] : [])
              ],
              utilization: ((totalCbm / totalCapacity) * 100).toFixed(1),
              efficiency: 'optimized',
              wastedSpace: (totalCapacity - totalCbm).toFixed(2),
              totalContainers: mixed40ft + mixed20ft
            });
          }
        }
      }
      
      // Option 3: Use existing containers if available
      const existingOptions = existingContainers
        .filter(container => {
          const availableCbm = container.maxCbm - container.currentCbm;
          const availableWeight = container.maxWeight - container.currentWeight;
          return availableCbm >= totalCbm && availableWeight >= totalWeight;
        })
        .map(container => {
          const availableCbm = container.maxCbm - container.currentCbm;
          const utilization = ((totalCbm / availableCbm) * 100).toFixed(1);
          return {
            strategy: 'existing',
            containers: [{ existingId: container._id, type: container.type, current: true }],
            utilization,
            efficiency: 'cost-effective',
            wastedSpace: (availableCbm - totalCbm).toFixed(2),
            totalContainers: 1,
            containerInfo: container
          };
        });
      
      const allOptions = [...optimizationOptions, ...existingOptions];
      
      // Select best option (highest utilization with minimum containers)
      const bestOption = allOptions.reduce((best, current) => {
        const currentScore = parseFloat(current.utilization) - (current.totalContainers * 5); // Penalty for more containers
        const bestScore = parseFloat(best.utilization) - (best.totalContainers * 5);
        return currentScore > bestScore ? current : best;
      }, allOptions[0]);
      
      setOptimizationResults({
        recommended: bestOption,
        alternatives: allOptions.filter(opt => opt !== bestOption),
        summary: {
          totalCbmToAllocate: totalCbm,
          totalWeightToAllocate: totalWeight,
          recommendedStrategy: bestOption?.strategy
        }
      });
      
      // Auto-select the recommended option
      setSelectedContainers(bestOption?.containers || []);
      
    } catch (error) {
      toast({
        variant: "destructive",
        title: "Optimization Error",
        description: error.message,
      });
    } finally {
      setLoading(false);
    }
  };

  const addManualContainer = (type) => {
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
  };

  const removeManualContainer = (type) => {
    setSelectedContainers(prev => 
      prev.map(c => {
        if (c.type === type && !c.existingId) {
          const newCount = (c.count || 1) - 1;
          return newCount > 0 ? { ...c, count: newCount } : null;
        }
        return c;
      }).filter(Boolean)
    );
  };

  const selectExistingContainer = (containerId) => {
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
  };

  const calculateTotalCapacity = () => {
    return selectedContainers.reduce((total, container) => {
      const containerType = containerTypes.find(ct => ct.type === container.type);
      if (container.existingId) {
        const existingContainer = container.containerInfo;
        return total + (existingContainer.maxCbm - existingContainer.currentCbm);
      } else {
        return total + (containerType.maxCbm * (container.count || 1));
      }
    }, 0);
  };

  const calculateUtilization = () => {
    const totalCapacity = calculateTotalCapacity();
    const requiredCapacity = data.allocationTotals?.totalCbm || 0;
    return totalCapacity > 0 ? ((requiredCapacity / totalCapacity) * 100).toFixed(1) : 0;
  };

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
                
                <div className="flex items-center justify-between text-sm text-green-700">
                  <span>Wasted Space: {optimizationResults.recommended.wastedSpace} CBM</span>
                  <span>Total Containers: {optimizationResults.recommended.totalContainers}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Alternative Options */}
          {optimizationResults.alternatives.length > 0 && (
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <BarChart3 className="h-5 w-5 mr-2" />
                  Alternative Options
                </CardTitle>
                <CardDescription>
                  Other viable container configurations
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {optimizationResults.alternatives.slice(0, 3).map((option, index) => (
                    <div 
                      key={index} 
                      className="p-3 border rounded-lg hover:bg-gray-50 cursor-pointer transition-colors"
                      onClick={() => setSelectedContainers(option.containers)}
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <p className="font-medium capitalize">{option.strategy} Strategy</p>
                          <p className="text-sm text-gray-600">
                            {option.containers.map(c => 
                              `${c.count || 1}x ${containerTypes.find(ct => ct.type === c.type)?.name}`
                            ).join(', ')}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{option.utilization}% utilization</p>
                          <Badge variant="outline" className="text-xs">
                            {option.efficiency}
                          </Badge>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </motion.div>
      )}

      {/* Manual Selection */}
      {optimizationMode === 'manual' && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="space-y-4"
        >
          {/* New Containers */}
          <Card>
            <CardHeader>
              <CardTitle>Add New Containers</CardTitle>
              <CardDescription>
                Select container types and quantities
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {containerTypes.map((containerType) => {
                  const selected = selectedContainers.find(c => c.type === containerType.type && !c.existingId);
                  const count = selected?.count || 0;
                  
                  return (
                    <div key={containerType.type} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold">{containerType.name}</h4>
                          <p className="text-sm text-gray-600">
                            {containerType.maxCbm} CBM • {containerType.maxWeight.toLocaleString()} kg
                          </p>
                        </div>
                        <div className="flex items-center space-x-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => removeManualContainer(containerType.type)}
                            disabled={count === 0}
                          >
                            <Minus className="h-4 w-4" />
                          </Button>
                          <span className="w-8 text-center font-medium">{count}</span>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => addManualContainer(containerType.type)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>

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
                      const availableWeight = container.maxWeight - container.currentWeight;
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
                <p className="text-2xl font-bold text-blue-600">{calculateTotalCapacity().toFixed(1)}</p>
                <p className="text-sm text-blue-600">Total Capacity (CBM)</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{calculateUtilization()}%</p>
                <p className="text-sm text-green-600">Utilization</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">{selectedContainers.length}</p>
                <p className="text-sm text-orange-600">Total Containers</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {(calculateTotalCapacity() - (data.allocationTotals?.totalCbm || 0)).toFixed(1)}
                </p>
                <p className="text-sm text-purple-600">Wasted Space (CBM)</p>
              </div>
            </div>
            
            {parseFloat(calculateUtilization()) < 50 && (
              <Alert>
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  Low utilization detected. Consider using smaller containers or combining with other orders.
                </AlertDescription>
              </Alert>
            )}
            
            {parseFloat(calculateUtilization()) > 95 && (
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
};

export default ContainerOptimizationStep;