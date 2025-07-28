import React from 'react'
import { motion } from 'framer-motion'
import { formatCurrency } from '@/lib/utils'

const KPICard = ({ title, value, className = "" }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`bg-white rounded-xl p-6 shadow-lg hover:shadow-xl transition-all duration-300 hover:-translate-y-1 ${className}`}
    >
      <p className="text-sm font-medium text-stone-500 mb-2">{title}</p>
      <p className="text-2xl md:text-3xl font-bold text-amber-600">{value}</p>
    </motion.div>
  )
}

const KPICards = ({ data = [] }) => {
  // Calculate totals from the data
  const totals = data.reduce((acc, item) => ({
    value: acc.value + (item.AMOUNT || 0),
    items: acc.items + (item['T.QTY'] || 0),
    volume: acc.volume + (item['T.CBM'] || 0),
    weight: acc.weight + (item['T.WT'] || 0)
  }), { value: 0, items: 0, volume: 0, weight: 0 })

  const kpis = [
    {
      title: "Total Value",
      value: formatCurrency(totals.value),
      id: "total-value"
    },
    {
      title: "Total Items",
      value: totals.items.toLocaleString(),
      id: "total-items"
    },
    {
      title: "Total Volume (CBM)",
      value: totals.volume.toFixed(2),
      id: "total-cbm"
    },
    {
      title: "Total Weight (WT)",
      value: totals.weight.toFixed(2),
      id: "total-wt"
    }
  ]

  return (
    <section className="mb-8">
      <div className="text-left mb-6">
        <h2 className="text-2xl font-semibold text-stone-800 mb-2">Shipment Overview</h2>
        <p className="text-stone-500">
          This section provides a high-level summary of the entire container's contents. 
          These key performance indicators (KPIs) will update dynamically as you apply filters below.
        </p>
      </div>
      
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
        {kpis.map((kpi, index) => (
          <KPICard
            key={kpi.id}
            title={kpi.title}
            value={kpi.value}
            className={`delay-${index * 100}`}
          />
        ))}
      </div>
    </section>
  )
}

export default KPICards
