import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Package,
  Ship,
  User,
  Boxes,
  Weight,
  CheckCircle2,
  AlertTriangle,
  Shield,
  RefreshCw
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const SimpleContainerAllocation = ({ onComplete, onCancel }) => {
  const [step, setStep] = useState(1);
  const [isLoading, setIsLoading] = useState(false);
  const [qcReadyOrders, setQcReadyOrders] = useState([]);
  const [selectedOrders, setSelectedOrders] = useState([]);
  const [selectedContainerType, setSelectedContainerType] = useState('40ft');
  const [loading, setLoading] = useState(true);
  const [authError, setAuthError] = useState(null);

  const { isAuthenticated, token, user } = useAuthStore();

  const getAuthHeaders = () => {
    if (!token) {
      throw new Error('Authentication required. Please log in again.');
    }
    return {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${token}`
    };
  };

  const handleAuthError = (error, response) => {
    console.error('Authentication Error Details:', {
      error: error.message,
      status: response?.status,
      isAuthenticated,
      hasToken: !!token,
      userRole: user?.role,
      tokenLength: token?.length || 0
    });
    
    if (response?.status === 401) {
      const errorMsg = !token ? 
        'No authentication token found. Please log in.' :
        'Your session has expired. Please log in again.';
      
      setAuthError({
        type: 'authentication',
        message: errorMsg,
        action: 'login',
        details: 'Click here to go to login page'
      });
      
      toast.error(errorMsg, {
        action: {
          label: 'Login',
          onClick: () => window.location.href = '/login'
        }
      });
    } else if (response?.status === 403) {
      setAuthError({
        type: 'authorization',
        message: 'You need admin or staff permissions to access this feature.',
        action: 'contact',
        details: `Current role: ${user?.role || 'Unknown'}. Contact your administrator to upgrade your permissions.`
      });
      
      toast.error('Insufficient permissions. Contact your administrator.');
    } else {
      setAuthError({
        type: 'network',
        message: 'Network error occurred. Please try again.',
        action: 'retry',
        details: error.message
      });
    }
  };

  const containerTypes = [
    { type: '20ft', name: '20-foot Container', maxCbm: 33, maxWeight: 28000 },
    { type: '40ft', name: '40-foot Container', maxCbm: 67, maxWeight: 30000 },
    { type: '40ft_hc', name: '40-foot High Cube', maxCbm: 76, maxWeight: 30000 }
  ];

  useEffect(() => {
    // Clear auth error when authentication state changes
    setAuthError(null);
  }, [isAuthenticated, token]);

  useEffect(() => {
    fetchQcReadyOrders();
  }, []);

  // Function to fix QC status of existing orders
  const fixExistingOrders = async () => {
    setIsLoading(true);
    try {
      const headers = getAuthHeaders();
      
      // First, get all orders
      const ordersResponse = await fetch('/api/orders', { headers });
      if (!ordersResponse.ok) {
        throw new Error('Failed to fetch orders');
      }
      
      const ordersData = await ordersResponse.json();
      const orders = ordersData.orders || [];
      
      // Find orders that need QC completion
      const ordersNeedingQC = orders.filter(order => 
        !['ready', 'partial_ready'].includes(order.status) && 
        order.items && order.items.length > 0
      );
      
      if (ordersNeedingQC.length === 0) {
        toast.info('No orders found that need QC completion');
        return;
      }
      
      toast.info(`Found ${ordersNeedingQC.length} orders. Completing QC...`);
      
      // Complete QC for each order
      let fixed = 0;
      for (const order of ordersNeedingQC) {
        try {
          const qcData = {
            orderId: order._id,
            inspectorNotes: 'Auto-completed for container allocation',
            items: order.items.map((item, index) => ({
              itemIndex: index,
              qcStatus: 'completed',
              qcPassedQuantity: item.quantity,
              qcPassedCartons: item.cartons,
              qcNotes: 'Auto-approved for allocation'
            }))
          };
          
          const qcResponse = await fetch('/api/warehouse/qc-inspection', {
            method: 'POST',
            headers,
            body: JSON.stringify(qcData)
          });
          
          if (qcResponse.ok) {
            fixed++;
          }
        } catch (error) {
          console.error(`Failed to fix order ${order.orderNumber}:`, error);
        }
      }
      
      toast.success(`Fixed ${fixed} orders! Refreshing...`);
      
      // Refresh the QC ready orders
      setTimeout(() => {
        fetchQcReadyOrders();
      }, 1000);
      
    } catch (error) {
      console.error('Fix orders error:', error);
      toast.error(`Failed to fix orders: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const fetchQcReadyOrders = async () => {
    setLoading(true);
    setAuthError(null);
    
    console.log('🔍 [FRONTEND] Fetching QC ready orders...');
    
    try {
      if (!isAuthenticated) {
        throw new Error('Please log in to access container allocation.');
      }

      const headers = getAuthHeaders();
      console.log('📡 [FRONTEND] Making API call to /api/warehouse/qc-ready-orders');
      console.log('🔑 [FRONTEND] Auth headers:', { hasToken: !!headers.Authorization });
      
      const response = await fetch('/api/warehouse/qc-ready-orders', {
        headers
      });

      console.log('📊 [FRONTEND] API Response:', {
        status: response.status,
        statusText: response.statusText,
        ok: response.ok
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { message: `HTTP ${response.status}: ${response.statusText}` };
        }
        
        const error = new Error(errorData.message || `Failed to fetch QC ready orders`);
        handleAuthError(error, response);
        return;
      }

      const result = await response.json();
      console.log('📄 [FRONTEND] API Response Data:', {
        ordersCount: result.orders?.length || 0,
        summaryTotalOrders: result.summary?.totalOrders || 0,
        summaryTotalCartons: result.summary?.totalCartons || 0,
        summaryTotalCbm: result.summary?.totalCbm || 0,
        timestamp: result.timestamp
      });
      
      if (result.orders && result.orders.length > 0) {
        console.log('📦 [FRONTEND] Orders details:');
        result.orders.forEach((order, index) => {
          console.log(`  Order ${index + 1}: ${order.orderNumber}`);
          console.log(`    Status: ${order.status}`);
          console.log(`    Items: ${order.items?.length || 0}`);
          console.log(`    Total Cartons: ${order.allocationSummary?.totalAvailableCartons || 0}`);
          console.log(`    Total CBM: ${order.allocationSummary?.totalAvailableCbm || 0}`);
          
          order.items?.forEach((item, itemIndex) => {
            console.log(`      Item ${itemIndex}: ${item.itemCode}`);
            console.log(`        Available Cartons: ${item.availableCartons || 0}`);
            console.log(`        QC Status: ${item.qcStatus}`);
            console.log(`        Can Allocate: ${item.allocationStatus?.canAllocate}`);
          });
        });
      }
      
      setQcReadyOrders(result.orders || []);
      
      if (!result.orders || result.orders.length === 0) {
        console.log('❌ [FRONTEND] No QC ready orders found');
        console.log('🔍 [FRONTEND] Possible reasons:');
        console.log('  1. No orders in database');
        console.log('  2. Orders exist but status is not "ready" or "partial_ready"');
        console.log('  3. Orders exist but items have no QC completion');
        console.log('  4. Orders exist but all cartons are already allocated');
        console.log('  5. Backend validation filters are too strict');
        
        toast.error('No QC ready orders found for allocation', {
          duration: 6000
        });
        
        // Enhanced error message for empty database
        setTimeout(() => {
          toast.info('Check server logs for detailed validation information. Use "Fix Existing Orders" to resolve QC issues.', {
            duration: 8000
          });
        }, 1000);
      } else {
        // Validate available cartons
        let totalAvailableCartons = 0;
        result.orders.forEach(order => {
          order.items?.forEach(item => {
            const available = (item.availableCartons || 0);
            totalAvailableCartons += available;
          });
        });
        
        if (totalAvailableCartons === 0) {
          toast.warning(`Found ${result.orders.length} orders but 0 cartons available for allocation`, {
            duration: 6000
          });
          setTimeout(() => {
            toast.info('Orders need QC inspection to make cartons available for allocation', {
              duration: 5000
            });
          }, 1500);
        } else {
          toast.success(`Found ${result.orders.length} QC ready orders with ${totalAvailableCartons} cartons available`);
        }
      }
    } catch (error) {
      console.error('Fetch QC ready orders error:', error);
      
      if (error.name === 'TypeError' && error.message.includes('fetch')) {
        setAuthError({
          type: 'network',
          message: 'Cannot connect to server. Please check your internet connection.',
          action: 'retry',
          details: 'The server may be down or there may be a network issue.'
        });
        toast.error('Network error: Cannot connect to server');
      } else if (error.message.includes('log in')) {
        handleAuthError(error);
      } else {
        setAuthError({
          type: 'network',
          message: 'Failed to load orders. Please try again.',
          action: 'retry',
          details: error.message
        });
        toast.error(error.message);
      }
    } finally {
      setLoading(false);
    }
  };

  const handleOrderSelect = (orderId, isSelected) => {
    if (isSelected) {
      const order = qcReadyOrders.find(o => o._id === orderId);
      if (order) {
        setSelectedOrders(prev => [...prev, orderId]);
      }
    } else {
      setSelectedOrders(prev => prev.filter(id => id !== orderId));
    }
  };

  const calculateTotals = () => {
    const selectedOrderData = qcReadyOrders.filter(order => 
      selectedOrders.includes(order._id)
    );

    const totals = selectedOrderData.reduce((acc, order) => {
      acc.totalCbm += order.totalCbm || 0;
      acc.totalWeight += order.totalWeight || 0;
      acc.totalCartons += order.totalCartons || 0;
      acc.totalCarryingCharges += order.totalCarryingCharges || 0;
      return acc;
    }, { totalCbm: 0, totalWeight: 0, totalCartons: 0, totalCarryingCharges: 0 });

    return totals;
  };

  // Real-time validation functions for immediate feedback
  const validateOrderSelection = (orderIds) => {
    const errors = [];
    const warnings = [];
    
    if (!orderIds || orderIds.length === 0) {
      errors.push('Please select at least one order for allocation.');
      return { isValid: false, errors, warnings };
    }
    
    const selectedOrderData = qcReadyOrders.filter(order => orderIds.includes(order._id));
    
    // Check if all selected orders are still QC ready
    const invalidOrders = selectedOrderData.filter(order => 
      !['ready', 'partial_ready'].includes(order.status)
    );
    
    if (invalidOrders.length > 0) {
      errors.push(`${invalidOrders.length} selected orders are no longer QC ready. Please refresh and reselect.`);
    }
    
    return { isValid: errors.length === 0, errors, warnings };
  };
  
  const validateContainerCapacity = (totals, containerType) => {
    const errors = [];
    const warnings = [];
    
    const container = containerTypes.find(c => c.type === containerType);
    if (!container) {
      errors.push('Please select a valid container type.');
      return { isValid: false, errors, warnings, utilizationInfo: null };
    }
    
    const cbmUtilization = (totals.totalCbm / container.maxCbm) * 100;
    const weightUtilization = (totals.totalWeight / container.maxWeight) * 100;
    
    // Capacity validation
    if (totals.totalCbm > container.maxCbm) {
      errors.push(`CBM exceeds container capacity: ${totals.totalCbm.toFixed(1)} > ${container.maxCbm} CBM`);
    }
    
    if (totals.totalWeight > container.maxWeight) {
      errors.push(`Weight exceeds container capacity: ${totals.totalWeight.toFixed(0)} > ${container.maxWeight} kg`);
    }
    
    // Utilization warnings
    if (cbmUtilization < 50) {
      warnings.push(`Low CBM utilization: ${cbmUtilization.toFixed(1)}%. Consider using a smaller container.`);
    } else if (cbmUtilization > 95) {
      warnings.push(`Very high CBM utilization: ${cbmUtilization.toFixed(1)}%. Little room for error.`);
    }
    
    if (weightUtilization > 95) {
      warnings.push(`Very high weight utilization: ${weightUtilization.toFixed(1)}%. Risk of exceeding limits.`);
    }
    
    const utilizationInfo = {
      cbm: { percentage: cbmUtilization, used: totals.totalCbm, max: container.maxCbm },
      weight: { percentage: weightUtilization, used: totals.totalWeight, max: container.maxWeight },
      efficiency: cbmUtilization > 80 ? 'excellent' : cbmUtilization > 60 ? 'good' : cbmUtilization > 40 ? 'fair' : 'poor'
    };
    
    return { isValid: errors.length === 0, errors, warnings, utilizationInfo };
  };
  
  const [validationResult, setValidationResult] = useState({ isValid: true, errors: [], warnings: [] });
  const [capacityValidation, setCapacityValidation] = useState({ isValid: true, errors: [], warnings: [], utilizationInfo: null });
  
  // Real-time validation when orders or container type changes
  useEffect(() => {
    const orderValidation = validateOrderSelection(selectedOrders);
    setValidationResult(orderValidation);
    
    if (orderValidation.isValid && selectedOrders.length > 0) {
      const totals = calculateTotals();
      const capacityVal = validateContainerCapacity(totals, selectedContainerType);
      setCapacityValidation(capacityVal);
    } else {
      setCapacityValidation({ isValid: true, errors: [], warnings: [], utilizationInfo: null });
    }
  }, [selectedOrders, selectedContainerType, qcReadyOrders]);

  const handleNext = () => {
    if (step === 1 && selectedOrders.length > 0) {
      setStep(2);
    }
  };

  const handleBack = () => {
    if (step === 2) {
      setStep(1);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      if (!isAuthenticated) {
        throw new Error('Please log in to complete allocation.');
      }

      // Pre-submission validation check
      if (!validationResult.isValid || !capacityValidation.isValid) {
        toast.error('Please resolve validation errors before proceeding.');
        return;
      }

      const headers = getAuthHeaders();
      const response = await fetch('/api/warehouse/simple-allocation', {
        method: 'POST',
        headers,
        body: JSON.stringify({
          orderIds: selectedOrders,
          containerType: selectedContainerType
        })
      });

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { 
            message: `HTTP ${response.status}: ${response.statusText}`,
            error: { type: 'NETWORK_ERROR' }
          };
        }
        
        // Handle structured error responses from backend
        if (errorData.error && errorData.error.type) {
          switch (errorData.error.type) {
            case 'AUTHENTICATION_ERROR':
            case 'AUTHORIZATION_ERROR':
              handleAuthError(new Error(errorData.error.message), response);
              return;
              
            case 'CAPACITY_ERROR':
              toast.error(`Container Capacity Issue: ${errorData.error.message}`, {
                duration: 6000
              });
              if (errorData.error.suggestions && errorData.error.suggestions.length > 0) {
                setTimeout(() => {
                  toast.info(`Suggestions: ${errorData.error.suggestions[0]}`, {
                    duration: 4000
                  });
                }, 1000);
              }
              break;
              
            case 'VALIDATION_ERROR':
              const validationMsg = errorData.error.details?.validationErrors ? 
                `Validation failed: ${errorData.error.details.validationErrors.map(e => e.message).join(', ')}` :
                errorData.error.message;
              toast.error(validationMsg);
              break;
              
            case 'ALLOCATION_ERROR':
            case 'DATABASE_ERROR':
              toast.error(`Allocation Failed: ${errorData.error.message}`, {
                duration: 8000
              });
              if (errorData.error.suggestions) {
                setTimeout(() => {
                  toast.info(`Try: ${errorData.error.suggestions[0]}`);
                }, 1500);
              }
              break;
              
            default:
              toast.error(errorData.error.message || 'Unknown error occurred');
          }
        } else {
          // Fallback for non-structured error responses
          const error = new Error(errorData.message || 'Failed to complete allocation');
          if (response.status === 401 || response.status === 403) {
            handleAuthError(error, response);
          } else {
            toast.error(error.message);
          }
        }
        return;
      }

      const result = await response.json();
      
      // Handle successful allocation with enhanced feedback
      if (result.success) {
        const successMsg = `Successfully allocated ${selectedOrders.length} orders to ${result.container?.type || 'container'}!`;
        toast.success(successMsg, {
          duration: 5000
        });
        
        // Show utilization info if available
        if (result.container?.utilization) {
          setTimeout(() => {
            toast.info(`Container utilization: ${result.container.utilization.cbm}% CBM, ${result.container.utilization.weight}% weight`, {
              duration: 4000
            });
          }, 1000);
        }
        
        onComplete?.(result);
      } else {
        toast.error('Allocation completed but with warnings. Please check the results.');
        onComplete?.(result);
      }
      
    } catch (err) {
      console.error('Allocation error:', err);
      
      if (err.message.includes('log in')) {
        handleAuthError(err);
      } else if (err.name === 'TypeError' && err.message.includes('fetch')) {
        toast.error('Network error: Cannot connect to server. Please check your connection.');
      } else {
        toast.error(`Unexpected error: ${err.message}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const totals = calculateTotals();
  const selectedContainer = containerTypes.find(c => c.type === selectedContainerType);
  const canFitInContainer = selectedContainer && 
    totals.totalCbm <= selectedContainer.maxCbm && 
    totals.totalWeight <= selectedContainer.maxWeight;

  if (loading) {
    return (
      <Card>
        <CardContent className="p-8">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
            <span className="ml-2 text-gray-600">Loading orders...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Container Allocation</h1>
              <p className="text-gray-600 mt-1">Simple container allocation for QC-ready orders</p>
            </div>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex items-center gap-2"
            >
              Cancel
            </Button>
          </div>
        </div>

        {/* Authentication Error Display */}
        {authError && (
          <Alert className={`mb-6 ${
            authError.type === 'authentication' ? 'border-red-500 bg-red-50' :
            authError.type === 'authorization' ? 'border-orange-500 bg-orange-50' :
            'border-yellow-500 bg-yellow-50'
          }`}>
            <div className="flex items-start">
              <div className="flex-shrink-0">
                {authError.type === 'authentication' ? (
                  <Shield className="h-5 w-5 text-red-500" />
                ) : authError.type === 'authorization' ? (
                  <AlertTriangle className="h-5 w-5 text-orange-500" />
                ) : (
                  <RefreshCw className="h-5 w-5 text-yellow-500" />
                )}
              </div>
              <div className="ml-3 flex-1">
                <AlertDescription className="text-sm font-medium">
                  {authError.message}
                </AlertDescription>
                <p className="text-xs mt-1 text-gray-600">{authError.details}</p>
                <div className="mt-3 flex space-x-2">
                  {authError.action === 'login' && (
                    <Button
                      size="sm"
                      onClick={() => window.location.href = '/login'}
                      className="bg-red-600 hover:bg-red-700"
                    >
                      Go to Login
                    </Button>
                  )}
                  {authError.action === 'retry' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={fetchQcReadyOrders}
                      className="flex items-center gap-1"
                    >
                      <RefreshCw className="h-3 w-3" />
                      Try Again
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => window.location.href = '/debug/auth'}
                  >
                    Debug Authentication
                  </Button>
                </div>
              </div>
            </div>
          </Alert>
        )}

        {/* Step 1: Order Selection */}
        {step === 1 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Package className="h-5 w-5 mr-2" />
                  Select Orders
                </CardTitle>
                <CardDescription>
                  Choose QC-ready orders to allocate to a container
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {loading ? (
                    <div className="text-center py-8">
                      <RefreshCw className="h-8 w-8 animate-spin mx-auto text-gray-400 mb-2" />
                      <p className="text-gray-600">Loading QC ready orders...</p>
                    </div>
                  ) : qcReadyOrders.length === 0 ? (
                    <div className="text-center py-12 space-y-4">
                      <Package className="h-16 w-16 mx-auto text-gray-300" />
                      <div className="space-y-2">
                        <h3 className="text-lg font-semibold text-gray-900">No QC Ready Orders Found</h3>
                        <p className="text-gray-600">Orders need to complete QC inspection before allocation</p>
                      </div>
                      <div className="flex flex-col sm:flex-row gap-3 justify-center">
                        <Button
                          onClick={fixExistingOrders}
                          disabled={isLoading}
                          className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
                        >
                          {isLoading ? (
                            <RefreshCw className="h-4 w-4 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-4 w-4" />
                          )}
                          {isLoading ? 'Fixing Orders...' : 'Fix Existing Orders'}
                        </Button>
                        <Button
                          variant="outline"
                          onClick={fetchQcReadyOrders}
                          className="flex items-center gap-2"
                        >
                          <RefreshCw className="h-4 w-4" />
                          Refresh
                        </Button>
                      </div>
                      <div className="text-xs text-gray-500 mt-4">
                        <p>The "Fix Existing Orders" button will:</p>
                        <p>• Find orders that haven't completed QC</p>
                        <p>• Mark all items as QC completed</p>
                        <p>• Make them available for container allocation</p>
                      </div>
                    </div>
                  ) : (
                    qcReadyOrders.map((order) => {
                      const isSelected = selectedOrders.includes(order._id);
                      
                      return (
                        <div
                          key={order._id}
                          className={`p-4 border rounded-lg transition-all ${
                            isSelected ? 'border-blue-500 bg-blue-50' : 'border-gray-200'
                          }`}
                        >
                          <div className="flex items-center justify-between">
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
                                {order.totalCbm?.toFixed(1)} CBM
                              </span>
                              <span className="flex items-center">
                                <Weight className="h-4 w-4 mr-1" />
                                {order.totalWeight?.toFixed(0)} kg
                              </span>
                              <span className="flex items-center">
                                <Package className="h-4 w-4 mr-1" />
                                {order.totalCartons} cartons
                              </span>
                            </div>
                          </div>
                        </div>
                      );
                    })
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Selection Summary */}
            {selectedOrders.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>Selection Summary</CardTitle>
                </CardHeader>
                <CardContent>
                  {/* Validation Alerts */}
                  {!validationResult.isValid && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {validationResult.errors.map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {validationResult.warnings && validationResult.warnings.length > 0 && (
                    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription>
                        <div className="space-y-1 text-yellow-800">
                          {validationResult.warnings.map((warning, index) => (
                            <div key={index}>• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  <div className="grid grid-cols-4 gap-4 text-center">
                    <div>
                      <p className="text-sm text-gray-600">Orders</p>
                      <p className="text-2xl font-bold text-blue-600">{selectedOrders.length}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total CBM</p>
                      <p className="text-2xl font-bold text-green-600">{totals.totalCbm.toFixed(1)}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Weight</p>
                      <p className="text-2xl font-bold text-orange-600">{totals.totalWeight.toFixed(0)} kg</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-600">Total Cartons</p>
                      <p className="text-2xl font-bold text-purple-600">{totals.totalCartons}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )}

            <div className="flex justify-between">
              <div></div>
              <Button
                onClick={handleNext}
                disabled={selectedOrders.length === 0 || !validationResult.isValid}
                className="flex items-center gap-2"
              >
                Next: Select Container
                <Ship className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}

        {/* Step 2: Container Selection & Confirmation */}
        {step === 2 && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            className="space-y-6"
          >
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center">
                  <Ship className="h-5 w-5 mr-2" />
                  Select Container Type
                </CardTitle>
                <CardDescription>
                  Choose the container type for allocation
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <Select value={selectedContainerType} onValueChange={setSelectedContainerType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select container type" />
                    </SelectTrigger>
                    <SelectContent>
                      {containerTypes.map((container) => (
                        <SelectItem key={container.type} value={container.type}>
                          {container.name} - {container.maxCbm} CBM, {container.maxWeight} kg
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* Validation Alerts */}
                  {!capacityValidation.isValid && (
                    <Alert variant="destructive" className="mb-4">
                      <AlertTriangle className="h-4 w-4" />
                      <AlertDescription>
                        <div className="space-y-1">
                          {capacityValidation.errors.map((error, index) => (
                            <div key={index}>• {error}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}
                  
                  {capacityValidation.warnings && capacityValidation.warnings.length > 0 && (
                    <Alert className="mb-4 border-yellow-500 bg-yellow-50">
                      <AlertTriangle className="h-4 w-4 text-yellow-500" />
                      <AlertDescription>
                        <div className="space-y-1 text-yellow-800">
                          {capacityValidation.warnings.map((warning, index) => (
                            <div key={index}>• {warning}</div>
                          ))}
                        </div>
                      </AlertDescription>
                    </Alert>
                  )}

                  {/* Utilization Check */}
                  {selectedContainer && capacityValidation.utilizationInfo && (
                    <div className="mt-4 p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium mb-2 flex items-center">
                        Container Utilization
                        {capacityValidation.utilizationInfo.efficiency === 'excellent' && (
                          <Badge className="ml-2 bg-green-100 text-green-800">Excellent Efficiency</Badge>
                        )}
                        {capacityValidation.utilizationInfo.efficiency === 'good' && (
                          <Badge className="ml-2 bg-blue-100 text-blue-800">Good Efficiency</Badge>
                        )}
                        {capacityValidation.utilizationInfo.efficiency === 'fair' && (
                          <Badge className="ml-2 bg-yellow-100 text-yellow-800">Fair Efficiency</Badge>
                        )}
                        {capacityValidation.utilizationInfo.efficiency === 'poor' && (
                          <Badge className="ml-2 bg-red-100 text-red-800">Poor Efficiency</Badge>
                        )}
                      </h4>
                      <div className="space-y-2">
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>CBM Usage</span>
                            <span>{capacityValidation.utilizationInfo.cbm.used.toFixed(1)} / {capacityValidation.utilizationInfo.cbm.max} CBM ({capacityValidation.utilizationInfo.cbm.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                capacityValidation.utilizationInfo.cbm.percentage <= 100 ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(capacityValidation.utilizationInfo.cbm.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                        
                        <div>
                          <div className="flex justify-between text-sm mb-1">
                            <span>Weight Usage</span>
                            <span>{capacityValidation.utilizationInfo.weight.used.toFixed(0)} / {capacityValidation.utilizationInfo.weight.max} kg ({capacityValidation.utilizationInfo.weight.percentage.toFixed(1)}%)</span>
                          </div>
                          <div className="w-full bg-gray-200 rounded-full h-2">
                            <div 
                              className={`h-2 rounded-full ${
                                capacityValidation.utilizationInfo.weight.percentage <= 100 ? 'bg-green-500' : 'bg-red-500'
                              }`}
                              style={{ width: `${Math.min(capacityValidation.utilizationInfo.weight.percentage, 100)}%` }}
                            />
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Legacy capacity alerts (will be replaced by new validation) */}
                  {selectedContainer && !capacityValidation.utilizationInfo && (
                    <>
                      {!canFitInContainer && (
                        <Alert variant="destructive">
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>
                            Selected orders exceed container capacity. Please choose a larger container or reduce orders.
                          </AlertDescription>
                        </Alert>
                      )}

                      {canFitInContainer && (
                        <Alert>
                          <CheckCircle2 className="h-4 w-4" />
                          <AlertDescription>
                            Container capacity is sufficient for selected orders.
                          </AlertDescription>
                        </Alert>
                      )}
                    </>
                  )}
                  
                  {/* New capacity validation status */}
                  {capacityValidation.isValid && capacityValidation.utilizationInfo && (
                    <Alert className="border-green-500 bg-green-50">
                      <CheckCircle2 className="h-4 w-4 text-green-600" />
                      <AlertDescription className="text-green-800">
                        Container capacity is sufficient. {capacityValidation.utilizationInfo.efficiency.charAt(0).toUpperCase() + capacityValidation.utilizationInfo.efficiency.slice(1)} space utilization.
                      </AlertDescription>
                    </Alert>
                  )}
                </div>
              </CardContent>
            </Card>

            <div className="flex justify-between">
              <Button
                variant="outline"
                onClick={handleBack}
                className="flex items-center gap-2"
              >
                Back
              </Button>
              <Button
                onClick={handleComplete}
                disabled={!capacityValidation.isValid || isLoading}
                className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
              >
                {isLoading ? 'Allocating...' : 'Complete Allocation'}
                <CheckCircle2 className="h-4 w-4" />
              </Button>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

export default SimpleContainerAllocation;