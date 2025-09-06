import React from 'react'
import { motion } from 'framer-motion'
import { ArrowLeft, RefreshCw, Download } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useNavigate } from 'react-router-dom'

const FinancialPageLayout = ({ 
  children, 
  title, 
  description, 
  icon: Icon,
  onRefresh,
  onExport,
  loading = false,
  showBackButton = true,
  additionalButtons = []
}) => {
  const navigate = useNavigate()

  return (
    <div className="container mx-auto px-4 py-6 max-w-7xl bg-background min-h-screen">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.6 }}
      >
        {/* Header */}
        <div className="flex justify-between items-center mb-6">
          <div className="flex items-center gap-4">
            {showBackButton && (
              <Button variant="outline" onClick={() => navigate('/financials')}>
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            )}
            <div className="flex items-center gap-3">
              {Icon && (
                <div className="w-10 h-10 bg-gradient-to-r from-amber-500 to-amber-600 rounded-lg flex items-center justify-center">
                  <Icon className="h-6 w-6 text-white" />
                </div>
              )}
              <div>
                <h1 className="text-3xl font-bold text-foreground">{title}</h1>
                {description && (
                  <p className="text-muted-foreground mt-1">{description}</p>
                )}
              </div>
            </div>
          </div>
          
          {/* Action Buttons */}
          <div className="flex items-center space-x-3">
            {onRefresh && (
              <Button variant="outline" onClick={onRefresh} disabled={loading}>
                <RefreshCw className={`h-4 w-4 mr-2 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </Button>
            )}
            {onExport && (
              <Button variant="outline" onClick={onExport}>
                <Download className="h-4 w-4 mr-2" />
                Export
              </Button>
            )}
            {additionalButtons.map((button, index) => (
              <Button
                key={index}
                onClick={button.onClick}
                className={button.className || "bg-amber-600 hover:bg-amber-700"}
                variant={button.variant || "default"}
                disabled={button.disabled || loading}
              >
                {button.icon && <button.icon className="h-4 w-4 mr-2" />}
                {button.label}
              </Button>
            ))}
          </div>
        </div>

        {/* Content */}
        {children}
      </motion.div>
    </div>
  )
}

export default FinancialPageLayout