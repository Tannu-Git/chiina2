import { clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs) {
  return twMerge(clsx(inputs))
}

export function formatCurrency(amount, currency = 'INR') {
  const formatter = new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  })
  return formatter.format(amount)
}

export function formatNumber(number) {
  return new Intl.NumberFormat('en-IN').format(number)
}

export function formatDate(date) {
  if (!date) return 'N/A';

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Invalid Date';

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
  }).format(parsedDate)
}

export function formatDateTime(date) {
  if (!date) return 'N/A';

  const parsedDate = new Date(date);
  if (isNaN(parsedDate.getTime())) return 'Invalid Date';

  return new Intl.DateTimeFormat('en-IN', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(parsedDate)
}

export function getStatusColor(status) {
  const statusColors = {
    draft: 'bg-stone-100 text-stone-800',
    pending: 'bg-amber-100 text-amber-800',
    submitted: 'bg-amber-200 text-amber-900',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-amber-50 text-amber-700',
    completed: 'bg-green-100 text-green-800',
    cancelled: 'bg-red-100 text-red-800',
    planning: 'bg-stone-100 text-stone-800',
    loading: 'bg-amber-100 text-amber-800',
    sealed: 'bg-amber-200 text-amber-900',
    shipped: 'bg-amber-100 text-amber-800',
    in_transit: 'bg-amber-50 text-amber-700',
    arrived: 'bg-green-50 text-green-700',
    cleared: 'bg-green-100 text-green-800',
    delivered: 'bg-green-100 text-green-800',
  }
  return statusColors[status] || 'bg-stone-100 text-stone-800'
}

export function getPriorityColor(priority) {
  const priorityColors = {
    low: 'bg-stone-100 text-stone-700',
    medium: 'bg-amber-100 text-amber-800',
    high: 'bg-amber-200 text-amber-900',
    urgent: 'bg-red-100 text-red-800',
  }
  return priorityColors[priority] || 'bg-stone-100 text-stone-800'
}

export function generateOrderNumber() {
  const timestamp = Date.now().toString().slice(-6)
  const random = Math.random().toString(36).substr(2, 3).toUpperCase()
  return `ORD-${timestamp}${random}`
}

export function generateContainerNumber() {
  const random = Math.random().toString(36).substr(2, 8).toUpperCase()
  return `SHIP-${random}`
}

export function debounce(func, wait) {
  let timeout
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout)
      func(...args)
    }
    clearTimeout(timeout)
    timeout = setTimeout(later, wait)
  }
}

// Unified carrying charge calculation function
export function calculateCarryingCharge(basis, rate, item) {
  if (!rate || rate <= 0) return 0

  switch (basis) {
    case 'carton':
      return (item.cartons || 0) * rate
    case 'weight':
      return (item.unitWeight || 0) * (item.quantity || 0) * rate
    case 'cbm':
      return (item.unitCbm || 0) * (item.quantity || 0) * rate
    default:
      return 0
  }
}

export function throttle(func, limit) {
  let inThrottle
  return function() {
    const args = arguments
    const context = this
    if (!inThrottle) {
      func.apply(context, args)
      inThrottle = true
      setTimeout(() => inThrottle = false, limit)
    }
  }
}

export function downloadCSV(data, filename) {
  const csvContent = "data:text/csv;charset=utf-8,"
    + data.map(row => Object.values(row).join(",")).join("\n")

  const encodedUri = encodeURI(csvContent)
  const link = document.createElement("a")
  link.setAttribute("href", encodedUri)
  link.setAttribute("download", `${filename}.csv`)
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

export function validateEmail(email) {
  const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return re.test(email)
}

export function validatePhone(phone) {
  const re = /^[\+]?[1-9][\d]{0,15}$/
  return re.test(phone)
}

export function truncateText(text, maxLength) {
  if (text.length <= maxLength) return text
  return text.substr(0, maxLength) + '...'
}

export function getInitials(name) {
  return name
    .split(' ')
    .map(word => word[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)
}
