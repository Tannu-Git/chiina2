import React, { useState, useRef, useEffect } from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
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
  Menu,
  X,
  Bell,
  Search,
  User,
  ChevronLeft,
  ChevronRight,
  Sun,
  Moon,
  Monitor
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { useAuthStore } from '@/stores/authStore'
import { useThemeStore } from '@/stores/themeStore'
import ModernSidebar from './SimpleSidebar'
import { cn } from '@/lib/utils'

const DashboardLayout = ({ children }) => {
  const location = useLocation()
  const navigate = useNavigate()
  const { user, logout, hasRole } = useAuthStore()
  const {
    sidebarCollapsed,
    getResponsiveSidebarState,
    theme,
    isDark,
    toggleTheme
  } = useThemeStore()

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [userMenuOpen, setUserMenuOpen] = useState(false)
  const userMenuRef = useRef(null)

  // Simple responsive check
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024)

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024)
    }
    window.addEventListener('resize', handleResize)
    return () => window.removeEventListener('resize', handleResize)
  }, [])

  const navigation = [
    {
      name: 'Dashboard',
      href: '/dashboard',
      icon: LayoutDashboard,
      current: location.pathname === '/dashboard'
    },
    {
      name: 'Orders',
      href: '/orders',
      icon: Package,
      current: location.pathname.startsWith('/orders')
    },
    {
      name: 'Warehouse',
      href: '/warehouse',
      icon: Warehouse,
      current: location.pathname.startsWith('/warehouse'),
      roles: ['admin', 'staff']
    },
    {
      name: 'Containers',
      href: '/containers',
      icon: Container,
      current: location.pathname.startsWith('/containers')
    },
    {
      name: 'Financials',
      href: '/financials',
      icon: DollarSign,
      current: location.pathname.startsWith('/financials'),
      roles: ['admin']
    },
    {
      name: 'Users',
      href: '/admin/users',
      icon: Users,
      current: location.pathname.startsWith('/admin/users'),
      roles: ['admin']
    }
  ]

  const filteredNavigation = navigation.filter(item => {
    if (!item.roles) return true
    return item.roles.includes(user?.role)
  })

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  // Close user menu when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (userMenuRef.current && !userMenuRef.current.contains(event.target)) {
        setUserMenuOpen(false)
      }
    }

    document.addEventListener('mousedown', handleClickOutside)
    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [])

  return (
    <div className="min-h-screen bg-background transition-colors duration-300">
      {/* Desktop Sidebar */}
      {!isMobile && (
        <ModernSidebar
          navigation={filteredNavigation}
          onLogout={handleLogout}
        />
      )}

      {/* Mobile sidebar backdrop */}
      {isMobile && (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 z-40"
            >
              <div
                className="fixed inset-0 bg-black/50 backdrop-blur-sm"
                onClick={() => setMobileMenuOpen(false)}
              />
            </motion.div>
          )}
        </AnimatePresence>
      )}

      {/* Mobile sidebar */}
      {isMobile && (
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', stiffness: 300, damping: 30 }}
              className="fixed inset-y-0 left-0 z-50 w-72 sidebar-container shadow-2xl"
            >
              <div className="flex items-center justify-between h-16 px-4 border-b border-sidebar-border">
                <div className="flex items-center">
                  <div className="sidebar-brand-icon">
                    <Container className="h-6 w-6 text-white" />
                  </div>
                  <span className="text-xl font-bold">Logistics OMS</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(false)}
                  aria-label="Close mobile menu"
                  className="text-sidebar-muted hover:text-sidebar-foreground"
                >
                  <X className="h-5 w-5" />
                </Button>
              </div>

              <nav className="flex-1 px-4 py-6 space-y-2 overflow-y-auto">
                {filteredNavigation.map((item) => (
                  <Link
                    key={item.name}
                    to={item.href}
                    onClick={() => setMobileMenuOpen(false)}
                    className={cn(
                      'sidebar-nav-item group',
                      item.current && 'active'
                    )}
                  >
                    <item.icon className="mr-3 h-5 w-5" />
                    {item.name}
                  </Link>
                ))}
              </nav>

              {/* Mobile Theme Toggle */}
              <div className="px-4 py-4 border-t border-sidebar-border">
                <Button
                  variant="ghost"
                  onClick={toggleTheme}
                  className="sidebar-nav-item w-full justify-start"
                >
                  {isDark ? <Sun className="mr-3 h-5 w-5" /> : <Moon className="mr-3 h-5 w-5" />}
                  Switch to {isDark ? 'Light' : 'Dark'} Mode
                </Button>
              </div>

              {/* Mobile User Section */}
              <div className="sidebar-user-section">
                <div className="flex items-center mb-4">
                  <div className="amber-gradient p-2 rounded-full mr-3">
                    <User className="h-5 w-5 text-white" />
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium truncate">{user?.name}</p>
                    <p className="text-xs text-sidebar-muted capitalize">{user?.role}</p>
                  </div>
                </div>
                <div className="space-y-2">
                  <Link to="/profile" onClick={() => setMobileMenuOpen(false)}>
                    <Button variant="ghost" className="sidebar-nav-item w-full justify-start">
                      <Settings className="mr-3 h-4 w-4" />
                      Profile
                    </Button>
                  </Link>
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setMobileMenuOpen(false)
                      handleLogout()
                    }}
                    className="sidebar-nav-item w-full justify-start text-red-600 hover:text-red-700 hover:bg-red-50"
                  >
                    <LogOut className="mr-3 h-4 w-4" />
                    Logout
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      )}



      {/* Main content */}
      <div className={cn(
        "transition-all duration-300",
        isMobile ? "pl-0" : sidebarCollapsed ? "pl-20" : "pl-64"
      )}>
        {/* Top bar */}
        <div className="sticky top-0 z-30 bg-background/80 backdrop-blur-md border-b border-border shadow-sm">
          <div className="flex items-center justify-between h-16 px-4 sm:px-6 lg:px-8">
            <div className="flex items-center">
              {/* Mobile menu button */}
              {isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => setMobileMenuOpen(true)}
                  aria-label="Open mobile menu"
                  className="mr-2"
                >
                  <Menu className="h-5 w-5" />
                </Button>
              )}

              {/* Page Title or Breadcrumb */}
              <div className="flex items-center">
                <h1 className="text-lg font-semibold text-foreground">
                  {filteredNavigation.find(item => item.current)?.name || 'Dashboard'}
                </h1>
              </div>

              {/* Search */}
              <div className="hidden md:block ml-6">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="text"
                    placeholder="Search orders, containers..."
                    className="pl-10 w-64 bg-background/50 border-border"
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-3">
              {/* Theme Toggle (Desktop) */}
              {!isMobile && (
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={toggleTheme}
                  className="text-muted-foreground hover:text-foreground"
                  title={`Switch to ${isDark ? 'light' : 'dark'} mode`}
                >
                  {isDark ? <Sun className="h-5 w-5" /> : <Moon className="h-5 w-5" />}
                </Button>
              )}

              {/* Notifications */}
              <Button variant="ghost" size="icon" className="relative text-muted-foreground hover:text-foreground" aria-label="Notifications">
                <Bell className="h-5 w-5" />
                <span className="absolute top-1 right-1 h-2 w-2 bg-red-500 rounded-full"></span>
              </Button>

              {/* User menu */}
              <div className="relative" ref={userMenuRef}>
                <button
                  onClick={() => setUserMenuOpen(!userMenuOpen)}
                  className="flex items-center space-x-2 p-2 rounded-lg hover:bg-accent transition-colors"
                  aria-label="User menu"
                >
                  <div className="w-8 h-8 amber-gradient rounded-full flex items-center justify-center">
                    <span className="text-white font-semibold text-sm">
                      {user?.name?.split(' ').map(n => n[0]).join('').toUpperCase() || 'U'}
                    </span>
                  </div>
                  <div className="hidden lg:block text-left">
                    <p className="text-sm font-medium text-foreground">{user?.name}</p>
                    <p className="text-xs text-muted-foreground capitalize">{user?.role}</p>
                  </div>
                  <ChevronRight className={cn(
                    "hidden lg:block h-4 w-4 transition-transform text-muted-foreground",
                    userMenuOpen && "rotate-90"
                  )} />
                </button>

                {/* Dropdown menu */}
                <AnimatePresence>
                  {userMenuOpen && (
                    <motion.div
                      initial={{ opacity: 0, y: -10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: -10, scale: 0.95 }}
                      transition={{ type: "spring", stiffness: 300, damping: 30 }}
                      className="absolute right-0 mt-2 w-56 bg-background/95 backdrop-blur-md rounded-lg shadow-xl border border-border py-2 z-50"
                    >
                      <div className="px-4 py-3 border-b border-border">
                        <p className="text-sm font-medium text-foreground">{user?.name}</p>
                        <p className="text-xs text-muted-foreground">{user?.email}</p>
                      </div>

                      <div className="py-2">
                        <Link
                          to="/profile"
                          className="flex items-center px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                          onClick={() => setUserMenuOpen(false)}
                        >
                          <Settings className="mr-3 h-4 w-4" />
                          Profile Settings
                        </Link>

                        <button
                          onClick={toggleTheme}
                          className="flex items-center w-full px-4 py-2 text-sm text-foreground hover:bg-accent transition-colors"
                        >
                          {isDark ? <Sun className="mr-3 h-4 w-4" /> : <Moon className="mr-3 h-4 w-4" />}
                          Switch to {isDark ? 'Light' : 'Dark'} Mode
                        </button>
                      </div>

                      <div className="border-t border-border pt-2">
                        <button
                          onClick={() => {
                            setUserMenuOpen(false)
                            handleLogout()
                          }}
                          className="flex items-center w-full px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-950 transition-colors"
                        >
                          <LogOut className="mr-3 h-4 w-4" />
                          Logout
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </div>

        {/* Page content */}
        <main className="flex-1">
          <div className="py-6">
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}

export default DashboardLayout
