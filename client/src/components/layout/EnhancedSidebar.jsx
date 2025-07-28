import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import {
  LayoutDashboard,
  Package,
  Warehouse,
  Container,
  DollarSign,
  Users,
  Settings,
  LogOut,
  ChevronLeft,
  ChevronRight,
  Pin,
  PinOff,
  Palette,
  Monitor,
  Sun,
  Moon,
  User,
  Maximize2,
  Minimize2
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

/**
 * Enhanced Professional Sidebar Component
 * Features: Responsive design, theme support, animations, accessibility
 */
const EnhancedSidebar = ({ navigation, onLogout }) => {
  const location = useLocation()
  const { user } = useAuthStore()
  const {
    sidebarCollapsed,
    sidebarPinned,
    sidebarStyle,
    isDark,
    theme,
    setSidebarCollapsed,
    setSidebarPinned,
    toggleSidebar,
    toggleTheme,
    getResponsiveSidebarState
  } = useThemeStore()

  const [isHovered, setIsHovered] = useState(false)
  const [showExpandButton, setShowExpandButton] = useState(false)

  // Simple collapsed state
  const isCollapsed = sidebarCollapsed

  // Update navigation with current state
  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: location.pathname === item.href
  }))



  return (
    <div
      className={cn(
        "sidebar-container fixed inset-y-0 left-0 z-50 flex flex-col border-r shadow-lg transition-all duration-300",
        sidebarStyle === 'glass' && "sidebar-glass",
        sidebarStyle === 'minimal' && "bg-white/95 backdrop-blur-sm",
        isCollapsed ? "w-16" : "w-64"
      )}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Section */}
      <div className="sidebar-brand relative">
        <div className="sidebar-brand-icon">
          <Container className="h-6 w-6 text-white" />
        </div>
        {!isCollapsed && (
          <span className="text-xl font-bold truncate">Logistics OMS</span>
        )}

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg transition-all duration-200"
          aria-label={isCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {isCollapsed ? (
            <ChevronRight className="h-3 w-3" />
          ) : (
            <ChevronLeft className="h-3 w-3" />
          )}
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
        {updatedNavigation.map((item) => (
          <Link
            key={item.name}
            to={item.href}
            className={cn(
              "sidebar-nav-item group",
              item.current && "active",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? item.name : ''}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0",
              !isCollapsed && "mr-3"
            )} />

            {!isCollapsed && (
              <span className="truncate">{item.name}</span>
            )}

            {/* Tooltip for collapsed state */}
            {isCollapsed && (
              <div className="sidebar-tooltip">
                {item.name}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Theme & Settings Section */}
      <div className="px-3 py-2 border-t border-sidebar-border">
        <div className={cn(
          "flex gap-1",
          isCollapsed ? "flex-col" : "flex-row"
        )}>
          {/* Theme Toggle */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className={cn(
              "sidebar-nav-item",
              isCollapsed && "justify-center"
            )}
            title={isCollapsed ? `Switch to ${isDark ? 'light' : 'dark'} mode` : ''}
          >
            {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            {!isCollapsed && (
              <span className="ml-2 text-xs">
                {isDark ? 'Light' : 'Dark'}
              </span>
            )}
          </Button>
        </div>
      </div>

      {/* User Section */}
      <div className="sidebar-user-section">
        <div className={cn(
          "flex items-center mb-3",
          isCollapsed && "justify-center"
        )}>
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-full flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>

          {!isCollapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-sidebar-muted capitalize truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className={cn(
          "space-y-1",
          isCollapsed && "flex flex-col items-center space-y-2"
        )}>
          <Link to="/profile">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "sidebar-nav-item",
                isCollapsed ? "w-auto px-2" : "w-full justify-start"
              )}
              title={isCollapsed ? "Profile" : ''}
            >
              <Settings className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
              {!isCollapsed && <span>Profile</span>}
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className={cn(
              "sidebar-nav-item text-red-600 hover:text-red-700 hover:bg-red-50",
              isCollapsed ? "w-auto px-2" : "w-full justify-start"
            )}
            title={isCollapsed ? "Logout" : ''}
          >
            <LogOut className={cn("h-4 w-4", !isCollapsed && "mr-2")} />
            {!isCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default EnhancedSidebar
