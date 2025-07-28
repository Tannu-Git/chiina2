import React from 'react'
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
  Sun,
  Moon,
  User
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

const SimpleSidebar = ({ navigation, onLogout }) => {
  const location = useLocation()
  const { user } = useAuthStore()
  const {
    sidebarCollapsed,
    isDark,
    toggleSidebar,
    toggleTheme
  } = useThemeStore()

  // Update navigation with current state
  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: location.pathname === item.href
  }))

  return (
    <div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-white border-r border-gray-200 shadow-lg transition-all duration-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}
    >
      {/* Brand Section */}
      <div className="flex items-center h-16 px-4 border-b border-gray-200 relative">
        <div className="bg-blue-600 p-2 rounded-lg mr-3">
          <Container className="h-6 w-6 text-white" />
        </div>
        {!sidebarCollapsed && (
          <span className="text-xl font-bold text-gray-900">Logistics OMS</span>
        )}
        
        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-white border border-gray-200 shadow-md hover:shadow-lg"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {sidebarCollapsed ? (
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
              "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors group relative",
              item.current
                ? "bg-blue-50 text-blue-700 border-r-2 border-blue-700"
                : "text-gray-600 hover:bg-gray-50 hover:text-gray-900",
              sidebarCollapsed && "justify-center"
            )}
            title={sidebarCollapsed ? item.name : ''}
          >
            <item.icon className={cn(
              "h-5 w-5 flex-shrink-0",
              !sidebarCollapsed && "mr-3"
            )} />
            
            {!sidebarCollapsed && (
              <span className="truncate">{item.name}</span>
            )}

            {/* Tooltip for collapsed state */}
            {sidebarCollapsed && (
              <div className="absolute left-full ml-3 px-3 py-2 text-xs font-medium rounded-lg opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap z-50 pointer-events-none bg-gray-900 text-white">
                {item.name}
              </div>
            )}
          </Link>
        ))}
      </nav>

      {/* Theme Toggle */}
      <div className="px-3 py-2 border-t border-gray-200">
        <Button
          variant="ghost"
          size="sm"
          onClick={toggleTheme}
          className={cn(
            "flex items-center px-3 py-2.5 text-sm font-medium rounded-lg transition-colors w-full",
            sidebarCollapsed && "justify-center"
          )}
          title={sidebarCollapsed ? `Switch to ${isDark ? 'light' : 'dark'} mode` : ''}
        >
          {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!sidebarCollapsed && (
            <span className="ml-2 text-xs">
              {isDark ? 'Light' : 'Dark'}
            </span>
          )}
        </Button>
      </div>

      {/* User Section */}
      <div className="p-4 border-t border-gray-200">
        <div className={cn(
          "flex items-center mb-3",
          sidebarCollapsed && "justify-center"
        )}>
          <div className="bg-gradient-to-br from-blue-500 to-purple-600 p-2 rounded-full flex-shrink-0">
            <User className="h-5 w-5 text-white" />
          </div>
          
          {!sidebarCollapsed && (
            <div className="ml-3 flex-1 min-w-0">
              <p className="text-sm font-medium text-gray-900 truncate">
                {user?.name || 'User'}
              </p>
              <p className="text-xs text-gray-500 capitalize truncate">
                {user?.role || 'Role'}
              </p>
            </div>
          )}
        </div>

        {/* User Actions */}
        <div className={cn(
          "space-y-1",
          sidebarCollapsed && "flex flex-col items-center space-y-2"
        )}>
          <Link to="/profile">
            <Button
              variant="ghost"
              size="sm"
              className={cn(
                "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors",
                sidebarCollapsed ? "w-auto px-2" : "w-full justify-start"
              )}
              title={sidebarCollapsed ? "Profile" : ''}
            >
              <Settings className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
              {!sidebarCollapsed && <span>Profile</span>}
            </Button>
          </Link>

          <Button
            variant="ghost"
            size="sm"
            onClick={onLogout}
            className={cn(
              "flex items-center px-3 py-2 text-sm font-medium rounded-lg transition-colors text-red-600 hover:text-red-700 hover:bg-red-50",
              sidebarCollapsed ? "w-auto px-2" : "w-full justify-start"
            )}
            title={sidebarCollapsed ? "Logout" : ''}
          >
            <LogOut className={cn("h-4 w-4", !sidebarCollapsed && "mr-2")} />
            {!sidebarCollapsed && <span>Logout</span>}
          </Button>
        </div>
      </div>
    </div>
  )
}

export default SimpleSidebar
