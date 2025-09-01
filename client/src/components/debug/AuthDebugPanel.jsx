import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { 
  Shield, 
  User, 
  Key, 
  AlertTriangle, 
  CheckCircle, 
  RefreshCw,
  Eye,
  EyeOff,
  Copy
} from 'lucide-react';
import { useAuthStore } from '@/stores/authStore';
import toast from 'react-hot-toast';

const AuthDebugPanel = () => {
  const { user, token, isAuthenticated, getCurrentUser, logout } = useAuthStore();
  const [showToken, setShowToken] = useState(false);
  const [debugInfo, setDebugInfo] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    gatherDebugInfo();
  }, []);

  const gatherDebugInfo = () => {
    const authData = {
      // Auth Store State
      storeAuthenticated: isAuthenticated,
      storeUser: user,
      storeToken: token ? 'Present' : 'Missing',
      tokenLength: token ? token.length : 0,
      
      // localStorage Check
      localStorageToken: localStorage.getItem('auth-storage'),
      
      // Headers Check
      axiosToken: window.axios?.defaults?.headers?.common?.['Authorization'],
      
      // Token Analysis
      tokenValid: false,
      tokenExpired: false,
      tokenPayload: null
    };

    // Try to decode token
    if (token) {
      try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        authData.tokenPayload = payload;
        authData.tokenValid = true;
        authData.tokenExpired = Date.now() >= (payload.exp * 1000);
      } catch (error) {
        authData.tokenValid = false;
        authData.tokenError = error.message;
      }
    }

    setDebugInfo(authData);
  };

  const testAPICall = async () => {
    setLoading(true);
    try {
      const response = await fetch('/api/warehouse/debug-qc', {
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });

      if (response.ok) {
        const data = await response.json();
        toast.success('API call successful! Check console for details.');
        console.log('API Response:', data);
      } else {
        const errorText = await response.text();
        toast.error(`API Error: ${response.status} - ${errorText}`);
        console.error('API Error:', response.status, errorText);
      }
    } catch (error) {
      toast.error(`Network Error: ${error.message}`);
      console.error('Network Error:', error);
    } finally {
      setLoading(false);
    }
  };

  const refreshAuth = async () => {
    setLoading(true);
    try {
      const result = await getCurrentUser();
      if (result.success) {
        toast.success('Authentication refreshed successfully');
        gatherDebugInfo();
      } else {
        toast.error(`Refresh failed: ${result.error}`);
      }
    } catch (error) {
      toast.error(`Refresh error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const copyToken = () => {
    if (token) {
      navigator.clipboard.writeText(token);
      toast.success('Token copied to clipboard');
    }
  };

  const forceLogout = () => {
    logout();
    toast.success('Logged out successfully');
    gatherDebugInfo();
  };

  if (!debugInfo) {
    return <div>Loading debug info...</div>;
  }

  return (
    <div className="space-y-6 p-6 max-w-4xl mx-auto">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Shield className="h-6 w-6 text-blue-600" />
          Authentication Debug Panel
        </h2>
        <Button onClick={gatherDebugInfo} variant="outline" size="sm">
          <RefreshCw className="h-4 w-4 mr-2" />
          Refresh
        </Button>
      </div>

      {/* Authentication Status */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <User className="h-5 w-5" />
            Authentication Status
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <p className="text-sm text-gray-600">Store Status</p>
              <Badge variant={debugInfo.storeAuthenticated ? 'default' : 'destructive'}>
                {debugInfo.storeAuthenticated ? 'Authenticated' : 'Not Authenticated'}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Status</p>
              <Badge variant={debugInfo.storeToken === 'Present' ? 'default' : 'destructive'}>
                {debugInfo.storeToken}
              </Badge>
            </div>
          </div>

          {debugInfo.storeUser && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Current User</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div><strong>Name:</strong> {debugInfo.storeUser.name}</div>
                <div><strong>Email:</strong> {debugInfo.storeUser.email}</div>
                <div><strong>Role:</strong> {debugInfo.storeUser.role}</div>
                <div><strong>ID:</strong> {debugInfo.storeUser.id}</div>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Token Analysis */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Key className="h-5 w-5" />
            Token Analysis
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-gray-600">Token Valid</p>
              <div className="flex items-center gap-2">
                {debugInfo.tokenValid ? (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                )}
                <span className="text-sm">{debugInfo.tokenValid ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Expired</p>
              <div className="flex items-center gap-2">
                {debugInfo.tokenExpired ? (
                  <AlertTriangle className="h-4 w-4 text-red-500" />
                ) : (
                  <CheckCircle className="h-4 w-4 text-green-500" />
                )}
                <span className="text-sm">{debugInfo.tokenExpired ? 'Yes' : 'No'}</span>
              </div>
            </div>
            <div>
              <p className="text-sm text-gray-600">Token Length</p>
              <span className="text-sm">{debugInfo.tokenLength} chars</span>
            </div>
          </div>

          {debugInfo.tokenPayload && (
            <div>
              <p className="text-sm text-gray-600 mb-2">Token Payload</p>
              <div className="bg-gray-50 rounded-lg p-3 text-sm">
                <div><strong>User ID:</strong> {debugInfo.tokenPayload.id}</div>
                <div><strong>Email:</strong> {debugInfo.tokenPayload.email}</div>
                <div><strong>Role:</strong> {debugInfo.tokenPayload.role}</div>
                <div><strong>Issued At:</strong> {new Date(debugInfo.tokenPayload.iat * 1000).toLocaleString()}</div>
                <div><strong>Expires At:</strong> {new Date(debugInfo.tokenPayload.exp * 1000).toLocaleString()}</div>
              </div>
            </div>
          )}

          {token && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <p className="text-sm text-gray-600">Raw Token</p>
                <Button
                  onClick={() => setShowToken(!showToken)}
                  variant="outline"
                  size="sm"
                >
                  {showToken ? <EyeOff className="h-3 w-3" /> : <Eye className="h-3 w-3" />}
                </Button>
                <Button
                  onClick={copyToken}
                  variant="outline"
                  size="sm"
                >
                  <Copy className="h-3 w-3" />
                </Button>
              </div>
              {showToken && (
                <div className="bg-gray-50 rounded-lg p-3 text-xs font-mono break-all">
                  {token}
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Issues & Recommendations */}
      <Card>
        <CardHeader>
          <CardTitle>Issues & Recommendations</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          {!debugInfo.storeAuthenticated && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Not Authenticated:</strong> You need to log in to access protected resources.
                <Button onClick={() => window.location.href = '/login'} className="ml-2" size="sm">
                  Go to Login
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {debugInfo.tokenExpired && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Token Expired:</strong> Your session has expired. Please log in again.
                <Button onClick={forceLogout} className="ml-2" size="sm">
                  Logout & Redirect
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {!debugInfo.tokenValid && debugInfo.storeToken === 'Present' && (
            <Alert variant="destructive">
              <AlertTriangle className="h-4 w-4" />
              <AlertDescription>
                <strong>Invalid Token:</strong> The token format is invalid.
                <Button onClick={forceLogout} className="ml-2" size="sm">
                  Clear & Re-login
                </Button>
              </AlertDescription>
            </Alert>
          )}

          {debugInfo.storeAuthenticated && debugInfo.tokenValid && !debugInfo.tokenExpired && (
            <Alert>
              <CheckCircle className="h-4 w-4" />
              <AlertDescription>
                <strong>Authentication OK:</strong> Your authentication appears to be working correctly.
              </AlertDescription>
            </Alert>
          )}
        </CardContent>
      </Card>

      {/* Test Actions */}
      <Card>
        <CardHeader>
          <CardTitle>Test Actions</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex gap-3 flex-wrap">
            <Button 
              onClick={testAPICall} 
              disabled={loading}
              variant="outline"
            >
              Test API Call
            </Button>
            <Button 
              onClick={refreshAuth} 
              disabled={loading}
              variant="outline"
            >
              Refresh Auth
            </Button>
            <Button 
              onClick={forceLogout} 
              variant="destructive"
              size="sm"
            >
              Force Logout
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AuthDebugPanel;