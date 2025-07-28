import React, { useState, useEffect } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { motion, AnimatePresence } from 'framer-motion'
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
  User,
  Menu,
  X
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import { cn } from '@/lib/utils'

/**
 * Unified Modern Sidebar Component
 * Features: Responsive, animated, role-based, theme-aware
 */
const ModernSidebar = ({ navigation, onLogout, className }) => {
  const location = useLocation()
  const { user } = useAuthStore()
  const {
    sidebarCollapsed,
    isDark,
    toggleSidebar,
    toggleTheme
  } = useThemeStore()

  const [isMobile, setIsMobile] = useState(false)
  const [isHovered, setIsHovered] = useState(false)

  // Responsive detection
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1024)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Update navigation with current state
  const updatedNavigation = navigation.map(item => ({
    ...item,
    current: location.pathname === item.href || location.pathname.startsWith(item.href + '/')
  }))

  // Determine if sidebar should be expanded
  const isExpanded = !sidebarCollapsed || isHovered

  return (
    <motion.div
      className={cn(
        "fixed inset-y-0 left-0 z-50 flex flex-col bg-background border-r border-border shadow-xl transition-all duration-300 ease-in-out",
        className
      )}
      initial={false}
      animate={{
        width: isExpanded ? 256 : 80
      }}
      transition={{
        duration: 0.3,
        ease: [0.4, 0.0, 0.2, 1]
      }}
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Brand Section */}
      <div className="flex items-center h-16 px-4 border-b border-border relative">
        <motion.div
          className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-xl shadow-lg"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Container className="h-6 w-6 text-white" />
        </motion.div>

        <AnimatePresence mode="wait">
          {isExpanded && (
            <motion.span
              initial={{ opacity: 0, x: -20, scale: 0.8 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: -20, scale: 0.8 }}
              transition={{
                duration: 0.4,
                ease: [0.4, 0.0, 0.2, 1],
                delay: 0.1
              }}
              className="ml-3 text-xl font-bold text-foreground truncate"
            >
              Logistics OMS
            </motion.span>
          )}
        </AnimatePresence>

        {/* Toggle Button */}
        <Button
          variant="ghost"
          size="icon"
          onClick={toggleSidebar}
          className="absolute -right-3 top-1/2 -translate-y-1/2 w-6 h-6 rounded-full bg-background border border-border shadow-md hover:shadow-lg transition-all duration-200"
          aria-label={sidebarCollapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          <motion.div
            animate={{ rotate: sidebarCollapsed ? 0 : 180 }}
            transition={{
              duration: 0.4,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <ChevronRight className="h-3 w-3" />
          </motion.div>
        </Button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto min-h-0 scrollbar-thin scrollbar-thumb-muted-foreground/20 scrollbar-track-transparent hover:scrollbar-thumb-muted-foreground/40">
        {updatedNavigation.map((item, index) => (
          <motion.div
            key={item.name}
            initial={{ opacity: 0, x: -30 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: index * 0.08,
              duration: 0.5,
              ease: [0.4, 0.0, 0.2, 1]
            }}
          >
            <Link
              to={item.href}
              className={cn(
                "group flex items-center px-3 py-2.5 text-sm font-medium rounded-xl transition-all duration-200 relative overflow-hidden",
                item.current
                  ? "bg-gradient-to-r from-amber-50 to-amber-100 text-amber-900 border border-amber-200 shadow-sm"
                  : "text-muted-foreground hover:bg-accent hover:text-accent-foreground"
              )}
            >
              {/* Active indicator */}
              {item.current && (
                <motion.div
                  layoutId="activeTab"
                  className="absolute inset-0 bg-gradient-to-r from-amber-500/10 to-amber-600/10 rounded-xl"
                  transition={{ type: "spring", bounce: 0.2, duration: 0.6 }}
                />
              )}

              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
                className="relative z-10"
              >
                <item.icon
                  className={cn(
                    "flex-shrink-0 h-5 w-5 transition-colors duration-200",
                    item.current ? "text-amber-600" : "text-muted-foreground group-hover:text-foreground"
                  )}
                  aria-hidden="true"
                />
              </motion.div>

              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -15, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -15, scale: 0.9 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0.0, 0.2, 1],
                      delay: 0.05
                    }}
                    className="ml-3 truncate relative z-10"
                  >
                    {item.name}
                  </motion.span>
                )}
              </AnimatePresence>

              {/* Tooltip for collapsed state */}
              {!isExpanded && (
                <div className="absolute left-full ml-2 px-3 py-2 bg-popover text-popover-foreground text-xs rounded-lg opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none whitespace-nowrap z-50 shadow-lg border">
                  {item.name}
                  <div className="absolute right-full top-1/2 -translate-y-1/2 border-4 border-transparent border-r-popover"></div>
                </div>
              )}
            </Link>
          </motion.div>
        ))}
      </nav>

      {/* Bottom Section */}
      <div className="mt-auto border-t border-border">
        {/* Theme Toggle */}
        <div className="p-3">
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.preventDefault()
              e.stopPropagation()
              toggleTheme()
            }}
            className={cn(
              "flex items-center text-sm font-medium rounded-xl transition-all duration-200 hover:bg-accent",
              isExpanded ? "w-full justify-start px-3 py-2.5" : "w-10 h-10 p-0 justify-center"
            )}
            title={!isExpanded ? `Switch to ${isDark ? 'light' : 'dark'} mode` : ''}
          >
            <motion.div
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
            >
              {isDark ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
            </motion.div>
            <AnimatePresence mode="wait">
              {isExpanded && (
                <motion.span
                  initial={{ opacity: 0, x: -15, scale: 0.9 }}
                  animate={{ opacity: 1, x: 0, scale: 1 }}
                  exit={{ opacity: 0, x: -15, scale: 0.9 }}
                  transition={{
                    duration: 0.4,
                    ease: [0.4, 0.0, 0.2, 1],
                    delay: 0.1
                  }}
                  className="ml-2 text-xs"
                >
                  {isDark ? 'Light Mode' : 'Dark Mode'}
                </motion.span>
              )}
            </AnimatePresence>
          </Button>
        </div>

        {/* User Section */}
        <div className="border-t border-border p-3">
          <AnimatePresence mode="wait">
            {isExpanded && (
              <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.9 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.9 }}
                transition={{
                  duration: 0.5,
                  ease: [0.4, 0.0, 0.2, 1],
                  delay: 0.1
                }}
                className="flex items-center mb-3"
              >
                <motion.div
                  className="bg-gradient-to-br from-amber-500 to-amber-600 p-2 rounded-xl shadow-lg flex-shrink-0"
                  whileHover={{ scale: 1.05 }}
                >
                  <User className="h-5 w-5 text-white" />
                </motion.div>
                <div className="ml-3 flex-1 min-w-0">
                  <p className="text-sm font-medium text-foreground truncate">
                    {user?.name || 'User'}
                  </p>
                  <p className="text-xs text-muted-foreground capitalize truncate">
                    {user?.role || 'Role'}
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* User Actions */}
          <div className={cn(
            "space-y-1",
            !isExpanded && "flex flex-col items-center space-y-2"
          )}>
            <Link
              to="/profile"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <Button
                variant="ghost"
                size="sm"
                className={cn(
                  "flex items-center text-sm font-medium rounded-xl transition-all duration-200 hover:bg-accent",
                  isExpanded ? "w-full justify-start px-3 py-2" : "w-10 h-10 p-0 justify-center"
                )}
                title={!isExpanded ? "Profile" : ''}
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <Settings className="h-4 w-4" />
                </motion.div>
                <AnimatePresence mode="wait">
                  {isExpanded && (
                    <motion.span
                      initial={{ opacity: 0, x: -15, scale: 0.9 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: -15, scale: 0.9 }}
                      transition={{
                        duration: 0.4,
                        ease: [0.4, 0.0, 0.2, 1],
                        delay: 0.05
                      }}
                      className="ml-2"
                    >
                      Profile
                    </motion.span>
                  )}
                </AnimatePresence>
              </Button>
            </Link>

            <Button
              variant="ghost"
              size="sm"
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                if (onLogout) {
                  onLogout()
                }
              }}
              className={cn(
                "flex items-center text-sm font-medium rounded-xl transition-all duration-200 text-destructive hover:text-destructive hover:bg-destructive/10",
                isExpanded ? "w-full justify-start px-3 py-2" : "w-10 h-10 p-0 justify-center"
              )}
              title={!isExpanded ? "Logout" : ''}
            >
              <motion.div
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.95 }}
              >
                <LogOut className="h-4 w-4" />
              </motion.div>
              <AnimatePresence mode="wait">
                {isExpanded && (
                  <motion.span
                    initial={{ opacity: 0, x: -15, scale: 0.9 }}
                    animate={{ opacity: 1, x: 0, scale: 1 }}
                    exit={{ opacity: 0, x: -15, scale: 0.9 }}
                    transition={{
                      duration: 0.4,
                      ease: [0.4, 0.0, 0.2, 1],
                      delay: 0.05
                    }}
                    className="ml-2"
                  >
                    Logout
                  </motion.span>
                )}
              </AnimatePresence>
            </Button>
          </div>
        </div>
      </div>
    </motion.div>
  )
}

export default ModernSidebar
