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
import Financials from './pages/financials/Financials'
import Users from './pages/admin/Users'
import Profile from './pages/Profile'

// Hooks and Stores
import { useAuthStore } from './stores/authStore'

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
  return (
    <QueryClientProvider client={queryClient}>
      <Router>
        <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50">
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
              <ProtectedRoute>
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
              <ProtectedRoute>
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
                  <ContainerDetails />
                </DashboardLayout>
              </ProtectedRoute>
            } />

            {/* Financial Routes */}
            <Route path="/financials" element={
              <ProtectedRoute requiredRole="admin">
                <DashboardLayout>
                  <Financials />
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

            {/* Default redirect */}
            <Route path="/" element={<Navigate to="/dashboard" replace />} />

            {/* 404 Route */}
            <Route path="*" element={
              <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                  <h1 className="text-4xl font-bold text-gray-900 mb-4">404</h1>
                  <p className="text-gray-600 mb-8">Page not found</p>
                  <a href="/dashboard" className="text-blue-600 hover:text-blue-800">
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
                background: '#363636',
                color: '#fff',
              },
              success: {
                duration: 3000,
                iconTheme: {
                  primary: '#4ade80',
                  secondary: '#fff',
                },
              },
              error: {
                duration: 5000,
                iconTheme: {
                  primary: '#ef4444',
                  secondary: '#fff',
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
