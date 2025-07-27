import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import {
  TrendingUp,
  TrendingDown,
  Target,
  AlertTriangle,
  Info,
  DollarSign,
  Percent,
  BarChart3
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { formatCurrency } from '@/lib/utils'

const ProfitGauge = ({ 
  currentProfit, 
  targetProfit, 
  previousProfit, 
  currency = 'USD',
  period = 'This Month',
  showDetails = true 
}) => {
  const [animatedValue, setAnimatedValue] = useState(0)
  
  // Calculate metrics
  const profitMargin = targetProfit > 0 ? (currentProfit / targetProfit) * 100 : 0
  const profitChange = previousProfit > 0 ? ((currentProfit - previousProfit) / previousProfit) * 100 : 0
  const isPositiveChange = profitChange >= 0
  const isOnTarget = profitMargin >= 90
  const isWarning = profitMargin < 70 && profitMargin >= 50
  const isCritical = profitMargin < 50

  // Animate the gauge
  useEffect(() => {
    const timer = setTimeout(() => {
      setAnimatedValue(Math.min(profitMargin, 100))
    }, 300)
    return () => clearTimeout(timer)
  }, [profitMargin])

  // Gauge colors based on performance
  const getGaugeColor = () => {
    if (isCritical) return '#ef4444' // red
    if (isWarning) return '#f59e0b' // yellow
    return '#10b981' // green
  }

  const getStatusBadge = () => {
    if (isOnTarget) return { text: 'On Target', color: 'bg-green-100 text-green-800' }
    if (isWarning) return { text: 'Below Target', color: 'bg-yellow-100 text-yellow-800' }
    if (isCritical) return { text: 'Critical', color: 'bg-red-100 text-red-800' }
    return { text: 'Good', color: 'bg-blue-100 text-blue-800' }
  }

  // SVG Gauge Component
  const GaugeChart = () => {
    const size = 200
    const strokeWidth = 20
    const radius = (size - strokeWidth) / 2
    const circumference = radius * 2 * Math.PI
    const strokeDasharray = circumference
    const strokeDashoffset = circumference - (animatedValue / 100) * circumference

    return (
      <div className="relative">
        <svg width={size} height={size} className="transform -rotate-90">
          {/* Background circle */}
          <circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke="#e5e7eb"
            strokeWidth={strokeWidth}
            fill="none"
          />
          
          {/* Progress circle */}
          <motion.circle
            cx={size / 2}
            cy={size / 2}
            r={radius}
            stroke={getGaugeColor()}
            strokeWidth={strokeWidth}
            fill="none"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
            initial={{ strokeDashoffset: circumference }}
            animate={{ strokeDashoffset }}
            transition={{ duration: 1.5, ease: "easeOut" }}
          />
          
          {/* Target marker */}
          <circle
            cx={size / 2 + radius * Math.cos((90 / 100) * 2 * Math.PI - Math.PI / 2)}
            cy={size / 2 + radius * Math.sin((90 / 100) * 2 * Math.PI - Math.PI / 2)}
            r="4"
            fill="#6b7280"
          />
        </svg>
        
        {/* Center content */}
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-3xl font-bold text-gray-900">
            {Math.round(animatedValue)}%
          </div>
          <div className="text-sm text-gray-500 text-center">
            of target
          </div>
        </div>
      </div>
    )
  }

  const statusBadge = getStatusBadge()

  return (
    <Card className="overflow-hidden">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center text-lg">
              <Target className="h-5 w-5 mr-2" />
              Profit Performance
            </CardTitle>
            <CardDescription>{period}</CardDescription>
          </div>
          <Badge className={statusBadge.color}>
            {statusBadge.text}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent>
        <div className="flex flex-col lg:flex-row items-center space-y-6 lg:space-y-0 lg:space-x-6">
          {/* Gauge Chart */}
          <div className="flex-shrink-0">
            <GaugeChart />
          </div>
          
          {/* Metrics */}
          <div className="flex-1 space-y-4 w-full">
            {/* Current vs Target */}
            <div className="grid grid-cols-2 gap-4">
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Current Profit</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(currentProfit)}
                </div>
              </div>
              <div className="text-center p-3 bg-gray-50 rounded-lg">
                <div className="text-sm text-gray-600 mb-1">Target Profit</div>
                <div className="text-xl font-bold text-gray-900">
                  {formatCurrency(targetProfit)}
                </div>
              </div>
            </div>
            
            {/* Change from Previous Period */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                {isPositiveChange ? (
                  <TrendingUp className="h-4 w-4 text-green-600 mr-2" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-red-600 mr-2" />
                )}
                <span className="text-sm text-gray-600">vs Previous Period</span>
              </div>
              <div className={`font-semibold ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                {isPositiveChange ? '+' : ''}{profitChange.toFixed(1)}%
              </div>
            </div>
            
            {/* Gap to Target */}
            <div className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center">
                <Target className="h-4 w-4 text-blue-600 mr-2" />
                <span className="text-sm text-gray-600">Gap to Target</span>
              </div>
              <div className="font-semibold text-gray-900">
                {formatCurrency(Math.max(0, targetProfit - currentProfit))}
              </div>
            </div>
          </div>
        </div>
        
        {/* Detailed Breakdown */}
        {showDetails && (
          <div className="mt-6 pt-6 border-t">
            <h4 className="font-medium text-gray-900 mb-3 flex items-center">
              <BarChart3 className="h-4 w-4 mr-2" />
              Performance Breakdown
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="text-center">
                <div className="text-2xl font-bold text-blue-600">
                  {Math.round(profitMargin)}%
                </div>
                <div className="text-sm text-gray-600">Target Achievement</div>
              </div>
              
              <div className="text-center">
                <div className="text-2xl font-bold text-green-600">
                  {formatCurrency(currentProfit)}
                </div>
                <div className="text-sm text-gray-600">Actual Profit</div>
              </div>
              
              <div className="text-center">
                <div className={`text-2xl font-bold ${isPositiveChange ? 'text-green-600' : 'text-red-600'}`}>
                  {isPositiveChange ? '+' : ''}{profitChange.toFixed(1)}%
                </div>
                <div className="text-sm text-gray-600">Growth Rate</div>
              </div>
            </div>
          </div>
        )}
        
        {/* Alerts */}
        {(isCritical || isWarning) && (
          <div className={`mt-4 p-3 rounded-lg flex items-start ${
            isCritical ? 'bg-red-50 border border-red-200' : 'bg-yellow-50 border border-yellow-200'
          }`}>
            <AlertTriangle className={`h-4 w-4 mt-0.5 mr-2 ${
              isCritical ? 'text-red-600' : 'text-yellow-600'
            }`} />
            <div className={`text-sm ${isCritical ? 'text-red-700' : 'text-yellow-700'}`}>
              {isCritical ? (
                <div>
                  <p className="font-medium">Critical Performance Alert</p>
                  <p>Profit is significantly below target. Immediate action required.</p>
                </div>
              ) : (
                <div>
                  <p className="font-medium">Performance Warning</p>
                  <p>Profit is below target. Consider reviewing strategies.</p>
                </div>
              )}
            </div>
          </div>
        )}
        
        {/* Success Message */}
        {isOnTarget && (
          <div className="mt-4 p-3 bg-green-50 border border-green-200 rounded-lg flex items-start">
            <Target className="h-4 w-4 mt-0.5 mr-2 text-green-600" />
            <div className="text-sm text-green-700">
              <p className="font-medium">Target Achieved!</p>
              <p>Excellent performance. Profit is on or above target.</p>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  )
}

export default ProfitGauge
