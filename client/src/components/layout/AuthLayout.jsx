import React from 'react'

const AuthLayout = ({ children }) => {
  return (
    <div className="min-h-screen bg-background">
      {children}
    </div>
  )
}

export default AuthLayout
