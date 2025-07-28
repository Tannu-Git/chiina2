import React, { useEffect, useRef } from 'react'
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement,
} from 'chart.js'
import { Doughnut, Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
  ArcElement
)

const ShipmentCharts = ({ data = [] }) => {
  // Aggregate data by client for value distribution
  const clientData = data.reduce((acc, item) => {
    const client = item.CLIENT || 'Unknown'
    acc[client] = (acc[client] || 0) + (item.AMOUNT || 0)
    return acc
  }, {})

  // Aggregate data by supplier for volume distribution
  const supplierData = data.reduce((acc, item) => {
    const supplier = item.SUPPLIER || 'Unknown'
    acc[supplier] = (acc[supplier] || 0) + (item['T.CBM'] || 0)
    return acc
  }, {})

  // Sort and prepare client chart data
  const sortedClients = Object.entries(clientData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5) // Top 5 clients

  const clientChartData = {
    labels: sortedClients.map(([client]) => client),
    datasets: [
      {
        label: 'Value by Client',
        data: sortedClients.map(([, value]) => value),
        backgroundColor: [
          '#d97706', // amber-600
          '#f59e0b', // amber-500
          '#fbbf24', // amber-400
          '#fcd34d', // amber-300
          '#fef3c7', // amber-100
        ],
        borderColor: '#f5f5f4', // stone-100
        borderWidth: 4,
      },
    ],
  }

  // Sort and prepare supplier chart data
  const sortedSuppliers = Object.entries(supplierData)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8) // Top 8 suppliers

  const supplierChartData = {
    labels: sortedSuppliers.map(([supplier]) => supplier),
    datasets: [
      {
        label: 'Volume (CBM) by Supplier',
        data: sortedSuppliers.map(([, volume]) => volume),
        backgroundColor: '#f59e0b', // amber-500
        borderColor: '#b45309', // amber-700
        borderWidth: 1,
      },
    ],
  }

  const clientChartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        position: 'bottom',
      },
      tooltip: {
        callbacks: {
          label: (context) => {
            const value = context.parsed
            return `${context.label}: ${new Intl.NumberFormat('en-US', {
              style: 'currency',
              currency: 'USD'
            }).format(value)}`
          }
        }
      }
    }
  }

  const supplierChartOptions = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: {
      legend: {
        display: false,
      },
    },
    scales: {
      x: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Total Cubic Meters (CBM)'
        }
      }
    }
  }

  return (
    <div className="lg:col-span-2 flex flex-col gap-8">
      {/* Client Value Chart */}
      <div className="p-6 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Value by Client</h3>
        <p className="text-sm text-stone-500 mb-4">
          This chart shows the percentage of the container's total value attributed to each client.
        </p>
        <div className="relative w-full h-80">
          <Doughnut data={clientChartData} options={clientChartOptions} />
        </div>
      </div>

      {/* Supplier Volume Chart */}
      <div className="p-6 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Volume by Supplier</h3>
        <p className="text-sm text-stone-500 mb-4">
          This chart visualizes the total cubic meters (CBM) of space occupied by goods from each supplier.
        </p>
        <div className="relative w-full h-80">
          <Bar data={supplierChartData} options={supplierChartOptions} />
        </div>
      </div>
    </div>
  )
}

export default ShipmentCharts
