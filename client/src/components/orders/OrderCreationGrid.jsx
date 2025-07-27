import React, { useState, useEffect, useRef } from 'react'
import { motion } from 'framer-motion'
import {
  Plus,
  Trash2,
  Save,
  Upload,
  Download,
  Search,
  Calculator,
  Zap,
  Copy,
  Clipboard,
  Undo,
  Redo,
  Filter,
  SortAsc,
  SortDesc
} from 'lucide-react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Badge } from '@/components/ui/badge'
import CodeAutoComplete from './CodeAutoComplete'
import ImageUploadField from './ImageUploadField'
import SupplierDropdown from './SupplierDropdown'
import PaymentTypeSelector from './PaymentTypeSelector'
import CarryingBasisSelector from './CarryingBasisSelector'
import { formatCurrency } from '@/lib/utils'
import axios from 'axios'
import toast from 'react-hot-toast'

const OrderCreationGrid = ({ onSave, initialData = [] }) => {
  const [rows, setRows] = useState(initialData.length > 0 ? initialData : [createEmptyRow()])
  const [selectedCells, setSelectedCells] = useState(new Set())
  const [clipboard, setClipboard] = useState(null)
  const [history, setHistory] = useState([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [filters, setFilters] = useState({})
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' })
  const [loading, setLoading] = useState(false)
  const gridRef = useRef(null)

  const columns = [
    { key: 'itemCode', label: 'Item Code', width: 150, type: 'autocomplete' },
    { key: 'description', label: 'Description', width: 200, type: 'text' },
    { key: 'quantity', label: 'Quantity', width: 100, type: 'number' },
    { key: 'unitPrice', label: 'Unit Price', width: 120, type: 'currency' },
    { key: 'totalPrice', label: 'Total Price', width: 120, type: 'calculated' },
    { key: 'supplier', label: 'Supplier', width: 150, type: 'supplier' },
    { key: 'paymentType', label: 'Payment', width: 120, type: 'payment' },
    { key: 'carryingBasis', label: 'Carrying Basis', width: 130, type: 'carrying' },
    { key: 'unitWeight', label: 'Unit Weight (kg)', width: 120, type: 'number' },
    { key: 'unitCbm', label: 'Unit CBM', width: 100, type: 'number' },
    { key: 'hsCode', label: 'HS Code', width: 120, type: 'text' },
    { key: 'image', label: 'Image', width: 100, type: 'image' },
    { key: 'notes', label: 'Notes', width: 200, type: 'text' }
  ]

  function createEmptyRow() {
    return {
      id: Date.now() + Math.random(),
      itemCode: '',
      description: '',
      quantity: 1,
      unitPrice: 0,
      totalPrice: 0,
      supplier: '',
      paymentType: 'FOB',
      carryingBasis: 'SEA',
      unitWeight: 0,
      unitCbm: 0,
      hsCode: '',
      image: null,
      notes: '',
      estimatedPrice: null,
      priceConfidence: null
    }
  }

  // Save state to history for undo/redo
  const saveToHistory = (newRows) => {
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(JSON.parse(JSON.stringify(newRows)))
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  // Update row data
  const updateRow = (rowId, field, value) => {
    const newRows = rows.map(row => {
      if (row.id === rowId) {
        const updatedRow = { ...row, [field]: value }

        // Auto-calculate total price
        if (field === 'quantity' || field === 'unitPrice') {
          updatedRow.totalPrice = updatedRow.quantity * updatedRow.unitPrice
        }

        return updatedRow
      }
      return row
    })

    saveToHistory(newRows)
    setRows(newRows)
  }

  // Add new row
  const addRow = (index = -1) => {
    const newRow = createEmptyRow()
    const newRows = [...rows]

    if (index === -1) {
      newRows.push(newRow)
    } else {
      newRows.splice(index + 1, 0, newRow)
    }

    saveToHistory(newRows)
    setRows(newRows)
  }

  // Delete row
  const deleteRow = (rowId) => {
    if (rows.length === 1) {
      toast.error('Cannot delete the last row')
      return
    }

    const newRows = rows.filter(row => row.id !== rowId)
    saveToHistory(newRows)
    setRows(newRows)
  }

  // Copy selected cells
  const copySelection = () => {
    if (selectedCells.size === 0) return

    const cellData = Array.from(selectedCells).map(cellId => {
      const [rowId, field] = cellId.split('-')
      const row = rows.find(r => r.id.toString() === rowId)
      return { field, value: row?.[field] || '' }
    })

    setClipboard(cellData)
    toast.success(`Copied ${cellData.length} cells`)
  }

  // Paste to selected cells
  const pasteSelection = () => {
    if (!clipboard || selectedCells.size === 0) return

    const newRows = [...rows]
    Array.from(selectedCells).forEach((cellId, index) => {
      const [rowId, field] = cellId.split('-')
      const rowIndex = newRows.findIndex(r => r.id.toString() === rowId)
      const clipboardItem = clipboard[index % clipboard.length]

      if (rowIndex !== -1 && clipboardItem?.field === field) {
        newRows[rowIndex][field] = clipboardItem.value
      }
    })

    saveToHistory(newRows)
    setRows(newRows)
    toast.success('Pasted successfully')
  }

  // Undo/Redo
  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setRows(history[historyIndex - 1])
    }
  }

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setRows(history[historyIndex + 1])
    }
  }

  // AI Price Estimation
  const estimatePrice = async (rowId) => {
    const row = rows.find(r => r.id === rowId)
    if (!row.itemCode && !row.description) {
      toast.error('Please enter item code or description first')
      return
    }

    try {
      setLoading(true)
      const response = await axios.post('/api/orders/estimate-price', {
        itemCode: row.itemCode,
        description: row.description,
        quantity: row.quantity,
        supplier: row.supplier
      })

      const { estimatedPrice, confidence, historicalData } = response.data

      updateRow(rowId, 'unitPrice', estimatedPrice)
      updateRow(rowId, 'estimatedPrice', estimatedPrice)
      updateRow(rowId, 'priceConfidence', confidence)

      toast.success(`Price estimated with ${confidence}% confidence`)
    } catch (error) {
      console.error('Price estimation error:', error)
      toast.error('Failed to estimate price')
    } finally {
      setLoading(false)
    }
  }

  // Bulk operations
  const bulkUpdate = (field, value) => {
    if (selectedCells.size === 0) return

    const newRows = [...rows]
    Array.from(selectedCells).forEach(cellId => {
      const [rowId] = cellId.split('-')
      const rowIndex = newRows.findIndex(r => r.id.toString() === rowId)
      if (rowIndex !== -1) {
        newRows[rowIndex][field] = value
      }
    })

    saveToHistory(newRows)
    setRows(newRows)
  }

  // Export to CSV
  const exportToCSV = () => {
    const headers = columns.map(col => col.label).join(',')
    const csvData = rows.map(row =>
      columns.map(col => row[col.key] || '').join(',')
    ).join('\n')

    const blob = new Blob([headers + '\n' + csvData], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'order-items.csv'
    a.click()
  }

  // Import from CSV
  const importFromCSV = (event) => {
    const file = event.target.files[0]
    if (!file) return

    const reader = new FileReader()
    reader.onload = (e) => {
      const csv = e.target.result
      const lines = csv.split('\n')
      const headers = lines[0].split(',')

      const importedRows = lines.slice(1).map((line, index) => {
        const values = line.split(',')
        const row = createEmptyRow()

        headers.forEach((header, i) => {
          const column = columns.find(col => col.label === header.trim())
          if (column && values[i]) {
            row[column.key] = values[i].trim()
          }
        })

        return row
      }).filter(row => row.itemCode || row.description)

      if (importedRows.length > 0) {
        saveToHistory(importedRows)
        setRows(importedRows)
        toast.success(`Imported ${importedRows.length} items`)
      }
    }

    reader.readAsText(file)
  }

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey || e.metaKey) {
        switch (e.key) {
          case 'c':
            e.preventDefault()
            copySelection()
            break
          case 'v':
            e.preventDefault()
            pasteSelection()
            break
          case 'z':
            e.preventDefault()
            if (e.shiftKey) {
              redo()
            } else {
              undo()
            }
            break
          case 's':
            e.preventDefault()
            onSave?.(rows)
            break
        }
      }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [selectedCells, clipboard, historyIndex])

  // Calculate totals
  const totals = rows.reduce((acc, row) => ({
    quantity: acc.quantity + (row.quantity || 0),
    totalPrice: acc.totalPrice + (row.totalPrice || 0),
    totalWeight: acc.totalWeight + ((row.quantity || 0) * (row.unitWeight || 0)),
    totalCbm: acc.totalCbm + ((row.quantity || 0) * (row.unitCbm || 0))
  }), { quantity: 0, totalPrice: 0, totalWeight: 0, totalCbm: 0 })

  return (
    <div className="space-y-4">
      {/* Toolbar */}
      <div className="flex items-center justify-between bg-white p-4 rounded-lg border shadow-sm">
        <div className="flex items-center space-x-2">
          <Button onClick={() => addRow()} size="sm">
            <Plus className="h-4 w-4 mr-1" />
            Add Row
          </Button>

          <Button onClick={copySelection} size="sm" variant="outline" disabled={selectedCells.size === 0}>
            <Copy className="h-4 w-4 mr-1" />
            Copy
          </Button>

          <Button onClick={pasteSelection} size="sm" variant="outline" disabled={!clipboard}>
            <Clipboard className="h-4 w-4 mr-1" />
            Paste
          </Button>

          <div className="border-l pl-2 ml-2">
            <Button onClick={undo} size="sm" variant="outline" disabled={historyIndex <= 0}>
              <Undo className="h-4 w-4" />
            </Button>
            <Button onClick={redo} size="sm" variant="outline" disabled={historyIndex >= history.length - 1}>
              <Redo className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="flex items-center space-x-2">
          <input
            type="file"
            accept=".csv"
            onChange={importFromCSV}
            className="hidden"
            id="csv-import"
          />
          <label htmlFor="csv-import">
            <Button size="sm" variant="outline" as="span">
              <Upload className="h-4 w-4 mr-1" />
              Import CSV
            </Button>
          </label>

          <Button onClick={exportToCSV} size="sm" variant="outline">
            <Download className="h-4 w-4 mr-1" />
            Export CSV
          </Button>

          <Button onClick={() => onSave?.(rows)} size="sm" className="bg-gradient-to-r from-blue-600 to-purple-600">
            <Save className="h-4 w-4 mr-1" />
            Save Order
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        <div className="overflow-x-auto" ref={gridRef}>
          <table className="w-full">
            {/* Header */}
            <thead className="bg-gray-50 border-b">
              <tr>
                <th className="w-12 p-2 text-center">#</th>
                {columns.map(column => (
                  <th
                    key={column.key}
                    className="p-2 text-left font-medium text-gray-900 border-r"
                    style={{ width: column.width }}
                  >
                    <div className="flex items-center space-x-1">
                      <span>{column.label}</span>
                      {column.type === 'number' || column.type === 'currency' ? (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => setSortConfig({
                            key: column.key,
                            direction: sortConfig.direction === 'asc' ? 'desc' : 'asc'
                          })}
                        >
                          {sortConfig.key === column.key ? (
                            sortConfig.direction === 'asc' ? <SortAsc className="h-3 w-3" /> : <SortDesc className="h-3 w-3" />
                          ) : (
                            <Filter className="h-3 w-3" />
                          )}
                        </Button>
                      ) : null}
                    </div>
                  </th>
                ))}
                <th className="w-20 p-2 text-center">Actions</th>
              </tr>
            </thead>

            {/* Body */}
            <tbody>
              {rows.map((row, rowIndex) => (
                <motion.tr
                  key={row.id}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className="border-b hover:bg-gray-50"
                >
                  <td className="p-2 text-center text-sm text-gray-500 border-r">
                    {rowIndex + 1}
                  </td>

                  {columns.map(column => (
                    <td key={column.key} className="p-1 border-r" style={{ width: column.width }}>
                      {column.type === 'autocomplete' ? (
                        <CodeAutoComplete
                          value={row[column.key]}
                          onChange={(value, item) => {
                            updateRow(row.id, column.key, value)
                            if (item) {
                              updateRow(row.id, 'description', item.description)
                              updateRow(row.id, 'unitPrice', item.price)
                              updateRow(row.id, 'unitWeight', item.weight)
                              updateRow(row.id, 'unitCbm', item.cbm)
                            }
                          }}
                          onEstimatePrice={() => estimatePrice(row.id)}
                        />
                      ) : column.type === 'supplier' ? (
                        <SupplierDropdown
                          value={row[column.key]}
                          onChange={(value) => updateRow(row.id, column.key, value)}
                        />
                      ) : column.type === 'payment' ? (
                        <PaymentTypeSelector
                          value={row[column.key]}
                          onChange={(value) => updateRow(row.id, column.key, value)}
                        />
                      ) : column.type === 'carrying' ? (
                        <CarryingBasisSelector
                          value={row[column.key]}
                          onChange={(value) => updateRow(row.id, column.key, value)}
                        />
                      ) : column.type === 'image' ? (
                        <ImageUploadField
                          value={row[column.key]}
                          onChange={(value) => updateRow(row.id, column.key, value)}
                        />
                      ) : column.type === 'calculated' ? (
                        <div className="flex items-center space-x-1">
                          <span className="font-medium">
                            {formatCurrency(row.totalPrice || 0)}
                          </span>
                          {row.estimatedPrice && (
                            <Badge variant="outline" className="text-xs">
                              AI: {row.priceConfidence}%
                            </Badge>
                          )}
                        </div>
                      ) : (
                        <Input
                          type={column.type === 'number' ? 'number' : 'text'}
                          value={row[column.key] || ''}
                          onChange={(e) => updateRow(row.id, column.key,
                            column.type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value
                          )}
                          className="border-0 focus:ring-1 focus:ring-blue-500 rounded-none"
                          onClick={() => {
                            const cellId = `${row.id}-${column.key}`
                            setSelectedCells(new Set([cellId]))
                          }}
                        />
                      )}
                    </td>
                  ))}

                  <td className="p-2 text-center">
                    <div className="flex items-center justify-center space-x-1">
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => estimatePrice(row.id)}
                        disabled={loading}
                        title="AI Price Estimation"
                      >
                        <Zap className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => deleteRow(row.id)}
                        className="text-red-600 hover:text-red-700"
                      >
                        <Trash2 className="h-3 w-3" />
                      </Button>
                    </div>
                  </td>
                </motion.tr>
              ))}
            </tbody>

            {/* Footer with totals */}
            <tfoot className="bg-gray-50 border-t">
              <tr>
                <td className="p-2 font-medium text-center">Total</td>
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2 font-medium">{totals.quantity}</td>
                <td className="p-2"></td>
                <td className="p-2 font-medium">{formatCurrency(totals.totalPrice)}</td>
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2 font-medium">{totals.totalWeight.toFixed(2)} kg</td>
                <td className="p-2 font-medium">{totals.totalCbm.toFixed(2)} CBM</td>
                <td className="p-2"></td>
                <td className="p-2"></td>
                <td className="p-2"></td>
              </tr>
            </tfoot>
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
          <div className="text-2xl font-bold">{totals.totalWeight.toFixed(2)} kg</div>
        </div>
      </div>
    </div>
  )
}

export default OrderCreationGrid
