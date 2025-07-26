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

export function calculateCarryingCharge(basis, rate, item) {
  switch(basis) {
    case 'carton':
      return rate * item.cartons
    case 'cbm':
      return rate * (item.unitCbm * item.cartons)
    case 'weight':
      return rate * (item.unitWeight * item.cartons)
    default:
      return 0
  }
}

export function getStatusColor(status) {
  const statusColors = {
    draft: 'bg-gray-100 text-gray-800',
    pending: 'bg-yellow-100 text-yellow-800',
    submitted: 'bg-blue-100 text-blue-800',
    confirmed: 'bg-green-100 text-green-800',
    in_progress: 'bg-purple-100 text-purple-800',
    completed: 'bg-emerald-100 text-emerald-800',
    cancelled: 'bg-red-100 text-red-800',
    planning: 'bg-slate-100 text-slate-800',
    loading: 'bg-orange-100 text-orange-800',
    sealed: 'bg-indigo-100 text-indigo-800',
    shipped: 'bg-blue-100 text-blue-800',
    in_transit: 'bg-cyan-100 text-cyan-800',
    arrived: 'bg-teal-100 text-teal-800',
    cleared: 'bg-lime-100 text-lime-800',
    delivered: 'bg-green-100 text-green-800',
  }
  return statusColors[status] || 'bg-gray-100 text-gray-800'
}

export function getPriorityColor(priority) {
  const priorityColors = {
    low: 'bg-green-100 text-green-800',
    medium: 'bg-yellow-100 text-yellow-800',
    high: 'bg-orange-100 text-orange-800',
    urgent: 'bg-red-100 text-red-800',
  }
  return priorityColors[priority] || 'bg-gray-100 text-gray-800'
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
