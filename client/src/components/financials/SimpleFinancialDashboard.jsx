import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { 
  DollarSign,
  TrendingUp,
  TrendingDown,
  Package,
  Ship,
  Calculator,
  AlertCircle
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import axios from 'axios';
import toast from 'react-hot-toast';

const SimpleFinancialDashboard = () => {
  const [financialData, setFinancialData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState('30'); // days
  const { isAuthenticated, token } = useAuthStore();

  useEffect(() => {
    fetchFinancialData();
  }, [timeRange]);

  const fetchFinancialData = async () => {
    try {
      console.log('📊 [SIMPLE FINANCIAL] Fetching financial data for', timeRange, 'days');
      
      if (!isAuthenticated || !token) {
        console.log('⚠️ [SIMPLE FINANCIAL] Not authenticated');
        toast.error('Please log in to view financial data');
        setLoading(false);
        return;
      }
      
      const response = await axios.get(`/api/financials/simple-dashboard?period=${timeRange}`);

      if (response.data) {
        setFinancialData(response.data);
        console.log('✅ [SIMPLE FINANCIAL] Data loaded successfully');
      } else {
        console.log('⚠️ [SIMPLE FINANCIAL] No data received from API');
        toast.error('No financial data available');
      }
    } catch (error) {
      console.error('❌ [SIMPLE FINANCIAL] Error:', error);
      if (error.response?.status === 401) {
        toast.error('Session expired. Please log in again.');
      } else if (error.response?.status === 403) {
        toast.error('Access denied. Admin/Staff access required.');
      } else {
        toast.error('Failed to load financial data. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600"></div>
        <span className="ml-2 text-gray-600">Loading financial data...</span>
      </div>
    );
  }

  // Show message if no data available
  if (!financialData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-center">
        <DollarSign className="h-16 w-16 text-gray-300 mb-4" />
        <h3 className="text-lg font-medium text-gray-600 mb-2">No Financial Data Available</h3>
        <p className="text-sm text-gray-400 mb-4">
          {!isAuthenticated 
            ? 'Please log in to view financial data'
            : 'No financial data found for the selected period'}
        </p>
        {isAuthenticated && (
          <Button onClick={fetchFinancialData} variant="outline">
            Retry Loading Data
          </Button>
        )}
      </div>
    );
  }

  const data = financialData;

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Financial Dashboard</h1>
          <p className="text-gray-600 mt-1">Simple financial overview and tracking</p>
        </div>
        
        <div className="flex space-x-2">
          {['7', '30', '90'].map((days) => (
            <Button
              key={days}
              variant={timeRange === days ? "default" : "outline"}
              size="sm"
              onClick={() => setTimeRange(days)}
            >
              {days} days
            </Button>
          ))}
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <DollarSign className="h-8 w-8 text-green-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Revenue</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary?.totalRevenue || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Calculator className="h-8 w-8 text-red-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Total Costs</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary?.totalCosts || 0)}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <TrendingUp className="h-8 w-8 text-blue-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Gross Profit</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(data.summary?.grossProfit || 0)}
                </p>
                <p className="text-sm text-green-600">
                  {(data.summary?.profitMargin || 0).toFixed(1)}% margin
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="p-6">
            <div className="flex items-center">
              <Package className="h-8 w-8 text-purple-600" />
              <div className="ml-4">
                <p className="text-sm font-medium text-gray-600">Orders</p>
                <p className="text-2xl font-bold text-gray-900">{data.summary?.orderCount || 0}</p>
                <p className="text-sm text-gray-600">{data.summary?.containerCount || 0} containers</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Recent Orders and Container Performance */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Orders */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Package className="h-5 w-5 mr-2" />
              Recent Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.recentOrders && data.recentOrders.length > 0 ? (
                data.recentOrders.map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
                    <div>
                      <p className="font-medium text-gray-900">{order.id}</p>
                      <p className="text-sm text-gray-600">{order.client}</p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold text-gray-900">{formatCurrency(order.amount)}</p>
                      <Badge 
                        variant={order.status === 'paid' ? 'default' : 'secondary'}
                        className={order.status === 'paid' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}
                      >
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Package className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No recent orders found</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Container Performance */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Ship className="h-5 w-5 mr-2" />
              Container Performance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {data.containers && data.containers.length > 0 ? (
                data.containers.map((container) => (
                  <div key={container.id} className="p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <div>
                        <p className="font-medium text-gray-900">{container.id}</p>
                        <p className="text-sm text-gray-600">{container.type}</p>
                      </div>
                      <Badge variant="outline">{container.type}</Badge>
                    </div>
                    
                    <div className="grid grid-cols-3 gap-2 text-sm">
                      <div>
                        <p className="text-gray-600">Revenue</p>
                        <p className="font-semibold text-green-600">
                          {formatCurrency(container.revenue)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Costs</p>
                        <p className="font-semibold text-red-600">
                          {formatCurrency(container.costs)}
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-600">Profit</p>
                        <p className="font-semibold text-blue-600">
                          {formatCurrency(container.profit)}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <Ship className="h-12 w-12 mx-auto mb-4 text-gray-300" />
                  <p>No container data available</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Simple Profit Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center">
            <TrendingUp className="h-5 w-5 mr-2" />
            Profit Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="text-center">
              <div className="text-3xl font-bold text-green-600 mb-2">
                {data.summary?.totalRevenue > 0 
                  ? ((data.summary.grossProfit / data.summary.totalRevenue) * 100).toFixed(1)
                  : '0.0'}%
              </div>
              <p className="text-sm text-gray-600">Profit Margin</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-blue-600 mb-2">
                {data.summary?.orderCount > 0 
                  ? formatCurrency(data.summary.grossProfit / data.summary.orderCount)
                  : formatCurrency(0)}
              </div>
              <p className="text-sm text-gray-600">Avg Profit per Order</p>
            </div>
            
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-600 mb-2">
                {data.summary?.containerCount > 0 
                  ? formatCurrency(data.summary.grossProfit / data.summary.containerCount)
                  : formatCurrency(0)}
              </div>
              <p className="text-sm text-gray-600">Avg Profit per Container</p>
            </div>
          </div>
          
          {data.summary?.profitMargin && data.summary.profitMargin < 15 && (
            <div className="mt-4 p-3 bg-yellow-50 rounded-lg flex items-start space-x-2">
              <AlertCircle className="h-5 w-5 text-yellow-600 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-yellow-800">Low Profit Margin</p>
                <p className="text-sm text-yellow-700">
                  Consider reviewing costs or adjusting pricing to improve profitability.
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default SimpleFinancialDashboard;