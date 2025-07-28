import React from 'react'
import { formatCurrency } from '@/lib/utils'

const ShipmentTable = ({ data = [] }) => {
  if (data.length === 0) {
    return (
      <div className="lg:col-span-3 p-6 bg-white rounded-xl shadow-lg">
        <h3 className="text-lg font-semibold text-stone-800 mb-1">Shipment Details</h3>
        <p className="text-sm text-stone-500 mb-4">
          A detailed, sortable list of all items in the shipment. Use the filters above to narrow down the results.
        </p>
        <div className="text-center py-8 text-stone-500">
          No data matches your filters.
        </div>
      </div>
    )
  }

  return (
    <div className="lg:col-span-3 p-6 bg-white rounded-xl shadow-lg">
      <h3 className="text-lg font-semibold text-stone-800 mb-1">Shipment Details</h3>
      <p className="text-sm text-stone-500 mb-4">
        A detailed, sortable list of all items in the shipment. Use the filters above to narrow down the results.
      </p>
      
      <div className="overflow-x-auto max-h-[800px] border border-stone-200 rounded-lg">
        <table className="w-full text-sm text-left text-stone-500">
          <thead className="text-xs text-stone-700 uppercase bg-stone-100 sticky top-0">
            <tr>
              <th scope="col" className="px-6 py-3 font-semibold">Item No.</th>
              <th scope="col" className="px-6 py-3 font-semibold">Description</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Amount</th>
              <th scope="col" className="px-6 py-3 font-semibold">Client</th>
              <th scope="col" className="px-6 py-3 font-semibold">Supplier</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Qty</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">CBM</th>
              <th scope="col" className="px-6 py-3 font-semibold text-right">Weight</th>
            </tr>
          </thead>
          <tbody>
            {data.map((item, index) => (
              <tr 
                key={index} 
                className="bg-white border-b border-stone-200 hover:bg-stone-50 transition-colors"
              >
                <td className="px-6 py-4 font-medium text-stone-900 whitespace-nowrap">
                  {item['ITEM NO.'] || 'N/A'}
                </td>
                <td className="px-6 py-4 max-w-xs">
                  <div className="truncate" title={item.DESCRIPTION}>
                    {item.DESCRIPTION || 'N/A'}
                  </div>
                </td>
                <td className="px-6 py-4 text-right font-medium">
                  {formatCurrency(item.AMOUNT || 0)}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                    {item.CLIENT || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-stone-100 text-stone-800">
                    {item.SUPPLIER || 'Unknown'}
                  </span>
                </td>
                <td className="px-6 py-4 text-right">
                  {(item['T.QTY'] || 0).toLocaleString()}
                </td>
                <td className="px-6 py-4 text-right">
                  {(item['T.CBM'] || 0).toFixed(2)}
                </td>
                <td className="px-6 py-4 text-right">
                  {(item['T.WT'] || 0).toFixed(2)}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* Table Footer with Summary */}
      <div className="mt-4 p-4 bg-stone-50 rounded-lg">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <span className="font-medium text-stone-700">Total Items:</span>
            <span className="ml-2 text-stone-900">{data.length}</span>
          </div>
          <div>
            <span className="font-medium text-stone-700">Total Quantity:</span>
            <span className="ml-2 text-stone-900">
              {data.reduce((sum, item) => sum + (item['T.QTY'] || 0), 0).toLocaleString()}
            </span>
          </div>
          <div>
            <span className="font-medium text-stone-700">Total CBM:</span>
            <span className="ml-2 text-stone-900">
              {data.reduce((sum, item) => sum + (item['T.CBM'] || 0), 0).toFixed(2)}
            </span>
          </div>
          <div>
            <span className="font-medium text-stone-700">Total Weight:</span>
            <span className="ml-2 text-stone-900">
              {data.reduce((sum, item) => sum + (item['T.WT'] || 0), 0).toFixed(2)}
            </span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default ShipmentTable
