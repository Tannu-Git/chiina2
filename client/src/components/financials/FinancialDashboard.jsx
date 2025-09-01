import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { 
  DollarSign,
  TrendingUp,
  Ship,
  Calculator,
  Building2,
  CreditCard,
  Settings,
  Edit,
  Eye
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const FinancialDashboard = () => {
  const [containers, setContainers] = useState([]);
  const [selectedContainer, setSelectedContainer] = useState(null);
  const [financialSummary, setFinancialSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  useEffect(() => {
    fetchFinancialData();
  }, []);

  const fetchFinancialData = async () => {
    try {
      const response = await fetch('/api/containers?includeFinancials=true', {
        headers: { 'Authorization': `Bearer ${localStorage.getItem('token')}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setContainers(data.containers || []);
        calculateFinancialSummary(data.containers || []);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: "Failed to fetch financial data" });
    } finally {
      setLoading(false);
    }
  };

  const calculateFinancialSummary = (containerData) => {
    const summary = {
      totalRevenue: containerData.reduce((sum, c) => sum + (c.totalRevenue || 0), 0),
      totalProfit: containerData.reduce((sum, c) => sum + (c.grossProfit || 0), 0),
      activeContainers: containerData.filter(c => c.status !== 'delivered').length,
      containersCount: containerData.length
    };
    summary.averageMargin = summary.totalRevenue > 0 ? ((summary.totalProfit / summary.totalRevenue) * 100).toFixed(1) : 0;
    setFinancialSummary(summary);
  };

  const updateContainerCharges = async (containerId, charges) => {
    try {
      const response = await fetch(`/api/financials/container-charges/${containerId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify(charges)
      });

      if (response.ok) {
        toast({ title: "Success", description: "Container charges updated successfully" });
        fetchFinancialData();
        setSelectedContainer(null);
      }
    } catch (error) {
      toast({ variant: "destructive", title: "Error", description: error.message });
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-96">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2">Loading financial data...</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-6">
      <div className="max-w-7xl mx-auto space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Financial Management</h1>
        </div>

        {/* Summary Cards */}
        {financialSummary && (
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <Card className="bg-green-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <TrendingUp className="h-8 w-8 text-green-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-green-600">Total Revenue</p>
                    <p className="text-2xl font-bold">₹{financialSummary.totalRevenue.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-blue-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <DollarSign className="h-8 w-8 text-blue-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-blue-600">Net Profit</p>
                    <p className="text-2xl font-bold">₹{financialSummary.totalProfit.toLocaleString()}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-purple-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Ship className="h-8 w-8 text-purple-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-purple-600">Active Containers</p>
                    <p className="text-2xl font-bold">{financialSummary.activeContainers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="bg-orange-50">
              <CardContent className="p-4">
                <div className="flex items-center">
                  <Calculator className="h-8 w-8 text-orange-500" />
                  <div className="ml-3">
                    <p className="text-sm font-medium text-orange-600">Avg Margin</p>
                    <p className="text-2xl font-bold">{financialSummary.averageMargin}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Container Management */}
        <Card>
          <CardHeader>
            <CardTitle>Container Financial Management</CardTitle>
            <CardDescription>Manage base charges and view profit analysis</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {containers.map((container) => (
                <div key={container._id} className="p-4 border rounded-lg">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <h4 className="font-semibold">{container.clientFacingId}</h4>
                      <p className="text-sm text-gray-600">{container.realContainerId} • {container.status}</p>
                    </div>
                    <div className="flex space-x-2">
                      <Button size="sm" variant="outline" onClick={() => window.open(`/containers/${container._id}`, '_blank')}>
                        <Eye className="h-4 w-4" />
                      </Button>
                      <Button size="sm" onClick={() => setSelectedContainer(container)}>
                        <Edit className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-4 gap-4 text-sm">
                    <div className="text-center p-2 bg-green-50 rounded">
                      <p className="text-green-600 font-medium">Revenue</p>
                      <p className="font-bold">₹{(container.totalRevenue || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-red-50 rounded">
                      <p className="text-red-600 font-medium">Base Costs</p>
                      <p className="font-bold">₹{(container.baseChargesTotal || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-blue-50 rounded">
                      <p className="text-blue-600 font-medium">Profit</p>
                      <p className="font-bold">₹{(container.grossProfit || 0).toLocaleString()}</p>
                    </div>
                    <div className="text-center p-2 bg-purple-50 rounded">
                      <p className="text-purple-600 font-medium">Margin</p>
                      <p className="font-bold">{(container.profitMargin || 0).toFixed(1)}%</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Charge Setup Modal */}
        {selectedContainer && (
          <ChargeSetupModal
            container={selectedContainer}
            onSave={updateContainerCharges}
            onClose={() => setSelectedContainer(null)}
          />
        )}
      </div>
    </div>
  );
};

// Charge Setup Modal
const ChargeSetupModal = ({ container, onSave, onClose }) => {
  const [charges, setCharges] = useState({
    gst: container.baseCharges?.gst || 0,
    duty: container.baseCharges?.duty || 0,
    misc: container.baseCharges?.misc || 0,
    extraCharge: container.baseCharges?.extraCharge || 0,
    currency: 'INR'
  });
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onSave(container._id, charges);
    setSaving(false);
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
      <Card className="w-full max-w-lg">
        <CardHeader>
          <CardTitle className="flex items-center">
            <Settings className="h-5 w-5 mr-2" />
            Setup Base Charges - {container.clientFacingId}
          </CardTitle>
        </CardHeader>
        
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label>GST</Label>
              <Input
                type="number"
                value={charges.gst}
                onChange={(e) => setCharges(prev => ({ ...prev, gst: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Duty</Label>
              <Input
                type="number"
                value={charges.duty}
                onChange={(e) => setCharges(prev => ({ ...prev, duty: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Miscellaneous</Label>
              <Input
                type="number"
                value={charges.misc}
                onChange={(e) => setCharges(prev => ({ ...prev, misc: parseFloat(e.target.value) || 0 }))}
              />
            </div>
            <div>
              <Label>Extra Charge</Label>
              <Input
                type="number"
                value={charges.extraCharge}
                onChange={(e) => setCharges(prev => ({ ...prev, extraCharge: parseFloat(e.target.value) || 0 }))}
              />
            </div>
          </div>
          
          <div className="p-3 bg-blue-50 rounded">
            <div className="flex justify-between">
              <span className="font-medium">Total Base Charges:</span>
              <span className="text-xl font-bold text-blue-600">
                ₹{(charges.gst + charges.duty + charges.misc + charges.extraCharge).toLocaleString()}
              </span>
            </div>
          </div>
          
          <div className="flex justify-end space-x-2">
            <Button variant="outline" onClick={onClose}>Cancel</Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save Charges'}
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default FinancialDashboard;