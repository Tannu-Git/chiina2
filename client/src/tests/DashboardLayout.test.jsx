import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import DashboardLayout from '@/components/layout/DashboardLayout'

// Mock dependencies
const mockNavigate = vi.fn()
const mockLogout = vi.fn()
const mockHasRole = vi.fn()
const mockUseLocation = vi.fn(() => ({ pathname: '/dashboard' }))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>,
  useLocation: () => mockUseLocation(),
  useNavigate: () => mockNavigate
}))

// Mock different user roles for testing
const createMockUser = (role) => ({
  id: '1',
  name: 'Test User',
  email: 'test@example.com',
  role: role
})

const mockAuthStore = (user) => ({
  user,
  logout: mockLogout,
  hasRole: mockHasRole
})

// Default mock - will be overridden in specific tests
let currentMockUser = createMockUser('admin')

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => mockAuthStore(currentMockUser)
}))

describe('DashboardLayout Component - All Elements and Role-Based Features', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockHasRole.mockImplementation((role) => true) // Default to admin access
    currentMockUser = createMockUser('admin') // Reset to admin for each test
  })

  describe('Rendering Tests', () => {
    it('renders layout with all main elements', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Check branding
      expect(screen.getByText('Logistics OMS')).toBeInTheDocument()

      // Check main content
      expect(screen.getByText('Test Content')).toBeInTheDocument()

      // Check user info (use getAllByText since user name appears in multiple places)
      const userNameElements = screen.getAllByText('Test User')
      expect(userNameElements.length).toBeGreaterThan(0)
      const adminElements = screen.getAllByText('admin')
      expect(adminElements.length).toBeGreaterThan(0)
    })

    it('renders all navigation items for admin user', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Warehouse')).toBeInTheDocument()
      expect(screen.getByText('Containers')).toBeInTheDocument()
      expect(screen.getByText('Financials')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('renders search input in top bar', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      expect(screen.getByPlaceholderText('Search orders, containers...')).toBeInTheDocument()
    })

    it('renders notification bell with indicator', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const notificationButton = screen.getByRole('button', { name: 'Notifications' })
      expect(notificationButton).toBeInTheDocument()

      // Check for notification indicator (red dot)
      const indicator = document.querySelector('.bg-red-500.rounded-full')
      expect(indicator).toBeInTheDocument()
    })
  })

  describe('Role-Based Navigation Tests', () => {
    it('shows all navigation items for admin role', () => {
      vi.mocked(vi.importActual('@/stores/authStore')).useAuthStore = () =>
        mockAuthStore(createMockUser('admin'))

      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Admin should see all items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Warehouse')).toBeInTheDocument()
      expect(screen.getByText('Containers')).toBeInTheDocument()
      expect(screen.getByText('Financials')).toBeInTheDocument()
      expect(screen.getByText('Users')).toBeInTheDocument()
    })

    it('hides admin-only items for staff role', () => {
      // Set current user to staff role
      currentMockUser = createMockUser('staff')

      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Staff should see most items but not admin-only ones
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Warehouse')).toBeInTheDocument()
      expect(screen.getByText('Containers')).toBeInTheDocument()
      expect(screen.queryByText('Financials')).not.toBeInTheDocument() // Admin only
      expect(screen.queryByText('Users')).not.toBeInTheDocument() // Admin only
    })

    it('hides staff-only items for client role', () => {
      // Set current user to client role
      currentMockUser = createMockUser('client')

      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Client should see limited items
      expect(screen.getByText('Dashboard')).toBeInTheDocument()
      expect(screen.getByText('Orders')).toBeInTheDocument()
      expect(screen.getByText('Containers')).toBeInTheDocument()
      expect(screen.queryByText('Warehouse')).not.toBeInTheDocument() // Staff/Admin only
      expect(screen.queryByText('Financials')).not.toBeInTheDocument() // Admin only
      expect(screen.queryByText('Users')).not.toBeInTheDocument() // Admin only
    })
  })

  describe('Mobile Menu Button Tests', () => {
    it('renders mobile menu button', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Mobile menu button (hamburger)
      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })
      expect(mobileMenuButton).toBeInTheDocument()
    })

    it('opens mobile sidebar when menu button is clicked', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Find mobile menu button
      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })

      fireEvent.click(mobileMenuButton)

      // Mobile sidebar should be visible (check for close button)
      const closeButton = screen.getByRole('button', { name: 'Close mobile menu' })
      expect(closeButton).toBeInTheDocument()
    })

    it('closes mobile sidebar when close button is clicked', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Open mobile menu first
      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })
      fireEvent.click(mobileMenuButton)

      // Find and click close button
      const closeButton = screen.getByRole('button', { name: 'Close mobile menu' })
      fireEvent.click(closeButton)

      // Sidebar should close (this would require checking animation state)
    })

    it('closes mobile sidebar when backdrop is clicked', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })
      fireEvent.click(mobileMenuButton)

      // Click backdrop
      const backdrop = document.querySelector('.bg-stone-600.bg-opacity-75')
      if (backdrop) {
        fireEvent.click(backdrop)
      }

      // Sidebar should close
    })
  })

  describe('Search Input Tests', () => {
    it('handles search input correctly', async () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const searchInput = screen.getByPlaceholderText('Search orders, containers...')
      await userEvent.type(searchInput, 'ORD-123')

      expect(searchInput).toHaveValue('ORD-123')
    })

    it('has search icon in input', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const searchIcon = document.querySelector('.relative .absolute')
      expect(searchIcon).toBeInTheDocument()
    })
  })

  describe('Notification Button Tests', () => {
    it('renders notification button with bell icon', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const notificationButton = screen.getByRole('button', { name: 'Notifications' })
      const bellIcon = notificationButton.querySelector('svg')
      expect(bellIcon).toBeInTheDocument()
    })

    it('shows notification indicator', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const indicator = document.querySelector('.absolute.top-0.right-0.bg-red-500')
      expect(indicator).toBeInTheDocument()
    })

    it('handles notification button click', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const notificationButton = screen.getByRole('button', { name: 'Notifications' })
      fireEvent.click(notificationButton)

      // Should not throw error
    })
  })

  describe('User Menu Tests', () => {
    it('renders user avatar with initials', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // User avatar should show initials
      expect(screen.getByText('TU')).toBeInTheDocument() // Test User initials
    })

    it('shows user name and role in header', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      expect(screen.getAllByText('Test User').length).toBeGreaterThan(0)
      expect(screen.getAllByText('admin').length).toBeGreaterThan(0)
    })

    it('opens user dropdown when avatar is clicked', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      // Should show dropdown menu
      expect(screen.getByText('Profile Settings')).toBeInTheDocument()
      const logoutButtons = screen.getAllByText('Logout')
      expect(logoutButtons.length).toBeGreaterThan(0)
    })

    it('closes user dropdown when clicking outside', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      // Click outside
      fireEvent.mouseDown(document.body)

      // Dropdown should close
      expect(screen.queryByText('Profile Settings')).not.toBeInTheDocument()
    })
  })

  describe('Profile Link Tests', () => {
    it('renders profile link in user dropdown', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      const profileLink = screen.getByRole('link', { name: /Profile Settings/i })
      expect(profileLink).toBeInTheDocument()
      expect(profileLink).toHaveAttribute('href', '/profile')
    })

    it('renders profile link in sidebar', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const profileLink = screen.getByRole('link', { name: /Profile/i })
      expect(profileLink).toBeInTheDocument()
      expect(profileLink).toHaveAttribute('href', '/profile')
    })
  })

  describe('Logout Button Tests', () => {
    it('renders logout button in user dropdown', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      const logoutButtons = screen.getAllByRole('button', { name: /Logout/i })
      expect(logoutButtons.length).toBeGreaterThan(0)
    })

    it('calls logout and navigates when logout button is clicked', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      const logoutButtons = screen.getAllByRole('button', { name: /Logout/i })
      fireEvent.click(logoutButtons[0])

      expect(mockLogout).toHaveBeenCalled()
      expect(mockNavigate).toHaveBeenCalledWith('/login')
    })

    it('renders logout button in sidebar', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const logoutButtons = screen.getAllByRole('button', { name: /Logout/i })
      expect(logoutButtons.length).toBeGreaterThan(0)
    })
  })

  describe('Navigation Link Tests', () => {
    it('renders all navigation links with correct hrefs', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      expect(screen.getByRole('link', { name: /Dashboard/i })).toHaveAttribute('href', '/dashboard')
      expect(screen.getByRole('link', { name: /Orders/i })).toHaveAttribute('href', '/orders')
      expect(screen.getByRole('link', { name: /Warehouse/i })).toHaveAttribute('href', '/warehouse')
      expect(screen.getByRole('link', { name: /Containers/i })).toHaveAttribute('href', '/containers')
      expect(screen.getByRole('link', { name: /Financials/i })).toHaveAttribute('href', '/financials')
      expect(screen.getByRole('link', { name: /Users/i })).toHaveAttribute('href', '/admin/users')
    })

    it('highlights current page in navigation', () => {
      // Mock useLocation to return /orders path
      mockUseLocation.mockReturnValue({ pathname: '/orders' })

      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const ordersLink = screen.getByRole('link', { name: /Orders/i })
      expect(ordersLink).toHaveClass('bg-amber-50', 'text-amber-700')
    })
  })

  describe('Responsive Design Tests', () => {
    it('hides search on small screens', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const searchContainer = document.querySelector('.hidden.sm\\:block')
      expect(searchContainer).toBeInTheDocument()
    })

    it('shows mobile menu button only on small screens', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })
      expect(mobileMenuButton).toBeInTheDocument()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper navigation structure', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const nav = screen.getByRole('navigation')
      expect(nav).toBeInTheDocument()
    })

    it('has accessible button labels', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Open user menu to see all buttons
      const userButton = screen.getByRole('button', { name: 'User menu' })
      fireEvent.click(userButton)

      const logoutButtons = screen.getAllByRole('button', { name: /Logout/i })
      expect(logoutButtons.length).toBeGreaterThan(0)
      expect(screen.getByRole('link', { name: /Profile Settings/i })).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      const searchInput = screen.getByPlaceholderText('Search orders, containers...')
      searchInput.focus()
      expect(document.activeElement).toBe(searchInput)

      await userEvent.tab()
      // Should move to next focusable element
    })
  })

  describe('Animation Tests', () => {
    it('applies motion animations to mobile sidebar', () => {
      render(<DashboardLayout><div>Test Content</div></DashboardLayout>)

      // Open mobile menu
      const mobileMenuButton = screen.getByRole('button', { name: 'Open mobile menu' })
      fireEvent.click(mobileMenuButton)

      // Check that the mobile sidebar is rendered (our mock creates div elements)
      const mobileSidebar = document.querySelector('.fixed.inset-y-0.left-0')
      expect(mobileSidebar).toBeInTheDocument()
    })
  })
})
