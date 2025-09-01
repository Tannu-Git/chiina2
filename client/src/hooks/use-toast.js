import { useState, useCallback } from 'react'
import toast from 'react-hot-toast'

export const useToast = () => {
  const [toasts, setToasts] = useState([])

  const showToast = useCallback(({ title, description, variant = 'default' }) => {
    const toastId = Math.random().toString(36).substr(2, 9)
    
    const newToast = {
      id: toastId,
      title,
      description,
      variant
    }

    setToasts(prev => [...prev, newToast])

    // Use react-hot-toast for actual display
    if (variant === 'destructive') {
      toast.error(description || title)
    } else {
      toast.success(description || title)
    }

    // Auto remove after 5 seconds
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toastId))
    }, 5000)

    return toastId
  }, [])

  const dismissToast = useCallback((toastId) => {
    setToasts(prev => prev.filter(t => t.id !== toastId))
    toast.dismiss(toastId)
  }, [])

  return {
    toast: showToast,
    dismiss: dismissToast,
    toasts
  }
}