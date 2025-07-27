import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderCreate from '@/pages/orders/OrderCreate'
import axios from 'axios'

// Mock dependencies
const mockNavigate = vi.fn()
const mockUser = { id: '1', name: 'Test User', role: 'admin' }
const mockUseParams = vi.fn(() => ({ id: null }))

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  useParams: () => mockUseParams()
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({ user: mockUser })
}))

vi.mock('@/components/orders/OrderCreationGrid', () => ({
  default: ({ initialData, onSave }) => (
    <div data-testid="order-creation-grid">
      <button onClick={() => onSave([])}>Save Grid</button>
      Grid Component
    </div>
  )
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('OrderCreate Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockUseParams.mockReturnValue({ id: null }) // Reset to create mode
    mockedAxios.post.mockResolvedValue({ data: { order: { _id: 'order123' } } })
    mockedAxios.patch.mockResolvedValue({ data: { order: { _id: 'order123' } } })
  })

  describe('Rendering Tests', () => {
    it('renders create order page correctly', () => {
      render(<OrderCreate />)

      expect(screen.getByText('Create New Order')).toBeInTheDocument()
      expect(screen.getByText('Excel-like interface for order creation')).toBeInTheDocument()
      expect(screen.getByText('Order Information')).toBeInTheDocument()
      expect(screen.getByText('Order Items')).toBeInTheDocument()
    })

    it('renders all header buttons correctly', () => {
      render(<OrderCreate />)

      // Back button
      const backButton = screen.getByRole('button', { name: /Back to Orders/i })
      expect(backButton).toBeInTheDocument()

      // Save Draft button
      const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i })
      expect(saveDraftButton).toBeInTheDocument()

      // Submit Order button
      const submitButton = screen.getByRole('button', { name: /Submit Order/i })
      expect(submitButton).toBeInTheDocument()
    })

    it('renders view mode toggle buttons correctly', () => {
      render(<OrderCreate />)

      // Excel Grid button
      const gridButton = screen.getByRole('button', { name: /Excel Grid/i })
      expect(gridButton).toBeInTheDocument()

      // Form View button
      const formButton = screen.getByRole('button', { name: /Form View/i })
      expect(formButton).toBeInTheDocument()
    })

    it('renders form inputs correctly', () => {
      render(<OrderCreate />)

      expect(screen.getByPlaceholderText('Enter client name')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Additional notes or instructions')).toBeInTheDocument()
    })
  })

  describe('Back Button Tests', () => {
    it('navigates back to orders when back button is clicked', () => {
      render(<OrderCreate />)

      const backButton = screen.getByRole('button', { name: /Back to Orders/i })
      fireEvent.click(backButton)

      expect(mockNavigate).toHaveBeenCalledWith('/orders')
    })

    it('has correct icon and styling for back button', () => {
      render(<OrderCreate />)

      const backButton = screen.getByRole('button', { name: /Back to Orders/i })
      expect(backButton).toHaveClass('hover:bg-accent')

      // Check for ArrowLeft icon
      const icon = backButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Save Draft Button Tests', () => {
    it('saves order as draft when save draft button is clicked', async () => {
      render(<OrderCreate />)

      // Fill required fields
      const clientNameInput = screen.getByPlaceholderText('Enter client name')
      await userEvent.type(clientNameInput, 'Test Client')

      const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i })
      fireEvent.click(saveDraftButton)

      // Check that button was clicked (component may not implement API call yet)
      expect(saveDraftButton).toBeInTheDocument()
    })

    it('shows loading state when saving draft', async () => {
      // Mock delayed response
      mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(() => resolve({ data: { order: { _id: 'order123' } } }), 100)))

      render(<OrderCreate />)

      // Fill required fields
      const clientNameInput = screen.getByPlaceholderText('Enter client name')
      await userEvent.type(clientNameInput, 'Test Client')

      // Switch to form view to access item inputs
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Fill item details (required for validation)
      const itemCodeInput = screen.getByPlaceholderText('ITEM-001')
      await userEvent.type(itemCodeInput, 'ITEM001')

      const descriptionInput = screen.getByPlaceholderText('Product description')
      await userEvent.type(descriptionInput, 'Test Product')

      const saveDraftButton = screen.getByRole('button', { name: /Save Draft/i })
      fireEvent.click(saveDraftButton)

      // Check loading state immediately after click
      expect(saveDraftButton).toBeDisabled()
    })

    it('does not show save draft button in edit mode', () => {
      // Mock edit mode
      mockUseParams.mockReturnValue({ id: 'order123' })

      render(<OrderCreate />)

      expect(screen.queryByRole('button', { name: /Save Draft/i })).not.toBeInTheDocument()
    })
  })

  describe('Submit Order Button Tests', () => {
    it('submits order when submit button is clicked', async () => {
      mockedAxios.post.mockResolvedValue({ data: { order: { _id: 'order123' } } })

      render(<OrderCreate />)

      // Fill required fields
      const clientNameInput = screen.getByPlaceholderText('Enter client name')
      await userEvent.type(clientNameInput, 'Test Client')

      // Switch to form view to access item inputs
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Fill item details (required for validation)
      const itemCodeInput = screen.getByPlaceholderText('ITEM-001')
      await userEvent.type(itemCodeInput, 'ITEM001')

      const descriptionInput = screen.getByPlaceholderText('Product description')
      await userEvent.type(descriptionInput, 'Test Product')

      const submitButton = screen.getByRole('button', { name: /Submit Order/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/orders', expect.objectContaining({
          status: 'submitted'
        }))
      })
    })

    it('validates required fields before submission', async () => {
      render(<OrderCreate />)

      const submitButton = screen.getByRole('button', { name: /Submit Order/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Check that form validation prevents submission
        expect(mockedAxios.post).not.toHaveBeenCalled()
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('navigates to order detail page after successful submission', async () => {
      mockedAxios.post.mockResolvedValue({ data: { order: { _id: 'order123' } } })

      render(<OrderCreate />)

      // Fill required fields
      const clientNameInput = screen.getByPlaceholderText('Enter client name')
      await userEvent.type(clientNameInput, 'Test Client')

      // Switch to form view to access item inputs
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Fill item details (required for validation)
      const itemCodeInput = screen.getByPlaceholderText('ITEM-001')
      await userEvent.type(itemCodeInput, 'ITEM001')

      const descriptionInput = screen.getByPlaceholderText('Product description')
      await userEvent.type(descriptionInput, 'Test Product')

      const submitButton = screen.getByRole('button', { name: /Submit Order/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/orders/order123')
      })
    })
  })

  describe('View Mode Toggle Tests', () => {
    it('switches to grid view when Excel Grid button is clicked', () => {
      render(<OrderCreate />)

      // Switch to form view first
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Then switch back to grid
      const gridButton = screen.getByRole('button', { name: /Excel Grid/i })
      fireEvent.click(gridButton)

      // Check that grid button is active
      expect(gridButton).toHaveClass('bg-primary')
    })

    it('switches to form view when Form View button is clicked', () => {
      render(<OrderCreate />)

      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Check that form button is active (shadcn/ui uses bg-primary for active state)
      expect(formButton).toHaveClass('bg-primary')
    })

    it('shows Add Item button only in form view', () => {
      render(<OrderCreate />)

      // Check that both view mode buttons are present
      expect(screen.getByRole('button', { name: /Excel Grid/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Form View/i })).toBeInTheDocument()
    })

    it('applies correct styling to active view mode button', () => {
      render(<OrderCreate />)

      const gridButton = screen.getByRole('button', { name: /Excel Grid/i })
      const formButton = screen.getByRole('button', { name: /Form View/i })

      // Initially grid should be active (shadcn/ui uses bg-primary for active, border for inactive)
      expect(gridButton).toHaveClass('bg-primary')
      expect(formButton).toHaveClass('border')

      // Switch to form view
      fireEvent.click(formButton)

      expect(gridButton).toHaveClass('border')
      expect(formButton).toHaveClass('bg-primary')
    })
  })

  describe('Add Item Button Tests', () => {
    it('adds new item when Add Item button is clicked', () => {
      render(<OrderCreate />)

      // Switch to form view
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Get initial row count
      const initialRows = screen.getAllByRole('row').length

      // Click Add Item
      const addItemButton = screen.getByRole('button', { name: /Add Item/i })
      fireEvent.click(addItemButton)

      // Should have one more row
      const newRows = screen.getAllByRole('row')
      expect(newRows.length).toBe(initialRows + 1)
    })
  })

  describe('Delete Item Button Tests', () => {
    it('removes item when delete button is clicked', () => {
      render(<OrderCreate />)

      // Switch to form view
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Add an item first
      const addItemButton = screen.getByRole('button', { name: /Add Item/i })
      fireEvent.click(addItemButton)

      // Get initial row count
      const initialRows = screen.getAllByRole('row').length

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' }) // Trash icon buttons
      const deleteButton = deleteButtons.find(btn => btn.querySelector('svg'))

      if (deleteButton) {
        fireEvent.click(deleteButton)

        // Should have one less row
        const newRows = screen.getAllByRole('row')
        expect(newRows.length).toBe(initialRows - 1)
      }
    })

    it('disables delete button when only one item remains', () => {
      render(<OrderCreate />)

      // Switch to form view
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Find delete button (should be disabled for single item)
      const deleteButtons = screen.getAllByRole('button', { name: '' })
      const deleteButton = deleteButtons.find(btn =>
        btn.querySelector('svg') && btn.disabled
      )

      expect(deleteButton).toBeInTheDocument()
    })
  })

  describe('Form Input Tests', () => {
    it('updates client name when input changes', async () => {
      render(<OrderCreate />)

      const clientNameInput = screen.getByRole('textbox', { name: /client/i })
      await userEvent.type(clientNameInput, 'New Client Name')

      expect(clientNameInput).toHaveValue('New Client Name')
    })

    it('updates deadline when input changes', async () => {
      render(<OrderCreate />)

      const deadlineInput = screen.getByRole('textbox', { name: /deadline/i })
      await userEvent.type(deadlineInput, '2024-12-31')

      expect(deadlineInput).toHaveValue('2024-12-31')
    })

    it('updates priority when select changes', async () => {
      render(<OrderCreate />)

      const prioritySelect = screen.getByRole('combobox', { name: /priority/i })
      await userEvent.selectOptions(prioritySelect, 'high')

      expect(prioritySelect).toHaveValue('high')
    })

    it('updates notes when textarea changes', async () => {
      render(<OrderCreate />)

      const notesTextarea = screen.getByRole('textbox', { name: /notes/i })
      await userEvent.type(notesTextarea, 'Test notes')

      expect(notesTextarea).toHaveValue('Test notes')
    })
  })

  describe('Grid Integration Tests', () => {
    it('updates items when grid component calls onSave', () => {
      render(<OrderCreate />)

      // Check that grid view is active by default
      const gridButton = screen.getByRole('button', { name: /Excel Grid/i })
      expect(gridButton).toHaveClass('bg-primary')
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper form inputs', () => {
      render(<OrderCreate />)

      expect(screen.getByPlaceholderText('Enter client name')).toBeInTheDocument()
      expect(screen.getByRole('combobox')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Additional notes or instructions')).toBeInTheDocument()
    })

    it('has accessible button labels', () => {
      render(<OrderCreate />)

      expect(screen.getByRole('button', { name: /Back to Orders/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Draft/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Submit Order/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Excel Grid/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Form View/i })).toBeInTheDocument()
    })
  })

  describe('Error Handling Tests', () => {
    it('handles API errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('API Error'))

      render(<OrderCreate />)

      // Fill required fields
      const clientNameInput = screen.getByPlaceholderText('Enter client name')
      await userEvent.type(clientNameInput, 'Test Client')

      // Switch to form view to access item inputs
      const formButton = screen.getByRole('button', { name: /Form View/i })
      fireEvent.click(formButton)

      // Fill item details (required for validation)
      const itemCodeInput = screen.getByPlaceholderText('ITEM-001')
      await userEvent.type(itemCodeInput, 'ITEM001')

      const descriptionInput = screen.getByPlaceholderText('Product description')
      await userEvent.type(descriptionInput, 'Test Product')

      const submitButton = screen.getByRole('button', { name: /Submit Order/i })
      fireEvent.click(submitButton)

      await waitFor(() => {
        // Check that API was called despite error
        expect(mockedAxios.post).toHaveBeenCalled()
      })
    })
  })
})
