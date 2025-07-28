// Comprehensive validation utilities for the logistics OMS

export const validateEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
  return emailRegex.test(email)
}

export const validatePhone = (phone) => {
  const phoneRegex = /^[\+]?[1-9][\d]{0,15}$/
  return phoneRegex.test(phone)
}

export const validateRequired = (value, fieldName) => {
  if (!value || (typeof value === 'string' && !value.trim())) {
    return `${fieldName} is required`
  }
  return null
}

export const validateNumber = (value, fieldName, options = {}) => {
  const { min = 0, max = Infinity, required = false } = options

  if (!value && !required) return null

  if (!value && required) {
    return `${fieldName} is required`
  }

  const num = parseFloat(value)
  if (isNaN(num)) {
    return `${fieldName} must be a valid number`
  }

  if (num < min) {
    return `${fieldName} must be at least ${min}`
  }

  if (num > max) {
    return `${fieldName} must not exceed ${max}`
  }

  return null
}

export const validateInteger = (value, fieldName, options = {}) => {
  const { min = 0, max = Infinity, required = false } = options

  if (!value && !required) return null

  if (!value && required) {
    return `${fieldName} is required`
  }

  const num = parseInt(value)
  if (isNaN(num) || !Number.isInteger(num)) {
    return `${fieldName} must be a valid integer`
  }

  if (num < min) {
    return `${fieldName} must be at least ${min}`
  }

  if (num > max) {
    return `${fieldName} must not exceed ${max}`
  }

  return null
}

export const validateSelect = (value, fieldName, allowedValues) => {
  if (!value) {
    return `${fieldName} is required`
  }

  if (!allowedValues.includes(value)) {
    return `${fieldName} must be one of: ${allowedValues.join(', ')}`
  }

  return null
}

export const validateOrderItem = (item, index) => {
  const errors = []

  // Required fields
  const itemCodeError = validateRequired(item.itemCode, 'Item code')
  if (itemCodeError) errors.push(`Item ${index + 1}: ${itemCodeError}`)

  const descriptionError = validateRequired(item.description, 'Description')
  if (descriptionError) errors.push(`Item ${index + 1}: ${descriptionError}`)

  // Numeric validations
  const quantityError = validateInteger(item.quantity, 'Quantity', { min: 1, required: true })
  if (quantityError) errors.push(`Item ${index + 1}: ${quantityError}`)

  // Unit price is optional for THROUGH_ME payment type
  if (item.paymentType !== 'THROUGH_ME') {
    const unitPriceError = validateNumber(item.unitPrice, 'Unit price', { min: 0, required: true })
    if (unitPriceError) errors.push(`Item ${index + 1}: ${unitPriceError}`)
  } else if (item.unitPrice) {
    // If price is provided for THROUGH_ME, validate it
    const unitPriceError = validateNumber(item.unitPrice, 'Unit price', { min: 0 })
    if (unitPriceError) errors.push(`Item ${index + 1}: ${unitPriceError}`)
  }

  const unitWeightError = validateNumber(item.unitWeight, 'Unit weight', { min: 0 })
  if (unitWeightError) errors.push(`Item ${index + 1}: ${unitWeightError}`)

  const unitCbmError = validateNumber(item.unitCbm, 'Unit CBM', { min: 0 })
  if (unitCbmError) errors.push(`Item ${index + 1}: ${unitCbmError}`)

  const cartonsError = validateInteger(item.cartons, 'Cartons', { min: 1 })
  if (cartonsError) errors.push(`Item ${index + 1}: ${cartonsError}`)

  // Select field validations
  const paymentTypeError = validateSelect(item.paymentType, 'Payment type', ['CLIENT_DIRECT', 'THROUGH_ME'])
  if (paymentTypeError) errors.push(`Item ${index + 1}: ${paymentTypeError}`)

  // Carrying charge validation
  if (item.carryingCharge) {
    const basisError = validateSelect(item.carryingCharge.basis, 'Carrying charge basis', ['carton', 'weight', 'cbm'])
    if (basisError) errors.push(`Item ${index + 1}: ${basisError}`)

    const rateError = validateNumber(item.carryingCharge.rate, 'Carrying charge rate', { min: 0 })
    if (rateError) errors.push(`Item ${index + 1}: ${rateError}`)
  }

  return errors
}

export const validateOrder = (orderData) => {
  const errors = []

  // Client name validation
  const clientNameError = validateRequired(orderData.clientName, 'Client name')
  if (clientNameError) errors.push(clientNameError)

  // Items validation
  if (!orderData.items || orderData.items.length === 0) {
    errors.push('At least one item is required')
  } else {
    orderData.items.forEach((item, index) => {
      const itemErrors = validateOrderItem(item, index)
      errors.push(...itemErrors)
    })
  }

  // Priority validation
  if (orderData.priority) {
    const priorityError = validateSelect(orderData.priority, 'Priority', ['low', 'medium', 'high', 'urgent'])
    if (priorityError) errors.push(priorityError)
  }

  // Deadline validation
  if (orderData.deadline) {
    const deadlineDate = new Date(orderData.deadline)
    const today = new Date()
    today.setHours(0, 0, 0, 0)

    if (deadlineDate < today) {
      errors.push('Deadline cannot be in the past')
    }
  }

  // Notes validation
  if (orderData.notes && orderData.notes.length > 1000) {
    errors.push('Notes cannot exceed 1000 characters')
  }

  return errors
}

export const validateUser = (userData) => {
  const errors = []

  // Name validation
  const nameError = validateRequired(userData.name, 'Name')
  if (nameError) errors.push(nameError)

  // Email validation
  const emailRequiredError = validateRequired(userData.email, 'Email')
  if (emailRequiredError) {
    errors.push(emailRequiredError)
  } else if (!validateEmail(userData.email)) {
    errors.push('Please enter a valid email address')
  }

  // Phone validation (if provided)
  if (userData.phone && !validatePhone(userData.phone)) {
    errors.push('Please enter a valid phone number')
  }

  // Password validation
  if (userData.password) {
    if (userData.password.length < 6) {
      errors.push('Password must be at least 6 characters long')
    }

    if (userData.confirmPassword && userData.password !== userData.confirmPassword) {
      errors.push('Passwords do not match')
    }
  }

  return errors
}

export const validateContainer = (containerData) => {
  const errors = []

  // Container number validation
  const containerNumberError = validateRequired(containerData.containerNumber, 'Container number')
  if (containerNumberError) errors.push(containerNumberError)

  // Type validation
  const typeError = validateSelect(containerData.type, 'Container type', ['20ft', '40ft', '40ft_hc', '45ft'])
  if (typeError) errors.push(typeError)

  // Status validation
  const statusError = validateSelect(containerData.status, 'Status', ['empty', 'loading', 'loaded', 'in_transit', 'delivered'])
  if (statusError) errors.push(statusError)

  // Capacity validations
  const maxWeightError = validateNumber(containerData.maxWeight, 'Max weight', { min: 0, required: true })
  if (maxWeightError) errors.push(maxWeightError)

  const maxVolumeError = validateNumber(containerData.maxVolume, 'Max volume', { min: 0, required: true })
  if (maxVolumeError) errors.push(maxVolumeError)

  return errors
}

// Utility function to display validation errors
export const displayValidationErrors = (errors, toastFunction) => {
  if (errors.length === 0) return true

  if (errors.length === 1) {
    toastFunction.error(errors[0])
  } else {
    toastFunction.error(`Please fix the following errors:\n• ${errors.join('\n• ')}`)
  }

  return false
}

// Real-time field validation for forms
export const createFieldValidator = (validationFn) => {
  return (value, ...args) => {
    try {
      return validationFn(value, ...args)
    } catch (error) {
      console.error('Validation error:', error)
      return 'Validation error occurred'
    }
  }
}
