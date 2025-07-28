import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

/**
 * Theme Store - Professional theme and sidebar management
 * Handles dark/light mode, sidebar preferences, and UI customization
 */
const useThemeStore = create(
  persist(
    (set, get) => ({
      // Theme State
      theme: 'light', // 'light' | 'dark' | 'system'
      isDark: false,
      
      // Sidebar State
      sidebarCollapsed: false,
      sidebarPinned: true,
      sidebarStyle: 'modern', // 'modern' | 'glass' | 'minimal'
      sidebarAnimation: true,
      
      // Layout Preferences
      compactMode: false,
      reducedMotion: false,
      highContrast: false,
      
      // Color Scheme
      accentColor: 'blue', // 'blue' | 'purple' | 'green' | 'orange'
      
      // Actions
      setTheme: (theme) => {
        set({ theme })
        get().applyTheme(theme)
      },
      
      toggleTheme: () => {
        const currentTheme = get().theme
        const newTheme = currentTheme === 'light' ? 'dark' : 'light'
        get().setTheme(newTheme)
      },
      
      applyTheme: (theme) => {
        const root = document.documentElement
        
        if (theme === 'system') {
          const systemTheme = window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light'
          root.classList.toggle('dark', systemTheme === 'dark')
          set({ isDark: systemTheme === 'dark' })
        } else {
          root.classList.toggle('dark', theme === 'dark')
          set({ isDark: theme === 'dark' })
        }
      },
      
      // Sidebar Actions
      setSidebarCollapsed: (collapsed) => {
        set({ sidebarCollapsed: collapsed })
        
        // Auto-expand on hover for collapsed sidebar
        if (collapsed && !get().sidebarPinned) {
          get().setSidebarPinned(false)
        }
      },
      
      toggleSidebar: () => {
        const collapsed = !get().sidebarCollapsed
        get().setSidebarCollapsed(collapsed)
      },
      
      setSidebarPinned: (pinned) => {
        set({ sidebarPinned: pinned })
      },
      
      setSidebarStyle: (style) => {
        set({ sidebarStyle: style })
      },
      
      // Layout Actions
      setCompactMode: (compact) => {
        set({ compactMode: compact })
        document.documentElement.classList.toggle('compact-mode', compact)
      },
      
      setReducedMotion: (reduced) => {
        set({ reducedMotion: reduced })
        document.documentElement.classList.toggle('reduce-motion', reduced)
      },
      
      setHighContrast: (contrast) => {
        set({ highContrast: contrast })
        document.documentElement.classList.toggle('high-contrast', contrast)
      },
      
      setAccentColor: (color) => {
        set({ accentColor: color })
        document.documentElement.setAttribute('data-accent', color)
      },
      
      // Responsive Helpers
      getResponsiveSidebarState: () => {
        const width = window.innerWidth
        const { sidebarCollapsed, compactMode } = get()
        
        // Auto-collapse on small screens
        if (width < 1024) {
          return { collapsed: true, overlay: true }
        }
        
        // Laptop mode - smart collapse
        if (width < 1280) {
          return { collapsed: compactMode || sidebarCollapsed, overlay: false }
        }
        
        // Desktop mode - user preference
        return { collapsed: sidebarCollapsed, overlay: false }
      },
      
      // Initialize theme system
      initialize: () => {
        const { theme, compactMode, reducedMotion, highContrast, accentColor } = get()
        
        // Apply theme
        get().applyTheme(theme)
        
        // Apply layout preferences
        document.documentElement.classList.toggle('compact-mode', compactMode)
        document.documentElement.classList.toggle('reduce-motion', reducedMotion)
        document.documentElement.classList.toggle('high-contrast', highContrast)
        document.documentElement.setAttribute('data-accent', accentColor)
        
        // Listen for system theme changes
        if (theme === 'system') {
          const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)')
          mediaQuery.addEventListener('change', (e) => {
            if (get().theme === 'system') {
              get().applyTheme('system')
            }
          })
        }
        
        // Listen for reduced motion preference
        const motionQuery = window.matchMedia('(prefers-reduced-motion: reduce)')
        if (motionQuery.matches && !reducedMotion) {
          get().setReducedMotion(true)
        }
      },
      
      // Reset to defaults
      reset: () => {
        set({
          theme: 'light',
          isDark: false,
          sidebarCollapsed: false,
          sidebarPinned: true,
          sidebarStyle: 'modern',
          sidebarAnimation: true,
          compactMode: false,
          reducedMotion: false,
          highContrast: false,
          accentColor: 'blue'
        })
        get().initialize()
      }
    }),
    {
      name: 'theme-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        theme: state.theme,
        sidebarCollapsed: state.sidebarCollapsed,
        sidebarPinned: state.sidebarPinned,
        sidebarStyle: state.sidebarStyle,
        sidebarAnimation: state.sidebarAnimation,
        compactMode: state.compactMode,
        reducedMotion: state.reducedMotion,
        highContrast: state.highContrast,
        accentColor: state.accentColor
      }),
      version: 1,
      migrate: (persistedState, version) => {
        if (version === 0) {
          return {
            ...persistedState,
            sidebarStyle: 'modern',
            sidebarAnimation: true,
            accentColor: 'blue'
          }
        }
        return persistedState
      }
    }
  )
)

// Initialize theme system on store creation
try {
  useThemeStore.getState().initialize()
} catch (error) {
  console.error('Failed to initialize theme store:', error)
}

export { useThemeStore }
