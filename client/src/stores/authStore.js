import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axios from 'axios'
import toast from 'react-hot-toast'

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

// Add request interceptor for better error handling
axios.interceptors.request.use(
  (config) => {
    // Add timestamp to prevent caching issues
    config.headers['X-Requested-At'] = new Date().toISOString()
    return config
  },
  (error) => {
    return Promise.reject(error)
  }
)

// Add response interceptor for global error handling
axios.interceptors.response.use(
  (response) => response,
  (error) => {
    // Handle network errors
    if (!error.response) {
      toast.error('Network error. Please check your connection.')
      return Promise.reject(error)
    }

    // Handle 401 errors globally
    if (error.response.status === 401) {
      const authStore = useAuthStore.getState()
      if (authStore.isAuthenticated) {
        authStore.logout()
        toast.error('Session expired. Please login again.')
      }
    }

    return Promise.reject(error)
  }
)

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
      lastActivity: null,

      // Clear error
      clearError: () => set({ error: null }),

      // Update last activity
      updateActivity: () => set({ lastActivity: new Date().toISOString() }),

      // Login action
      login: async (credentials) => {
        if (!credentials?.email || !credentials?.password) {
          const error = 'Email and password are required'
          set({ error })
          toast.error(error)
          return { success: false, error }
        }

        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/login', credentials)
          const { token, user } = response.data

          // Validate response data
          if (!token || !user) {
            throw new Error('Invalid response from server')
          }

          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({
            user: {
              ...user,
              // Ensure user object has required properties
              name: user.name || 'Unknown User',
              email: user.email || '',
              role: user.role || 'user',
              permissions: user.permissions || []
            },
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastActivity: new Date().toISOString()
          })

          toast.success(`Welcome back, ${user.name || 'User'}!`)
          return { success: true, user }
        } catch (error) {
          console.error('Login error:', error)
          const message = error.response?.data?.message || error.message || 'Login failed'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Register action
      register: async (userData) => {
        if (!userData?.email || !userData?.password || !userData?.name) {
          const error = 'Name, email and password are required'
          set({ error })
          toast.error(error)
          return { success: false, error }
        }

        set({ isLoading: true, error: null })
        try {
          const response = await axios.post('/api/auth/register', userData)
          const { token, user } = response.data

          // Validate response data
          if (!token || !user) {
            throw new Error('Invalid response from server')
          }

          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({
            user: {
              ...user,
              // Ensure user object has required properties
              name: user.name || 'Unknown User',
              email: user.email || '',
              role: user.role || 'user',
              permissions: user.permissions || []
            },
            token,
            isAuthenticated: true,
            isLoading: false,
            error: null,
            lastActivity: new Date().toISOString()
          })

          toast.success(`Welcome, ${user.name || 'User'}!`)
          return { success: true, user }
        } catch (error) {
          console.error('Registration error:', error)
          const message = error.response?.data?.message || error.message || 'Registration failed'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Logout action
      logout: (showToast = true) => {
        try {
          // Remove token from axios headers
          delete axios.defaults.headers.common['Authorization']

          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            lastActivity: null
          })

          if (showToast) {
            toast.success('Logged out successfully')
          }
        } catch (error) {
          console.error('Logout error:', error)
          // Force logout even if there's an error
          set({
            user: null,
            token: null,
            isAuthenticated: false,
            isLoading: false,
            error: null,
            lastActivity: null
          })
        }
      },

      // Get current user
      getCurrentUser: async () => {
        const { token } = get()
        if (!token) {
          return { success: false, error: 'No token available' }
        }

        try {
          // Set token in headers if it exists
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          const response = await axios.get('/api/auth/me')
          const { user } = response.data

          if (!user) {
            throw new Error('Invalid user data received')
          }

          set({
            user: {
              ...user,
              // Ensure user object has required properties
              name: user.name || 'Unknown User',
              email: user.email || '',
              role: user.role || 'user',
              permissions: user.permissions || []
            },
            isAuthenticated: true,
            error: null,
            lastActivity: new Date().toISOString()
          })
          return { success: true, user }
        } catch (error) {
          console.error('Get current user error:', error)
          // Token is invalid, logout silently
          get().logout(false)
          return { success: false, error: error.message }
        }
      },

      // Update profile
      updateProfile: async (profileData) => {
        if (!profileData) {
          const error = 'Profile data is required'
          set({ error })
          toast.error(error)
          return { success: false, error }
        }

        set({ isLoading: true, error: null })
        try {
          const response = await axios.put('/api/auth/profile', profileData)
          const { user } = response.data

          if (!user) {
            throw new Error('Invalid user data received')
          }

          set({
            user: {
              ...user,
              // Ensure user object has required properties
              name: user.name || 'Unknown User',
              email: user.email || '',
              role: user.role || 'user',
              permissions: user.permissions || []
            },
            isLoading: false,
            error: null,
            lastActivity: new Date().toISOString()
          })

          toast.success('Profile updated successfully')
          return { success: true, user }
        } catch (error) {
          console.error('Update profile error:', error)
          const message = error.response?.data?.message || error.message || 'Profile update failed'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Check permissions
      hasPermission: (permission) => {
        const { user } = get()
        if (!user || !permission) return false
        if (user.role === 'admin') return true
        return Array.isArray(user.permissions) && user.permissions.includes(permission)
      },

      // Check role
      hasRole: (role) => {
        const { user } = get()
        if (!user || !role) return false
        return user.role === role || user.role === 'admin'
      },

      // Check if user is admin
      isAdmin: () => {
        const { user } = get()
        return user?.role === 'admin'
      },

      // Change password
      changePassword: async (passwordData) => {
        if (!passwordData?.currentPassword || !passwordData?.newPassword) {
          const error = 'Current password and new password are required'
          set({ error })
          toast.error(error)
          return { success: false, error }
        }

        set({ isLoading: true, error: null })
        try {
          await axios.put('/api/auth/change-password', passwordData)

          set({ isLoading: false })
          toast.success('Password changed successfully')
          return { success: true }
        } catch (error) {
          console.error('Change password error:', error)
          const message = error.response?.data?.message || error.message || 'Password change failed'
          set({ isLoading: false, error: message })
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Refresh token
      refreshToken: async () => {
        const { token } = get()
        if (!token) return { success: false, error: 'No token to refresh' }

        try {
          const response = await axios.post('/api/auth/refresh', { token })
          const { token: newToken, user } = response.data

          if (!newToken) {
            throw new Error('No token received')
          }

          // Update axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${newToken}`

          set({
            token: newToken,
            user: user || get().user,
            lastActivity: new Date().toISOString()
          })

          return { success: true, token: newToken }
        } catch (error) {
          console.error('Token refresh error:', error)
          // If refresh fails, logout
          get().logout(false)
          return { success: false, error: error.message }
        }
      },

      // Check if session is expired
      isSessionExpired: () => {
        const { lastActivity } = get()
        if (!lastActivity) return false

        const lastActivityTime = new Date(lastActivity).getTime()
        const now = new Date().getTime()
        const sessionTimeout = 24 * 60 * 60 * 1000 // 24 hours in milliseconds

        return (now - lastActivityTime) > sessionTimeout
      },

      // Initialize auth state
      initialize: async () => {
        const { token, getCurrentUser, isSessionExpired, logout } = get()

        if (!token) {
          return { success: false, error: 'No token found' }
        }

        // Check if session is expired
        if (isSessionExpired()) {
          logout(false)
          return { success: false, error: 'Session expired' }
        }

        try {
          const result = await getCurrentUser()
          return result
        } catch (error) {
          console.error('Initialize auth error:', error)
          logout(false)
          return { success: false, error: error.message }
        }
      }
    }),
    {
      name: 'auth-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated,
        lastActivity: state.lastActivity
      }),
      // Add version for migration support
      version: 1,
      migrate: (persistedState, version) => {
        // Handle migration from older versions
        if (version === 0) {
          // Add lastActivity if it doesn't exist
          return {
            ...persistedState,
            lastActivity: new Date().toISOString()
          }
        }
        return persistedState
      }
    }
  )
)

// Initialize auth on app start with error handling
try {
  useAuthStore.getState().initialize()
} catch (error) {
  console.error('Failed to initialize auth store:', error)
}

export { useAuthStore }
