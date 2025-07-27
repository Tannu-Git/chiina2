import React, { forwardRef } from 'react'
import { cn } from '@/lib/utils'

const ExcelInput = forwardRef(({ 
  className, 
  type = "text", 
  error,
  success,
  ...props 
}, ref) => {
  return (
    <input
      type={type}
      className={cn(
        "excel-input",
        error && "border-red-300 focus:ring-red-300 focus:bg-red-50",
        success && "border-green-300 focus:ring-green-300 focus:bg-green-50",
        className
      )}
      ref={ref}
      {...props}
    />
  )
})

ExcelInput.displayName = "ExcelInput"

export { ExcelInput }
