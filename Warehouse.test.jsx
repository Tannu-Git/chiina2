import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Warehouse from '@/pages/warehouse/Warehouse'
import axios from 'axios'

// Mock dependencies
const mockUser = { id: '1', name: 'Test User', role: 'admin' }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser })
}))

vi.mock('react-router-dom', () => ({
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}))

// Mock warehouse components
vi.mock('@/components/warehouse/QCInspector', () => ({
  default: ({ order, onResult, onClose }) => (
    <div data-testid="qc-inspector">
      QC Inspector for {order?.orderNumber}
      <button onClick={() => onResult({ success: true, needsLoopback: false })}>Pass QC</button>
      <button onClick={() => onResult({ success: true, needsLoopback: true })}>Pass with Loopback</button>
      <button onClick={onClose}>Close</button>
    </div>
  )
}))

vi.mock('@/components/warehouse/LoopBackMonitor', () => ({
  default: () => <div data-testid="loopback-monitor">LoopBack Monitor</div>
}))

vi.mock('@/components/warehouse/ContainerPlanner3D', () => ({
  default: ({ containers, availableItems }) => (
    <div data-testid="container-planner-3d">
      Container Planner 3D - {containers.length} containers, {availableItems.length} items
    </div>
  )
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock warehouse data
const mockWarehouseData = {
  metrics: {
    totalOrders: 45,
    readyOrders: 12,
    activeContainers: 8,
    totalCbmUtilization: 245.5
  },
  readyOrders: [
    {
      _id: '1',
      orderNumber: 'ORD-001234',
      clientName: 'ABC Trading',
      status: 'ready',
      totalCartons: 25,
      totalCbm: 15.5,
      totalWeight: 1200,
      deadline: '2024-02-15',
      items: [
        { itemCode: 'ITEM-001', description: 'Product A', quantity: 10 },
        { itemCode: 'ITEM-002', description: 'Product B', quantity: 15 }
      ]
    },
    {
      _id: '2',
      orderNumber: 'ORD-001235',
      clientName: 'XYZ Corp',
      status: 'in_production',
      totalCartons: 18,
      totalCbm: 12.3,
      totalWeight: 950,
      deadline: '2024-02-20',
      items: [
        { itemCode: 'ITEM-003', description: 'Product C', quantity: 8 }
      ]
    }
  ],
  activeContainers: [
    {
      _id: '1',
      clientFacingId: 'SHIP-ABC123',
      type: '40ft',
      status: 'loading',
      currentCbm: 45.2,
      maxCbm: 67,
      currentWeight: 15000,
      maxWeight: 30000,
      location: { current: 'Warehouse A' },
      orders: [
        { orderId: { orderNumber: 'ORD-001234', clientName: 'ABC Trading' } }
      ]
    }
  ]
}

describe('Warehouse Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: mockWarehouseData })
    mockedAxios.post.mockResolvedValue({ data: { success: true } })
  })

  describe('Rendering Tests', () => {
    it('renders warehouse dashboard header correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        expect(screen.getByText('Warehouse Operations')).toBeInTheDocument()
        expect(screen.getByText('Manage orders, containers, and quality control')).toBeInTheDocument()
      })
    })

    it('renders all metric cards correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Orders')).toBeInTheDocument()
        expect(screen.getByText('45')).toBeInTheDocument()
        
        expect(screen.getByText('Ready Orders')).toBeInTheDocument()
        expect(screen.getByText('12')).toBeInTheDocument()
        
        expect(screen.getByText('Active Containers')).toBeInTheDocument()
        expect(screen.getByText('8')).toBeInTheDocument()
        
        expect(screen.getByText('CBM Utilization')).toBeInTheDocument()
        expect(screen.getByText('245.5 m³')).toBeInTheDocument()
      })
    })

    it('renders tab navigation correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        expect(screen.getByRole('button', { name: /Overview/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Ready Orders/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Active Containers/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Quality Control/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Loop-back Monitor/i })).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /Container Planner/i })).toBeInTheDocument()
      })
    })
  })

  describe('Tab Navigation Tests', () => {
    it('switches to orders tab when clicked', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
        
        expect(ordersTab).toHaveClass('border-blue-500', 'text-blue-600')
      })
    })

    it('switches to containers tab when clicked', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const containersTab = screen.getByRole('button', { name: /Active Containers/i })
        fireEvent.click(containersTab)
        
        expect(containersTab).toHaveClass('border-blue-500', 'text-blue-600')
      })
    })

    it('switches to QC tab when clicked', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const qcTab = screen.getByRole('button', { name: /Quality Control/i })
        fireEvent.click(qcTab)
        
        expect(screen.getByTestId('qc-inspector')).toBeInTheDocument()
      })
    })

    it('switches to loopback tab when clicked', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const loopbackTab = screen.getByRole('button', { name: /Loop-back Monitor/i })
        fireEvent.click(loopbackTab)
        
        expect(screen.getByTestId('loopback-monitor')).toBeInTheDocument()
      })
    })

    it('switches to planner tab when clicked', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const plannerTab = screen.getByRole('button', { name: /Container Planner/i })
        fireEvent.click(plannerTab)
        
        expect(screen.getByTestId('container-planner-3d')).toBeInTheDocument()
      })
    })
  })

  describe('Search and Filter Tests', () => {
    it('renders search input in orders tab', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
        
        expect(screen.getByPlaceholderText('Search orders...')).toBeInTheDocument()
      })
    })

    it('renders filter button in orders tab', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
        
        expect(screen.getByRole('button', { name: /Filter/i })).toBeInTheDocument()
      })
    })

    it('updates search term when typing', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
        
        const searchInput = screen.getByPlaceholderText('Search orders...')
        fireEvent.change(searchInput, { target: { value: 'ORD-001234' } })
        
        expect(searchInput.value).toBe('ORD-001234')
      })
    })
  })

  describe('Order Action Buttons Tests', () => {
    beforeEach(async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
      })
    })

    it('renders QC button for each order', async () => {
      await waitFor(() => {
        const qcButtons = screen.getAllByRole('button', { name: /QC/i })
        expect(qcButtons.length).toBeGreaterThan(0)
      })
    })

    it('renders Loop-back button for each order', async () => {
      await waitFor(() => {
        const loopbackButtons = screen.getAllByRole('button', { name: /Loop-back/i })
        expect(loopbackButtons.length).toBeGreaterThan(0)
      })
    })

    it('renders Allocate button for each order', async () => {
      await waitFor(() => {
        const allocateButtons = screen.getAllByRole('button', { name: /Allocate/i })
        expect(allocateButtons.length).toBeGreaterThan(0)
      })
    })

    it('opens QC inspector when QC button is clicked', async () => {
      await waitFor(() => {
        const qcButton = screen.getAllByRole('button', { name: /QC/i })[0]
        fireEvent.click(qcButton)
        
        // Switch to QC tab to see the inspector
        const qcTab = screen.getByRole('button', { name: /Quality Control/i })
        fireEvent.click(qcTab)
        
        expect(screen.getByTestId('qc-inspector')).toBeInTheDocument()
      })
    })

    it('creates loopback when Loop-back button is clicked', async () => {
      await waitFor(() => {
        const loopbackButton = screen.getAllByRole('button', { name: /Loop-back/i })[0]
        fireEvent.click(loopbackButton)
        
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/warehouse/loopback', expect.any(Object))
      })
    })

    it('allocates to container when Allocate button is clicked', async () => {
      await waitFor(() => {
        const allocateButton = screen.getAllByRole('button', { name: /Allocate/i })[0]
        fireEvent.click(allocateButton)
        
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/warehouse/allocate', expect.any(Object))
      })
    })
  })

  describe('QC Inspector Tests', () => {
    it('handles QC pass result correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        // Switch to QC tab
        const qcTab = screen.getByRole('button', { name: /Quality Control/i })
        fireEvent.click(qcTab)
        
        // Click Pass QC button
        const passButton = screen.getByText('Pass QC')
        fireEvent.click(passButton)
        
        expect(screen.getByText('QC inspection completed successfully!')).toBeInTheDocument()
      })
    })

    it('handles QC pass with loopback result correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        // Switch to QC tab
        const qcTab = screen.getByRole('button', { name: /Quality Control/i })
        fireEvent.click(qcTab)
        
        // Click Pass with Loopback button
        const passLoopbackButton = screen.getByText('Pass with Loopback')
        fireEvent.click(passLoopbackButton)
        
        expect(screen.getByText('QC inspection completed successfully!')).toBeInTheDocument()
        expect(screen.getByText('Creating loop-back order for shortages/damages...')).toBeInTheDocument()
      })
    })
  })

  describe('Container Display Tests', () => {
    it('displays container information correctly', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const containersTab = screen.getByRole('button', { name: /Active Containers/i })
        fireEvent.click(containersTab)
        
        expect(screen.getByText('SHIP-ABC123')).toBeInTheDocument()
        expect(screen.getByText('40ft Container')).toBeInTheDocument()
        expect(screen.getByText('loading')).toBeInTheDocument()
        expect(screen.getByText('45.2/67 m³')).toBeInTheDocument()
        expect(screen.getByText('15000/30000 kg')).toBeInTheDocument()
      })
    })

    it('displays container utilization bars', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const containersTab = screen.getByRole('button', { name: /Active Containers/i })
        fireEvent.click(containersTab)
        
        // Check for progress bars
        const progressBars = document.querySelectorAll('.bg-blue-600, .bg-green-600')
        expect(progressBars.length).toBeGreaterThan(0)
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('fetches warehouse data on mount', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/warehouse/dashboard')
      })
    })

    it('handles API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedAxios.get.mockRejectedValue(new Error('API Error'))
      
      render(<Warehouse />)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error fetching warehouse data:', expect.any(Error))
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper heading structure', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent('Warehouse Operations')
      })
    })

    it('has accessible tab navigation', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const tabs = screen.getAllByRole('button')
        const tabButtons = tabs.filter(button => 
          button.textContent.includes('Overview') ||
          button.textContent.includes('Ready Orders') ||
          button.textContent.includes('Active Containers') ||
          button.textContent.includes('Quality Control') ||
          button.textContent.includes('Loop-back Monitor') ||
          button.textContent.includes('Container Planner')
        )
        
        expect(tabButtons.length).toBe(6)
      })
    })

    it('has accessible action buttons', async () => {
      render(<Warehouse />)
      
      await waitFor(() => {
        const ordersTab = screen.getByRole('button', { name: /Ready Orders/i })
        fireEvent.click(ordersTab)
        
        expect(screen.getAllByRole('button', { name: /QC/i }).length).toBeGreaterThan(0)
        expect(screen.getAllByRole('button', { name: /Loop-back/i }).length).toBeGreaterThan(0)
        expect(screen.getAllByRole('button', { name: /Allocate/i }).length).toBeGreaterThan(0)
      })
    })
  })
})
