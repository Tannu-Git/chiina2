import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight,
  Package,
  Ship,
  FileText,
  CheckCircle2,
  Boxes,
  Weight,
  DollarSign
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription } from '@/components/ui/alert';
import toast from 'react-hot-toast';

// Import step components
import OrderSelectionStep from './allocation-steps/OrderSelectionStep';
import ContainerOptimizationStep from './allocation-steps/ContainerOptimizationStep';
import AllocationPreviewStep from './allocation-steps/AllocationPreviewStep';
import ConfirmationStep from './allocation-steps/ConfirmationStep';

const ContainerAllocationWizard = ({ onComplete, onCancel }) => {
  const [currentStep, setCurrentStep] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [wizardData, setWizardData] = useState({
    selectedOrders: [],
    validationResults: null,
    allocationTotals: null,
    selectedContainers: [],
    optimizationResults: null,
    shippingCompanyId: null,
    baseCharges: null,
    allocationPreview: null
  });

  const steps = [
    {
      id: 'order-selection',
      title: 'Select Orders',
      description: 'Choose QC-ready orders',
      icon: Package,
      component: OrderSelectionStep
    },
    {
      id: 'container-optimization',
      title: 'Optimize Containers',
      description: 'Select & optimize containers',
      icon: Ship,
      component: ContainerOptimizationStep
    },
    {
      id: 'allocation-preview',
      title: 'Preview & Setup',
      description: 'Review allocation & finances',
      icon: FileText,
      component: AllocationPreviewStep
    },
    {
      id: 'confirmation',
      title: 'Confirm & Execute',
      description: 'Final confirmation',
      icon: CheckCircle2,
      component: ConfirmationStep
    }
  ];

  const updateWizardData = (newData) => {
    setWizardData(prev => ({
      ...prev,
      ...newData
    }));
  };

  const handleNext = async () => {
    if (currentStep < steps.length - 1) {
      setIsLoading(true);
      setError(null);
      
      try {
        // Process current step data before moving to next
        const stepResult = await processStep(currentStep, wizardData);
        
        if (stepResult) {
          updateWizardData(stepResult);
          setCurrentStep(prev => prev + 1);
          
          toast({
            title: "Step Completed",
            description: `${steps[currentStep].title} completed successfully.`,
          });
        }
      } catch (err) {
        setError(err.message || 'An error occurred while processing the step');
        toast({
          variant: "destructive",
          title: "Error",
          description: err.message || 'Failed to process step',
        });
      } finally {
        setIsLoading(false);
      }
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
      setError(null);
    }
  };

  const handleComplete = async () => {
    setIsLoading(true);
    try {
      const response = await fetch('/api/warehouse/allocation-wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({
          step: 'confirm-allocation',
          data: {
            validationResults: wizardData.validationResults,
            optimizationResults: wizardData.optimizationResults,
            shippingCompanyId: wizardData.shippingCompanyId,
            baseCharges: wizardData.baseCharges
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Failed to complete allocation');
      }

      const result = await response.json();
      
      toast({
        title: "Allocation Completed!",
        description: `Successfully allocated ${result.result.ordersAllocated} orders to ${result.result.containersCreated + result.result.containersUpdated} containers.`,
      });
      
      onComplete?.(result);
    } catch (err) {
      setError(err.message);
      toast({
        variant: "destructive",
        title: "Allocation Failed",
        description: err.message,
      });
    } finally {
      setIsLoading(false);
    }
  };

  const processStep = async (stepIndex, data) => {
    const stepId = steps[stepIndex].id;
    
    switch (stepId) {
      case 'order-selection':
        return await validateOrderSelection(data.selectedOrders);
      case 'container-optimization':
        return await optimizeContainerAllocation(data);
      case 'allocation-preview':
        return await previewAllocation(data);
      default:
        return null;
    }
  };

  const validateOrderSelection = async (selectedOrders) => {
    const response = await fetch('/api/warehouse/allocation-wizard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        step: 'validate-selection',
        data: { selectedOrders }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to validate order selection');
    }

    const result = await response.json();
    return {
      validationResults: result.validationResults,
      allocationTotals: result.allocationTotals,
      recommendations: result.recommendations
    };
  };

  const optimizeContainerAllocation = async (data) => {
    const response = await fetch('/api/warehouse/allocation-wizard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        step: 'optimize-containers',
        data: {
          allocationTotals: data.allocationTotals,
          selectedContainers: data.selectedContainers
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to optimize container allocation');
    }

    const result = await response.json();
    return {
      optimizationResults: result.optimizationResults,
      optimizationSummary: result.summary
    };
  };

  const previewAllocation = async (data) => {
    const response = await fetch('/api/warehouse/allocation-wizard', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${localStorage.getItem('token')}`
      },
      body: JSON.stringify({
        step: 'preview-allocation',
        data: {
          validationResults: data.validationResults,
          optimizationResults: data.optimizationResults,
          shippingCompanyId: data.shippingCompanyId,
          baseCharges: data.baseCharges
        }
      })
    });

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.message || 'Failed to generate allocation preview');
    }

    const result = await response.json();
    return {
      allocationPreview: result.allocationPreview,
      financialPreview: result.financialPreview,
      warnings: result.warnings
    };
  };

  const getCurrentStepComponent = () => {
    const StepComponent = steps[currentStep].component;
    
    if (currentStep === steps.length - 1) {
      // Confirmation step needs onComplete handler
      return (
        <StepComponent
          data={wizardData}
          onUpdate={updateWizardData}
          onNext={handleNext}
          onPrevious={handlePrevious}
          onComplete={handleComplete}
          isLoading={isLoading}
          error={error}
        />
      );
    }
    
    return (
      <StepComponent
        data={wizardData}
        onUpdate={updateWizardData}
        onNext={handleNext}
        onPrevious={handlePrevious}
        isLoading={isLoading}
        error={error}
      />
    );
  };

  const progressPercentage = ((currentStep + 1) / steps.length) * 100;

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-indigo-50 p-6">
      <div className="max-w-7xl mx-auto">
        {/* Header */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Container Allocation Wizard</h1>
              <p className="text-gray-600 mt-1">Efficiently allocate QC-ready orders to containers</p>
            </div>
            <Button
              variant="outline"
              onClick={onCancel}
              className="flex items-center gap-2"
            >
              Cancel Wizard
            </Button>
          </div>
          
          {/* Progress Bar */}
          <div className="bg-white rounded-lg p-4 shadow-sm border">
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm font-medium text-gray-700">
                Step {currentStep + 1} of {steps.length}: {steps[currentStep].title}
              </span>
              <span className="text-sm text-gray-500">
                {Math.round(progressPercentage)}% Complete
              </span>
            </div>
            <Progress value={progressPercentage} className="h-2" />
          </div>
        </div>

        {/* Step Navigation */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => {
              const Icon = step.icon;
              const isActive = index === currentStep;
              const isCompleted = index < currentStep;
              const isUpcoming = index > currentStep;
              
              return (
                <div key={step.id} className="flex items-center">
                  <div className="flex flex-col items-center">
                    <div className={`
                      w-12 h-12 rounded-full flex items-center justify-center border-2 transition-all duration-300
                      ${
                        isCompleted
                          ? 'bg-green-500 border-green-500 text-white'
                          : isActive
                          ? 'bg-blue-500 border-blue-500 text-white'
                          : 'bg-gray-100 border-gray-300 text-gray-400'
                      }
                    `}>
                      {isCompleted ? (
                        <CheckCircle className="h-6 w-6" />
                      ) : (
                        <Icon className="h-6 w-6" />
                      )}
                    </div>
                    <div className="mt-2 text-center">
                      <div className={`text-xs font-medium ${
                        isActive ? 'text-blue-600' : isCompleted ? 'text-green-600' : 'text-gray-500'
                      }`}>
                        {step.title}
                      </div>
                      <div className="text-xs text-gray-400 max-w-20">
                        {step.description}
                      </div>
                    </div>
                  </div>
                  
                  {index < steps.length - 1 && (
                    <div className={`
                      w-20 h-0.5 mx-4 transition-all duration-300
                      ${isCompleted ? 'bg-green-500' : 'bg-gray-300'}
                    `} />
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Error Alert */}
        {error && (
          <Alert variant="destructive" className="mb-6">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription>{error}</AlertDescription>
          </Alert>
        )}

        {/* Step Content */}
        <AnimatePresence mode="wait">
          <motion.div
            key={currentStep}
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            transition={{ duration: 0.3 }}
          >
            {getCurrentStepComponent()}
          </motion.div>
        </AnimatePresence>

        {/* Navigation Footer */}
        <div className="mt-8 flex items-center justify-between">
          <Button
            variant="outline"
            onClick={handlePrevious}
            disabled={currentStep === 0 || isLoading}
            className="flex items-center gap-2"
          >
            <ChevronLeft className="h-4 w-4" />
            Previous
          </Button>

          <div className="flex items-center gap-4">
            {/* Summary Stats */}
            {wizardData.allocationTotals && (
              <div className="flex items-center gap-6 text-sm text-gray-600">
                <div className="flex items-center gap-1">
                  <Boxes className="h-4 w-4" />
                  <span>{wizardData.allocationTotals.totalCartons} cartons</span>
                </div>
                <div className="flex items-center gap-1">
                  <Weight className="h-4 w-4" />
                  <span>{wizardData.allocationTotals.totalCbm?.toFixed(1)} CBM</span>
                </div>
                <div className="flex items-center gap-1">
                  <DollarSign className="h-4 w-4" />
                  <span>₹{wizardData.allocationTotals.totalCarryingCharges?.toLocaleString()}</span>
                </div>
              </div>
            )}
          </div>

          {currentStep === steps.length - 1 ? (
            <Button
              onClick={handleComplete}
              disabled={isLoading}
              className="flex items-center gap-2 bg-green-600 hover:bg-green-700"
            >
              {isLoading ? 'Completing...' : 'Complete Allocation'}
              <CheckCircle className="h-4 w-4" />
            </Button>
          ) : (
            <Button
              onClick={handleNext}
              disabled={isLoading || !canProceedToNext()}
              className="flex items-center gap-2"
            >
              {isLoading ? 'Processing...' : 'Next'}
              <ChevronRight className="h-4 w-4" />
            </Button>
          )}
        </div>
      </div>
    </div>
  );

  function canProceedToNext() {
    switch (currentStep) {
      case 0: // Order selection
        return wizardData.selectedOrders && wizardData.selectedOrders.length > 0;
      case 1: // Container optimization
        return wizardData.validationResults && wizardData.selectedContainers;
      case 2: // Allocation preview
        return wizardData.optimizationResults;
      default:
        return true;
    }
  }
};

export default ContainerAllocationWizard;