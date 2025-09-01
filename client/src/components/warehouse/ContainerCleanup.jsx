import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Trash2, 
  RefreshCw, 
  CheckCircle2, 
  AlertTriangle,
  Package,
  Loader2
} from 'lucide-react';
import { motion } from 'framer-motion';
import toast from 'react-hot-toast';
import { useAuthStore } from '@/stores/authStore';

const ContainerCleanup = ({ onCleanupComplete }) => {
  const [isLoading, setIsLoading] = useState(false);
  const [cleanupResult, setCleanupResult] = useState(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const { token, user } = useAuthStore();

  const handleCleanup = async () => {
    if (!showConfirmation) {
      setShowConfirmation(true);
      return;
    }

    setIsLoading(true);
    setCleanupResult(null);
    
    try {
      const response = await fetch('/api/warehouse/cleanup-containers', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        }
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.message || 'Cleanup failed');
      }

      const result = await response.json();
      setCleanupResult(result);
      
      if (result.success) {
        toast.success(`Cleanup completed! Removed ${result.summary.containersRemoved} containers`);
        onCleanupComplete?.(result);
      } else {
        toast.error('Cleanup failed: ' + result.message);
      }
      
    } catch (error) {
      console.error('Cleanup error:', error);
      toast.error('Cleanup failed: ' + error.message);
      setCleanupResult({ 
        success: false, 
        message: error.message,
        timestamp: new Date().toISOString()
      });
    } finally {
      setIsLoading(false);
      setShowConfirmation(false);
    }
  };

  const resetConfirmation = () => {
    setShowConfirmation(false);
    setCleanupResult(null);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center text-red-700">
            <Trash2 className="h-5 w-5 mr-2" />
            Container Cleanup Tool
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-gray-600">
            This tool will remove all existing containers and reset associated orders to ready status.
            Use this to clean up old data like SHIP-MK1ULVR6 and SHIP-93K6T7PK.
          </p>
          
          {/* User Info */}
          <div className="text-sm text-gray-500">
            <p><strong>User:</strong> {user?.name} ({user?.role})</p>
            <p><strong>Note:</strong> Only admin users can perform this operation</p>
          </div>

          {/* Warning */}
          <Alert className="border-orange-200 bg-orange-50">
            <AlertTriangle className="h-4 w-4 text-orange-600" />
            <AlertDescription className="text-orange-800">
              <strong>Warning:</strong> This action cannot be undone. All container data will be permanently removed.
            </AlertDescription>
          </Alert>

          {/* Confirmation Step */}
          {!showConfirmation ? (
            <Button
              onClick={handleCleanup}
              variant="destructive"
              className="w-full"
              disabled={isLoading || user?.role !== 'admin'}
            >
              <Trash2 className="h-4 w-4 mr-2" />
              Remove All Containers
            </Button>
          ) : (
            <div className="space-y-3">
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  <strong>Confirm:</strong> Are you sure you want to remove ALL containers? This will:
                  <ul className="list-disc list-inside mt-2 space-y-1">
                    <li>Delete all container records (including SHIP-MK1ULVR6, SHIP-93K6T7PK)</li>
                    <li>Reset orders to ready status for reallocation</li>
                    <li>Remove all container-order associations</li>
                  </ul>
                </AlertDescription>
              </Alert>
              
              <div className="flex space-x-3">
                <Button
                  onClick={handleCleanup}
                  variant="destructive"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Cleaning up...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4 mr-2" />
                      Yes, Remove All
                    </>
                  )}
                </Button>
                <Button
                  onClick={resetConfirmation}
                  variant="outline"
                  disabled={isLoading}
                  className="flex-1"
                >
                  Cancel
                </Button>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Cleanup Results */}
      {cleanupResult && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className={cleanupResult.success ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'}>
            <CardHeader>
              <CardTitle className={`flex items-center ${
                cleanupResult.success ? 'text-green-700' : 'text-red-700'
              }`}>
                {cleanupResult.success ? (
                  <CheckCircle2 className="h-5 w-5 mr-2" />
                ) : (
                  <AlertTriangle className="h-5 w-5 mr-2" />
                )}
                Cleanup {cleanupResult.success ? 'Completed' : 'Failed'}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className={`mb-4 ${
                cleanupResult.success ? 'text-green-800' : 'text-red-800'
              }`}>
                {cleanupResult.message}
              </p>
              
              {cleanupResult.success && cleanupResult.summary && (
                <div className="space-y-3">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <Package className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-600">
                        {cleanupResult.summary.containersRemoved}
                      </p>
                      <p className="text-sm text-green-700">Containers Removed</p>
                    </div>
                    <div className="text-center p-3 bg-white rounded-lg border border-green-200">
                      <RefreshCw className="h-6 w-6 text-green-600 mx-auto mb-1" />
                      <p className="text-2xl font-bold text-green-600">
                        {cleanupResult.summary.ordersReset}
                      </p>
                      <p className="text-sm text-green-700">Orders Reset</p>
                    </div>
                  </div>
                  
                  {cleanupResult.summary.removedContainers && cleanupResult.summary.removedContainers.length > 0 && (
                    <div>
                      <h4 className="font-medium text-green-800 mb-2">Removed Containers:</h4>
                      <div className="space-y-1 max-h-32 overflow-y-auto">
                        {cleanupResult.summary.removedContainers.map((container, index) => (
                          <div key={index} className="text-sm text-green-700 bg-white px-2 py-1 rounded border border-green-100">
                            {container.id} ({container.type}) - {container.status} - {container.orders} orders
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              )}
              
              <p className="text-xs text-gray-500 mt-3">
                Completed at: {new Date(cleanupResult.timestamp).toLocaleString()}
              </p>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Next Steps */}
      {cleanupResult?.success && (
        <Card className="border-blue-200 bg-blue-50">
          <CardContent className="pt-4">
            <h4 className="font-medium text-blue-800 mb-2">✅ Next Steps:</h4>
            <ul className="text-sm text-blue-700 space-y-1">
              <li>• Your system is now clean and ready for new container allocations</li>
              <li>• All orders have been reset to ready status</li>
              <li>• You can now use the simplified container allocation process</li>
              <li>• Visit the warehouse section to start fresh container allocation</li>
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ContainerCleanup;