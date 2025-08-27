import React from 'react'
import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import axios from 'axios'
import QCInspector from '../components/warehouse/QCInspector'

// Mock dependencies
vi.mock('axios')
vi.mock('../stores/authStore', () => ({
  useAuthStore: () => ({
    user: { id: 'test-user-id', name: 'Test User' }
  })
}))

vi.mock('react-hot-toast', () => ({
  default: {
    success: vi.fn(),
    error: vi.fn()
  }
}))

// Mock framer-motion
vi.mock('framer-motion', () => ({
  motion: {
    div: ({ children, ...props }) => <div {...props}>{children}</div>
  },
  AnimatePresence: ({ children }) => children
}))

describe('QCInspector Component', () => {
  const mockOrder = {
    _id: 'order-123',
    orderNumber: 'ORD-000001',
    clientName: 'Test Client',
    items: [
      {
        _id: 'item-1',
        itemCode: 'ITEM-001',
        description: 'Test Item 1',
        quantity: 100,
        unitPrice: 10.50,
        cartons: 5
      },
      {
        _id: 'item-2', 
        itemCode: 'ITEM-002',
        description: 'Test Item 2',
        quantity: 50,
        unitPrice: 25.00,
        cartons: 3
      }
    ]
  }

  const mockProps = {
    order: mockOrder,
    onResult: vi.fn(),
    onClose: vi.fn()
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders with proper layout - items list on left, inspection on right', () => {
    render(<QCInspector {...mockProps} />)
    
    // Check header
    expect(screen.getByText('Quality Control Inspection')).toBeInTheDocument()
    expect(screen.getByText(/Order: ORD-000001 - Test Client/)).toBeInTheDocument()
    
    // Check items list sidebar 
    expect(screen.getByText('Items to Inspect')).toBeInTheDocument()
    expect(screen.getByText('ITEM-001')).toBeInTheDocument()
    expect(screen.getByText('ITEM-002')).toBeInTheDocument()
    expect(screen.getByText('Test Item 1')).toBeInTheDocument()
    
    // Check progress indicator
    expect(screen.getByText('Progress')).toBeInTheDocument()
    expect(screen.getByText('0 / 2')).toBeInTheDocument()
    
    // Check main inspection area
    expect(screen.getByText('Item 1 of 2')).toBeInTheDocument()
    expect(screen.getByText('Expected Quantity')).toBeInTheDocument()
    expect(screen.getByText('Received Quantity')).toBeInTheDocument()
    expect(screen.getByText('Inspection Status')).toBeInTheDocument()
  })

  it('allows item navigation and updates current item', () => {
    render(<QCInspector {...mockProps} />)
    
    // Initially shows first item
    expect(screen.getByDisplayValue('100')).toBeInTheDocument() // Expected quantity
    
    // Click on second item in sidebar
    fireEvent.click(screen.getByText('ITEM-002'))
    
    // Should switch to second item
    expect(screen.getByDisplayValue('50')).toBeInTheDocument() // Expected quantity for item 2
    expect(screen.getByText('Item 2 of 2')).toBeInTheDocument()
  })

  it('handles QC status selection properly', () => {
    render(<QCInspector {...mockProps} />)
    
    // Click approved status
    fireEvent.click(screen.getByText('Approved'))
    
    // Should show green styling (approved state)
    const approvedButton = screen.getByText('Approved').closest('button')
    expect(approvedButton).toHaveClass('bg-green-600')
  })

  it('shows defects section when item is damaged', () => {
    render(<QCInspector {...mockProps} />)
    
    // Select damaged status
    fireEvent.click(screen.getByText('Damaged'))
    
    // Should show defects section
    expect(screen.getByText('Defects Found')).toBeInTheDocument()
    expect(screen.getByPlaceholderText('Describe the defect found...')).toBeInTheDocument()
  })
})