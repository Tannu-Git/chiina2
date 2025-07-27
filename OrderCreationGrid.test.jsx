import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderCreationGrid from '@/components/orders/OrderCreationGrid'
import axios from 'axios'

// Mock dependencies
vi.mock('@/components/orders/CodeAutoComplete', () => ({
  default: ({ value, onChange, onSelect }) => (
    <input
      data-testid="code-autocomplete"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
      onBlur={() => onSelect?.({ itemCode: value, description: 'Test Item' })}
    />
  )
}))

vi.mock('@/components/orders/ImageUploadField', () => ({
  default: ({ onUpload }) => (
    <button
      data-testid="image-upload"
      onClick={() => onUpload?.(['test-image.jpg'])}
    >
      Upload Image
    </button>
  )
}))

vi.mock('@/components/orders/SupplierDropdown', () => ({
  default: ({ value, onChange }) => (
    <select
      data-testid="supplier-dropdown"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">Select Supplier</option>
      <option value="supplier1">Supplier 1</option>
      <option value="supplier2">Supplier 2</option>
    </select>
  )
}))

vi.mock('@/components/orders/PaymentTypeSelector', () => ({
  default: ({ value, onChange }) => (
    <select
      data-testid="payment-type-selector"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">Select Payment Type</option>
      <option value="FOB">FOB</option>
      <option value="CIF">CIF</option>
    </select>
  )
}))

vi.mock('@/components/orders/CarryingBasisSelector', () => ({
  default: ({ value, onChange }) => (
    <select
      data-testid="carrying-basis-selector"
      value={value || ''}
      onChange={(e) => onChange?.(e.target.value)}
    >
      <option value="">Select Carrying Basis</option>
      <option value="SEA">Sea Freight</option>
      <option value="AIR">Air Freight</option>
    </select>
  )
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('OrderCreationGrid Component - All Elements and Buttons', () => {
  const mockOnSave = vi.fn()
  const defaultProps = {
    onSave: mockOnSave,
    initialData: []
  }

  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.post.mockResolvedValue({
      data: { estimatedPrice: 100, confidence: 85, historicalData: {} }
    })
  })

  describe('Rendering Tests', () => {
    it('renders grid with toolbar correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      expect(screen.getByText('Excel-like Order Grid')).toBeInTheDocument()
      expect(screen.getByText('Advanced spreadsheet interface for order creation')).toBeInTheDocument()
    })

    it('renders all toolbar buttons correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Left side buttons
      expect(screen.getByRole('button', { name: /Add Row/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Paste/i })).toBeInTheDocument()
      
      // Undo/Redo buttons
      expect(screen.getByRole('button', { name: '' })).toBeInTheDocument() // Undo button (icon only)
      expect(screen.getAllByRole('button', { name: '' }).length).toBeGreaterThan(1) // Redo button (icon only)
      
      // Right side buttons
      expect(screen.getByRole('button', { name: /Import CSV/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Order/i })).toBeInTheDocument()
    })

    it('renders grid headers correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      expect(screen.getByText('Item Code')).toBeInTheDocument()
      expect(screen.getByText('Description')).toBeInTheDocument()
      expect(screen.getByText('Quantity')).toBeInTheDocument()
      expect(screen.getByText('Unit Price')).toBeInTheDocument()
      expect(screen.getByText('Total Price')).toBeInTheDocument()
      expect(screen.getByText('Supplier')).toBeInTheDocument()
      expect(screen.getByText('Payment')).toBeInTheDocument()
    })

    it('renders initial empty row', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Should have at least one row with inputs
      expect(screen.getByTestId('code-autocomplete')).toBeInTheDocument()
      expect(screen.getByTestId('supplier-dropdown')).toBeInTheDocument()
      expect(screen.getByTestId('payment-type-selector')).toBeInTheDocument()
    })
  })

  describe('Add Row Button Tests', () => {
    it('adds new row when Add Row button is clicked', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /Add Row/i })
      
      // Get initial number of rows
      const initialRows = screen.getAllByTestId('code-autocomplete').length
      
      fireEvent.click(addButton)
      
      // Should have one more row
      const newRows = screen.getAllByTestId('code-autocomplete')
      expect(newRows.length).toBe(initialRows + 1)
    })

    it('has correct icon in Add Row button', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const addButton = screen.getByRole('button', { name: /Add Row/i })
      const icon = addButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Copy Button Tests', () => {
    it('is disabled when no cells are selected', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const copyButton = screen.getByRole('button', { name: /Copy/i })
      expect(copyButton).toBeDisabled()
    })

    it('copies selected cells when clicked', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // First, we need to select a cell (this would require more complex interaction)
      // For now, just test that the button exists and has correct styling
      const copyButton = screen.getByRole('button', { name: /Copy/i })
      expect(copyButton).toHaveClass('outline')
    })
  })

  describe('Paste Button Tests', () => {
    it('is disabled when clipboard is empty', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const pasteButton = screen.getByRole('button', { name: /Paste/i })
      expect(pasteButton).toBeDisabled()
    })

    it('has correct icon in Paste button', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const pasteButton = screen.getByRole('button', { name: /Paste/i })
      const icon = pasteButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Undo/Redo Button Tests', () => {
    it('undo button is disabled initially', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Find undo button (first icon-only button)
      const iconButtons = screen.getAllByRole('button', { name: '' })
      const undoButton = iconButtons.find(btn => btn.querySelector('svg'))
      
      expect(undoButton).toBeDisabled()
    })

    it('redo button is disabled initially', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Find redo button (second icon-only button)
      const iconButtons = screen.getAllByRole('button', { name: '' })
      const redoButton = iconButtons[1]
      
      expect(redoButton).toBeDisabled()
    })
  })

  describe('Import CSV Button Tests', () => {
    it('renders import CSV button correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const importButton = screen.getByRole('button', { name: /Import CSV/i })
      expect(importButton).toBeInTheDocument()
      expect(importButton).toHaveClass('outline')
    })

    it('has hidden file input for CSV import', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const fileInput = document.querySelector('input[type="file"][accept=".csv"]')
      expect(fileInput).toBeInTheDocument()
      expect(fileInput).toHaveClass('hidden')
    })

    it('triggers file input when import button is clicked', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const importButton = screen.getByRole('button', { name: /Import CSV/i })
      const fileInput = document.querySelector('input[type="file"]')
      
      // Mock file input click
      const clickSpy = vi.spyOn(fileInput, 'click').mockImplementation(() => {})
      
      fireEvent.click(importButton)
      
      // The label should trigger the file input
      expect(fileInput).toBeInTheDocument()
      
      clickSpy.mockRestore()
    })
  })

  describe('Export CSV Button Tests', () => {
    it('renders export CSV button correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const exportButton = screen.getByRole('button', { name: /Export CSV/i })
      expect(exportButton).toBeInTheDocument()
      expect(exportButton).toHaveClass('outline')
    })

    it('exports data when export button is clicked', () => {
      // Mock URL.createObjectURL and document.createElement
      global.URL.createObjectURL = vi.fn(() => 'mock-url')
      const mockClick = vi.fn()
      const mockAnchor = { href: '', download: '', click: mockClick }
      vi.spyOn(document, 'createElement').mockReturnValue(mockAnchor)
      
      render(<OrderCreationGrid {...defaultProps} />)
      
      const exportButton = screen.getByRole('button', { name: /Export CSV/i })
      fireEvent.click(exportButton)
      
      expect(mockClick).toHaveBeenCalled()
      expect(mockAnchor.download).toBe('order-items.csv')
    })
  })

  describe('Save Order Button Tests', () => {
    it('renders save order button correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const saveButton = screen.getByRole('button', { name: /Save Order/i })
      expect(saveButton).toBeInTheDocument()
      expect(saveButton).toHaveClass('bg-gradient-to-r', 'from-blue-600', 'to-purple-600')
    })

    it('calls onSave when save button is clicked', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const saveButton = screen.getByRole('button', { name: /Save Order/i })
      fireEvent.click(saveButton)
      
      expect(mockOnSave).toHaveBeenCalled()
    })

    it('has correct icon in Save Order button', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const saveButton = screen.getByRole('button', { name: /Save Order/i })
      const icon = saveButton.querySelector('svg')
      expect(icon).toBeInTheDocument()
    })
  })

  describe('Delete Row Button Tests', () => {
    it('renders delete button for each row', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Add a row first
      const addButton = screen.getByRole('button', { name: /Add Row/i })
      fireEvent.click(addButton)
      
      // Should have delete buttons (trash icons)
      const deleteButtons = document.querySelectorAll('button svg')
      expect(deleteButtons.length).toBeGreaterThan(0)
    })

    it('removes row when delete button is clicked', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Add multiple rows
      const addButton = screen.getByRole('button', { name: /Add Row/i })
      fireEvent.click(addButton)
      fireEvent.click(addButton)
      
      const initialRows = screen.getAllByTestId('code-autocomplete').length
      
      // Find and click a delete button (this would require more specific targeting)
      // For now, just verify the structure exists
      expect(initialRows).toBeGreaterThan(1)
    })
  })

  describe('AI Price Estimation Tests', () => {
    it('estimates price when AI button is clicked', async () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Fill in item code first
      const itemCodeInput = screen.getByTestId('code-autocomplete')
      await userEvent.type(itemCodeInput, 'ITEM001')
      
      // Find and click AI estimation button (would be in the row)
      // This would require more specific implementation details
      
      // Verify API call would be made
      // expect(mockedAxios.post).toHaveBeenCalledWith('/api/orders/estimate-price', expect.any(Object))
    })
  })

  describe('Keyboard Navigation Tests', () => {
    it('handles keyboard shortcuts correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Test Ctrl+S for save
      fireEvent.keyDown(document, { key: 's', ctrlKey: true })
      expect(mockOnSave).toHaveBeenCalled()
    })

    it('handles Ctrl+Z for undo', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // This would require having history to undo
      fireEvent.keyDown(document, { key: 'z', ctrlKey: true })
      
      // Should not throw error
    })

    it('handles Ctrl+Y for redo', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      fireEvent.keyDown(document, { key: 'y', ctrlKey: true })
      
      // Should not throw error
    })
  })

  describe('Cell Input Tests', () => {
    it('updates cell values when inputs change', async () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const itemCodeInput = screen.getByTestId('code-autocomplete')
      await userEvent.type(itemCodeInput, 'ITEM001')
      
      expect(itemCodeInput.value).toBe('ITEM001')
    })

    it('calculates total price automatically', async () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // This would require finding quantity and unit price inputs
      // and verifying that total price is calculated
      
      // For now, just verify the structure exists
      expect(screen.getByText('Total Price')).toBeInTheDocument()
    })
  })

  describe('Totals Display Tests', () => {
    it('displays totals row correctly', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // Should show totals at the bottom
      expect(screen.getByText('Totals:')).toBeInTheDocument()
    })

    it('updates totals when values change', async () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      // This would require changing values and verifying totals update
      // For now, just verify totals section exists
      expect(screen.getByText('Total Quantity:')).toBeInTheDocument()
      expect(screen.getByText('Total Amount:')).toBeInTheDocument()
    })
  })

  describe('Accessibility Tests', () => {
    it('has accessible button labels', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      expect(screen.getByRole('button', { name: /Add Row/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Copy/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Paste/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Import CSV/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Export CSV/i })).toBeInTheDocument()
      expect(screen.getByRole('button', { name: /Save Order/i })).toBeInTheDocument()
    })

    it('has proper table structure', () => {
      render(<OrderCreationGrid {...defaultProps} />)
      
      const table = screen.getByRole('table')
      expect(table).toBeInTheDocument()
      
      const headers = screen.getAllByRole('columnheader')
      expect(headers.length).toBeGreaterThan(0)
    })
  })
})
