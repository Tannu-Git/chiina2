import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import OrderCreationGrid from '@/components/orders/OrderCreationGrid'

// Mock the components that might not exist
vi.mock('@/components/orders/CodeAutoComplete', () => ({
  default: ({ value, onChange, onSelect }) => (
    <input
      data-testid="code-autocomplete"
      value={value}
      onChange={(e) => onChange(e.target.value)}
      onBlur={() => onSelect && onSelect({ itemCode: value, description: 'Test Item' })}
    />
  )
}))

vi.mock('@/components/orders/ImageUploadField', () => ({
  default: ({ onUpload }) => (
    <button
      data-testid="image-upload"
      onClick={() => onUpload && onUpload(['test-image.jpg'])}
    >
      Upload Image
    </button>
  )
}))

vi.mock('@/components/orders/SupplierDropdown', () => ({
  default: ({ value, onChange }) => (
    <select
      data-testid="supplier-dropdown"
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
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
      value={value}
      onChange={(e) => onChange(e.target.value)}
    >
      <option value="">Select Carrying Basis</option>
      <option value="SEA">Sea Freight</option>
      <option value="AIR">Air Freight</option>
    </select>
  )
}))

describe('OrderCreationGrid', () => {
  const mockOnSave = vi.fn()
  const defaultProps = {
    initialData: [],
    onSave: mockOnSave
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders without crashing', () => {
    render(<OrderCreationGrid {...defaultProps} />)
    expect(screen.getByText('Excel-like Order Grid')).toBeInTheDocument()
  })

  it('displays initial data correctly', () => {
    const initialData = [
      {
        id: '1',
        itemCode: 'ITEM001',
        description: 'Test Item',
        quantity: 10,
        unitPrice: 100,
        totalPrice: 1000
      }
    ]

    render(<OrderCreationGrid {...defaultProps} initialData={initialData} />)
    
    expect(screen.getByDisplayValue('ITEM001')).toBeInTheDocument()
    expect(screen.getByDisplayValue('Test Item')).toBeInTheDocument()
    expect(screen.getByDisplayValue('10')).toBeInTheDocument()
    expect(screen.getByDisplayValue('100')).toBeInTheDocument()
  })

  it('adds new row when Add Row button is clicked', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    // Should have at least one row now
    const itemCodeInputs = screen.getAllByTestId('code-autocomplete')
    expect(itemCodeInputs.length).toBeGreaterThan(0)
  })

  it('calculates totals correctly when values change', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    // Add a row first
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    // Find quantity and price inputs
    const quantityInput = screen.getByDisplayValue('1')
    const priceInput = screen.getByDisplayValue('0')
    
    // Update values
    await userEvent.clear(quantityInput)
    await userEvent.type(quantityInput, '5')
    
    await userEvent.clear(priceInput)
    await userEvent.type(priceInput, '20')
    
    // Check if total is calculated (5 * 20 = 100)
    await waitFor(() => {
      expect(screen.getByDisplayValue('100')).toBeInTheDocument()
    })
  })

  it('removes row when delete button is clicked', async () => {
    const initialData = [
      {
        id: '1',
        itemCode: 'ITEM001',
        description: 'Test Item',
        quantity: 10,
        unitPrice: 100
      }
    ]

    render(<OrderCreationGrid {...defaultProps} initialData={initialData} />)
    
    const deleteButton = screen.getByLabelText('Delete row')
    fireEvent.click(deleteButton)
    
    // Item should be removed
    expect(screen.queryByDisplayValue('ITEM001')).not.toBeInTheDocument()
  })

  it('calls onSave when Save button is clicked', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)
    
    expect(mockOnSave).toHaveBeenCalled()
  })

  it('handles CSV import correctly', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    const importButton = screen.getByText('Import CSV')
    fireEvent.click(importButton)
    
    // Mock file input
    const fileInput = screen.getByLabelText('CSV file input')
    const file = new File(['itemCode,description,quantity,unitPrice\nITEM001,Test Item,10,100'], 'test.csv', {
      type: 'text/csv'
    })
    
    await userEvent.upload(fileInput, file)
    
    // Should process the CSV and add rows
    await waitFor(() => {
      expect(screen.getByDisplayValue('ITEM001')).toBeInTheDocument()
    })
  })

  it('validates required fields', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    // Add a row
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    // Try to save without filling required fields
    const saveButton = screen.getByText('Save Changes')
    fireEvent.click(saveButton)
    
    // Should show validation errors
    await waitFor(() => {
      expect(screen.getByText('Item code is required')).toBeInTheDocument()
    })
  })

  it('handles keyboard navigation correctly', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    // Add a row
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    const firstInput = screen.getAllByTestId('code-autocomplete')[0]
    firstInput.focus()
    
    // Test Tab navigation
    fireEvent.keyDown(firstInput, { key: 'Tab' })
    
    // Should move to next cell
    const descriptionInput = screen.getByDisplayValue('')
    expect(document.activeElement).toBe(descriptionInput)
  })

  it('handles copy and paste operations', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    // Add a row with data
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    // Select a cell and copy
    const itemCodeInput = screen.getAllByTestId('code-autocomplete')[0]
    await userEvent.type(itemCodeInput, 'ITEM001')
    
    // Simulate copy operation
    fireEvent.keyDown(itemCodeInput, { key: 'c', ctrlKey: true })
    
    // Add another row and paste
    fireEvent.click(addButton)
    const secondItemCodeInput = screen.getAllByTestId('code-autocomplete')[1]
    fireEvent.keyDown(secondItemCodeInput, { key: 'v', ctrlKey: true })
    
    // Should paste the copied value
    await waitFor(() => {
      expect(secondItemCodeInput.value).toBe('ITEM001')
    })
  })

  it('handles undo and redo operations', async () => {
    render(<OrderCreationGrid {...defaultProps} />)
    
    // Add a row
    const addButton = screen.getByText('Add Row')
    fireEvent.click(addButton)
    
    // Make a change
    const itemCodeInput = screen.getAllByTestId('code-autocomplete')[0]
    await userEvent.type(itemCodeInput, 'ITEM001')
    
    // Undo the change
    const undoButton = screen.getByLabelText('Undo')
    fireEvent.click(undoButton)
    
    // Should revert the change
    expect(itemCodeInput.value).toBe('')
    
    // Redo the change
    const redoButton = screen.getByLabelText('Redo')
    fireEvent.click(redoButton)
    
    // Should restore the change
    expect(itemCodeInput.value).toBe('ITEM001')
  })
})
