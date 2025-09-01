import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Ship,
  Calculator,
  PieChart,
  Users,
  Package,
  CreditCard,
  Building2,
  FileText
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';

const AllocationPreviewStep = ({ data, onUpdate, isLoading }) => {
  const [shippingCompanies, setShippingCompanies] = useState([]);
  const [selectedShippingCompany, setSelectedShippingCompany] = useState(data.shippingCompanyId || '');
  const [baseCharges, setBaseCharges] = useState({
    gst: data.baseCharges?.gst || 0,
    duty: data.baseCharges?.duty || 0,
    misc: data.baseCharges?.misc || 0,
    extraCharge: data.baseCharges?.extraCharge || 0,
    currency: data.baseCharges?.currency || 'INR'
  });
  const [allocationPreview, setAllocationPreview] = useState(null);
  const [loading, setLoading] = useState(false);
  const { token, isAuthenticated } = useAuthStore();

  useEffect(() => {
    fetchShippingCompanies();
  }, []);

  useEffect(() => {
    if (data.validationResults && data.optimizationResults) {
      generateAllocationPreview();
    }
  }, [selectedShippingCompany, baseCharges, data.validationResults, data.optimizationResults]);

  useEffect(() => {
    onUpdate({
      shippingCompanyId: selectedShippingCompany,
      baseCharges,
      allocationPreview
    });
  }, [selectedShippingCompany, baseCharges, allocationPreview]);

  const fetchShippingCompanies = async () => {
    try {
      if (!isAuthenticated || !token) {
        console.warn('No authentication token available for shipping companies');
        return;
      }

      const response = await fetch('/api/financials/shipping-companies', {
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (response.ok) {
        const result = await response.json();
        setShippingCompanies(result.companies || []);
      }
    } catch (error) {
      console.error('Failed to fetch shipping companies:', error);
    }
  };

  const generateAllocationPreview = async () => {
    if (!data.validationResults || !data.optimizationResults) return;

    if (!isAuthenticated || !token) {
      toast.error('Please log in to generate allocation preview.');
      return;
    }

    setLoading(true);
    try {
      const response = await fetch('/api/warehouse/allocation-wizard', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({
          step: 'preview-allocation',
          data: {
            validationResults: data.validationResults,
            optimizationResults: data.optimizationResults,
            shippingCompanyId: selectedShippingCompany,
            baseCharges
          }
        })
      });

      if (!response.ok) {
        throw new Error('Failed to generate allocation preview');
      }

      const result = await response.json();
      setAllocationPreview(result);
    } catch (error) {
      toast.error(`Preview Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const handleBaseChargeChange = (field, value) => {
    setBaseCharges(prev => ({
      ...prev,
      [field]: parseFloat(value) || 0
    }));
  };

  const calculateTotalBaseCharges = () => {
    return baseCharges.gst + baseCharges.duty + baseCharges.misc + baseCharges.extraCharge;
  };

  const formatCurrency = (amount, currency = 'INR') => {
    return currency === 'INR' 
      ? `₹${amount.toLocaleString()}` 
      : `$${amount.toLocaleString()}`;
  };

  const getSelectedShippingCompany = () => {
    return shippingCompanies.find(company => company.companyId === selectedShippingCompany);
  };

  return (
    <div className="space-y-6">
      {/* Allocation Overview */}
      {data.validationResults && data.optimizationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Allocation Overview
            </CardTitle>
            <CardDescription>
              Summary of orders and containers for allocation
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div className="text-center p-3 bg-blue-50 rounded-lg">
                <p className="text-2xl font-bold text-blue-600">{data.validationResults.length}</p>
                <p className="text-sm text-blue-600">Orders</p>
              </div>
              <div className="text-center p-3 bg-green-50 rounded-lg">
                <p className="text-2xl font-bold text-green-600">{data.optimizationResults.length}</p>
                <p className="text-sm text-green-600">Containers</p>
              </div>
              <div className="text-center p-3 bg-orange-50 rounded-lg">
                <p className="text-2xl font-bold text-orange-600">
                  {data.validationResults.reduce((sum, order) => sum + order.items.length, 0)}
                </p>
                <p className="text-sm text-orange-600">Items</p>
              </div>
              <div className="text-center p-3 bg-purple-50 rounded-lg">
                <p className="text-2xl font-bold text-purple-600">
                  {data.allocationTotals?.totalCbm?.toFixed(1) || 0}
                </p>
                <p className="text-sm text-purple-600">Total CBM</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Shipping Company & Charges Setup */}
        <div className="space-y-6">
          {/* Shipping Company Selection */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Ship className="h-5 w-5 mr-2" />
                Shipping Company
              </CardTitle>
              <CardDescription>
                Select shipping company for this allocation
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="shipping-company">Company</Label>
                <Select value={selectedShippingCompany} onValueChange={setSelectedShippingCompany}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select shipping company" />
                  </SelectTrigger>
                  <SelectContent>
                    {shippingCompanies.map((company) => (
                      <SelectItem key={company.companyId} value={company.companyId}>
                        <div className="flex items-center justify-between w-full">
                          <span>{company.companyName}</span>
                          <Badge variant={company.contractDetails?.preferredPartner ? "default" : "secondary"}>
                            {company.contractDetails?.preferredPartner ? 'Preferred' : 'Standard'}
                          </Badge>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              
              {getSelectedShippingCompany() && (
                <div className="p-3 bg-gray-50 rounded-lg space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">On-Time Delivery:</span>
                    <span className="text-sm">{getSelectedShippingCompany().performanceMetrics?.onTimeDelivery}%</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Customer Rating:</span>
                    <span className="text-sm">{getSelectedShippingCompany().performanceMetrics?.customerRating}/5</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-medium">Total Shipments:</span>
                    <span className="text-sm">{getSelectedShippingCompany().performanceMetrics?.totalShipments?.toLocaleString()}</span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Base Charges Setup */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center">
                <Calculator className="h-5 w-5 mr-2" />
                Container Base Charges
              </CardTitle>
              <CardDescription>
                Setup GST, Duty, Miscellaneous, and Extra charges
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="gst">GST</Label>
                  <Input
                    id="gst"
                    type="number"
                    value={baseCharges.gst}
                    onChange={(e) => handleBaseChargeChange('gst', e.target.value)}
                    placeholder="GST amount"
                  />
                </div>
                <div>
                  <Label htmlFor="duty">Duty</Label>
                  <Input
                    id="duty"
                    type="number"
                    value={baseCharges.duty}
                    onChange={(e) => handleBaseChargeChange('duty', e.target.value)}
                    placeholder="Duty amount"
                  />
                </div>
                <div>
                  <Label htmlFor="misc">Miscellaneous</Label>
                  <Input
                    id="misc"
                    type="number"
                    value={baseCharges.misc}
                    onChange={(e) => handleBaseChargeChange('misc', e.target.value)}
                    placeholder="Misc charges"
                  />
                </div>
                <div>
                  <Label htmlFor="extraCharge">Extra Charge</Label>
                  <Input
                    id="extraCharge"
                    type="number"
                    value={baseCharges.extraCharge}
                    onChange={(e) => handleBaseChargeChange('extraCharge', e.target.value)}
                    placeholder="Extra charges"
                  />
                </div>
              </div>
              
              <div>
                <Label htmlFor="currency">Currency</Label>
                <Select value={baseCharges.currency} onValueChange={(value) => setBaseCharges(prev => ({ ...prev, currency: value }))}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="INR">Indian Rupee (INR)</SelectItem>
                    <SelectItem value="USD">US Dollar (USD)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              
              <div className="p-3 bg-blue-50 rounded-lg">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Total Base Charges:</span>
                  <span className="text-lg font-bold text-blue-600">
                    {formatCurrency(calculateTotalBaseCharges(), baseCharges.currency)}
                  </span>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Financial Preview */}
        <div className="space-y-6">
          {allocationPreview && (
            <>
              {/* Revenue & Profit Preview */}
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center">
                    <TrendingUp className="h-5 w-5 mr-2" />
                    Financial Preview
                  </CardTitle>
                  <CardDescription>
                    Projected revenue and profit from this allocation
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <Tabs defaultValue="profit" className="space-y-4">
                    <TabsList className="grid w-full grid-cols-2">
                      <TabsTrigger value="profit">Profit Analysis</TabsTrigger>
                      <TabsTrigger value="payments">Payment Breakdown</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="profit" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-green-50 rounded-lg">
                          <span className="font-medium text-green-800">Total Revenue (Carrying Charges)</span>
                          <span className="text-xl font-bold text-green-600">
                            ₹{allocationPreview.financialPreview?.revenue?.totalCarryingCharges?.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-red-50 rounded-lg">
                          <span className="font-medium text-red-800">Total Base Charges</span>
                          <span className="text-xl font-bold text-red-600">
                            {formatCurrency(allocationPreview.financialPreview?.costs?.baseCharges?.total || 0, baseCharges.currency)}
                          </span>
                        </div>
                        
                        <Separator />
                        
                        <div className="flex items-center justify-between p-4 bg-blue-50 rounded-lg border-2 border-blue-200">
                          <span className="text-lg font-semibold text-blue-800">Estimated Profit</span>
                          <span className="text-2xl font-bold text-blue-600">
                            ₹{allocationPreview.financialPreview?.profit?.estimated?.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-center p-2">
                          <span className="text-sm text-gray-600">
                            Profit Margin: <span className="font-semibold">{allocationPreview.financialPreview?.profit?.margin}</span>
                          </span>
                        </div>
                        
                        {/* Base Charges Breakdown */}
                        <div className="space-y-2">
                          <h4 className="font-medium text-gray-900">Base Charges Breakdown</h4>
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div className="flex justify-between">
                              <span>GST:</span>
                              <span>{formatCurrency(baseCharges.gst, baseCharges.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Duty:</span>
                              <span>{formatCurrency(baseCharges.duty, baseCharges.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Misc:</span>
                              <span>{formatCurrency(baseCharges.misc, baseCharges.currency)}</span>
                            </div>
                            <div className="flex justify-between">
                              <span>Extra:</span>
                              <span>{formatCurrency(baseCharges.extraCharge, baseCharges.currency)}</span>
                            </div>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="payments" className="space-y-4">
                      <div className="space-y-3">
                        <div className="flex items-center justify-between p-3 bg-purple-50 rounded-lg">
                          <div className="flex items-center">
                            <CreditCard className="h-4 w-4 mr-2 text-purple-600" />
                            <span className="font-medium text-purple-800">Through Me Payments</span>
                          </div>
                          <span className="text-lg font-bold text-purple-600">
                            ₹{allocationPreview.financialPreview?.revenue?.paymentBreakdown?.throughMe?.amount?.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="flex items-center justify-between p-3 bg-orange-50 rounded-lg">
                          <div className="flex items-center">
                            <Building2 className="h-4 w-4 mr-2 text-orange-600" />
                            <span className="font-medium text-orange-800">Direct Payments</span>
                          </div>
                          <span className="text-lg font-bold text-orange-600">
                            ₹{allocationPreview.financialPreview?.revenue?.paymentBreakdown?.direct?.amount?.toLocaleString()}
                          </span>
                        </div>
                        
                        <div className="text-xs text-gray-600 p-3 bg-gray-50 rounded-lg">
                          <p><strong>Note:</strong> Through Me payments come to you but are not counted in profit calculation. Only Direct payments contribute to profit.</p>
                        </div>
                        
                        <div className="grid grid-cols-2 gap-4 text-sm">
                          <div className="text-center p-2 bg-purple-100 rounded">
                            <p className="font-medium">Through Me Orders</p>
                            <p className="text-lg font-bold text-purple-600">
                              {allocationPreview.financialPreview?.revenue?.paymentBreakdown?.throughMe?.orders || 0}
                            </p>
                          </div>
                          <div className="text-center p-2 bg-orange-100 rounded">
                            <p className="font-medium">Direct Orders</p>
                            <p className="text-lg font-bold text-orange-600">
                              {allocationPreview.financialPreview?.revenue?.paymentBreakdown?.direct?.orders || 0}
                            </p>
                          </div>
                        </div>
                      </div>
                    </TabsContent>
                  </Tabs>
                </CardContent>
              </Card>

              {/* Warnings & Recommendations */}
              {allocationPreview.warnings && allocationPreview.warnings.length > 0 && (
                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center text-amber-600">
                      <AlertTriangle className="h-5 w-5 mr-2" />
                      Warnings & Recommendations
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2">
                      {allocationPreview.warnings.map((warning, index) => (
                        <Alert key={index}>
                          <AlertTriangle className="h-4 w-4" />
                          <AlertDescription>{warning}</AlertDescription>
                        </Alert>
                      ))}
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          )}
        </div>
      </div>

      {/* Client Summary */}
      {data.validationResults && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Users className="h-5 w-5 mr-2" />
              Client Allocation Summary
            </CardTitle>
            <CardDescription>
              Overview of allocation by client
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ScrollArea className="h-64">
              <div className="space-y-3">
                {Object.values(
                  data.validationResults.reduce((acc, order) => {
                    if (!acc[order.clientId]) {
                      acc[order.clientId] = {
                        clientId: order.clientId,
                        clientName: order.clientName,
                        orders: 0,
                        totalCbm: 0,
                        totalCartons: 0,
                        totalCarryingCharges: 0,
                        paymentTypes: { throughMe: 0, direct: 0 }
                      };
                    }
                    
                    acc[order.clientId].orders++;
                    acc[order.clientId].totalCbm += order.orderTotals.cbm;
                    acc[order.clientId].totalCartons += order.orderTotals.cartons;
                    acc[order.clientId].totalCarryingCharges += order.orderTotals.carryingCharges;
                    
                    // Count payment types
                    order.items.forEach(item => {
                      if (item.allocation.paymentType === 'THROUGH_ME') {
                        acc[order.clientId].paymentTypes.throughMe++;
                      } else {
                        acc[order.clientId].paymentTypes.direct++;
                      }
                    });
                    
                    return acc;
                  }, {})
                ).map((client) => (
                  <div key={client.clientId} className="p-4 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-semibold">{client.clientName}</h4>
                      <Badge variant="outline">{client.orders} orders</Badge>
                    </div>
                    
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                      <div className="text-center">
                        <p className="text-gray-600">CBM</p>
                        <p className="font-semibold">{client.totalCbm.toFixed(1)}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Cartons</p>
                        <p className="font-semibold">{client.totalCartons}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Charges</p>
                        <p className="font-semibold">₹{client.totalCarryingCharges.toLocaleString()}</p>
                      </div>
                      <div className="text-center">
                        <p className="text-gray-600">Payment</p>
                        <p className="font-semibold text-xs">
                          {client.paymentTypes.throughMe}TM / {client.paymentTypes.direct}D
                        </p>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </ScrollArea>
          </CardContent>
        </Card>
      )}

      {loading && (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
          <span className="ml-2 text-gray-600">Generating allocation preview...</span>
        </div>
      )}
    </div>
  );
};

export default AllocationPreviewStep;