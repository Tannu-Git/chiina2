import React from 'react'
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { Toaster } from 'react-hot-toast'

// Layout Components
import DashboardLayout from './components/layout/DashboardLayout'
import AuthLayout from './components/layout/AuthLayout'

// Auth Pages
import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

// Dashboard Pages
import Dashboard from './pages/Dashboard'
import Orders from './pages/orders/Orders'
import OrderCreate from './pages/orders/OrderCreate'
import OrderDetails from './pages/orders/OrderDetails'
import Warehouse from './pages/warehouse/Warehouse'
import Containers from './pages/containers/Containers'
import ContainerDetails from './pages/containers/ContainerDetails'
import ContainerEdit from './pages/containers/ContainerEdit'
import ClientAllocations from './pages/containers/ClientAllocations'

// Financial Pages
import FinancialDashboard from './pages/financials/FinancialDashboard'
import FinancialOverview from './pages/financials/FinancialOverview'
import TransactionManagement from './pages/financials/TransactionManagement'
import AccountBalances from './pages/financials/AccountBalances'
import InvoiceManagement from './pages/financials/InvoiceManagement'
import Financials from './pages/financials/Financials'
import PaymentCollections from './pages/financials/PaymentCollectionsManager'

import ClientManagement from './pages/clients/ClientManagement'
import CompaniesManagement from './pages/companies/CompaniesManagement'
import Users from './pages/admin/Users'
import Profile from './pages/Profile'
import AuthDebugPanel from './components/debug/AuthDebugPanel'
import ContainerCleanup from './components/warehouse/ContainerCleanup'
import NewContainerAllocation from './components/warehouse/NewContainerAllocation'

// Hooks and Stores
import { useAuthStore } from './stores/authStore'
import { useThemeStore } from './stores/themeStore'

// Create a client
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
})

// Protected Route Component
const ProtectedRoute = ({ children, requiredRole = null }) => {
  const { user, isAuthenticated } = useAuthStore()

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  if (requiredRole && user?.role !== requiredRole && user?.role !== 'admin') {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

// Public Route Component (redirect if authenticated)
const PublicRoute = ({ children }) => {
  const { isAuthenticated } = useAuthStore()

  if (isAuthenticated) {
    return <Navigate to="/dashboard" replace />
  }

  return children
}

function App() {
  // Initialize theme store
  const { initialize } = useThemeStore()

  React.useEffect(() => {
    initialize()
  }, [initialize])

  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-background">
          <Routes>
            {/* Public Routes */}
            <Route path="/login" element={
              <PublicRoute>
                <AuthLayout>
                  <Login />
                </AuthLayout>
              </PublicRoute>
            } />

            <Route path="/register" element={
              <PublicRoute>
                <AuthLayout>
                  <Register />
                </AuthLayout>
              </PublicRoute>
            } />

            {/* Protected Routes */}
            <Route path="/dashboard" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Dashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Orders Routes */}
            <Route path="/orders" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Orders />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/orders/create" element={
              <ProtectedRoute requiredRole="staff">
                <DashboardLayout>
                  <OrderCreate />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/orders/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <OrderDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/orders/:id/edit" element={
              <ProtectedRoute requiredRole="staff">
                <DashboardLayout>
                  <OrderCreate />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Warehouse Routes */}
            <Route path="/warehouse" element={
              <ProtectedRoute requiredRole="staff">
                <DashboardLayout>
                  <Warehouse />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/warehouse/allocation" element={
              <ProtectedRoute requiredRole="staff">
                <NewContainerAllocation 
                  onComplete={(result) => {
                    console.log('Allocation completed:', result);
                    window.location.href = '/containers';
                  }}
                  onCancel={() => {
                    window.location.href = '/warehouse';
                  }}
                />
              </ProtectedRoute>
            } />

            {/* Container Routes */}
            <Route path="/containers" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Containers />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/containers/create" element={
              <ProtectedRoute requiredRole="staff">
                <DashboardLayout>
                  <ContainerDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/containers/:id" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ContainerDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/containers/:id/edit" element={
              <ProtectedRoute requiredRole="staff">
                <DashboardLayout>
                  <ContainerEdit />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/client-allocations" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ClientAllocations />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Financial Routes */}
            <Route path="/financials" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <FinancialDashboard />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/financials/overview" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <FinancialOverview />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/financials/transactions" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <TransactionManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/financials/accounts" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <AccountBalances />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/financials/invoices" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <InvoiceManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/financials/legacy" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <Financials />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/payment-collections" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <PaymentCollections />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/client-management" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <ClientManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            <Route path="/companies-management" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <CompaniesManagement />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Admin Routes */}
            <Route path="/admin/users" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <Users />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Profile Route */}
            <Route path="/profile" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <Profile />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Debug Routes */}
            <Route path="/debug/auth" element={
              <ProtectedRoute>
                <DashboardLayout>
                  <AuthDebugPanel />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Cleanup Routes */}
            <Route path="/cleanup/containers" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <ContainerCleanup />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-stone-900 mb-4">404</h1>
                  <p className="text-stone-600 mb-8">Page not found</p>
                  <a href="/dashboard" className="text-amber-600 hover:text-amber-800">
                    Go back to dashboard
                  </a>
                </div>
              </div>
            } />
          </Routes>

          {/* Toast notifications */}
          <Toaster
            position="top-right"
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: 'hsl(var(--primary))',
                  secondary: 'hsl(var(--primary-foreground))',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: 'hsl(var(--destructive))',
                  secondary: 'hsl(var(--destructive-foreground))',
                },
              },
            }}
          />
        </div>
      </Router>
    </QueryClientProvider>
  )
}

export default App
