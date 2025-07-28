import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import KPICards from '@/components/shipment/KPICards'
import ShipmentFilters from '@/components/shipment/ShipmentFilters'
import AIInsights from '@/components/shipment/AIInsights'
import ShipmentCharts from '@/components/shipment/ShipmentCharts'
import ShipmentTable from '@/components/shipment/ShipmentTable'

// Sample data from the design.html file
const rawData = [
  {"ITEM NO.": "KV-101", "DESCRIPTION": "FILE BAG", "PRICE": 0.3, "QTY": 480, "CTNS": 17, "T.QTY": 8160, "AMOUNT": 2448, "CBM": 0.095, "T.CBM": 1.615, "WT": 19.5, "T.WT": 331.5, "SUPPLIER": "SUJI STOCK", "CLIENT": "YOGESH", "CARRYING": 23094.5},
  {"ITEM NO.": "KI-5", "DESCRIPTION": "BELT", "PRICE": 2.1, "QTY": 360, "CTNS": 10, "T.QTY": 3600, "AMOUNT": 7560, "CBM": 0.09, "T.CBM": 0.9, "WT": 45, "T.WT": 450, "SUPPLIER": "45908", "CLIENT": "RAJESH ARORA", "CARRYING": 18000},
  {"ITEM NO.": "CH-212F", "DESCRIPTION": "16CC FOLDER DOUBLE POCKET", "PRICE": 0.81, "QTY": 600, "CTNS": 20, "T.QTY": 12000, "AMOUNT": 9720, "CBM": 0.11, "T.CBM": 2.2, "WT": 34, "T.WT": 680, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 32560},
  {"ITEM NO.": "CH-T112F WHITE", "DESCRIPTION": "25CC FOLDER SINGLE POCKET", "PRICE": 0.82, "QTY": 480, "CTNS": 20, "T.QTY": 9600, "AMOUNT": 7872, "CBM": 0.1, "T.CBM": 2, "WT": 25.5, "T.WT": 510, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 29600},
  {"ITEM NO.": "CH-T112F", "DESCRIPTION": "25CC FOLDER SINGLE POCKET", "PRICE": 0.81, "QTY": 600, "CTNS": 1, "T.QTY": 600, "AMOUNT": 486, "CBM": 0.05, "T.CBM": 0.05, "WT": 16.5, "T.WT": 16.5, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": null},
  {"ITEM NO.": "CH-T112F BLACK", "DESCRIPTION": "25CC FOLDER SINGLE POCKET", "PRICE": 0.82, "QTY": 600, "CTNS": 9, "T.QTY": 5400, "AMOUNT": 4428, "CBM": 0.05, "T.CBM": 0.45, "WT": 16.5, "T.WT": 148.5, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 16428},
  {"ITEM NO.": "CH-525F", "DESCRIPTION": "A4 PUNCH FOLDER 12 POCKET", "PRICE": 0.82, "QTY": 600, "CTNS": 20, "T.QTY": 12000, "AMOUNT": 9840, "CBM": 0.12, "T.CBM": 2.4, "WT": 36, "T.WT": 720, "SUPPLIER": "TOPPER", "CLIENT": "RAJESH ARORA", "CARRYING": 38160},
  {"ITEM NO.": "CRYSTAL-106", "DESCRIPTION": "8\" White Hex RUBBER BALL", "PRICE": 1.2, "QTY": 500, "CTNS": 25, "T.QTY": 12500, "AMOUNT": 15000, "CBM": 0.081, "T.CBM": 2.025, "WT": 34, "T.WT": 850, "SUPPLIER": "CRYSTAL", "CLIENT": "DEEPAK KOL", "CARRYING": 36550},
  {"ITEM NO.": "CRYSTAL-107", "DESCRIPTION": "9\" White Hex RUBBER BALL", "PRICE": 1.28, "QTY": 500, "CTNS": 24, "T.QTY": 12000, "AMOUNT": 15360, "CBM": 0.081, "T.CBM": 1.944, "WT": 39, "T.WT": 936, "SUPPLIER": "CRYSTAL", "CLIENT": "DEEPAK KOL", "CARRYING": 40248},
  {"ITEM NO.": "CRYSTAL-103", "DESCRIPTION": "GREEN/Pink Hand Basket", "PRICE": 4.6, "QTY": 150, "CTNS": 11, "T.QTY": 1650, "AMOUNT": 7590, "CBM": 0.072, "T.CBM": 0.792, "WT": 31.5, "T.WT": 346.5, "SUPPLIER": "CRYSTAL", "CLIENT": "DEEPAK KOL", "CARRYING": 14899.5},
  {"ITEM NO.": null, "DESCRIPTION": "04 FLINT 2.2*7MM Black", "PRICE": 2.8, "QTY": 600, "CTNS": 24, "T.QTY": 14400, "AMOUNT": 40320, "CBM": 0.013, "T.CBM": 0.312, "WT": 25.5, "T.WT": 612, "SUPPLIER": "JAMES", "CLIENT": "DEEPAK KOL", "CARRYING": 24480},
  {"ITEM NO.": null, "DESCRIPTION": "lighter ACCESSORIES 8.3MM WHEEL", "PRICE": 180, "QTY": 2, "CTNS": 48, "T.QTY": 96, "AMOUNT": 17280, "CBM": 0.013, "T.CBM": 0.624, "WT": 20.5, "T.WT": 984, "SUPPLIER": "JAMES", "CLIENT": "YOGESH", "CARRYING": 39360},
  {"ITEM NO.": null, "DESCRIPTION": "lighter ACCESSORIES 8.3MM WHEEL", "PRICE": 180, "QTY": 4, "CTNS": 1, "T.QTY": 4, "AMOUNT": 720, "CBM": 0.03, "T.CBM": 0.03, "WT": 2, "T.WT": 2, "SUPPLIER": "JAMES", "CLIENT": "YOGESH", "CARRYING": 720}
]

const ShipmentAnalysis = () => {
  const [processedData, setProcessedData] = useState([])
  const [filteredData, setFilteredData] = useState([])
  const [selectedClient, setSelectedClient] = useState('All')
  const [selectedSupplier, setSelectedSupplier] = useState('All')

  // Process data to fill in missing client/supplier info
  useEffect(() => {
    let lastClient = null
    let lastSupplier = null
    
    const processed = rawData.map(row => {
      if (row.CLIENT) lastClient = row.CLIENT
      if (row.SUPPLIER) lastSupplier = row.SUPPLIER
      
      return {
        ...row,
        CLIENT: row.CLIENT || lastClient || 'Unknown',
        SUPPLIER: row.SUPPLIER || lastSupplier || 'Unknown'
      }
    })
    
    setProcessedData(processed)
    setFilteredData(processed)
  }, [])

  // Handle filtering
  useEffect(() => {
    let filtered = processedData

    if (selectedClient !== 'All') {
      filtered = filtered.filter(item => item.CLIENT === selectedClient)
    }

    if (selectedSupplier !== 'All') {
      filtered = filtered.filter(item => item.SUPPLIER === selectedSupplier)
    }

    setFilteredData(filtered)
  }, [processedData, selectedClient, selectedSupplier])

  return (
    <div className="min-h-screen bg-stone-100 text-stone-800">
      <div className="container mx-auto p-4 md:p-8">
        {/* Header */}
        <motion.header 
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          className="text-center mb-8"
        >
          <h1 className="text-3xl md:text-4xl font-bold text-stone-900 mb-2">
            Kolkata DTD Container Shipment
          </h1>
          <p className="text-stone-500">
            Interactive Dashboard with AI Insights | {new Date().toLocaleDateString('en-US', { 
              year: 'numeric', 
              month: 'long', 
              day: 'numeric' 
            })}
          </p>
        </motion.header>

        {/* KPI Cards */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
        >
          <KPICards data={filteredData} />
        </motion.div>

        {/* Filters */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <ShipmentFilters
            data={processedData}
            selectedClient={selectedClient}
            selectedSupplier={selectedSupplier}
            onClientChange={setSelectedClient}
            onSupplierChange={setSelectedSupplier}
          />
        </motion.div>

        {/* AI Insights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <AIInsights 
            data={filteredData} 
            selectedClient={selectedClient}
          />
        </motion.div>

        {/* Main Content Grid */}
        <motion.main 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.4 }}
          className="grid grid-cols-1 lg:grid-cols-5 gap-8"
        >
          {/* Charts */}
          <ShipmentCharts data={filteredData} />
          
          {/* Data Table */}
          <ShipmentTable data={filteredData} />
        </motion.main>
      </div>
    </div>
  )
}

export default ShipmentAnalysis
