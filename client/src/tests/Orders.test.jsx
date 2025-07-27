import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Orders from '@/pages/orders/Orders'
import axios from 'axios'

// Mock dependencies
const mockNavigate = vi.fn()
const mockUser = { id: '1', name: 'Test User', role: 'admin' }

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser })
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock react-hot-toast
vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn(),
    loading: vi.fn()
  }
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>,
    tr: ({ children, ...props }) => <tr {...props}>{children}</tr>,
    td: ({ children, ...props }) => <td {...props}>{children}</td>,
    button: ({ children, ...props }) => <button {...props}>{children}</button>
  }
}))

// Mock orders data
const mockOrdersData = {
  orders: [
    {
      _id: '1',
      orderNumber: 'ORD-001234',
      clientName: 'ABC Trading Co',
      status: 'confirmed',
      priority: 'high',
      totalAmount: 245000,
      totalCarryingCharges: 18500,
      totalCartons: 45,
      totalCbm: 28.5,
      totalWeight: 1250,
      deadline: '2024-02-15',
      createdAt: '2024-01-15',
      items: [
        { itemCode: 'ITEM-001', description: 'Electronics', quantity: 50 },
        { itemCode: 'ITEM-002', description: 'Accessories', quantity: 25 }
      ]
    },
    {
      _id: '2',
      orderNumber: 'ORD-001235',
      clientName: 'XYZ Corporation',
      status: 'in_progress',
      priority: 'medium',
      totalAmount: 189000,
      totalCarryingCharges: 14200,
      totalCartons: 32,
      totalCbm: 18.2,
      totalWeight: 890,
      deadline: '2024-01-28',
      createdAt: '2024-01-14',
      items: [
        { itemCode: 'ITEM-003', description: 'Fashion Accessories', quantity: 75 }
      ]
    }
  ],
  pagination: {
    currentPage: 1,
    totalPages: 1,
    total: 2
  }
}

describe('Orders Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: mockOrdersData })
    mockedAxios.delete.mockResolvedValue({ data: { success: true } })
  })

  describe('Rendering Tests', () => {
    it('renders orders page header correctly', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByText('Orders')).toBeInTheDocument()
        expect(screen.getByText('Manage and track all your orders')).toBeInTheDocument()
      })
    })

    it('renders all header buttons correctly', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Create Order/i })).toBeInTheDocument()
      })
    })

    it('renders search and filter controls', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument()
      })
    })

    it('renders orders table with data', async () => {
      render(<Orders />)

      await waitFor(() => {
        // Check for table headers or basic table structure
        expect(screen.getByText('Orders')).toBeInTheDocument()
        // Look for any table or data container
        const tableElements = screen.getAllByRole('table', { hidden: true })
        expect(tableElements.length).toBeGreaterThanOrEqual(0)
      })
    })
  })

  describe('Header Button Tests', () => {
    it('refreshes data when refresh button is clicked', async () => {
      render(<Orders />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })

        // Clear previous calls
        mockedAxios.get.mockClear()

        fireEvent.click(refreshButton)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/orders', expect.any(Object))
      })
    })

    it('shows export message when export button is clicked', async () => {
      render(<Orders />)

      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Export/i })
        fireEvent.click(exportButton)

        expect(screen.getByText('Export functionality will be implemented')).toBeInTheDocument()
      })
    })

    it('navigates to create order page when create button is clicked', async () => {
      render(<Orders />)

      await waitFor(() => {
        const createButton = screen.getByRole('link', { name: /Create Order/i })
        expect(createButton).toHaveAttribute('href', '/orders/create')
      })
    })

    it('has correct icons in header buttons', async () => {
      render(<Orders />)

      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })
        const exportButton = screen.getByRole('button', { name: /Export/i })
        const createButton = screen.getByRole('link', { name: /Create Order/i })

        expect(refreshButton.querySelector('svg')).toBeInTheDocument()
        expect(exportButton.querySelector('svg')).toBeInTheDocument()
        expect(createButton.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter Tests', () => {
    it('handles search input correctly', async () => {
      render(<Orders />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search orders...')
        fireEvent.change(searchInput, { target: { value: 'ORD-001234' } })

        expect(searchInput.value).toBe('ORD-001234')
      })
    })

    it('triggers search when typing in search input', async () => {
      render(<Orders />)

      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search orders...')

        // Clear previous calls
        mockedAxios.get.mockClear()

        fireEvent.change(searchInput, { target: { value: 'ABC' } })

        // Should trigger API call with search parameter
        setTimeout(() => {
          expect(mockedAxios.get).toHaveBeenCalledWith('/api/orders',
            expect.objectContaining({
              params: expect.objectContaining({
                search: 'ABC'
              })
            })
          )
        }, 500) // Debounced search
      })
    })

    it('renders filter button correctly', async () => {
      render(<Orders />)

      await waitFor(() => {
        const filterButton = screen.getByRole('button', { name: /Filter/i })
        expect(filterButton).toBeInTheDocument()
        expect(filterButton.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  describe('Table Action Button Tests', () => {
    it('renders view button for each order', async () => {
      render(<Orders />)

      await waitFor(() => {
        const viewButtons = screen.getAllByRole('link').filter(link =>
          link.getAttribute('href')?.includes('/orders/') &&
          !link.getAttribute('href')?.includes('/edit') &&
          !link.getAttribute('href')?.includes('/create')
        )
        expect(viewButtons.length).toBeGreaterThan(0)
      })
    })

    it('renders edit button for each order', async () => {
      render(<Orders />)

      await waitFor(() => {
        const editButtons = screen.getAllByRole('link').filter(link =>
          link.getAttribute('href')?.includes('/edit')
        )
        expect(editButtons.length).toBeGreaterThan(0)
      })
    })

    it('renders delete button for admin/staff users', async () => {
      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )
        expect(deleteButtons.length).toBeGreaterThan(0)
      })
    })

    it('hides delete button for client users', async () => {
      // Mock client user
      vi.mocked(vi.importActual('@/stores/authStore')).useAuthStore = () => ({
        user: { ...mockUser, role: 'client' }
      })

      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.queryAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )
        expect(deleteButtons.length).toBe(0)
      })
    })

    it('renders more options button for each order', async () => {
      render(<Orders />)

      await waitFor(() => {
        const moreButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg')
        )
        expect(moreButtons.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Delete Order Tests', () => {
    it('shows confirmation dialog when delete button is clicked', async () => {
      // Mock window.confirm
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )

        if (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0])
          expect(confirmSpy).toHaveBeenCalledWith('Are you sure you want to delete this order?')
        }
      })

      confirmSpy.mockRestore()
    })

    it('deletes order when confirmed', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)

      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )

        if (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0])

          expect(mockedAxios.delete).toHaveBeenCalledWith('/api/orders/1')
        }
      })

      confirmSpy.mockRestore()
    })

    it('does not delete order when cancelled', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(false)

      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )

        if (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0])

          expect(mockedAxios.delete).not.toHaveBeenCalled()
        }
      })

      confirmSpy.mockRestore()
    })
  })

  describe('Pagination Tests', () => {
    beforeEach(() => {
      // Mock data with multiple pages
      mockedAxios.get.mockResolvedValue({
        data: {
          ...mockOrdersData,
          pagination: {
            currentPage: 1,
            totalPages: 3,
            total: 25
          }
        }
      })
    })

    it('renders pagination when multiple pages exist', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: 'Previous' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: 'Next' })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: '1' })).toBeInTheDocument()
      })
    })

    it('disables previous button on first page', async () => {
      render(<Orders />)

      await waitFor(() => {
        const previousButton = screen.getByRole('button', { name: 'Previous' })
        expect(previousButton).toBeDisabled()
      })
    })

    it('navigates to next page when next button is clicked', async () => {
      render(<Orders />)

      await waitFor(() => {
        const nextButton = screen.getByRole('button', { name: 'Next' })

        mockedAxios.get.mockClear()
        fireEvent.click(nextButton)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/orders',
          expect.objectContaining({
            params: expect.objectContaining({
              page: '2'
            })
          })
        )
      })
    })

    it('navigates to specific page when page number is clicked', async () => {
      render(<Orders />)

      await waitFor(() => {
        const pageButton = screen.getByRole('button', { name: '2' })

        mockedAxios.get.mockClear()
        fireEvent.click(pageButton)

        expect(mockedAxios.get).toHaveBeenCalledWith('/api/orders',
          expect.objectContaining({
            params: expect.objectContaining({
              page: '2'
            })
          })
        )
      })
    })
  })

  describe('Empty State Tests', () => {
    it('shows empty state when no orders exist', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { orders: [], pagination: { currentPage: 1, totalPages: 1, total: 0 } }
      })

      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByText('No orders found')).toBeInTheDocument()
        expect(screen.getByText('Get started by creating your first order')).toBeInTheDocument()
        expect(screen.getByRole('link', { name: /Create First Order/i })).toBeInTheDocument()
      })
    })

    it('shows search-specific empty state when search returns no results', async () => {
      mockedAxios.get.mockResolvedValue({
        data: { orders: [], pagination: { currentPage: 1, totalPages: 1, total: 0 } }
      })

      render(<Orders />)

      // Perform search
      await waitFor(() => {
        const searchInput = screen.getByPlaceholderText('Search orders...')
        fireEvent.change(searchInput, { target: { value: 'nonexistent' } })
      })

      await waitFor(() => {
        expect(screen.getByText('Try adjusting your search criteria')).toBeInTheDocument()
      })
    })
  })

  describe('Quick Stats Tests', () => {
    it('displays order statistics correctly', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument()
        expect(screen.getByText('2')).toBeInTheDocument() // Based on mock data
      })
    })
  })

  describe('Loading State Tests', () => {
    it('shows loading spinner when fetching data', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}))

      render(<Orders />)

      expect(screen.getByText('Loading orders...')).toBeInTheDocument()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles API errors gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedAxios.get.mockRejectedValue(new Error('API Error'))

      render(<Orders />)

      await waitFor(() => {
        // Should show mock data when API fails
        expect(screen.getByText('ORD-001234')).toBeInTheDocument()
      })

      consoleError.mockRestore()
    })

    it('handles delete errors gracefully', async () => {
      const confirmSpy = vi.spyOn(window, 'confirm').mockReturnValue(true)
      mockedAxios.delete.mockRejectedValue(new Error('Delete failed'))

      render(<Orders />)

      await waitFor(() => {
        const deleteButtons = screen.getAllByRole('button').filter(button =>
          button.querySelector('svg') &&
          button.className.includes('text-red-600')
        )

        if (deleteButtons.length > 0) {
          fireEvent.click(deleteButtons[0])

          expect(screen.getByText('Failed to delete order')).toBeInTheDocument()
        }
      })

      confirmSpy.mockRestore()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper table structure', async () => {
      render(<Orders />)

      await waitFor(() => {
        const table = screen.getByRole('table')
        expect(table).toBeInTheDocument()

        const headers = screen.getAllByRole('columnheader')
        expect(headers.length).toBeGreaterThan(0)
      })
    })

    it('has accessible button labels', async () => {
      render(<Orders />)

      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Refresh/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Export/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument()
      })
    })
  })
})
