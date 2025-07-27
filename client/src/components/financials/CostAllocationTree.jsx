import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  ChevronRight,
  DollarSign,
  Package,
  Truck,
  Ship,
  Building,
  Users,
  Zap,
  PieChart,
  BarChart3,
  TrendingUp,
  Info
} from 'lucide-react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Button } from '@/components/ui/button'
import { formatCurrency } from '@/lib/utils'

const CostAllocationTree = ({ containerData, showPercentages = true, expandAll = false }) => {
  const [expandedNodes, setExpandedNodes] = useState(new Set(expandAll ? ['root'] : []))

  // Sample cost allocation data structure
  const costStructure = {
    id: 'root',
    name: 'Total Container Costs',
    amount: containerData?.totalCost || 125000,
    percentage: 100,
    icon: Ship,
    children: [
      {
        id: 'shipping',
        name: 'Shipping & Logistics',
        amount: 45000,
        percentage: 36,
        icon: Truck,
        children: [
          { id: 'ocean_freight', name: 'Ocean Freight', amount: 28000, percentage: 22.4, icon: Ship },
          { id: 'port_charges', name: 'Port Charges', amount: 8500, percentage: 6.8, icon: Building },
          { id: 'inland_transport', name: 'Inland Transport', amount: 5200, percentage: 4.2, icon: Truck },
          { id: 'customs', name: 'Customs & Clearance', amount: 3300, percentage: 2.6, icon: Building }
        ]
      },
      {
        id: 'goods',
        name: 'Goods & Products',
        amount: 65000,
        percentage: 52,
        icon: Package,
        children: [
          { id: 'product_cost', name: 'Product Cost', amount: 58000, percentage: 46.4, icon: Package },
          { id: 'packaging', name: 'Packaging', amount: 4200, percentage: 3.4, icon: Package },
          { id: 'quality_control', name: 'Quality Control', amount: 2800, percentage: 2.2, icon: Zap }
        ]
      },
      {
        id: 'overhead',
        name: 'Overhead & Admin',
        amount: 15000,
        percentage: 12,
        icon: Building,
        children: [
          { id: 'admin_fees', name: 'Administrative Fees', amount: 6500, percentage: 5.2, icon: Users },
          { id: 'insurance', name: 'Insurance', amount: 4200, percentage: 3.4, icon: Building },
          { id: 'documentation', name: 'Documentation', amount: 2800, percentage: 2.2, icon: Building },
          { id: 'handling', name: 'Handling Charges', amount: 1500, percentage: 1.2, icon: Users }
        ]
      }
    ]
  }

  const toggleNode = (nodeId) => {
    const newExpanded = new Set(expandedNodes)
    if (newExpanded.has(nodeId)) {
      newExpanded.delete(nodeId)
    } else {
      newExpanded.add(nodeId)
    }
    setExpandedNodes(newExpanded)
  }

  const getColorByPercentage = (percentage) => {
    if (percentage >= 30) return 'bg-red-100 text-red-800'
    if (percentage >= 15) return 'bg-orange-100 text-orange-800'
    if (percentage >= 5) return 'bg-yellow-100 text-yellow-800'
    return 'bg-green-100 text-green-800'
  }

  const TreeNode = ({ node, level = 0, parentAmount = 0 }) => {
    const isExpanded = expandedNodes.has(node.id)
    const hasChildren = node.children && node.children.length > 0
    const IconComponent = node.icon || Package

    return (
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ duration: 0.3, delay: level * 0.1 }}
        className="w-full"
      >
        <div
          className={`flex items-center justify-between p-3 rounded-lg border transition-all duration-200 ${
            level === 0 
              ? 'bg-gradient-to-r from-blue-50 to-purple-50 border-blue-200' 
              : 'bg-white border-gray-200 hover:border-gray-300 hover:shadow-sm'
          }`}
          style={{ marginLeft: `${level * 20}px` }}
        >
          <div className="flex items-center space-x-3 flex-1">
            {hasChildren && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => toggleNode(node.id)}
                className="p-1 h-6 w-6"
              >
                {isExpanded ? (
                  <ChevronDown className="h-3 w-3" />
                ) : (
                  <ChevronRight className="h-3 w-3" />
                )}
              </Button>
            )}
            
            {!hasChildren && <div className="w-6" />}
            
            <div className={`p-2 rounded-lg ${
              level === 0 ? 'bg-blue-100' : 'bg-gray-100'
            }`}>
              <IconComponent className={`h-4 w-4 ${
                level === 0 ? 'text-blue-600' : 'text-gray-600'
              }`} />
            </div>
            
            <div className="flex-1">
              <div className="flex items-center space-x-2">
                <span className={`font-medium ${
                  level === 0 ? 'text-lg text-gray-900' : 'text-gray-800'
                }`}>
                  {node.name}
                </span>
                
                {showPercentages && (
                  <Badge className={`text-xs ${getColorByPercentage(node.percentage)}`}>
                    {node.percentage.toFixed(1)}%
                  </Badge>
                )}
              </div>
              
              {level > 0 && (
                <div className="text-sm text-gray-500 mt-1">
                  Allocation: {((node.amount / parentAmount) * 100).toFixed(1)}% of parent
                </div>
              )}
            </div>
          </div>
          
          <div className="text-right">
            <div className={`font-bold ${
              level === 0 ? 'text-xl text-gray-900' : 'text-lg text-gray-800'
            }`}>
              {formatCurrency(node.amount)}
            </div>
            
            {level > 0 && (
              <div className="text-sm text-gray-500">
                ${(node.amount / (containerData?.totalUnits || 1)).toFixed(2)}/unit
              </div>
            )}
          </div>
        </div>

        <AnimatePresence>
          {isExpanded && hasChildren && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.3 }}
              className="mt-2 space-y-2"
            >
              {node.children.map((child) => (
                <TreeNode
                  key={child.id}
                  node={child}
                  level={level + 1}
                  parentAmount={node.amount}
                />
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    )
  }

  // Calculate summary statistics
  const totalCategories = costStructure.children?.length || 0
  const largestCategory = costStructure.children?.reduce((max, cat) => 
    cat.amount > max.amount ? cat : max, costStructure.children[0]
  )
  const averageCategorySize = costStructure.amount / totalCategories

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center">
              <PieChart className="h-5 w-5 mr-2" />
              Cost Allocation Tree
            </CardTitle>
            <CardDescription>
              Hierarchical breakdown of container costs and allocations
            </CardDescription>
          </div>
          
          <div className="flex items-center space-x-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedNodes(new Set(['root', 'shipping', 'goods', 'overhead']))}
            >
              Expand All
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setExpandedNodes(new Set())}
            >
              Collapse All
            </Button>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Summary Stats */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{totalCategories}</div>
            <div className="text-sm text-gray-600">Cost Categories</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-green-600">
              {largestCategory ? largestCategory.percentage.toFixed(1) : 0}%
            </div>
            <div className="text-sm text-gray-600">Largest Category</div>
            <div className="text-xs text-gray-500">{largestCategory?.name}</div>
          </div>
          
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">
              {formatCurrency(averageCategorySize)}
            </div>
            <div className="text-sm text-gray-600">Average Category</div>
          </div>
        </div>

        {/* Cost Tree */}
        <div className="space-y-2">
          <TreeNode node={costStructure} />
        </div>

        {/* Cost Distribution Chart */}
        <div className="mt-6 p-4 bg-gray-50 rounded-lg">
          <h4 className="font-medium text-gray-900 mb-3 flex items-center">
            <BarChart3 className="h-4 w-4 mr-2" />
            Cost Distribution
          </h4>
          
          <div className="space-y-2">
            {costStructure.children?.map((category) => (
              <div key={category.id} className="flex items-center space-x-3">
                <div className="flex items-center space-x-2 flex-1">
                  <category.icon className="h-4 w-4 text-gray-600" />
                  <span className="text-sm font-medium text-gray-700">{category.name}</span>
                </div>
                
                <div className="flex-1">
                  <div className="w-full bg-gray-200 rounded-full h-2">
                    <motion.div
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-2 rounded-full"
                      initial={{ width: 0 }}
                      animate={{ width: `${category.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
                
                <div className="text-right min-w-20">
                  <div className="text-sm font-medium text-gray-900">
                    {formatCurrency(category.amount)}
                  </div>
                  <div className="text-xs text-gray-500">
                    {category.percentage.toFixed(1)}%
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Insights */}
        <div className="mt-6 p-4 bg-blue-50 rounded-lg">
          <div className="flex items-start space-x-2">
            <Info className="h-4 w-4 text-blue-500 mt-0.5" />
            <div className="text-sm text-blue-700">
              <p className="font-medium mb-1">Cost Allocation Insights:</p>
              <ul className="list-disc list-inside space-y-1">
                <li>Goods represent the largest cost component at {costStructure.children?.[1]?.percentage.toFixed(1)}%</li>
                <li>Shipping costs account for {costStructure.children?.[0]?.percentage.toFixed(1)}% of total expenses</li>
                <li>Overhead costs are maintained at {costStructure.children?.[2]?.percentage.toFixed(1)}% for operational efficiency</li>
                <li>Click on categories to expand and view detailed breakdowns</li>
              </ul>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}

export default CostAllocationTree
