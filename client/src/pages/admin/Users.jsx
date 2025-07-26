import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  Users as UsersIcon,
  Plus,
  Search,
  Filter,
  Eye,
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
  MoreHorizontal
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle, MetricCard } from '@/components/ui/card'
import { SearchInput } from '@/components/ui/input'
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

  // Fetch users
  const fetchUsers = async () => {
    try {
      setLoading(true)
      const response = await axios.get('/api/users')
      setUsers(response.data.users || [])
    } catch (error) {
      console.error('Error fetching users:', error)
      toast.error('Failed to load users')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchUsers()
  }, [])

  // Mock data for demonstration
  const mockUsers = [
    {
      _id: '1',
      name: 'John Smith',
      email: 'john@abctrading.com',
      phone: '+1-555-0123',
      role: 'client',
      status: 'active',
      company: 'ABC Trading Co.',
      lastLogin: '2024-01-20T10:30:00Z',
      createdAt: '2024-01-01T00:00:00Z',
      ordersCount: 23,
      totalSpent: 485000
    },
    {
      _id: '2',
      name: 'Admin User',
      email: 'admin@demo.com',
      phone: '+1-555-0456',
      role: 'admin',
      status: 'active',
      company: 'Logistics OMS',
      lastLogin: '2024-01-21T09:15:00Z',
      createdAt: '2023-12-01T00:00:00Z',
      ordersCount: 0,
      totalSpent: 0
    },
    {
      _id: '3',
      name: 'Sarah Wilson',
      email: 'sarah@fabricworld.com',
      phone: '+1-555-0789',
      role: 'client',
      status: 'active',
      company: 'Fabric World Ltd.',
      lastLogin: '2024-01-19T14:20:00Z',
      createdAt: '2024-01-05T00:00:00Z',
      ordersCount: 18,
      totalSpent: 392000
    },
    {
      _id: '4',
      name: 'Mike Johnson',
      email: 'mike@warehouse.com',
      phone: '+1-555-0321',
      role: 'staff',
      status: 'active',
      company: 'Logistics OMS',
      lastLogin: '2024-01-20T16:45:00Z',
      createdAt: '2023-12-15T00:00:00Z',
      ordersCount: 0,
      totalSpent: 0
    },
    {
      _id: '5',
      name: 'David Chen',
      email: 'david@globallogistics.com',
      phone: '+1-555-0654',
      role: 'client',
      status: 'inactive',
      company: 'Global Logistics Pvt Ltd',
      lastLogin: '2024-01-10T11:30:00Z',
      createdAt: '2023-11-20T00:00:00Z',
      ordersCount: 15,
      totalSpent: 298000
    }
  ]

  const displayUsers = users.length > 0 ? users : mockUsers

  // Filter users
  const filteredUsers = displayUsers.filter(user => {
    const matchesSearch = user.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         user.company?.toLowerCase().includes(searchTerm.toLowerCase())
    const matchesRole = roleFilter === 'all' || user.role === roleFilter
    const matchesStatus = statusFilter === 'all' || user.status === statusFilter
    return matchesSearch && matchesRole && matchesStatus
  })

  const getRoleIcon = (role) => {
    switch (role) {
      case 'admin':
        return <ShieldCheck className="h-4 w-4 text-red-500" />
      case 'staff':
        return <Shield className="h-4 w-4 text-blue-500" />
      case 'client':
        return <UserCheck className="h-4 w-4 text-green-500" />
      default:
        return <UsersIcon className="h-4 w-4 text-gray-500" />
    }
  }

  const getRoleColor = (role) => {
    switch (role) {
      case 'admin':
        return 'bg-red-100 text-red-800'
      case 'staff':
        return 'bg-blue-100 text-blue-800'
      case 'client':
        return 'bg-green-100 text-green-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusColor = (status) => {
    switch (status) {
      case 'active':
        return 'bg-green-100 text-green-800'
      case 'inactive':
        return 'bg-gray-100 text-gray-800'
      case 'suspended':
        return 'bg-red-100 text-red-800'
      default:
        return 'bg-gray-100 text-gray-800'
    }
  }

  const handleDeleteUser = async (userId) => {
    if (window.confirm('Are you sure you want to delete this user?')) {
      try {
        await axios.delete(`/api/users/${userId}`)
        toast.success('User deleted successfully')
        fetchUsers()
      } catch (error) {
        toast.error('Failed to delete user')
      }
    }
  }

  const handleToggleStatus = async (userId, currentStatus) => {
    const newStatus = currentStatus === 'active' ? 'inactive' : 'active'
    try {
      await axios.patch(`/api/users/${userId}`, { status: newStatus })
      toast.success(`User ${newStatus === 'active' ? 'activated' : 'deactivated'} successfully`)
      fetchUsers()
    } catch (error) {
      toast.error('Failed to update user status')
    }
  }

  const handleViewUser = (user) => {
    // Show user details modal or navigate to user profile
    toast.info(`Viewing details for ${user.name}`)
  }

  const handleEditUser = (user) => {
    // Show edit user modal or navigate to edit page
    toast.info(`Editing user ${user.name}`)
  }

  const handleExportUsers = () => {
    // Export users functionality
    toast.success('Users exported successfully!')
  }

  const handleAddUser = () => {
    // Show add user modal or navigate to add user page
    toast.info('Add user functionality will be implemented')
  }

  // Calculate metrics
  const metrics = {
    totalUsers: filteredUsers.length,
    activeUsers: filteredUsers.filter(u => u.status === 'active').length,
    clientUsers: filteredUsers.filter(u => u.role === 'client').length,
    staffUsers: filteredUsers.filter(u => u.role === 'admin' || u.role === 'staff').length
  }

  if (loading && users.length === 0) {
    return (
      <div className="px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-center h-64">
          <div className="loading-spinner mr-2" />
          <span>Loading users...</span>
        </div>
      </div>
    )
  }

  return (
    <div className="px-4 sm:px-6 lg:px-8">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-gray-900">User Management</h1>
            <p className="text-gray-600 mt-2">Manage system users and permissions</p>
          </div>
          <div className="flex space-x-3">
            <Button variant="outline" onClick={fetchUsers}>
              <RefreshCw className="h-4 w-4 mr-2" />
              Refresh
            </Button>
            <Button variant="outline" onClick={handleExportUsers}>
              <Download className="h-4 w-4 mr-2" />
              Export
            </Button>
            {currentUser?.role === 'admin' && (
              <Button variant="gradient" onClick={handleAddUser}>
                <Plus className="h-4 w-4 mr-2" />
                Add User
              </Button>
            )}
          </div>
        </div>

        {/* Metrics */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.1 }}
          >
            <MetricCard
              title="Total Users"
              value={metrics.totalUsers}
              icon={UsersIcon}
              change="+2 this month"
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <MetricCard
              title="Active Users"
              value={metrics.activeUsers}
              icon={UserCheck}
              change={`${((metrics.activeUsers / metrics.totalUsers) * 100).toFixed(1)}% active`}
              changeType="positive"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.3 }}
          >
            <MetricCard
              title="Client Users"
              value={metrics.clientUsers}
              icon={UserCheck}
              change="Revenue generators"
              changeType="neutral"
            />
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, delay: 0.4 }}
          >
            <MetricCard
              title="Staff Users"
              value={metrics.staffUsers}
              icon={Shield}
              change="Admin & Staff"
              changeType="neutral"
            />
          </motion.div>
        </div>

        {/* Filters */}
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="flex-1">
                <SearchInput
                  placeholder="Search users..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                />
              </div>
              <div className="flex space-x-2">
                <select
                  value={roleFilter}
                  onChange={(e) => setRoleFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Roles</option>
                  <option value="admin">Admin</option>
                  <option value="staff">Staff</option>
                  <option value="client">Client</option>
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="all">All Status</option>
                  <option value="active">Active</option>
                  <option value="inactive">Inactive</option>
                  <option value="suspended">Suspended</option>
                </select>
                <Button variant="outline">
                  <Filter className="h-4 w-4 mr-2" />
                  More Filters
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Users Table */}
        <Card>
          <CardHeader>
            <CardTitle>All Users ({filteredUsers.length})</CardTitle>
            <CardDescription>Manage system users and their permissions</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <table className="w-full border-collapse">
                <thead>
                  <tr className="border-b border-gray-200">
                    <th className="excel-header text-left">User</th>
                    <th className="excel-header text-left">Contact</th>
                    <th className="excel-header text-center">Role</th>
                    <th className="excel-header text-center">Status</th>
                    <th className="excel-header text-left">Company</th>
                    <th className="excel-header text-center">Orders</th>
                    <th className="excel-header text-right">Total Spent</th>
                    <th className="excel-header text-center">Last Login</th>
                    <th className="excel-header text-center">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredUsers.map((user, index) => (
                    <motion.tr
                      key={user._id}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.3, delay: index * 0.05 }}
                      className="border-b border-gray-100 hover:bg-gray-50 transition-colors"
                    >
                      <td className="excel-cell">
                        <div className="flex items-center space-x-3">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-full flex items-center justify-center">
                            <span className="text-white font-semibold text-sm">
                              {user.name.split(' ').map(n => n[0]).join('').toUpperCase()}
                            </span>
                          </div>
                          <div>
                            <div className="font-medium text-gray-900">{user.name}</div>
                            <div className="text-sm text-gray-500">ID: {user._id}</div>
                          </div>
                        </div>
                      </td>
                      <td className="excel-cell">
                        <div className="space-y-1">
                          <div className="flex items-center text-sm">
                            <Mail className="h-3 w-3 mr-2 text-gray-400" />
                            <a href={`mailto:${user.email}`} className="text-blue-600 hover:underline">
                              {user.email}
                            </a>
                          </div>
                          {user.phone && (
                            <div className="flex items-center text-sm">
                              <Phone className="h-3 w-3 mr-2 text-gray-400" />
                              <a href={`tel:${user.phone}`} className="text-blue-600 hover:underline">
                                {user.phone}
                              </a>
                            </div>
                          )}
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <div className="flex items-center justify-center">
                          {getRoleIcon(user.role)}
                          <span className={`status-badge ml-2 ${getRoleColor(user.role)}`}>
                            {user.role}
                          </span>
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <span className={`status-badge ${getStatusColor(user.status)}`}>
                          {user.status}
                        </span>
                      </td>
                      <td className="excel-cell">
                        <div className="font-medium text-gray-900">{user.company}</div>
                        <div className="text-sm text-gray-500">
                          Joined {formatDate(user.createdAt)}
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <div className="font-medium">{user.ordersCount}</div>
                        <div className="text-sm text-gray-500">orders</div>
                      </td>
                      <td className="excel-cell text-right">
                        {user.totalSpent > 0 ? (
                          <div>
                            <div className="font-medium">{formatCurrency(user.totalSpent)}</div>
                            <div className="text-sm text-gray-500">lifetime</div>
                          </div>
                        ) : (
                          <span className="text-gray-400">-</span>
                        )}
                      </td>
                      <td className="excel-cell text-center">
                        <div className="text-sm">
                          {formatDateTime(user.lastLogin)}
                        </div>
                      </td>
                      <td className="excel-cell text-center">
                        <div className="flex items-center justify-center space-x-1">
                          <Button variant="ghost" size="sm" onClick={() => handleViewUser(user)}>
                            <Eye className="h-4 w-4" />
                          </Button>
                          {currentUser?.role === 'admin' && (
                            <>
                              <Button variant="ghost" size="sm" onClick={() => handleEditUser(user)}>
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleToggleStatus(user._id, user.status)}
                                className={user.status === 'active' ? 'text-yellow-600 hover:text-yellow-800' : 'text-green-600 hover:text-green-800'}
                              >
                                {user.status === 'active' ? <UserX className="h-4 w-4" /> : <UserCheck className="h-4 w-4" />}
                              </Button>
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={() => handleDeleteUser(user._id)}
                                className="text-red-600 hover:text-red-800"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </>
                          )}
                          <Button variant="ghost" size="sm">
                            <MoreHorizontal className="h-4 w-4" />
                          </Button>
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
                <UsersIcon className="h-16 w-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-lg font-medium text-gray-900 mb-2">No users found</h3>
                <p className="text-gray-500 mb-6">
                  {searchTerm ? 'Try adjusting your search criteria' : 'Get started by adding your first user'}
                </p>
                {currentUser?.role === 'admin' && (
                  <Button variant="gradient">
                    <Plus className="h-4 w-4 mr-2" />
                    Add First User
                  </Button>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        {/* User Statistics */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8">
          {/* Top Clients by Revenue */}
          <Card>
            <CardHeader>
              <CardTitle>Top Clients by Revenue</CardTitle>
              <CardDescription>Highest spending client users</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers
                  .filter(u => u.role === 'client' && u.totalSpent > 0)
                  .sort((a, b) => b.totalSpent - a.totalSpent)
                  .slice(0, 5)
                  .map((client, index) => (
                    <div key={client._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                          <span className="text-sm font-semibold text-green-600">{index + 1}</span>
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{client.name}</p>
                          <p className="text-sm text-gray-500">{client.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-gray-900">{formatCurrency(client.totalSpent)}</p>
                        <p className="text-sm text-gray-500">{client.ordersCount} orders</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>

          {/* Recent Activity */}
          <Card>
            <CardHeader>
              <CardTitle>Recent User Activity</CardTitle>
              <CardDescription>Latest user logins and registrations</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {filteredUsers
                  .sort((a, b) => new Date(b.lastLogin) - new Date(a.lastLogin))
                  .slice(0, 5)
                  .map((user, index) => (
                    <div key={user._id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-blue-100 rounded-full flex items-center justify-center">
                          {getRoleIcon(user.role)}
                        </div>
                        <div>
                          <p className="font-medium text-gray-900">{user.name}</p>
                          <p className="text-sm text-gray-500">{user.role} • {user.company}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-medium text-gray-900">Last login</p>
                        <p className="text-sm text-gray-500">{formatDateTime(user.lastLogin)}</p>
                      </div>
                    </div>
                  ))}
              </div>
            </CardContent>
          </Card>
        </div>
      </motion.div>
    </div>
  )
}

export default Users