import React, { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Checkbox } from '@/components/ui/checkbox';
import { 
  CheckCircle2,
  AlertTriangle,
  Package,
  Ship,
  DollarSign,
  Users,
  FileText,
  Clock,
  TrendingUp,
  Building2,
  CreditCard,
  Calculator
} from 'lucide-react';
import { motion } from 'framer-motion';

const ConfirmationStep = ({ data, onComplete, isLoading }) => {
  const [confirmations, setConfirmations] = useState({
    dataAccuracy: false,
    financialTerms: false,
    shippingArrangement: false,
    clientNotification: false
  });

  const handleConfirmationChange = (field, checked) => {
    setConfirmations(prev => ({
      ...prev,
      [field]: checked
    }));
  };

  const allConfirmed = Object.values(confirmations).every(Boolean);

  const formatCurrency = (amount, currency = 'INR') => {
    return currency === 'INR' 
      ? `₹${amount?.toLocaleString()}` 
      : `$${amount?.toLocaleString()}`;
  };

  const getShippingCompanyName = () => {
    // This would typically come from the shipping company data
    return data.shippingCompanyId || 'Selected Shipping Company';
  };

  const calculateAllocationSummary = () => {
    if (!data.validationResults) return null;

    const summary = {
      totalOrders: data.validationResults.length,
      totalItems: data.validationResults.reduce((sum, order) => sum + order.items.length, 0),
      totalContainers: data.optimizationResults?.length || 0,
      totalCbm: data.allocationTotals?.totalCbm || 0,
      totalCartons: data.allocationTotals?.totalCartons || 0,
      totalRevenue: data.allocationPreview?.financialPreview?.revenue?.totalCarryingCharges || 0,
      totalBaseCharges: data.allocationPreview?.financialPreview?.costs?.baseCharges?.total || 0,
      estimatedProfit: data.allocationPreview?.financialPreview?.profit?.estimated || 0,
      profitMargin: data.allocationPreview?.financialPreview?.profit?.margin || '0%'
    };

    return summary;
  };

  const summary = calculateAllocationSummary();

  return (
    <div className="space-y-6">
      {/* Final Summary */}
      {summary && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4"
        >
          <Card className="border-blue-200 bg-blue-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Package className="h-8 w-8 text-blue-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-blue-600">Orders</p>
                  <p className="text-2xl font-bold text-blue-900">{summary.totalOrders}</p>
                  <p className="text-xs text-blue-700">{summary.totalItems} items</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-green-200 bg-green-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <Ship className="h-8 w-8 text-green-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-green-600">Containers</p>
                  <p className="text-2xl font-bold text-green-900">{summary.totalContainers}</p>
                  <p className="text-xs text-green-700">{summary.totalCbm.toFixed(1)} CBM</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-purple-200 bg-purple-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <DollarSign className="h-8 w-8 text-purple-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-purple-600">Revenue</p>
                  <p className="text-2xl font-bold text-purple-900">₹{summary.totalRevenue.toLocaleString()}</p>
                  <p className="text-xs text-purple-700">Carrying charges</p>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card className="border-amber-200 bg-amber-50">
            <CardContent className="p-4">
              <div className="flex items-center">
                <TrendingUp className="h-8 w-8 text-amber-500" />
                <div className="ml-3">
                  <p className="text-sm font-medium text-amber-600">Profit</p>
                  <p className="text-2xl font-bold text-amber-900">₹{summary.estimatedProfit.toLocaleString()}</p>
                  <p className="text-xs text-amber-700">{summary.profitMargin} margin</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Allocation Details */}
        <div className="space-y-6">
          {/* Order Allocation Summary */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <FileText className="h-5 w-5 mr-2" />
                Order Allocation Details
              </CardTitle>
              <CardDescription>
                Final allocation breakdown by order
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ScrollArea className="h-64">
                <div className="space-y-3">
                  {data.validationResults?.map((order, index) => (
                    <div key={index} className="p-3 border rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <h4 className="font-semibold text-sm">{order.orderNumber}</h4>
                          <p className="text-xs text-gray-600">{order.clientName}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium">{order.orderTotals.cbm.toFixed(1)} CBM</p>
                          <p className="text-xs text-gray-600">{order.orderTotals.cartons} cartons</p>
                        </div>
                      </div>
                      
                      <div className="flex items-center justify-between text-xs">
                        <span className="text-gray-600">{order.items.length} items</span>
                        <span className="font-medium text-green-600">
                          ₹{order.orderTotals.carryingCharges.toLocaleString()}
                        </span>
                      </div>
                      
                      {/* Payment type indicators */}
                      <div className="flex gap-1 mt-2">
                        {order.items.map((item, itemIndex) => (
                          <Badge 
                            key={itemIndex} 
                            variant={item.allocation.paymentType === 'THROUGH_ME' ? 'secondary' : 'default'}
                            className="text-xs"
                          >
                            {item.allocation.paymentType === 'THROUGH_ME' ? 'TM' : 'D'}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </ScrollArea>
            </CardContent>
          </Card>

          {/* Container Allocation */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ship className="h-5 w-5 mr-2" />
                Container Configuration
              </CardTitle>
              <CardDescription>
                Selected containers and capacity utilization
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {data.optimizationResults?.map((result, index) => (
                  <div key={index} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-medium">
                          {result.type === 'existing' ? 'Existing Container' : 'New Container'}
                        </p>
                        <p className="text-sm text-gray-600">
                          {result.containerType || result.type} 
                          {result.realContainerId && ` - ${result.realContainerId}`}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium">
                          {result.utilization?.cbm || result.utilization}% utilized
                        </p>
                        <Badge className={`text-xs ${
                          parseFloat(result.utilization?.cbm || result.utilization) > 85 
                            ? 'bg-green-500' 
                            : parseFloat(result.utilization?.cbm || result.utilization) > 70 
                            ? 'bg-yellow-500' 
                            : 'bg-red-500'
                        }`}>
                          {result.efficiency || 'standard'}
                        </Badge>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Summary & Confirmation */}
        <div className="space-y-6">
          {/* Financial Breakdown */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Financial Breakdown
              </CardTitle>
              <CardDescription>
                Complete financial summary for this allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Revenue */}
              <div className="p-3 bg-green-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-green-800">Total Revenue</span>
                  <span className="text-xl font-bold text-green-600">
                    ₹{summary?.totalRevenue.toLocaleString()}
                  </span>
                </div>
                <div className="text-sm text-green-700">
                  From carrying charges across all orders
                </div>
              </div>
              
              {/* Payment Breakdown */}
              {data.allocationPreview?.financialPreview?.revenue?.paymentBreakdown && (
                <div className="grid grid-cols-2 gap-3">
                  <div className="p-3 bg-purple-50 rounded-lg text-center">
                    <CreditCard className="h-4 w-4 mx-auto mb-1 text-purple-600" />
                    <p className="text-sm font-medium text-purple-800">Through Me</p>
                    <p className="text-lg font-bold text-purple-600">
                      ₹{data.allocationPreview.financialPreview.revenue.paymentBreakdown.throughMe.amount?.toLocaleString()}
                    </p>
                  </div>
                  <div className="p-3 bg-orange-50 rounded-lg text-center">
                    <Building2 className="h-4 w-4 mx-auto mb-1 text-orange-600" />
                    <p className="text-sm font-medium text-orange-800">Direct</p>
                    <p className="text-lg font-bold text-orange-600">
                      ₹{data.allocationPreview.financialPreview.revenue.paymentBreakdown.direct.amount?.toLocaleString()}
                    </p>
                  </div>
                </div>
              )}
              
              {/* Base Charges */}
              <div className="p-3 bg-red-50 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="font-medium text-red-800">Base Charges</span>
                  <span className="text-lg font-bold text-red-600">
                    {formatCurrency(summary?.totalBaseCharges, data.baseCharges?.currency)}
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2 text-xs text-red-700">
                  <div className="flex justify-between">
                    <span>GST:</span>
                    <span>{formatCurrency(data.baseCharges?.gst, data.baseCharges?.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Duty:</span>
                    <span>{formatCurrency(data.baseCharges?.duty, data.baseCharges?.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Misc:</span>
                    <span>{formatCurrency(data.baseCharges?.misc, data.baseCharges?.currency)}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Extra:</span>
                    <span>{formatCurrency(data.baseCharges?.extraCharge, data.baseCharges?.currency)}</span>
                  </div>
                </div>
              </div>
              
              <Separator />
              
              {/* Final Profit */}
              <div className="p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                <div className="flex items-center justify-between mb-1">
                  <span className="text-lg font-semibold text-blue-800">Net Profit</span>
                  <span className="text-2xl font-bold text-blue-600">
                    ₹{summary?.estimatedProfit.toLocaleString()}
                  </span>
                </div>
                <div className="text-center">
                  <span className="text-sm text-blue-700">
                    Profit Margin: <span className="font-semibold">{summary?.profitMargin}</span>
                  </span>
                </div>
                <div className="text-xs text-blue-600 mt-2 text-center">
                  Formula: Carrying Charges - Base Charges
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Shipping Information */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ship className="h-5 w-5 mr-2" />
                Shipping Arrangement
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Shipping Company:</span>
                  <span className="text-sm">{getShippingCompanyName()}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Containers:</span>
                  <span className="text-sm">{summary?.totalContainers} containers</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium">Total Capacity:</span>
                  <span className="text-sm">{summary?.totalCbm.toFixed(1)} CBM</span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      {/* Pre-Allocation Confirmations */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <CheckCircle2 className="h-5 w-5 mr-2" />
            Pre-Allocation Confirmations
          </CardTitle>
          <CardDescription>
            Please confirm the following before proceeding with allocation
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-start space-x-3">
              <Checkbox
                id="dataAccuracy"
                checked={confirmations.dataAccuracy}
                onCheckedChange={(checked) => handleConfirmationChange('dataAccuracy', checked)}
              />
              <label htmlFor="dataAccuracy" className="text-sm cursor-pointer">
                <span className="font-medium">Data Accuracy:</span> I have reviewed all order details, quantities, and allocation data and confirm they are accurate.
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="financialTerms"
                checked={confirmations.financialTerms}
                onCheckedChange={(checked) => handleConfirmationChange('financialTerms', checked)}
              />
              <label htmlFor="financialTerms" className="text-sm cursor-pointer">
                <span className="font-medium">Financial Terms:</span> I understand the profit calculation method (Carrying Charges - Base Charges) and payment type implications.
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="shippingArrangement"
                checked={confirmations.shippingArrangement}
                onCheckedChange={(checked) => handleConfirmationChange('shippingArrangement', checked)}
              />
              <label htmlFor="shippingArrangement" className="text-sm cursor-pointer">
                <span className="font-medium">Shipping Arrangement:</span> The selected shipping company and container configuration are appropriate for this allocation.
              </label>
            </div>
            
            <div className="flex items-start space-x-3">
              <Checkbox
                id="clientNotification"
                checked={confirmations.clientNotification}
                onCheckedChange={(checked) => handleConfirmationChange('clientNotification', checked)}
              />
              <label htmlFor="clientNotification" className="text-sm cursor-pointer">
                <span className="font-medium">Client Communication:</span> I will notify affected clients about their container allocation and shipping schedule.
              </label>
            </div>
          </div>
          
          {!allConfirmed && (
            <Alert>
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                Please confirm all items above before proceeding with the allocation.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Warnings */}
      {data.allocationPreview?.warnings && data.allocationPreview.warnings.length > 0 && (
        <Card className="border-amber-200">
          <CardHeader>
            <CardTitle className="flex items-center text-amber-600">
              <AlertTriangle className="h-5 w-5 mr-2" />
              Important Warnings
            </CardTitle>
            <CardDescription>
              Please review these warnings before confirming allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.allocationPreview.warnings.map((warning, index) => (
                <Alert key={index}>
                  <AlertTriangle className="h-4 w-4" />
                  <AlertDescription>{warning}</AlertDescription>
                </Alert>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Final Action */}
      <Card className="border-green-200 bg-green-50">
        <CardContent className="p-6">
          <div className="text-center space-y-4">
            <div>
              <h3 className="text-lg font-semibold text-green-800">Ready to Allocate</h3>
              <p className="text-sm text-green-700">
                This action will create containers, allocate orders, and update financial records.
              </p>
            </div>
            
            <div className="flex items-center justify-center space-x-4">
              <div className="flex items-center text-sm text-green-700">
                <Clock className="h-4 w-4 mr-1" />
                <span>Estimated completion: 2-3 minutes</span>
              </div>
            </div>
            
            <Button
              onClick={onComplete}
              disabled={!allConfirmed || isLoading}
              className="bg-green-600 hover:bg-green-700 text-white px-8 py-2"
              size="lg"
            >
              {isLoading ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Processing Allocation...
                </>
              ) : (
                <>
                  <CheckCircle2 className="h-4 w-4 mr-2" />
                  Confirm & Execute Allocation
                </>
              )}
            </Button>
            
            {!allConfirmed && (
              <p className="text-xs text-amber-600">
                Complete all confirmations to enable allocation
              </p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ConfirmationStep;