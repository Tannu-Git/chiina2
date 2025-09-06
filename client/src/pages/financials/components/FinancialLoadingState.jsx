import React from 'react'

const FinancialLoadingState = ({ message = "Loading financial data..." }) => {
  return (
    <div className="min-h-screen bg-background flex items-center justify-center">
      <div className="flex items-center space-x-2">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-amber-500"></div>
        <span className="text-lg text-muted-foreground">{message}</span>
      </div>
    </div>
  )
}

export default FinancialLoadingState