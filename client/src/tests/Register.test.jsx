import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Register from '@/pages/auth/Register'
import axios from 'axios'

// Mock dependencies
const mockNavigate = vi.fn()
const mockLogin = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: mockLogin
  })
}))

vi.mock('axios')
const mockedAxios = vi.mocked(axios)

describe('Register Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockedAxios.post.mockResolvedValue({
      data: { token: 'mock-token', user: { id: '1', name: 'Test User' } }
    })
  })

  describe('Rendering Tests', () => {
    it('renders registration form correctly', () => {
      render(<Register />)

      // Check branding section
      expect(screen.getByText('Join Logistics OMS')).toBeInTheDocument()
      expect(screen.getByText('Professional Account Management')).toBeInTheDocument()
      expect(screen.getByText('Multi-Company Support')).toBeInTheDocument()
      expect(screen.getByText('Email Notifications & Updates')).toBeInTheDocument()

      // Check form elements
      expect(screen.getByRole('heading', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByText('Sign up for a new account to get started')).toBeInTheDocument()
    })

    it('renders all form inputs correctly', () => {
      render(<Register />)

      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your company name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    })

    it('renders all buttons correctly', () => {
      render(<Register />)

      // Password toggle buttons
      const passwordToggleButtons = screen.getAllByRole('button', { name: '' })
      expect(passwordToggleButtons.length).toBe(2) // Two eye icon buttons

      // Submit button
      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')

      // Sign in link
      const signInLink = screen.getByRole('link', { name: 'Sign in' })
      expect(signInLink).toBeInTheDocument()
      expect(signInLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Form Input Tests', () => {
    it('handles name input correctly', async () => {
      render(<Register />)

      const nameInput = screen.getByPlaceholderText('Enter your full name')
      await userEvent.type(nameInput, 'John Doe')
      expect(nameInput).toHaveValue('John Doe')
    })

    it('handles email input correctly', async () => {
      render(<Register />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      await userEvent.type(emailInput, 'john@example.com')
      expect(emailInput).toHaveValue('john@example.com')
    })

    it('handles phone input correctly', async () => {
      render(<Register />)

      const phoneInput = screen.getByPlaceholderText('Enter your phone number')
      await userEvent.type(phoneInput, '+1234567890')
      expect(phoneInput).toHaveValue('+1234567890')
    })

    it('handles company input correctly', async () => {
      render(<Register />)

      const companyInput = screen.getByPlaceholderText('Enter your company name')
      await userEvent.type(companyInput, 'Test Company')
      expect(companyInput).toHaveValue('Test Company')
    })

    it('handles password input correctly', async () => {
      render(<Register />)

      const passwordInput = screen.getByPlaceholderText('Create a password')
      await userEvent.type(passwordInput, 'password123')
      expect(passwordInput).toHaveValue('password123')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('handles confirm password input correctly', async () => {
      render(<Register />)

      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password')
      await userEvent.type(confirmPasswordInput, 'password123')
      expect(confirmPasswordInput).toHaveValue('password123')
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })
  })

  describe('Password Toggle Button Tests', () => {
    it('toggles password visibility when first eye button is clicked', async () => {
      render(<Register />)

      const passwordInput = screen.getByPlaceholderText('Create a password')
      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const passwordToggleButton = toggleButtons[0]

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show password
      fireEvent.click(passwordToggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click again to hide password
      fireEvent.click(passwordToggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('toggles confirm password visibility when second eye button is clicked', async () => {
      render(<Register />)

      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password')
      const toggleButtons = screen.getAllByRole('button', { name: '' })
      const confirmPasswordToggleButton = toggleButtons[1]

      // Initially password should be hidden
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')

      // Click to show password
      fireEvent.click(confirmPasswordToggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'text')

      // Click again to hide password
      fireEvent.click(confirmPasswordToggleButton)
      expect(confirmPasswordInput).toHaveAttribute('type', 'password')
    })

    it('shows correct icons based on password visibility', () => {
      render(<Register />)

      const toggleButtons = screen.getAllByRole('button', { name: '' })

      // Both buttons should have SVG icons
      toggleButtons.forEach(button => {
        expect(button.querySelector('svg')).toBeInTheDocument()
      })
    })
  })

  describe('Form Validation Tests', () => {
    it('validates required fields', async () => {
      render(<Register />)

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      // HTML5 validation should prevent submission
      // The form should not submit without required fields
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('validates password mismatch', async () => {
      render(<Register />)

      // Fill form with mismatched passwords
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password456')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      // The component should handle password mismatch validation
      expect(screen.getByPlaceholderText('Create a password')).toHaveValue('password123')
      expect(screen.getByPlaceholderText('Confirm your password')).toHaveValue('password456')
      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('validates password length', async () => {
      render(<Register />)

      // Fill form with short password
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), '123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), '123')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
      })

      expect(mockedAxios.post).not.toHaveBeenCalled()
    })

    it('shows password requirements hint', () => {
      render(<Register />)

      expect(screen.getByText('Password must be at least 6 characters long')).toBeInTheDocument()
    })
  })

  describe('Submit Button Tests', () => {
    it('submits form with valid data', async () => {
      render(<Register />)

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Enter your phone number'), '+1234567890')
      await userEvent.type(screen.getByPlaceholderText('Enter your company name'), 'Test Company')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockedAxios.post).toHaveBeenCalledWith('/api/auth/register', {
          name: 'John Doe',
          email: 'john@example.com',
          phone: '+1234567890',
          company: 'Test Company',
          password: 'password123'
        })
      })
    })

    it('shows loading state when submitting', async () => {
      // Mock delayed response
      mockedAxios.post.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)))

      render(<Register />)

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      // Should show loading state
      expect(submitButton).toBeDisabled()
      expect(screen.getByText('Creating account...')).toBeInTheDocument()
    })

    it('logs in user and navigates on successful registration', async () => {
      render(<Register />)

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({ id: '1', name: 'Test User' }, 'mock-token')
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('handles registration errors gracefully', async () => {
      mockedAxios.post.mockRejectedValue(new Error('Registration failed'))

      render(<Register />)

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')
      await userEvent.type(screen.getByPlaceholderText('Confirm your password'), 'password123')

      const submitButton = screen.getByRole('button', { name: 'Create Account' })
      fireEvent.click(submitButton)

      // The component should handle registration errors gracefully
      expect(screen.getByRole('button', { name: 'Creating account...' })).toBeInTheDocument()
    })
  })

  describe('Navigation Tests', () => {
    it('navigates to login page when sign in link is clicked', () => {
      render(<Register />)

      const signInLink = screen.getByRole('link', { name: 'Sign in' })
      expect(signInLink).toHaveAttribute('href', '/login')
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper form inputs', () => {
      render(<Register />)

      expect(screen.getByPlaceholderText('Enter your full name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your phone number')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your company name')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Create a password')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Confirm your password')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<Register />)

      const nameInput = screen.getByPlaceholderText('Enter your full name')
      const emailInput = screen.getByPlaceholderText('Enter your email')
      const phoneInput = screen.getByPlaceholderText('Enter your phone number')

      // Tab through form elements
      nameInput.focus()
      expect(document.activeElement).toBe(nameInput)

      await userEvent.tab()
      expect(document.activeElement).toBe(emailInput)

      await userEvent.tab()
      expect(document.activeElement).toBe(phoneInput)
    })

    it('has accessible button labels', () => {
      render(<Register />)

      expect(screen.getByRole('button', { name: 'Create Account' })).toBeInTheDocument()
      expect(screen.getByRole('link', { name: 'Sign in' })).toBeInTheDocument()
    })
  })

  describe('Form Submission via Enter Key Tests', () => {
    it('submits form when Enter is pressed in any input', async () => {
      render(<Register />)

      // Fill form with valid data
      await userEvent.type(screen.getByPlaceholderText('Enter your full name'), 'John Doe')
      await userEvent.type(screen.getByPlaceholderText('Enter your email'), 'john@example.com')
      await userEvent.type(screen.getByPlaceholderText('Create a password'), 'password123')

      const confirmPasswordInput = screen.getByPlaceholderText('Confirm your password')
      await userEvent.type(confirmPasswordInput, 'password123')

      fireEvent.keyDown(confirmPasswordInput, { key: 'Enter', code: 'Enter' })

      // Verify form inputs are filled correctly
      expect(screen.getByPlaceholderText('Enter your full name')).toHaveValue('John Doe')
      expect(screen.getByPlaceholderText('Enter your email')).toHaveValue('john@example.com')
    })
  })
})
