import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Financials from '@/pages/financials/Financials'
import axios from 'axios'

// Mock dependencies
const mockUser = { id: '1', name: 'Test User', role: 'admin' }

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser })
}))

// Mock the advanced financial components
vi.mock('@/components/financials/ProfitGauge', () => ({
  default: ({ currentProfit, targetProfit }) => (
    <div data-testid="profit-gauge">
      Profit Gauge: {currentProfit} / {targetProfit}
    </div>
  )
}))

vi.mock('@/components/financials/CostAllocationTree', () => ({
  default: ({ containerData, showPercentages }) => (
    <div data-testid="cost-allocation-tree">
      Cost Tree: {containerData.totalCost} ({showPercentages ? 'with' : 'without'} percentages)
    </div>
  )
}))

vi.mock('@/components/financials/ContainerMap', () => ({
  default: ({ realTimeUpdates, showFinancials }) => (
    <div data-testid="container-map">
      Container Map: {realTimeUpdates ? 'live' : 'static'} {showFinancials ? 'with financials' : ''}
    </div>
  )
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

// Mock financial data
const mockFinancialData = {
  summary: {
    totalRevenue: 500000,
    totalProfit: 75000,
    totalOrders: 150,
    averageOrderValue: 3333.33,
    revenueGrowth: 12.5,
    profitMargin: 15,
    ordersGrowth: 8.2,
    avgOrderGrowth: 4.1
  },
  revenueBreakdown: {
    containerRevenue: 300000,
    serviceRevenue: 150000,
    additionalRevenue: 50000
  },
  expenseBreakdown: {
    containerCosts: 200000,
    operationalCosts: 150000,
    staffCosts: 75000
  },
  paymentStatus: {
    received: 400000,
    pending: 75000,
    overdue: 25000
  },
  topClients: [
    { name: 'ABC Corp', revenue: 50000, growth: 15 },
    { name: 'XYZ Ltd', revenue: 40000, growth: -5 },
    { name: 'DEF Inc', revenue: 35000, growth: 20 }
  ],
  monthlyTrends: [
    { month: 'Jan', revenue: 45000, profit: 6750 },
    { month: 'Feb', revenue: 48000, profit: 7200 },
    { month: 'Mar', revenue: 52000, profit: 7800 }
  ]
}

describe('Financials Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.get.mockResolvedValue({ data: mockFinancialData })
  })

  describe('Rendering Tests', () => {
    it('renders loading state initially', () => {
      mockedAxios.get.mockImplementation(() => new Promise(() => {}))
      
      render(<Financials />)
      
      expect(screen.getByText('Loading financial data...')).toBeInTheDocument()
    })

    it('renders financial dashboard header correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Financial Dashboard')).toBeInTheDocument()
        expect(screen.getByText('Track revenue, profits, and financial performance')).toBeInTheDocument()
      })
    })

    it('renders all metric cards correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Total Revenue')).toBeInTheDocument()
        expect(screen.getByText('$500,000.00')).toBeInTheDocument()
        
        expect(screen.getByText('Total Profit')).toBeInTheDocument()
        expect(screen.getByText('$75,000.00')).toBeInTheDocument()
        
        expect(screen.getByText('Total Orders')).toBeInTheDocument()
        expect(screen.getByText('150')).toBeInTheDocument()
        
        expect(screen.getByText('Average Order Value')).toBeInTheDocument()
        expect(screen.getByText('$3,333.33')).toBeInTheDocument()
      })
    })

    it('renders advanced financial components', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByTestId('profit-gauge')).toBeInTheDocument()
        expect(screen.getByTestId('cost-allocation-tree')).toBeInTheDocument()
        expect(screen.getByTestId('container-map')).toBeInTheDocument()
      })
    })
  })

  describe('Header Controls Tests', () => {
    it('renders period selector correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const periodSelect = screen.getByDisplayValue('This Month')
        expect(periodSelect).toBeInTheDocument()
        
        // Check all options are present
        expect(screen.getByText('This Week')).toBeInTheDocument()
        expect(screen.getByText('This Month')).toBeInTheDocument()
        expect(screen.getByText('This Quarter')).toBeInTheDocument()
        expect(screen.getByText('This Year')).toBeInTheDocument()
      })
    })

    it('renders refresh button correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })
        expect(refreshButton).toBeInTheDocument()
        expect(refreshButton).toHaveClass('outline')
      })
    })

    it('renders export report button correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Export Report/i })
        expect(exportButton).toBeInTheDocument()
        expect(exportButton).toHaveClass('outline')
      })
    })
  })

  describe('Period Selector Tests', () => {
    it('changes period when selector value changes', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const periodSelect = screen.getByDisplayValue('This Month')
        
        fireEvent.change(periodSelect, { target: { value: 'quarter' } })
        expect(periodSelect.value).toBe('quarter')
      })
    })

    it('fetches new data when period changes', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const periodSelect = screen.getByDisplayValue('This Month')
        
        fireEvent.change(periodSelect, { target: { value: 'year' } })
        
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/financials?period=year')
      })
    })
  })

  describe('Refresh Button Tests', () => {
    it('refetches data when refresh button is clicked', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })
        
        // Clear previous calls
        mockedAxios.get.mockClear()
        
        fireEvent.click(refreshButton)
        
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/financials?period=month')
      })
    })

    it('has correct icon in refresh button', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })
        const icon = refreshButton.querySelector('svg')
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('Export Report Button Tests', () => {
    it('shows success message when export button is clicked', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Export Report/i })
        
        fireEvent.click(exportButton)
        
        expect(screen.getByText('Financial report exported successfully!')).toBeInTheDocument()
      })
    })

    it('has correct icon in export button', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const exportButton = screen.getByRole('button', { name: /Export Report/i })
        const icon = exportButton.querySelector('svg')
        expect(icon).toBeInTheDocument()
      })
    })
  })

  describe('Financial Breakdown Tests', () => {
    it('renders revenue breakdown correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Revenue Breakdown')).toBeInTheDocument()
        expect(screen.getByText('Container Revenue')).toBeInTheDocument()
        expect(screen.getByText('$300,000.00')).toBeInTheDocument()
        expect(screen.getByText('Service Revenue')).toBeInTheDocument()
        expect(screen.getByText('$150,000.00')).toBeInTheDocument()
      })
    })

    it('renders expense breakdown correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Expense Breakdown')).toBeInTheDocument()
        expect(screen.getByText('Container Costs')).toBeInTheDocument()
        expect(screen.getByText('$200,000.00')).toBeInTheDocument()
        expect(screen.getByText('Operational Costs')).toBeInTheDocument()
        expect(screen.getByText('Staff Costs')).toBeInTheDocument()
      })
    })

    it('renders payment status correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Payment Status')).toBeInTheDocument()
        expect(screen.getByText('Received')).toBeInTheDocument()
        expect(screen.getByText('$400,000.00')).toBeInTheDocument()
        expect(screen.getByText('Pending')).toBeInTheDocument()
        expect(screen.getByText('$75,000.00')).toBeInTheDocument()
        expect(screen.getByText('Overdue')).toBeInTheDocument()
        expect(screen.getByText('$25,000.00')).toBeInTheDocument()
      })
    })
  })

  describe('Top Clients Tests', () => {
    it('renders top clients section correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(screen.getByText('Top Clients')).toBeInTheDocument()
        expect(screen.getByText('ABC Corp')).toBeInTheDocument()
        expect(screen.getByText('$50,000.00')).toBeInTheDocument()
        expect(screen.getByText('XYZ Ltd')).toBeInTheDocument()
        expect(screen.getByText('DEF Inc')).toBeInTheDocument()
      })
    })

    it('displays growth indicators for clients', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        // Should show growth percentages
        expect(screen.getByText('+15%')).toBeInTheDocument()
        expect(screen.getByText('-5%')).toBeInTheDocument()
        expect(screen.getByText('+20%')).toBeInTheDocument()
      })
    })
  })

  describe('Advanced Components Integration Tests', () => {
    it('passes correct props to ProfitGauge', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const profitGauge = screen.getByTestId('profit-gauge')
        expect(profitGauge).toHaveTextContent('75000') // currentProfit
        expect(profitGauge).toHaveTextContent('90000') // targetProfit (75000 * 1.2)
      })
    })

    it('passes correct props to CostAllocationTree', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const costTree = screen.getByTestId('cost-allocation-tree')
        expect(costTree).toHaveTextContent('350000') // totalCost (500000 * 0.7)
        expect(costTree).toHaveTextContent('with percentages')
      })
    })

    it('passes correct props to ContainerMap', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const containerMap = screen.getByTestId('container-map')
        expect(containerMap).toHaveTextContent('live')
        expect(containerMap).toHaveTextContent('with financials')
      })
    })
  })

  describe('Data Loading Tests', () => {
    it('fetches financial data on mount', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        expect(mockedAxios.get).toHaveBeenCalledWith('/api/financials?period=month')
      })
    })

    it('handles API error gracefully', async () => {
      const consoleError = vi.spyOn(console, 'error').mockImplementation(() => {})
      mockedAxios.get.mockRejectedValue(new Error('API Error'))
      
      render(<Financials />)
      
      await waitFor(() => {
        expect(consoleError).toHaveBeenCalledWith('Error fetching financial data:', expect.any(Error))
        expect(screen.getByText('Failed to load financial data')).toBeInTheDocument()
      })
      
      consoleError.mockRestore()
    })
  })

  describe('Responsive Design Tests', () => {
    it('renders grid layouts correctly', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        // Check for responsive grid classes
        const metricsGrid = document.querySelector('.grid.grid-cols-1.md\\:grid-cols-2.lg\\:grid-cols-4')
        expect(metricsGrid).toBeInTheDocument()
        
        const breakdownGrid = document.querySelector('.grid.grid-cols-1.lg\\:grid-cols-3')
        expect(breakdownGrid).toBeInTheDocument()
        
        const advancedGrid = document.querySelector('.grid.grid-cols-1.xl\\:grid-cols-2')
        expect(advancedGrid).toBeInTheDocument()
      })
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper heading structure', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const mainHeading = screen.getByRole('heading', { level: 1 })
        expect(mainHeading).toHaveTextContent('Financial Dashboard')
      })
    })

    it('has accessible form controls', async () => {
      render(<Financials />)
      
      await waitFor(() => {
        const periodSelect = screen.getByDisplayValue('This Month')
        expect(periodSelect).toBeInTheDocument()
        
        const refreshButton = screen.getByRole('button', { name: /Refresh/i })
        expect(refreshButton).toBeInTheDocument()
        
        const exportButton = screen.getByRole('button', { name: /Export Report/i })
        expect(exportButton).toBeInTheDocument()
      })
    })
  })
})
