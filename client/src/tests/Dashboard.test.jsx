import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import Dashboard from '@/pages/Dashboard'
import axios from 'axios'

// Mock dependencies
const mockUser = {
  id: '1',
  name: 'John Doe',
  email: 'john@example.com',
  role: 'admin'
}

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    user: mockUser
  })
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock dashboard data
const mockDashboardData = {
  metrics: [
    { title: 'Total Orders', value: 150, change: '+12%', changeType: 'positive' },
    { title: 'Active Containers', value: 45, change: '+5%', changeType: 'positive' },
    { title: 'Revenue', value: 125000, change: '+8%', changeType: 'positive' },
    { title: 'Profit Margin', value: '15.2%', change: '-2%', changeType: 'negative' }
  ],
  recentOrders: [
    { id: 'ORD-001', client: 'ABC Corp', value: 15000, status: 'completed' },
    { id: 'ORD-002', client: 'XYZ Ltd', value: 8500, status: 'in_progress' },
    { id: 'ORD-003', client: 'DEF Inc', value: 12000, status: 'pending' }
  ],
  containerUpdates: [
    { id: 'CONT-001', location: 'Shanghai Port', status: 'in_transit', eta: '2024-02-15' },
    { id: 'CONT-002', location: 'Los Angeles Port', status: 'arrived', eta: '2024-02-10' },
    { id: 'CONT-003', location: 'Hong Kong Port', status: 'loading', eta: '2024-02-20' }
  ]
}

describe('Dashboard Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: mockDashboardData })
  })

  describe('Rendering Tests', () => {
    it('renders loading state initially', () => {
      // Mock pending request
      mockedAxios.get.mockImplementation(() => new Promise(() => {}))

      render(<Dashboard />)

      expect(screen.getByText('Loading dashboard...')).toBeInTheDocument()
      expect(document.querySelector('.loading-spinner')).toBeInTheDocument() // loading spinner
    })

    it('renders welcome message with user name', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText(`Welcome back, ${mockUser.name}! 👋`)).toBeInTheDocument()
        expect(screen.getByText("Here's what's happening with your logistics operations today.")).toBeInTheDocument()
      })
    })

    it('renders all metric cards correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()
        expect(screen.getByText('+12%')).toBeInTheDocument()

        expect(screen.getByText('Active Containers')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument()
        expect(screen.getByText('+5%')).toBeInTheDocument()
      })
    })

    it('renders recent orders section correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Recent Orders')).toBeInTheDocument()
        expect(screen.getByText('Latest order activities')).toBeInTheDocument()
      })
    })

    it('renders container updates section correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Container Updates')).toBeInTheDocument()
        expect(screen.getByText('Real-time container tracking')).toBeInTheDocument()

        // Check container items
        expect(screen.getByText('CONT-001')).toBeInTheDocument()
        expect(screen.getByText('Shanghai Port')).toBeInTheDocument()
        expect(screen.getByText('in transit')).toBeInTheDocument()
        expect(screen.getByText('ETA: 2024-02-15')).toBeInTheDocument()

        expect(screen.getByText('CONT-002')).toBeInTheDocument()
        expect(screen.getByText('Los Angeles Port')).toBeInTheDocument()
        expect(screen.getByText('arrived')).toBeInTheDocument()
      })
    })

    it('renders quick actions section correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByText('Quick Actions')).toBeInTheDocument()
        expect(screen.getByText('Common tasks and shortcuts')).toBeInTheDocument()

        // Check action buttons
        expect(screen.getByText('Create New Order')).toBeInTheDocument()
        expect(screen.getByText('Track Container')).toBeInTheDocument()
        expect(screen.getByText('View Reports')).toBeInTheDocument()
      })
    })
  })

  describe('Button Tests', () => {
    it('renders View All button in recent orders section', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        const viewAllButton = screen.getByRole('button', { name: 'View All' })
        expect(viewAllButton).toBeInTheDocument()
        expect(viewAllButton).toHaveClass('border')
      })
    })

    it('renders Track All button in container updates section', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        const trackAllButton = screen.getByRole('button', { name: 'Track All' })
        expect(trackAllButton).toBeInTheDocument()
        expect(trackAllButton).toHaveClass('border')
      })
    })

    it('renders quick action buttons with correct links', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        // Create New Order button
        const createOrderLink = screen.getByRole('link', { name: /Create New Order/i })
        expect(createOrderLink).toHaveAttribute('href', '/orders/create')

        // Track Container button
        const trackContainerLink = screen.getByRole('link', { name: /Track Container/i })
        expect(trackContainerLink).toHaveAttribute('href', '/containers')

        // View Reports button
        const viewReportsLink = screen.getByRole('link', { name: /View Reports/i })
        expect(viewReportsLink).toHaveAttribute('href', '/financials')
      })
    })

    it('handles button clicks correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        const viewAllButton = screen.getByRole('button', { name: 'View All' })
        const trackAllButton = screen.getByRole('button', { name: 'Track All' })

        // Buttons should be clickable
        expect(viewAllButton).not.toBeDisabled()
        expect(trackAllButton).not.toBeDisabled()

        // Click buttons
        fireEvent.click(viewAllButton)
        fireEvent.click(trackAllButton)

        // Should not throw errors
      })
    })
  })

  describe('Status Icon Tests', () => {
    it('displays correct status icons for orders', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        // Check for SVG icons (they should be present as SVG elements)
        const svgIcons = document.querySelectorAll('svg')
        expect(svgIcons.length).toBeGreaterThan(0)
      })
    })

    it('displays correct status icons for containers', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        // Container icons should be present
        const containerIcons = document.querySelectorAll('svg')
        expect(containerIcons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('fetches dashboard data on mount', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/dashboard')
      })
    })

    it('handles API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedAxios.get.mockRejectedValue(new Error('API Error'))

      render(<Dashboard />)

      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error fetching dashboard data:', expect.any(Error))
      })

      consoleError.mockRestore()
    })

    it('displays fallback data when API returns empty data', async () => {
      mockedAxios.get.mockResolvedValue({ data: {} })

      render(<Dashboard />)

      await waitFor(() => {
        // Should still render the sections even with empty data
        expect(screen.getByText('Recent Orders')).toBeInTheDocument()
        expect(screen.getByText('Container Updates')).toBeInTheDocument()
        expect(screen.getByText('Quick Actions')).toBeInTheDocument()
      })
    })
  })

  describe('Responsive Design Tests', () => {
    it('renders grid layouts correctly', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        // Check for grid classes
        const metricsGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4')
        expect(metricsGrid).toBeInTheDocument()

        const mainGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-2')
        expect(mainGrid).toBeInTheDocument()

        const actionsGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-3')
        expect(actionsGrid).toBeInTheDocument()
      })
    })
  })

  describe('Animation Tests', () => {
    it('applies motion animations to elements', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        // Check for motion div elements (framer-motion creates these with animate attributes)
        const motionElements = document.querySelectorAll('[animate]')
        expect(motionElements.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper heading structure', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toBeInTheDocument()
        expect(mainHeading).toHaveTextContent(`Welcome back, ${mockUser.name}! 👋`)
      })
    })

    it('has accessible button labels', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'View All' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Track All' })).toBeInTheDocument()
      })
    })

    it('has accessible link labels', async () => {
      render(<Dashboard />)

      await waitFor(() => {
        expect(screen.getByRole('link', { name: /Create New Order/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Track Container/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /View Reports/i })).toBeInTheDocument()
      })
    })
  })
})
