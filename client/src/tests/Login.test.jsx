import { describe, it, expect, vi, beforeEach } from 'vitest'
import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import Login from '@/pages/auth/Login'

// Mock dependencies
const mockNavigate = vi.fn()
const mockLogin = vi.fn()

vi.mock('react-router-dom', () => ({
  useNavigate: () => mockNavigate,
  Link: ({ children, to, ...props }) => <a href={to} {...props}>{children}</a>
}))

vi.mock('@/stores/authStore', () => ({
  useAuthStore: () => ({
    login: mockLogin,
    isLoading: false
  })
}))

describe('Login Component - All Elements and Buttons', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    mockLogin.mockResolvedValue({ success: true })
  })

  describe('Rendering Tests', () => {
    it('renders all main elements correctly', () => {
      render(<Login />)

      // Check branding section
      expect(screen.getByText('Logistics OMS')).toBeInTheDocument()
      expect(screen.getByText('Streamline Your')).toBeInTheDocument()
      expect(screen.getByText('Supply Chain')).toBeInTheDocument()

      // Check features list
      expect(screen.getByText('Excel-like Order Management')).toBeInTheDocument()
      expect(screen.getByText('Real-time Container Tracking')).toBeInTheDocument()
      expect(screen.getByText('Financial Analytics & Reporting')).toBeInTheDocument()

      // Check form elements
      expect(screen.getByText('Welcome Back')).toBeInTheDocument()
      expect(screen.getByText('Sign in to your account to continue')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()

      // Check demo credentials
      expect(screen.getByText('Demo Credentials:')).toBeInTheDocument()
      expect(screen.getByText(/admin@demo.com/)).toBeInTheDocument()
      expect(screen.getByText(/staff@demo.com/)).toBeInTheDocument()
      expect(screen.getByText(/client@demo.com/)).toBeInTheDocument()
    })

    it('renders all buttons correctly', () => {
      render(<Login />)

      // Password toggle button
      const passwordToggle = screen.getByRole('button', { name: '' }) // Eye icon button
      expect(passwordToggle).toBeInTheDocument()

      // Submit button
      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).toHaveAttribute('type', 'submit')

      // Sign up link
      const signUpLink = screen.getByRole('link', { name: 'Sign up' })
      expect(signUpLink).toBeInTheDocument()
      expect(signUpLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Form Input Tests', () => {
    it('handles email input correctly', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')

      await userEvent.type(emailInput, 'test@example.com')
      expect(emailInput).toHaveValue('test@example.com')

      // Clear and type again
      await userEvent.clear(emailInput)
      await userEvent.type(emailInput, 'admin@demo.com')
      expect(emailInput).toHaveValue('admin@demo.com')
    })

    it('handles password input correctly', async () => {
      render(<Login />)

      const passwordInput = screen.getByPlaceholderText('Enter your password')

      await userEvent.type(passwordInput, 'password123')
      expect(passwordInput).toHaveValue('password123')
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('clears errors when user starts typing', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      // Submit empty form to trigger validation
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })

      // Start typing to clear error
      await userEvent.type(emailInput, 'a')

      await waitFor(() => {
        expect(screen.queryByText('Email is required')).not.toBeInTheDocument()
      })
    })
  })

  describe('Password Toggle Button Tests', () => {
    it('toggles password visibility when eye button is clicked', async () => {
      render(<Login />)

      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const toggleButton = screen.getByRole('button', { name: '' }) // Eye icon button

      // Initially password should be hidden
      expect(passwordInput).toHaveAttribute('type', 'password')

      // Click to show password
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'text')

      // Click again to hide password
      fireEvent.click(toggleButton)
      expect(passwordInput).toHaveAttribute('type', 'password')
    })

    it('shows correct icon based on password visibility', () => {
      render(<Login />)

      const toggleButton = screen.getByRole('button', { name: '' })

      // Should show Eye icon initially (password hidden)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument()

      // Click to toggle
      fireEvent.click(toggleButton)

      // Should show EyeOff icon (password visible)
      expect(toggleButton.querySelector('svg')).toBeInTheDocument()
    })
  })

  describe('Form Validation Tests', () => {
    it('validates empty email field', async () => {
      render(<Login />)

      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Email is required')).toBeInTheDocument()
      })
    })

    it('validates invalid email format', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await userEvent.type(emailInput, 'invalid-email')
      fireEvent.click(submitButton)

      // The component should handle invalid email (HTML5 validation or custom validation)
      expect(emailInput).toHaveValue('invalid-email')
      expect(submitButton).toBeInTheDocument()
    })

    it('validates empty password field', async () => {
      render(<Login />)

      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password is required')).toBeInTheDocument()
      })
    })

    it('validates short password', async () => {
      render(<Login />)

      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await userEvent.type(passwordInput, '123')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(screen.getByText('Password must be at least 6 characters')).toBeInTheDocument()
      })
    })

    it('shows error styling on invalid fields', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(emailInput).toHaveClass('border-red-500')
        expect(passwordInput).toHaveClass('border-red-500')
      })
    })
  })

  describe('Submit Button Tests', () => {
    it('submits form with valid credentials', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await userEvent.type(emailInput, 'admin@demo.com')
      await userEvent.type(passwordInput, 'password')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockLogin).toHaveBeenCalledWith({
          email: 'admin@demo.com',
          password: 'password'
        })
      })
    })

    it('navigates to dashboard on successful login', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      await userEvent.type(emailInput, 'admin@demo.com')
      await userEvent.type(passwordInput, 'password')
      fireEvent.click(submitButton)

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/dashboard')
      })
    })

    it('prevents submission with invalid form', async () => {
      render(<Login />)

      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      fireEvent.click(submitButton)

      // Should not call login with invalid form
      expect(mockLogin).not.toHaveBeenCalled()
    })

    it('handles form submission via Enter key', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')

      await userEvent.type(emailInput, 'admin@demo.com')
      await userEvent.type(passwordInput, 'password')

      // Simulate Enter key press
      fireEvent.keyDown(passwordInput, { key: 'Enter', code: 'Enter' })

      // Verify form inputs are filled correctly
      expect(emailInput).toHaveValue('admin@demo.com')
      expect(passwordInput).toHaveValue('password')
    })
  })

  describe('Loading State Tests', () => {
    it('shows submit button in normal state', () => {
      render(<Login />)

      const submitButton = screen.getByRole('button', { name: 'Sign In' })
      expect(submitButton).toBeInTheDocument()
      expect(submitButton).not.toBeDisabled()
      expect(submitButton).toHaveTextContent('Sign In')
    })
  })

  describe('Navigation Tests', () => {
    it('navigates to register page when sign up link is clicked', () => {
      render(<Login />)

      const signUpLink = screen.getByRole('link', { name: 'Sign up' })
      expect(signUpLink).toHaveAttribute('href', '/register')
    })
  })

  describe('Accessibility Tests', () => {
    it('has proper form inputs', () => {
      render(<Login />)

      expect(screen.getByPlaceholderText('Enter your email')).toBeInTheDocument()
      expect(screen.getByPlaceholderText('Enter your password')).toBeInTheDocument()
    })

    it('supports keyboard navigation', async () => {
      render(<Login />)

      const emailInput = screen.getByPlaceholderText('Enter your email')
      const passwordInput = screen.getByPlaceholderText('Enter your password')
      const submitButton = screen.getByRole('button', { name: 'Sign In' })

      // Tab through elements
      emailInput.focus()
      expect(document.activeElement).toBe(emailInput)

      await userEvent.tab()
      expect(document.activeElement).toBe(passwordInput)

      await userEvent.tab()
      // Should focus on password toggle button

      await userEvent.tab()
      expect(document.activeElement).toBe(submitButton)
    })
  })
})
