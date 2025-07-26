import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'
import axios from 'axios'
import toast from 'react-hot-toast'

// Configure axios defaults
axios.defaults.baseURL = import.meta.env.VITE_API_URL || 'http://localhost:5001'

const useAuthStore = create(
  persist(
    (set, get) => ({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,

      // Login action
      login: async (credentials) => {
        set({ isLoading: true })
        try {
          const response = await axios.post('/api/auth/login', credentials)
          const { token, user } = response.data

          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })

          toast.success(`Welcome back, ${user.name}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Login failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Register action
      register: async (userData) => {
        set({ isLoading: true })
        try {
          const response = await axios.post('/api/auth/register', userData)
          const { token, user } = response.data

          // Set token in axios headers
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          set({
            user,
            token,
            isAuthenticated: true,
            isLoading: false
          })

          toast.success(`Welcome, ${user.name}!`)
          return { success: true }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Registration failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Logout action
      logout: () => {
        // Remove token from axios headers
        delete axios.defaults.headers.common['Authorization']

        set({
          user: null,
          token: null,
          isAuthenticated: false,
          isLoading: false
        })

        toast.success('Logged out successfully')
      },

      // Get current user
      getCurrentUser: async () => {
        const { token } = get()
        if (!token) return

        try {
          // Set token in headers if it exists
          axios.defaults.headers.common['Authorization'] = `Bearer ${token}`

          const response = await axios.get('/api/auth/me')
          const { user } = response.data

          set({ user, isAuthenticated: true })
          return { success: true, user }
        } catch (error) {
          // Token is invalid, logout
          get().logout()
          return { success: false }
        }
      },

      // Update profile
      updateProfile: async (profileData) => {
        set({ isLoading: true })
        try {
          const response = await axios.put('/api/auth/profile', profileData)
          const { user } = response.data

          set({
            user,
            isLoading: false
          })

          toast.success('Profile updated successfully')
          return { success: true, user }
        } catch (error) {
          set({ isLoading: false })
          const message = error.response?.data?.message || 'Profile update failed'
          toast.error(message)
          return { success: false, error: message }
        }
      },

      // Check permissions
      hasPermission: (permission) => {
        const { user } = get()
        if (!user) return false
        if (user.role === 'admin') return true
        return user.permissions?.includes(permission) || false
      },

      // Check role
      hasRole: (role) => {
        const { user } = get()
        if (!user) return false
        return user.role === role || user.role === 'admin'
      },

      // Initialize auth state
      initialize: async () => {
        const { token, getCurrentUser } = get()
        if (token) {
          await getCurrentUser()
        }
      }
    }),
    {
      name: 'auth-storage',
      partialize: (state) => ({
        token: state.token,
        user: state.user,
        isAuthenticated: state.isAuthenticated
      })
    }
  )
)

// Initialize auth on app start
useAuthStore.getState().initialize()

export { useAuthStore }
