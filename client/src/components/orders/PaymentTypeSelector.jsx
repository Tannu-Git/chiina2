import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  ChevronDown,
  CreditCard,
  Truck,
  Ship,
  Plane,
  Building,
  DollarSign,
  Info,
  AlertCircle
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'

const PaymentTypeSelector = ({ value, onChange }) => {
  const [isOpen, setIsOpen] = useState(false)

  const paymentTypes = [
    {
      code: 'FOB',
      name: 'Free On Board',
      description: 'Seller delivers goods on board the vessel. Buyer assumes risk and cost from that point.',
      icon: Ship,
      riskLevel: 'medium',
      commonUse: 'Sea freight',
      buyerResponsible: ['Marine insurance', 'Freight charges', 'Import duties', 'Destination handling'],
      sellerResponsible: ['Export packing', 'Loading charges', 'Export clearance', 'Delivery to port']
    },
    {
      code: 'CIF',
      name: 'Cost, Insurance & Freight',
      description: 'Seller pays for shipping and insurance to destination port. Risk transfers at origin port.',
      icon: Ship,
      riskLevel: 'low',
      commonUse: 'Sea freight',
      buyerResponsible: ['Import duties', 'Destination handling', 'Inland transport'],
      sellerResponsible: ['Marine insurance', 'Freight charges', 'Export clearance', 'Loading charges']
    },
    {
      code: 'EXW',
      name: 'Ex Works',
      description: 'Buyer collects goods from seller\'s premises. Seller has minimal obligations.',
      icon: Building,
      riskLevel: 'high',
      commonUse: 'All transport modes',
      buyerResponsible: ['All transport', 'All insurance', 'Export/import clearance', 'All duties'],
      sellerResponsible: ['Make goods available', 'Provide commercial invoice']
    },
    {
      code: 'DDP',
      name: 'Delivered Duty Paid',
      description: 'Seller delivers goods cleared for import at buyer\'s location. Maximum seller obligation.',
      icon: Truck,
      riskLevel: 'low',
      commonUse: 'All transport modes',
      buyerResponsible: ['Unloading at destination'],
      sellerResponsible: ['All transport', 'All insurance', 'All clearance', 'All duties', 'Delivery']
    },
    {
      code: 'CPT',
      name: 'Carriage Paid To',
      description: 'Seller pays freight to destination. Risk transfers when goods are handed to carrier.',
      icon: Truck,
      riskLevel: 'medium',
      commonUse: 'All transport modes',
      buyerResponsible: ['Insurance', 'Import duties', 'Destination handling'],
      sellerResponsible: ['Freight charges', 'Export clearance', 'Loading charges']
    },
    {
      code: 'DAP',
      name: 'Delivered At Place',
      description: 'Seller delivers goods ready for unloading at named destination.',
      icon: Truck,
      riskLevel: 'low',
      commonUse: 'All transport modes',
      buyerResponsible: ['Unloading', 'Import duties', 'Import clearance'],
      sellerResponsible: ['All transport', 'Export clearance', 'Insurance (optional)']
    },
    {
      code: 'FCA',
      name: 'Free Carrier',
      description: 'Seller delivers goods to carrier nominated by buyer at named place.',
      icon: Truck,
      riskLevel: 'medium',
      commonUse: 'All transport modes',
      buyerResponsible: ['Main carriage', 'Insurance', 'Import duties'],
      sellerResponsible: ['Export clearance', 'Delivery to carrier', 'Loading (if at seller\'s premises)']
    },
    {
      code: 'CFR',
      name: 'Cost & Freight',
      description: 'Seller pays freight to destination port. Risk transfers when goods cross ship\'s rail.',
      icon: Ship,
      riskLevel: 'medium',
      commonUse: 'Sea freight',
      buyerResponsible: ['Marine insurance', 'Import duties', 'Destination handling'],
      sellerResponsible: ['Freight charges', 'Export clearance', 'Loading charges']
    }
  ]

  const selectedType = paymentTypes.find(type => type.code === value) || paymentTypes[0]

  const getRiskColor = (level) => {
    switch (level) {
      case 'low': return 'bg-green-100 text-green-800'
      case 'medium': return 'bg-yellow-100 text-yellow-800'
      case 'high': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const selectPaymentType = (type) => {
    onChange(type.code, type)
    setIsOpen(false)
  }

  return (
    <div className="relative">
      <Button
        type="button"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full justify-between text-left"
      >
        <div className="flex items-center space-x-2">
          {selectedType.icon && <selectedType.icon className="h-4 w-4" />}
          <span>{selectedType.code}</span>
        </div>
        <ChevronDown className={`h-4 w-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: -10, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: -10, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="absolute z-50 w-96 mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-96 overflow-y-auto"
          >
            <div className="p-3 border-b border-gray-200">
              <h3 className="font-medium text-gray-900">Payment Terms (Incoterms)</h3>
              <p className="text-sm text-gray-500">Select the appropriate international commercial terms</p>
            </div>

            <div className="max-h-80 overflow-y-auto">
              {paymentTypes.map((type, index) => (
                <motion.div
                  key={type.code}
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2, delay: index * 0.05 }}
                  className={`p-4 cursor-pointer border-b border-gray-100 hover:bg-blue-50 ${
                    value === type.code ? 'bg-blue-50 border-blue-200' : ''
                  }`}
                  onClick={() => selectPaymentType(type)}
                >
                  <div className="flex items-start justify-between mb-2">
                    <div className="flex items-center space-x-2">
                      <type.icon className="h-5 w-5 text-gray-600" />
                      <div>
                        <span className="font-medium text-gray-900">{type.code}</span>
                        <span className="text-sm text-gray-600 ml-2">{type.name}</span>
                      </div>
                    </div>
                    
                    <div className="flex items-center space-x-2">
                      <Badge className={`text-xs ${getRiskColor(type.riskLevel)}`}>
                        {type.riskLevel} risk
                      </Badge>
                      <Badge variant="outline" className="text-xs">
                        {type.commonUse}
                      </Badge>
                    </div>
                  </div>

                  <p className="text-sm text-gray-600 mb-3">{type.description}</p>

                  <div className="grid grid-cols-2 gap-3 text-xs">
                    <div>
                      <div className="font-medium text-green-700 mb-1">Buyer Responsible:</div>
                      <ul className="space-y-1">
                        {type.buyerResponsible.map((item, i) => (
                          <li key={i} className="text-gray-600">• {item}</li>
                        ))}
                      </ul>
                    </div>
                    
                    <div>
                      <div className="font-medium text-blue-700 mb-1">Seller Responsible:</div>
                      <ul className="space-y-1">
                        {type.sellerResponsible.map((item, i) => (
                          <li key={i} className="text-gray-600">• {item}</li>
                        ))}
                      </ul>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            <div className="p-3 border-t border-gray-200 bg-gray-50">
              <div className="flex items-start space-x-2">
                <Info className="h-4 w-4 text-blue-500 mt-0.5" />
                <div className="text-xs text-gray-600">
                  <p className="font-medium mb-1">Incoterms 2020</p>
                  <p>These terms define the responsibilities of buyers and sellers in international trade. Choose based on your risk tolerance and logistics capabilities.</p>
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

export default PaymentTypeSelector
