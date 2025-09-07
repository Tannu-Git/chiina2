import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  Eye,
  EyeOff,
  Edit,
  Trash2,
  Shield,
  ShieldCheck,
  UserCheck,
  UserX,
  Mail,
  Phone,
  Calendar,
  RefreshCw,
  Download,
  MoreHorizontal,
  MapPin,
  Building,
  CreditCard,
  Package,
  DollarSign,
  TrendingUp,
  Clock,
  Save,
  X,
  User,
  Key,
  ChevronLeft,
  ChevronRight,
  CheckSquare,
  Square,
  Trash,
  UserMinus,
  UserPlus,
  Container
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Checkbox } from '@/components/ui/checkbox'
import { useAuthStore } from '@/stores/authStore'
import { formatDate, formatDateTime, formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const Users = () => {
  const { user: currentUser } = useAuthStore()
  const [loading, setLoading] = useState(true)
  const [users, setUsers] = useState([])
  const [searchTerm, setSearchTerm] = useState('')
  const [roleFilter, setRoleFilter] = useState('all')
  const [statusFilter, setStatusFilter] = useState('all')
  
  // Pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalPages, setTotalPages] = useState(1)
  const [totalUsers, setTotalUsers] = useState(0)
  const [usersPerPage] = useState(20)
  
  // Selection states
  const [selectedUsers, setSelectedUsers] = useState([])
  const [selectAll, setSelectAll] = useState(false)
  const [bulkActionLoading, setBulkActionLoading] = useState(false)
  
  // Modal states
  const [showEditModal, setShowEditModal] = useState(false)
  const [showAddModal, setShowAddModal] = useState(false)
  const [showDetailsModal, setShowDetailsModal] = useState(false)
  const [showPasswordModal, setShowPasswordModal] = useState(false)
  const [selectedUser, setSelectedUser] = useState(null)
  
  // Form states
  const [editForm, setEditForm] = useState({
    name: '',
    email: '',
    role: 'client',
    company: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: '',
      zipCode: ''
    },
    permissions: []
  })
  
  const [newUserForm, setNewUserForm] = useState({
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'client',
    company: '',
    phone: '',
    address: {
      street: '',
      city: '',
      state: '',
      country: 'India',
      zipCode: ''
    },
    permissions: []
  })

  const [passwordForm, setPasswordForm] = useState({
    newPassword: '',
    confirmPassword: ''
  })

  // Password visibility states
  const [showNewUserPassword, setShowNewUserPassword] = useState(false)
  const [showNewUserConfirmPassword, setShowNewUserConfirmPassword] = useState(false)
  const [showChangePassword, setShowChangePassword] = useState(false)
  const [showChangeConfirmPassword, setShowChangeConfirmPassword] = useState(false)

  // Fetch users with enhanced data and pagination
  const fetchUsers = async (page = currentPage) => {
    try {
      setLoading(true)
      console.log(`Fetching users for page ${page} with filters: role=${roleFilter}, search=${searchTerm}`)
      
      const response = await axios.get('/api/users', {
        params: {
          page,
          limit: usersPerPage,
          role: roleFilter !== 'all' ? roleFilter : undefined,
          search: searchTerm || undefined
        }
      })
      
      const fetchedUsers = response.data.users || []
      console.log(`Fetched ${fetchedUsers.length} users for page ${page} (total: ${response.data.total || 0})`)
      
      setUsers(fetchedUsers)
      setTotalPages(response.data.totalPages || 1)
      setTotalUsers(response.data.total || 0)
      setCurrentPage(page)
      
      // Reset selections when data changes
      setSelectedUsers([])
      setSelectAll(false)
      
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users from server. Please check your connection.')
      
      // Set empty state instead of demo data
      setUsers([])
      setTotalPages(1)
      setTotalUsers(0)
      setCurrentPage(1)
    } finally {
      setLoading(false)
    }
  }
  
  useEffect(() => {
    fetchUsers(1) // Always start from page 1 when filters change
  }, [roleFilter, statusFilter])
  
  // Separate effect for search with debouncing
  useEffect(() => {
    const delayedSearch = setTimeout(() => {
      if (searchTerm !== '') {
        fetchUsers(1) // Start from page 1 when searching
      } else if (searchTerm === '') {
        fetchUsers(currentPage) // Keep current page when clearing search
      }
    }, 500)
    
    return () => clearTimeout(delayedSearch)
  }, [searchTerm])
  
  // Initial load effect
  useEffect(() => {
    fetchUsers(1) // Load initial data
  }, []) // Empty dependency array for initial load only

  // Filter users based on search and filters
  const filteredUsers = users.filter(user => {
    const matchesSearch = searchTerm === '' || 
      user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.company?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      user.clientId?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    
    return matchesSearch && matchesRole && matchesStatus
  })
  
  // Debug logging
  console.log('Filter debug:', {
    totalUsers: users.length,
    filteredUsers: filteredUsers.length,
    searchTerm,
    roleFilter,
    statusFilter,
    currentPage
  })

  // Helper functions
  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-red-600 dark:text-red-400" />
      case 'staff':
        return <Shield className="h-4 w-4 text-blue-600 dark:text-blue-400" />
      case 'client':
        return <UserCheck className="h-4 w-4 text-green-600 dark:text-green-400" />
      default:
        return <UsersIcon className="h-4 w-4 text-muted-foreground" />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
      case 'staff':
        return 'bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950 dark:text-blue-300 dark:border-blue-800'
      case 'client':
        return 'bg-green-50 text-green-700 border-green-200 dark:bg-green-950 dark:text-green-300 dark:border-green-800'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950 dark:text-emerald-300 dark:border-emerald-800'
      case 'inactive':
        return 'bg-muted text-muted-foreground border-border'
      case 'suspended':
        return 'bg-red-50 text-red-700 border-red-200 dark:bg-red-950 dark:text-red-300 dark:border-red-800'
      default:
        return 'bg-muted text-muted-foreground border-border'
    }
  }
  
  const getBalanceColor = (balance) => {
    // RED: When balance > 0 (client OWES you money - you need to TAKE from them)
    if (balance > 0) return 'text-red-600 dark:text-red-400'
    // GREEN: When balance < 0 (you OWE client money - you need to GIVE to them)
    if (balance < 0) return 'text-green-600 dark:text-green-400'
    return 'text-muted-foreground'
  }

  // CRUD Operations
  const handleCreateUser = async () => {
    try {
      if (!newUserForm.name) {
        toast.error('Name is required')
        return
      }
      
      // Only validate password confirmation if password is provided
      if (newUserForm.password && newUserForm.password !== newUserForm.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      
      // Only validate password length if password is provided
      if (newUserForm.password && newUserForm.password.length < 6) {
        toast.error('Password must be at least 6 characters long')
        return
      }
      
      const userData = {
        name: newUserForm.name.trim(),
        role: newUserForm.role,
        permissions: newUserForm.permissions
      }
      
      // Only include fields if they have actual values
      if (newUserForm.email && newUserForm.email.trim()) {
        userData.email = newUserForm.email.trim()
      }
      
      if (newUserForm.password && newUserForm.password.trim()) {
        userData.password = newUserForm.password
      }
      
      if (newUserForm.company && newUserForm.company.trim()) {
        userData.company = newUserForm.company.trim()
      }
      
      if (newUserForm.phone && newUserForm.phone.trim()) {
        userData.phone = newUserForm.phone.trim()
      }
      
      // Handle address - only include if any address field has a value
      const hasAddressData = newUserForm.address && (
        newUserForm.address.street?.trim() ||
        newUserForm.address.city?.trim() ||
        newUserForm.address.state?.trim() ||
        newUserForm.address.country?.trim() ||
        newUserForm.address.zipCode?.trim()
      )
      
      if (hasAddressData) {
        userData.address = {
          street: newUserForm.address.street?.trim() || '',
          city: newUserForm.address.city?.trim() || '',
          state: newUserForm.address.state?.trim() || '',
          country: newUserForm.address.country?.trim() || 'India',
          zipCode: newUserForm.address.zipCode?.trim() || ''
        }
      }
      
      await axios.post('/api/users', userData)
      toast.success('User created successfully!')
      setShowAddModal(false)
      resetNewUserForm()
      // Navigate to page 1 to show the newly created user
      setCurrentPage(1)
      fetchUsers(1)
    } catch (error) {
      console.error('Create user error:', error)
      
      // Handle validation errors specifically
      if (error.response?.status === 400 && error.response?.data?.errors) {
        const validationErrors = error.response.data.errors
        const errorMessages = validationErrors.map(err => err.msg).join(', ')
        toast.error(`Validation failed: ${errorMessages}`)
      } else {
        toast.error(error.response?.data?.message || 'Failed to create user')
      }
    }
  }
  
  const handleUpdateUser = async () => {
    try {
      if (!editForm.name) {
        toast.error('Name is required')
        return
      }
      
      await axios.put(`/api/users/${selectedUser._id}`, editForm)
      toast.success('User updated successfully!')
      setShowEditModal(false)
      // Stay on current page for edits since user should still be visible
      fetchUsers(currentPage)
    } catch (error) {
      console.error('Update user error:', error)
      toast.error(error.response?.data?.message || 'Failed to update user')
    }
  }

  const handleDeleteUser = async (userId) => {
    if (!window.confirm('Are you sure you want to delete this user? This action cannot be undone.')) {
      return
    }
    
    try {
      await axios.delete(`/api/users/${userId}`)
      toast.success('User deleted successfully')
      // If we're on a page > 1 and this might have been the last user on this page,
      // we might need to go back a page. Let the backend handle pagination correctly.
      fetchUsers(currentPage)
    } catch (error) {
      console.error('Delete user error:', error)
      
      // Handle specific error cases
      if (error.response?.status === 400 && error.response?.data?.message?.includes('Invalid user ID format')) {
        toast.error('Cannot delete demo user - Invalid user ID format')
      } else {
        toast.error(error.response?.data?.message || 'Failed to delete user')
      }
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    const action = newStatus === 'active' ? 'activate' : 'deactivate'
    
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) {
      return
    }
    
    try {
      await axios.patch(`/api/users/${userId}`, { status: newStatus })
      toast.success(`User ${action}d successfully`)
      // Stay on current page for status changes
      fetchUsers(currentPage)
    } catch (error) {
      console.error('Toggle user status error:', error)
      toast.error(error.response?.data?.message || 'Failed to update user status')
    }
  }

  const handleExportUsers = () => {
    try {
      // Enhanced CSV data with payment and container information
      const csvData = filteredUsers.map(user => ({
        'User ID': user._id,
        'Name': user.name,
        'Email': user.email,
        'Role': user.role,
        'Status': user.status,
        'Company': user.company || 'N/A',
        'Phone': user.phone || 'N/A',
        'Client ID': user.clientId || 'N/A',
        'Orders Count': user.ordersCount || 0,
        'Total Spent': formatCurrency(user.totalSpent || 0),
        'Container Count': user.containerCount || 0,
        'Account Balance INR': formatCurrency(user.accountBalance?.INR || 0),
        'Account Balance USD': formatCurrency(user.accountBalance?.USD || 0),
        'Address': user.address ? `${user.address.street}, ${user.address.city}, ${user.address.state}, ${user.address.country}` : 'N/A',
        'Last Login': user.lastLogin ? new Date(user.lastLogin).toLocaleDateString() : 'Never',
        'Last Order': user.lastOrderDate ? new Date(user.lastOrderDate).toLocaleDateString() : 'None',
        'Created Date': new Date(user.createdAt).toLocaleDateString()
      }))

      if (csvData.length === 0) {
        toast.error('No users to export')
        return
      }

      // Convert to CSV
      const headers = Object.keys(csvData[0] || {})
      const csvContent = [
        headers.join(','),
        ...csvData.map(row => 
          headers.map(header => {
            const value = row[header] || ''
            return typeof value === 'string' && (value.includes(',') || value.includes('"')) 
              ? `"${value.replace(/"/g, '""')}"` 
              : value
          }).join(',')
        )
      ].join('\n')

      // Create and download file
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' })
      const link = document.createElement('a')
      link.href = URL.createObjectURL(blob)
      link.download = `users-comprehensive-${new Date().toISOString().split('T')[0]}.csv`
      link.style.display = 'none'
      document.body.appendChild(link)
      link.click()
      document.body.removeChild(link)
      URL.revokeObjectURL(link.href)
      
      toast.success(`Exported ${filteredUsers.length} users with comprehensive data`)
    } catch (error) {
      console.error('Export failed:', error)
      toast.error('Failed to export users')
    }
  }
  
  const handleAddUser = () => {
    resetNewUserForm()
    setShowAddModal(true)
  }

  const handleViewUser = (user) => {
    console.log('Viewing user:', user) // Debug log
    console.log('User address for viewing:', user.address) // Debug address specifically
    setSelectedUser(user)
    setShowDetailsModal(true)
  }

  const handleEditUser = (user) => {
    console.log('Editing user:', user) // Debug log
    console.log('User address:', user.address) // Debug address specifically
    setSelectedUser(user)
    
    // Safely handle address with proper fallbacks
    const userAddress = user.address || {}
    console.log('Processed address:', userAddress) // Debug processed address
    
    setEditForm({
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'client',
      company: user.company || '',
      phone: user.phone || '',
      address: {
        street: userAddress.street || '',
        city: userAddress.city || '',
        state: userAddress.state || '',
        country: userAddress.country || 'India',
        zipCode: userAddress.zipCode || ''
      },
      permissions: user.permissions || []
    })
    
    console.log('Edit form set to:', {
      name: user.name || '',
      email: user.email || '',
      role: user.role || 'client',
      company: user.company || '',
      phone: user.phone || '',
      address: {
        street: userAddress.street || '',
        city: userAddress.city || '',
        state: userAddress.state || '',
        country: userAddress.country || 'India',
        zipCode: userAddress.zipCode || ''
      },
      permissions: user.permissions || []
    }) // Debug final form
    
    setShowEditModal(true)
  }

  const handleChangePassword = (user) => {
    setSelectedUser(user)
    setPasswordForm({
      newPassword: '',
      confirmPassword: ''
    })
    // Reset password visibility states
    setShowChangePassword(false)
    setShowChangeConfirmPassword(false)
    setShowPasswordModal(true)
  }

  const handleUpdatePassword = async () => {
    try {
      if (!passwordForm.newPassword || !passwordForm.confirmPassword) {
        toast.error('Please fill in all password fields')
        return
      }
      
      if (passwordForm.newPassword !== passwordForm.confirmPassword) {
        toast.error('Passwords do not match')
        return
      }
      
      if (passwordForm.newPassword.length < 6) {
        toast.error('Password must be at least 6 characters long')
        return
      }
      
      await axios.patch(`/api/users/${selectedUser._id}/password`, {
        newPassword: passwordForm.newPassword
      })
      
      toast.success('Password updated successfully!')
      setShowPasswordModal(false)
      setPasswordForm({ newPassword: '', confirmPassword: '' })
      // Reset password visibility states
      setShowChangePassword(false)
      setShowChangeConfirmPassword(false)
    } catch (error) {
      console.error('Update password error:', error)
      toast.error(error.response?.data?.message || 'Failed to update password')
    }
  }

  // Selection and bulk operations
  const handleSelectUser = (userId, checked) => {
    if (checked) {
      setSelectedUsers(prev => [...prev, userId])
    } else {
      setSelectedUsers(prev => prev.filter(id => id !== userId))
      setSelectAll(false)
    }
  }

  const handleSelectAll = (checked) => {
    if (checked) {
      setSelectedUsers(filteredUsers.map(user => user._id))
      setSelectAll(true)
    } else {
      setSelectedUsers([])
      setSelectAll(false)
    }
  }

  const handleBulkAction = async (action) => {
    if (selectedUsers.length === 0) {
      toast.error('Please select users first')
      return
    }

    const actionText = {
      delete: 'delete',
      activate: 'activate', 
      deactivate: 'deactivate'
    }[action]

    if (!window.confirm(`Are you sure you want to ${actionText} ${selectedUsers.length} selected user(s)?`)) {
      return
    }

    try {
      setBulkActionLoading(true)
      const response = await axios.post('/api/users/bulk-actions', {
        action,
        userIds: selectedUsers
      })

      toast.success(response.data.message)
      setSelectedUsers([])
      setSelectAll(false)
      // Refresh current page after bulk operations
      fetchUsers(currentPage)
    } catch (error) {
      console.error('Bulk action error:', error)
      toast.error(error.response?.data?.message || `Failed to ${actionText} users`)
    } finally {
      setBulkActionLoading(false)
    }
  }

  // Pagination
  const handlePageChange = (page) => {
    if (page >= 1 && page <= totalPages) {
      fetchUsers(page)
    }
  }

  // Form management functions
  const resetNewUserForm = () => {
    setNewUserForm({
      name: '',
      email: '',
      password: '',
      confirmPassword: '',
      role: 'client',
      company: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: 'India',
        zipCode: ''
      },
      permissions: []
    })
    // Reset password visibility states
    setShowNewUserPassword(false)
    setShowNewUserConfirmPassword(false)
  }
  
  const resetEditForm = () => {
    setEditForm({
      name: '',
      email: '',
      role: 'client',
      company: '',
      phone: '',
      address: {
        street: '',
        city: '',
        state: '',
        country: '',
        zipCode: ''
      },
      permissions: []
    })
  }

  // Calculate metrics
  const metrics = {
    totalUsers: totalUsers, // Use actual total from backend
    activeUsers: filteredUsers.filter(u => u.status === 'active').length,
    clientUsers: filteredUsers.filter(u => u.role === 'client').length,
    staffUsers: filteredUsers.filter(u => u.role === 'admin' || u.role === 'staff').length,
    totalOrders: filteredUsers.reduce((sum, u) => sum + (u.ordersCount || 0), 0),
    totalRevenue: filteredUsers.reduce((sum, u) => sum + (u.totalSpent || 0), 0)
  }

  if (loading && users.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="flex items-center space-x-2">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
          <span className="text-lg text-foreground">Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.6 }}
        >
          {/* Header */}
          <div className="flex justify-between items-center mb-8">
            <div className="flex items-center space-x-4">
              <div className="w-12 h-12 bg-primary/10 rounded-xl flex items-center justify-center">
                <UsersIcon className="h-7 w-7 text-primary" />
              </div>
              <div>
                <h1 className="text-3xl font-bold text-foreground">User Management</h1>
                <p className="text-muted-foreground mt-1">Manage system users, permissions, and account details</p>
              </div>
            </div>
            <div className="flex space-x-3">
              <Button variant="outline" onClick={() => fetchUsers(currentPage)} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
              <Button variant="outline" onClick={handleExportUsers}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
              {currentUser?.role === 'admin' && (
                <Button onClick={handleAddUser} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                  <Plus className="h-4 w-4 mr-2" />
                  Add User
                </Button>
              )}
            </div>
          </div>

          {/* Metrics Cards */}
          <div className="grid grid-cols-1 md:grid-cols-6 gap-6 mb-8">
            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <UsersIcon className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Users</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.totalUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-green-500/10 rounded-lg">
                    <UserCheck className="h-5 w-5 text-green-600 dark:text-green-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Active</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.activeUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-emerald-500/10 rounded-lg">
                    <Building className="h-5 w-5 text-emerald-600 dark:text-emerald-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Clients</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.clientUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-purple-500/10 rounded-lg">
                    <Shield className="h-5 w-5 text-purple-600 dark:text-purple-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Staff</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.staffUsers}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-orange-500/10 rounded-lg">
                    <Package className="h-5 w-5 text-orange-600 dark:text-orange-400" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Total Orders</p>
                    <p className="text-2xl font-bold text-foreground">{metrics.totalOrders}</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-0 shadow-sm">
              <CardContent className="p-6">
                <div className="flex items-center">
                  <div className="p-2 bg-primary/10 rounded-lg">
                    <DollarSign className="h-5 w-5 text-primary" />
                  </div>
                  <div className="ml-4">
                    <p className="text-sm font-medium text-muted-foreground">Revenue</p>
                    <p className="text-2xl font-bold text-foreground">{formatCurrency(metrics.totalRevenue)}</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Filters */}
          <Card className="mb-6 border-0 shadow-sm">
            <CardContent className="p-6">
              <div className="flex flex-col sm:flex-row gap-4">
                <div className="flex-1 relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    placeholder="Search users by name, email, company, or client ID..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="pl-10"
                  />
                </div>
                <div className="flex space-x-4">
                  <Select value={roleFilter} onValueChange={setRoleFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by role" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Roles</SelectItem>
                      <SelectItem value="admin">Admin</SelectItem>
                      <SelectItem value="staff">Staff</SelectItem>
                      <SelectItem value="client">Client</SelectItem>
                    </SelectContent>
                  </Select>
                  <Select value={statusFilter} onValueChange={setStatusFilter}>
                    <SelectTrigger className="w-40">
                      <SelectValue placeholder="Filter by status" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All Status</SelectItem>
                      <SelectItem value="active">Active</SelectItem>
                      <SelectItem value="inactive">Inactive</SelectItem>
                      <SelectItem value="suspended">Suspended</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Bulk Operations Bar */}
          {selectedUsers.length > 0 && (
            <Card className="mb-6 border-0 shadow-sm">
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-4">
                    <div className="flex items-center space-x-2">
                      <CheckSquare className="h-5 w-5 text-primary" />
                      <span className="font-medium text-foreground">
                        {selectedUsers.length} user{selectedUsers.length !== 1 ? 's' : ''} selected
                      </span>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setSelectedUsers([])
                        setSelectAll(false)
                      }}
                    >
                      Clear Selection
                    </Button>
                  </div>
                  
                  {currentUser?.role === 'admin' && (
                    <div className="flex items-center space-x-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('activate')}
                        disabled={bulkActionLoading}
                        className="text-green-600 hover:text-green-800 hover:bg-green-500/10"
                      >
                        <UserPlus className="h-4 w-4 mr-2" />
                        Activate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('deactivate')}
                        disabled={bulkActionLoading}
                        className="text-yellow-600 hover:text-yellow-800 hover:bg-yellow-500/10"
                      >
                        <UserMinus className="h-4 w-4 mr-2" />
                        Deactivate
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleBulkAction('delete')}
                        disabled={bulkActionLoading}
                        className="text-red-600 hover:text-red-800 hover:bg-red-500/10"
                      >
                        <Trash className="h-4 w-4 mr-2" />
                        Delete
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Users Table */}
          <Card className="border-0 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-xl font-semibold text-foreground">
                    All Users ({totalUsers}) 
                    {currentPage > 1 && (
                      <span className="text-sm font-normal text-muted-foreground">
                        - Page {currentPage} of {totalPages}
                      </span>
                    )}
                  </CardTitle>
                  <CardDescription className="text-muted-foreground">
                    Manage system users and their permissions
                  </CardDescription>
                </div>
                
                {/* Pagination Controls */}
                {totalPages > 1 && (
                  <div className="flex items-center space-x-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage - 1)}
                      disabled={currentPage === 1 || loading}
                    >
                      <ChevronLeft className="h-4 w-4" />
                      Previous
                    </Button>
                    
                    <div className="flex items-center space-x-1">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        const page = i + 1;
                        if (totalPages <= 5) {
                          return (
                            <Button
                              key={page}
                              variant={currentPage === page ? "default" : "outline"}
                              size="sm"
                              onClick={() => handlePageChange(page)}
                              disabled={loading}
                              className="w-8 h-8 p-0"
                            >
                              {page}
                            </Button>
                          );
                        }
                        // For more than 5 pages, show smart pagination
                        if (currentPage <= 3) {
                          if (page <= 4) {
                            return (
                              <Button
                                key={page}
                                variant={currentPage === page ? "default" : "outline"}
                                size="sm"
                                onClick={() => handlePageChange(page)}
                                disabled={loading}
                                className="w-8 h-8 p-0"
                              >
                                {page}
                              </Button>
                            );
                          } else if (page === 5) {
                            return <span key="ellipsis1" className="px-2">...</span>;
                          }
                        }
                        return null;
                      })}
                      
                      {totalPages > 5 && currentPage > 3 && (
                        <Button
                          variant={currentPage === totalPages ? "default" : "outline"}
                          size="sm"
                          onClick={() => handlePageChange(totalPages)}
                          disabled={loading}
                          className="w-8 h-8 p-0"
                        >
                          {totalPages}
                        </Button>
                      )}
                    </div>
                    
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handlePageChange(currentPage + 1)}
                      disabled={currentPage === totalPages || loading}
                    >
                      Next
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-border">
                      {currentUser?.role === 'admin' && (
                        <th className="text-left py-3 px-4 font-medium text-muted-foreground w-12">
                          <div className="flex items-center">
                            {selectAll ? (
                              <CheckSquare 
                                className="h-4 w-4 text-primary cursor-pointer" 
                                onClick={() => handleSelectAll(false)}
                              />
                            ) : (
                              <Square 
                                className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" 
                                onClick={() => handleSelectAll(true)}
                              />
                            )}
                          </div>
                        </th>
                      )}
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">User</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Contact</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Role</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Status</th>
                      <th className="text-left py-3 px-4 font-medium text-muted-foreground">Company</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Business Stats</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Last Login</th>
                      <th className="text-center py-3 px-4 font-medium text-muted-foreground">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredUsers.map((user, index) => (
                      <motion.tr
                        key={user._id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.3, delay: index * 0.05 }}
                        className="border-b border-border hover:bg-muted/50 transition-colors"
                      >
                        {currentUser?.role === 'admin' && (
                          <td className="py-4 px-4">
                            <div className="flex items-center">
                              {selectedUsers.includes(user._id) ? (
                                <CheckSquare 
                                  className="h-4 w-4 text-primary cursor-pointer" 
                                  onClick={() => handleSelectUser(user._id, false)}
                                />
                              ) : (
                                <Square 
                                  className="h-4 w-4 text-muted-foreground cursor-pointer hover:text-primary" 
                                  onClick={() => handleSelectUser(user._id, true)}
                                />
                              )}
                            </div>
                          </td>
                        )}
                        <td className="py-4 px-4">
                          <div className="flex items-center space-x-3">
                            <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                              <span className="text-primary font-semibold text-sm">
                                {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                              </span>
                            </div>
                            <div>
                              <div className="font-medium text-foreground">{user.name}</div>
                              <div className="text-sm text-muted-foreground">
                                {user.clientId ? `Client: ${user.clientId}` : `ID: ${user._id.slice(-8)}`}
                              </div>
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="space-y-1">
                            <div className="flex items-center text-sm">
                              <Mail className="h-3 w-3 mr-2 text-muted-foreground" />
                              <a href={`mailto:${user.email}`} className="text-primary hover:underline">
                                {user.email}
                              </a>
                            </div>
                            {user.phone && (
                              <div className="flex items-center text-sm">
                                <Phone className="h-3 w-3 mr-2 text-muted-foreground" />
                                <a href={`tel:${user.phone}`} className="text-primary hover:underline">
                                  {user.phone}
                                </a>
                              </div>
                            )}
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="flex items-center justify-center space-x-2">
                            {getRoleIcon(user.role)}
                            <Badge className={getRoleColor(user.role)}>
                              {user.role}
                            </Badge>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          <Badge className={getStatusColor(user.status)}>
                            {user.status}
                          </Badge>
                        </td>
                        <td className="py-4 px-4">
                          <div>
                            <div className="font-medium text-foreground">{user.company || 'N/A'}</div>
                            <div className="text-sm text-muted-foreground">
                              Joined {formatDate(user.createdAt)}
                            </div>
                          </div>
                        </td>
                        <td className="py-4 px-4 text-center">
                          {user.role === 'client' ? (
                            <div className="space-y-1">
                              <div className="text-sm font-medium text-foreground">{user.ordersCount || 0} orders</div>
                              <div className="text-sm text-muted-foreground">{user.containerCount || 0} containers</div>
                              <div className="text-sm font-medium text-muted-foreground">
                                Allocated: {formatCurrency(user.totalSpent || 0)}
                              </div>
                              <div className={`text-sm font-medium ${getBalanceColor(user.accountBalance?.INR || 0)}`}>
                                {(user.accountBalance?.INR || 0) > 0 ? 
                                  `Owes: ${formatCurrency(user.accountBalance?.INR || 0)}` :
                                  (user.accountBalance?.INR || 0) < 0 ? 
                                    `Credit: ${formatCurrency(Math.abs(user.accountBalance?.INR || 0))}` :
                                    'Settled: ₹0'
                                }
                              </div>
                            </div>
                          ) : (
                            <span className="text-sm text-muted-foreground">System User</span>
                          )}
                        </td>
                        <td className="py-4 px-4 text-center">
                          <div className="text-sm text-muted-foreground">
                            {user.lastLogin ? formatDateTime(user.lastLogin) : 'Never'}
                          </div>
                        </td>
                        <td className="py-4 px-4">
                          <div className="flex items-center justify-center space-x-1">
                            <Button 
                              variant="ghost" 
                              size="sm" 
                              onClick={() => handleViewUser(user)}
                              className="text-primary hover:text-primary/80 hover:bg-primary/10"
                              title="View Details"
                            >
                              <Eye className="h-4 w-4" />
                            </Button>
                            {currentUser?.role === 'admin' && (
                              <>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleEditUser(user)}
                                  className="text-green-600 hover:text-green-800 hover:bg-green-500/10 dark:text-green-400 dark:hover:text-green-300"
                                  title="Edit User"
                                >
                                  <Edit className="h-4 w-4" />
                                </Button>
                                <Button 
                                  variant="ghost" 
                                  size="sm" 
                                  onClick={() => handleChangePassword(user)}
                                  className="text-purple-600 hover:text-purple-800 hover:bg-purple-500/10 dark:text-purple-400 dark:hover:text-purple-300"
                                  title="Change Password"
                                >
                                  <Key className="h-4 w-4" />
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleToggleStatus(user._id, user.status)}
                                  className={user.status === 'active' 
                                    ? 'text-yellow-600 hover:text-yellow-800 hover:bg-yellow-500/10 dark:text-yellow-400 dark:hover:text-yellow-300' 
                                    : 'text-green-600 hover:text-green-800 hover:bg-green-500/10 dark:text-green-400 dark:hover:text-green-300'
                                  }
                                  title={user.status === 'active' ? 'Deactivate User' : 'Activate User'}
                                >
                                  {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                                </Button>
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  onClick={() => handleDeleteUser(user._id)}
                                  className="text-red-600 hover:text-red-800 hover:bg-red-500/10 dark:text-red-400 dark:hover:text-red-300"
                                  title="Delete User"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </Button>
                              </>
                            )}
                          </div>
                        </td>
                      </motion.tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Empty State */}
              {filteredUsers.length === 0 && !loading && (
                <div className="text-center py-12">
                  <UsersIcon className="h-16 w-16 text-muted-foreground mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-foreground mb-2">No users found</h3>
                  <p className="text-muted-foreground mb-6">
                    {searchTerm || roleFilter !== 'all' || statusFilter !== 'all' 
                      ? 'Try adjusting your search criteria or filters' 
                      : 'Get started by adding your first user'
                    }
                  </p>
                  <div className="text-xs text-muted-foreground mb-4">
                    Debug info: Page {currentPage}, Total users: {totalUsers}, Fetched: {users.length}, Filtered: {filteredUsers.length}
                  </div>
                  {currentUser?.role === 'admin' && !searchTerm && (
                    <Button onClick={handleAddUser} className="bg-primary hover:bg-primary/90 text-primary-foreground">
                      <Plus className="h-4 w-4 mr-2" />
                      Add First User
                    </Button>
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          {/* Add User Modal */}
          <Dialog open={showAddModal} onOpenChange={setShowAddModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Plus className="h-5 w-5" />
                  Add New User
                </DialogTitle>
                <DialogDescription>
                  Create a new user account with complete profile and permission settings.
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-6">
                <Tabs defaultValue="basic" className="w-full">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="basic">Basic Info</TabsTrigger>
                    <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                    <TabsTrigger value="permissions">Role & Permissions</TabsTrigger>
                  </TabsList>
                  
                  <TabsContent value="basic" className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="add-name">Full Name *</Label>
                        <Input
                          id="add-name"
                          value={newUserForm.name}
                          onChange={(e) => setNewUserForm({...newUserForm, name: e.target.value})}
                          placeholder="Enter full name"
                        />
                      </div>
                      <div>
                        <Label htmlFor="add-email">Email Address</Label>
                        <Input
                          id="add-email"
                          type="email"
                          value={newUserForm.email}
                          onChange={(e) => setNewUserForm({...newUserForm, email: e.target.value})}
                          placeholder="Enter email address (optional)"
                        />
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label htmlFor="add-password">Password</Label>
                        <div className="relative">
                          <Input
                            id="add-password"
                            type={showNewUserPassword ? "text" : "password"}
                            value={newUserForm.password}
                            onChange={(e) => setNewUserForm({...newUserForm, password: e.target.value})}
                            placeholder="Enter password (optional)"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewUserPassword(!showNewUserPassword)}
                          >
                            {showNewUserPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                      <div>
                        <Label htmlFor="add-confirm-password">Confirm Password</Label>
                        <div className="relative">
                          <Input
                            id="add-confirm-password"
                            type={showNewUserConfirmPassword ? "text" : "password"}
                            value={newUserForm.confirmPassword}
                            onChange={(e) => setNewUserForm({...newUserForm, confirmPassword: e.target.value})}
                            placeholder="Confirm password (optional)"
                            className="pr-10"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                            onClick={() => setShowNewUserConfirmPassword(!showNewUserConfirmPassword)}
                          >
                            {showNewUserConfirmPassword ? (
                              <EyeOff className="h-4 w-4 text-muted-foreground" />
                            ) : (
                              <Eye className="h-4 w-4 text-muted-foreground" />
                            )}
                          </Button>
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <Label htmlFor="add-company">Company/Organization</Label>
                      <Input
                        id="add-company"
                        value={newUserForm.company}
                        onChange={(e) => setNewUserForm({...newUserForm, company: e.target.value})}
                        placeholder="Enter company name"
                      />
                    </div>
                    
                    <div className="bg-blue-50 dark:bg-blue-950 p-3 rounded-lg">
                      <p className="text-sm text-blue-700 dark:text-blue-300">
                        <strong>User Creation Tips:</strong>
                      </p>
                      <ul className="text-xs text-blue-600 dark:text-blue-400 mt-1 space-y-1">
                        <li>• Only name and role are required - other fields are optional</li>
                        <li>• If no email provided, user cannot log in until email is added later</li>
                        <li>• If no password provided, user must reset password to log in</li>
                        <li>• Click the eye icon to show/hide password while typing</li>
                        <li>• Users without email/password can be edited later to add credentials</li>
                      </ul>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="contact" className="space-y-4">
                    <div>
                      <Label htmlFor="add-phone">Phone Number</Label>
                      <Input
                        id="add-phone"
                        value={newUserForm.phone}
                        onChange={(e) => setNewUserForm({...newUserForm, phone: e.target.value})}
                        placeholder="Enter phone number"
                      />
                    </div>
                    
                    <div className="space-y-3">
                      <Label>Address</Label>
                      <Input
                        placeholder="Street Address"
                        value={newUserForm.address.street}
                        onChange={(e) => setNewUserForm({...newUserForm, address: {...newUserForm.address, street: e.target.value}})}
                      />
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="City"
                          value={newUserForm.address.city}
                          onChange={(e) => setNewUserForm({...newUserForm, address: {...newUserForm.address, city: e.target.value}})}
                        />
                        <Input
                          placeholder="State"
                          value={newUserForm.address.state}
                          onChange={(e) => setNewUserForm({...newUserForm, address: {...newUserForm.address, state: e.target.value}})}
                        />
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <Input
                          placeholder="Country"
                          value={newUserForm.address.country}
                          onChange={(e) => setNewUserForm({...newUserForm, address: {...newUserForm.address, country: e.target.value}})}
                        />
                        <Input
                          placeholder="ZIP Code"
                          value={newUserForm.address.zipCode}
                          onChange={(e) => setNewUserForm({...newUserForm, address: {...newUserForm.address, zipCode: e.target.value}})}
                        />
                      </div>
                    </div>
                  </TabsContent>
                  
                  <TabsContent value="permissions" className="space-y-4">
                    <div>
                      <Label htmlFor="add-role">User Role</Label>
                      <Select value={newUserForm.role} onValueChange={(value) => setNewUserForm({...newUserForm, role: value})}>
                        <SelectTrigger>
                          <SelectValue placeholder="Select role" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="client">Client</SelectItem>
                          <SelectItem value="staff">Staff</SelectItem>
                          <SelectItem value="admin">Admin</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </TabsContent>
                </Tabs>
                
                <div className="flex justify-end gap-3 pt-4 border-t">
                  <Button variant="outline" onClick={() => setShowAddModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleCreateUser} className="bg-blue-600 hover:bg-blue-700">
                    <Save className="h-4 w-4 mr-2" />
                    Create User
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>

          {/* Edit User Modal */}
          <Dialog open={showEditModal} onOpenChange={setShowEditModal}>
            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Edit className="h-5 w-5" />
                  Edit User: {selectedUser?.name}
                </DialogTitle>
                <DialogDescription>
                  Update user information, role, and permissions.
                </DialogDescription>
              </DialogHeader>
              
              {selectedUser && (
                <div className="space-y-6">
                  <Tabs defaultValue="basic" className="w-full">
                    <TabsList className="grid w-full grid-cols-3">
                      <TabsTrigger value="basic">Basic Info</TabsTrigger>
                      <TabsTrigger value="contact">Contact & Address</TabsTrigger>
                      <TabsTrigger value="permissions">Role & Permissions</TabsTrigger>
                    </TabsList>
                    
                    <TabsContent value="basic" className="space-y-4">
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-name">Full Name *</Label>
                          <Input
                            id="edit-name"
                            value={editForm.name}
                            onChange={(e) => setEditForm({...editForm, name: e.target.value})}
                            placeholder="Enter full name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-email">Email Address *</Label>
                          <Input
                            id="edit-email"
                            type="email"
                            value={editForm.email}
                            onChange={(e) => setEditForm({...editForm, email: e.target.value})}
                            placeholder="Enter email address"
                          />
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <Label htmlFor="edit-company">Company/Organization</Label>
                          <Input
                            id="edit-company"
                            value={editForm.company}
                            onChange={(e) => setEditForm({...editForm, company: e.target.value})}
                            placeholder="Enter company name"
                          />
                        </div>
                        <div>
                          <Label htmlFor="edit-phone">Phone Number</Label>
                          <Input
                            id="edit-phone"
                            value={editForm.phone}
                            onChange={(e) => setEditForm({...editForm, phone: e.target.value})}
                            placeholder="Enter phone number"
                          />
                        </div>
                      </div>
                    </TabsContent>
                    
                    <TabsContent value="contact" className="space-y-4">
                        <div className="space-y-3">
                          <Label>Address</Label>
                          <Input
                            placeholder="Street Address"
                            value={editForm.address?.street || ''}
                            onChange={(e) => {
                              console.log('Editing street:', e.target.value) // Debug log
                              setEditForm({...editForm, address: {...editForm.address, street: e.target.value}})
                            }}
                          />
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="City"
                              value={editForm.address?.city || ''}
                              onChange={(e) => {
                                console.log('Editing city:', e.target.value) // Debug log
                                setEditForm({...editForm, address: {...editForm.address, city: e.target.value}})
                              }}
                            />
                            <Input
                              placeholder="State"
                              value={editForm.address?.state || ''}
                              onChange={(e) => {
                                console.log('Editing state:', e.target.value) // Debug log
                                setEditForm({...editForm, address: {...editForm.address, state: e.target.value}})
                              }}
                            />
                          </div>
                          <div className="grid grid-cols-2 gap-3">
                            <Input
                              placeholder="Country"
                              value={editForm.address?.country || 'India'}
                              onChange={(e) => {
                                console.log('Editing country:', e.target.value) // Debug log
                                setEditForm({...editForm, address: {...editForm.address, country: e.target.value}})
                              }}
                            />
                            <Input
                              placeholder="ZIP Code"
                              value={editForm.address?.zipCode || ''}
                              onChange={(e) => {
                                console.log('Editing zipCode:', e.target.value) // Debug log
                                setEditForm({...editForm, address: {...editForm.address, zipCode: e.target.value}})
                              }}
                            />
                          </div>
                        </div>
                    </TabsContent>
                    
                    <TabsContent value="permissions" className="space-y-4">
                      <div>
                        <Label htmlFor="edit-role">User Role</Label>
                        <Select value={editForm.role} onValueChange={(value) => setEditForm({...editForm, role: value})}>
                          <SelectTrigger>
                            <SelectValue placeholder="Select role" />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="client">Client</SelectItem>
                            <SelectItem value="staff">Staff</SelectItem>
                            <SelectItem value="admin">Admin</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      
                      <div className="bg-amber-50 dark:bg-amber-950 p-3 rounded-lg">
                        <p className="text-sm text-amber-700 dark:text-amber-300">
                          <strong>Role Change Notice:</strong>
                        </p>
                        <ul className="text-xs text-amber-600 dark:text-amber-400 mt-1 space-y-1">
                          <li>• Changing role affects user permissions and access</li>
                          <li>• Client role: Limited access to own data only</li>
                          <li>• Staff role: Access to operational functions</li>
                          <li>• Admin role: Full system access</li>
                        </ul>
                      </div>
                    </TabsContent>
                  </Tabs>
                  
                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowEditModal(false)}>
                      Cancel
                    </Button>
                    <Button onClick={handleUpdateUser} className="bg-green-600 hover:bg-green-700">
                      <Save className="h-4 w-4 mr-2" />
                      Update User
                    </Button>
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* View Details Modal */}
          <Dialog open={showDetailsModal} onOpenChange={setShowDetailsModal}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Eye className="h-5 w-5" />
                  User Details: {selectedUser?.name}
                </DialogTitle>
                <DialogDescription>
                  Complete user information and statistics
                </DialogDescription>
              </DialogHeader>
              {selectedUser && (
                <div className="space-y-6">
                  {/* Basic Information */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <User className="h-4 w-4" />
                          Basic Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Name</Label>
                          <p className="font-medium">{selectedUser.name}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Role</Label>
                          <div className="flex items-center gap-2">
                            {getRoleIcon(selectedUser.role)}
                            <Badge className={getRoleColor(selectedUser.role)}>
                              {selectedUser.role}
                            </Badge>
                          </div>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Status</Label>
                          <Badge className={getStatusColor(selectedUser.status)}>
                            {selectedUser.status}
                          </Badge>
                        </div>
                        {selectedUser.clientId && (
                          <div>
                            <Label className="text-sm font-medium text-muted-foreground">Client ID</Label>
                            <p className="font-mono text-sm">{selectedUser.clientId}</p>
                          </div>
                        )}
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Created</Label>
                          <p className="text-sm">{formatDate(selectedUser.createdAt)}</p>
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Last Login</Label>
                          <p className="text-sm">{selectedUser.lastLogin ? formatDateTime(selectedUser.lastLogin) : 'Never'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Mail className="h-4 w-4" />
                          Contact Info
                        </CardTitle>
                      </CardHeader>
                      <CardContent className="space-y-3">
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Email</Label>
                          {selectedUser.email ? (
                            <a href={`mailto:${selectedUser.email}`} className="text-primary hover:underline block">
                              {selectedUser.email}
                            </a>
                          ) : (
                            <p className="text-muted-foreground text-sm">No email provided</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Phone</Label>
                          {selectedUser.phone ? (
                            <a href={`tel:${selectedUser.phone}`} className="text-primary hover:underline block">
                              {selectedUser.phone}
                            </a>
                          ) : (
                            <p className="text-muted-foreground text-sm">No phone provided</p>
                          )}
                        </div>
                        <div>
                          <Label className="text-sm font-medium text-muted-foreground">Company</Label>
                          <p className="font-medium">{selectedUser.company || 'No company specified'}</p>
                        </div>
                      </CardContent>
                    </Card>

                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <MapPin className="h-4 w-4" />
                          Address
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        {selectedUser.address && (
                          selectedUser.address.street || selectedUser.address.city || selectedUser.address.state || selectedUser.address.country || selectedUser.address.zipCode
                        ) ? (
                          <div className="space-y-2">
                            {selectedUser.address.street && <p className="text-sm">{selectedUser.address.street}</p>}
                            <p className="text-sm">
                              {[selectedUser.address.city, selectedUser.address.state].filter(Boolean).join(', ')}
                            </p>
                            <p className="text-sm">
                              {[selectedUser.address.country, selectedUser.address.zipCode].filter(Boolean).join(' ')}
                            </p>
                          </div>
                        ) : (
                          <p className="text-muted-foreground text-sm">No address provided</p>
                        )}
                      </CardContent>
                    </Card>
                  </div>

                  {/* Business Statistics for Clients */}
                  {selectedUser.role === 'client' && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <TrendingUp className="h-4 w-4" />
                          Business Statistics
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                          <div className="text-center p-4 bg-blue-50 dark:bg-blue-950 rounded-lg">
                            <Package className="h-6 w-6 mx-auto mb-2 text-blue-600 dark:text-blue-400" />
                            <p className="text-2xl font-bold text-blue-600 dark:text-blue-400">{selectedUser.ordersCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Orders</p>
                          </div>
                          <div className="text-center p-4 bg-green-50 dark:bg-green-950 rounded-lg">
                            <Container className="h-6 w-6 mx-auto mb-2 text-green-600 dark:text-green-400" />
                            <p className="text-2xl font-bold text-green-600 dark:text-green-400">{selectedUser.containerCount || 0}</p>
                            <p className="text-sm text-muted-foreground">Containers</p>
                          </div>
                          <div className="text-center p-4 bg-purple-50 dark:bg-purple-950 rounded-lg">
                            <DollarSign className="h-6 w-6 mx-auto mb-2 text-purple-600 dark:text-purple-400" />
                            <p className="text-lg font-bold text-purple-600 dark:text-purple-400">
                              {formatCurrency(selectedUser.totalSpent || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Total Spent</p>
                          </div>
                          <div className="text-center p-4 bg-orange-50 dark:bg-orange-950 rounded-lg">
                            <CreditCard className="h-6 w-6 mx-auto mb-2 text-orange-600 dark:text-orange-400" />
                            <p className={`text-lg font-bold ${getBalanceColor(selectedUser.accountBalance?.INR || 0)}`}>
                              {formatCurrency(selectedUser.accountBalance?.INR || 0)}
                            </p>
                            <p className="text-sm text-muted-foreground">Balance (INR)</p>
                          </div>
                        </div>
                        {selectedUser.lastOrderDate && (
                          <div className="mt-4 p-3 bg-muted rounded-lg">
                            <p className="text-sm text-muted-foreground">
                              <Clock className="h-4 w-4 inline mr-2" />
                              Last Order: {formatDateTime(selectedUser.lastOrderDate)}
                            </p>
                          </div>
                        )}
                      </CardContent>
                    </Card>
                  )}

                  {/* Permissions */}
                  {selectedUser.permissions && selectedUser.permissions.length > 0 && (
                    <Card>
                      <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                          <Key className="h-4 w-4" />
                          Permissions
                        </CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="flex flex-wrap gap-2">
                          {selectedUser.permissions.map((permission, index) => (
                            <Badge key={index} variant="outline" className="text-xs">
                              {permission.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())}
                            </Badge>
                          ))}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <div className="flex justify-end gap-3 pt-4 border-t">
                    <Button variant="outline" onClick={() => setShowDetailsModal(false)}>
                      Close
                    </Button>
                    {currentUser?.role === 'admin' && (
                      <Button onClick={() => {
                        setShowDetailsModal(false)
                        handleEditUser(selectedUser)
                      }} className="bg-blue-600 hover:bg-blue-700">
                        <Edit className="h-4 w-4 mr-2" />
                        Edit User
                      </Button>
                    )}
                  </div>
                </div>
              )}
            </DialogContent>
          </Dialog>

          {/* Change Password Modal */}
          <Dialog open={showPasswordModal} onOpenChange={setShowPasswordModal}>
            <DialogContent className="max-w-md">
              <DialogHeader>
                <DialogTitle className="flex items-center gap-2">
                  <Key className="h-5 w-5" />
                  Change Password
                </DialogTitle>
                <DialogDescription>
                  Set a new password for {selectedUser?.name}
                </DialogDescription>
              </DialogHeader>
              
              <div className="space-y-4">
                <div>
                  <Label htmlFor="new-password">New Password *</Label>
                  <div className="relative">
                    <Input
                      id="new-password"
                      type={showChangePassword ? "text" : "password"}
                      value={passwordForm.newPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, newPassword: e.target.value})}
                      placeholder="Enter new password (min 6 characters)"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowChangePassword(!showChangePassword)}
                    >
                      {showChangePassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div>
                  <Label htmlFor="confirm-password">Confirm Password *</Label>
                  <div className="relative">
                    <Input
                      id="confirm-password"
                      type={showChangeConfirmPassword ? "text" : "password"}
                      value={passwordForm.confirmPassword}
                      onChange={(e) => setPasswordForm({...passwordForm, confirmPassword: e.target.value})}
                      placeholder="Confirm new password"
                      className="pr-10"
                    />
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="absolute right-0 top-0 h-full px-3 py-2 hover:bg-transparent"
                      onClick={() => setShowChangeConfirmPassword(!showChangeConfirmPassword)}
                    >
                      {showChangeConfirmPassword ? (
                        <EyeOff className="h-4 w-4 text-muted-foreground" />
                      ) : (
                        <Eye className="h-4 w-4 text-muted-foreground" />
                      )}
                    </Button>
                  </div>
                </div>
                
                <div className="bg-primary/10 p-3 rounded-lg">
                  <p className="text-sm text-foreground">
                    <strong>Password Requirements:</strong>
                  </p>
                  <ul className="text-xs text-muted-foreground mt-1 space-y-1">
                    <li>• Minimum 6 characters long</li>
                    <li>• User will need to login again with new password</li>
                    <li>• Click the eye icon to show/hide password</li>
                  </ul>
                </div>
                
                <div className="flex justify-end gap-3 pt-4 border-t border-border">
                  <Button variant="outline" onClick={() => setShowPasswordModal(false)}>
                    Cancel
                  </Button>
                  <Button onClick={handleUpdatePassword} className="bg-purple-600 hover:bg-purple-700 text-white dark:bg-purple-600 dark:hover:bg-purple-700">
                    <Save className="h-4 w-4 mr-2" />
                    Update Password
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </motion.div>
      </div>
    </div>
  )
}

export default Users