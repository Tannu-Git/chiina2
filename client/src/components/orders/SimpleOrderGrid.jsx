import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { Plus, Trash2, Save } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import CodeAutoComplete from './CodeAutoComplete'
import { formatCurrency } from '@/lib/utils'

// Create empty row helper
function createEmptyRow() {
  return {
    id: Date.now() + Math.random(),
    itemCode: '',
    description: '',
    quantity: '',
    unitPrice: '',
    totalPrice: 0,
    unitWeight: '',
    unitCbm: '',
    cartons: '',
    supplier: '',
    paymentType: 'TO_AGENT',
    carryingCharge: {
      basis: 'carton',
      rate: '',
      amount: 0
    }
  }
}

const SimpleOrderGrid = ({ onSave, initialData = [] }) => {
  const [rows, setRows] = useState(initialData.length > 0 ? initialData : [createEmptyRow()])

  // Add new row
  const addRow = () => {
    setRows([...rows, createEmptyRow()])
  }

  // Delete row
  const deleteRow = (id) => {
    if (rows.length > 1) {
      setRows(rows.filter(row => row.id !== id))
    }
  }

  // Update row data
  const updateRow = (id, field, value) => {
    setRows(rows.map(row => {
      if (row.id === id) {
        const updatedRow = { ...row }

        // Handle nested carryingCharge fields
        if (field.startsWith('carryingCharge.')) {
          const chargeField = field.split('.')[1]
          updatedRow.carryingCharge = {
            ...updatedRow.carryingCharge,
            [chargeField]: value
          }

          // Auto-calculate carrying charge amount
          if (chargeField === 'rate' || chargeField === 'basis') {
            const rate = parseFloat(updatedRow.carryingCharge.rate) || 0
            const basis = updatedRow.carryingCharge.basis
            const cartons = parseFloat(updatedRow.cartons) || 0
            const quantity = parseFloat(updatedRow.quantity) || 0
            const unitWeight = parseFloat(updatedRow.unitWeight) || 0
            const unitCbm = parseFloat(updatedRow.unitCbm) || 0
            let multiplier = 1

            if (basis === 'carton') {
              multiplier = cartons
            } else if (basis === 'weight') {
              multiplier = unitWeight * quantity
            } else if (basis === 'cbm') {
              multiplier = unitCbm * quantity
            }

            updatedRow.carryingCharge.amount = rate * multiplier
          }
        } else {
          updatedRow[field] = value
        }

        // Auto-calculate total price
        if (field === 'quantity' || field === 'unitPrice') {
          const qty = parseFloat(updatedRow.quantity) || 0
          const price = parseFloat(updatedRow.unitPrice) || 0
          updatedRow.totalPrice = qty * price
        }

        // Recalculate carrying charge if cartons/weight/cbm/quantity changes
        if (field === 'cartons' || field === 'unitWeight' || field === 'unitCbm' || field === 'quantity') {
          const rate = parseFloat(updatedRow.carryingCharge.rate) || 0
          const basis = updatedRow.carryingCharge.basis
          const cartons = parseFloat(updatedRow.cartons) || 0
          const quantity = parseFloat(updatedRow.quantity) || 0
          const unitWeight = parseFloat(updatedRow.unitWeight) || 0
          const unitCbm = parseFloat(updatedRow.unitCbm) || 0
          let multiplier = 1

          if (basis === 'carton') {
            multiplier = cartons
          } else if (basis === 'weight') {
            multiplier = unitWeight * quantity
          } else if (basis === 'cbm') {
            multiplier = unitCbm * quantity
          }

          updatedRow.carryingCharge.amount = rate * multiplier
        }

        return updatedRow
      }
      return row
    }))
  }

  // Handle autocomplete selection
  const handleItemSelect = (rowId, item) => {
    setRows(rows.map(row => {
      if (row.id === rowId) {
        return {
          ...row,
          itemCode: item.itemCode,
          description: item.description,
          unitPrice: item.price || 0,
          unitWeight: item.weight || 0,
          unitCbm: item.cbm || 0,
          totalPrice: row.quantity * (item.price || 0)
        }
      }
      return row
    }))
  }

  // Calculate totals
  const totals = rows.reduce((acc, row) => ({
    quantity: acc.quantity + (row.quantity || 0),
    totalPrice: acc.totalPrice + (row.totalPrice || 0),
    weight: acc.weight + ((row.unitWeight || 0) * (row.quantity || 0)),
    cbm: acc.cbm + ((row.unitCbm || 0) * (row.quantity || 0))
  }), { quantity: 0, totalPrice: 0, weight: 0, cbm: 0 })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2">
          <Button onClick={addRow} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>
        </div>
        <Button onClick={() => onSave?.(rows)} size="sm" className="bg-blue-600 hover:bg-blue-700">
          <Save className="h-4 w-4 mr-1" />
          Save Order
        </Button>
      </div>

      {/* Compact Grid */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-lg overflow-hidden">
        <div className="overflow-x-auto overflow-y-visible">
          <table className="w-full compact-grid min-w-[1000px]">
            {/* Header */}
            <thead>
              <tr>

                <th className="excel-header min-w-[150px]">Item Code</th>
                <th className="excel-header min-w-[200px]">Description</th>
                <th className="excel-header w-24">Qty</th>
                <th className="excel-header w-28">Unit Price</th>
                <th className="excel-header w-28">Total Price</th>
                <th className="excel-header w-24">Weight</th>
                <th className="excel-header w-24">CBM</th>
                <th className="excel-header w-20">Cartons</th>
                <th className="excel-header min-w-[120px]">Supplier</th>
                <th className="excel-header min-w-[100px]">Payment</th>
                <th className="excel-header min-w-[100px]">Carrying Basis</th>
                <th className="excel-header w-24">Rate</th>
                <th className="excel-header w-28">Charge Amount</th>
                <th className="excel-header w-20">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {rows.map((row, index) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="excel-row"
                >


                  {/* Item Code with Autocomplete */}
                  <td className="excel-cell p-0">
                    <CodeAutoComplete
                      value={row.itemCode}
                      onChange={(value) => updateRow(row.id, 'itemCode', value)}
                      onSelect={(item) => handleItemSelect(row.id, item)}
                      placeholder="Enter item code..."
                      className="w-full h-full border-none bg-transparent"
                    />
                  </td>

                  {/* Description */}
                  <td className="excel-cell p-0">
                    <Input
                      value={row.description}
                      onChange={(e) => updateRow(row.id, 'description', e.target.value)}
                      placeholder="Description..."
                      className="excel-input"
                    />
                  </td>

                  {/* Quantity */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.quantity || ''}
                      onChange={(e) => updateRow(row.id, 'quantity', e.target.value)}
                      min="1"
                      placeholder="1"
                      className="excel-input text-center"
                    />
                  </td>

                  {/* Unit Price */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.unitPrice || ''}
                      onChange={(e) => updateRow(row.id, 'unitPrice', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder={row.paymentType === 'TO_FACTORY' ? 'Unknown' : '0.00'}
                      className="excel-input text-right"
                    />
                  </td>

                  {/* Total Price (calculated) */}
                  <td className="excel-cell text-right font-medium">
                    {row.paymentType === 'TO_FACTORY' && !row.unitPrice
                      ? 'Price TBD'
                      : formatCurrency(row.totalPrice)
                    }
                  </td>

                  {/* Unit Weight */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.unitWeight || ''}
                      onChange={(e) => updateRow(row.id, 'unitWeight', e.target.value)}
                      min="0"
                      step="0.1"
                      placeholder="0.0"
                      className="excel-input text-right"
                    />
                  </td>

                  {/* Unit CBM */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.unitCbm || ''}
                      onChange={(e) => updateRow(row.id, 'unitCbm', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="excel-input text-right"
                    />
                  </td>

                  {/* Cartons */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.cartons || ''}
                      onChange={(e) => updateRow(row.id, 'cartons', e.target.value)}
                      min="1"
                      placeholder="1"
                      className="excel-input text-center"
                    />
                  </td>

                  {/* Supplier */}
                  <td className="excel-cell p-0">
                    <Input
                      value={row.supplier}
                      onChange={(e) => updateRow(row.id, 'supplier', e.target.value)}
                      placeholder="Supplier..."
                      className="excel-input"
                    />
                  </td>

                  {/* Payment Type */}
                  <td className="excel-cell p-0">
                    <Select value={row.paymentType} onValueChange={(value) => updateRow(row.id, 'paymentType', value)}>
                      <SelectTrigger className="excel-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="TO_AGENT">To Me (Agent)</SelectItem>
                        <SelectItem value="TO_FACTORY">To Factory (Direct)</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Carrying Basis */}
                  <td className="excel-cell p-0">
                    <Select value={row.carryingCharge.basis} onValueChange={(value) => updateRow(row.id, 'carryingCharge.basis', value)}>
                      <SelectTrigger className="excel-input">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="carton">Per Carton</SelectItem>
                        <SelectItem value="weight">Per KG</SelectItem>
                        <SelectItem value="cbm">Per CBM</SelectItem>
                      </SelectContent>
                    </Select>
                  </td>

                  {/* Carrying Rate */}
                  <td className="excel-cell p-0">
                    <Input
                      type="number"
                      value={row.carryingCharge.rate || ''}
                      onChange={(e) => updateRow(row.id, 'carryingCharge.rate', e.target.value)}
                      min="0"
                      step="0.01"
                      placeholder="0.00"
                      className="excel-input text-right"
                    />
                  </td>

                  {/* Carrying Charge Amount (calculated) */}
                  <td className="excel-cell text-right font-medium">
                    {formatCurrency(row.carryingCharge.amount)}
                  </td>

                  {/* Actions */}
                  <td className="excel-cell text-center">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteRow(row.id)}
                      className="text-red-600 hover:text-red-700 h-6 w-6 p-0"
                      disabled={rows.length === 1}
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-4 gap-4">
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Items</div>
          <div className="text-2xl font-bold">{rows.length}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Quantity</div>
          <div className="text-2xl font-bold">{totals.quantity}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Value</div>
          <div className="text-2xl font-bold">{formatCurrency(totals.totalPrice)}</div>
        </div>
        <div className="bg-white p-4 rounded-lg border">
          <div className="text-sm text-gray-600">Total Weight</div>
          <div className="text-2xl font-bold">{totals.weight.toFixed(2)} kg</div>
        </div>
      </div>
    </div>
  )
}

export default SimpleOrderGrid
