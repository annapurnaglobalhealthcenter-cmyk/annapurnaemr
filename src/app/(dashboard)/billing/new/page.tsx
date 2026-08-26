'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInvoice } from '@/lib/services/billing.service'
import { toast } from 'sonner'
import { Plus, Trash2, Loader2 } from 'lucide-react'

interface LineItem {
  item_description: string
  category: string
  quantity: number
  unit_price: number
}

const CATEGORIES = ['Consultation', 'Laboratory', 'Radiology', 'Pharmacy', 'Room Charge', 'Procedure', 'Other']

export default function NewInvoicePage() {
  const router = useRouter()
  const [patientId, setPatientId] = useState('')
  const [lineItems, setLineItems] = useState<LineItem[]>([
    { item_description: '', category: 'Consultation', quantity: 1, unit_price: 0 }
  ])
  const [isSubmitting, setIsSubmitting] = useState(false)

  const total = lineItems.reduce((sum, item) => sum + item.quantity * item.unit_price, 0)

  const addItem = () => setLineItems(prev => [
    ...prev,
    { item_description: '', category: 'Consultation', quantity: 1, unit_price: 0 }
  ])

  const removeItem = (i: number) => setLineItems(prev => prev.filter((_, idx) => idx !== i))

  const updateItem = (i: number, field: keyof LineItem, value: string | number) => {
    setLineItems(prev => prev.map((item, idx) => idx === i ? { ...item, [field]: value } : item))
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    if (!patientId.trim()) { toast.error('Please enter a Patient ID (UUID).'); return }
    if (lineItems.some(item => !item.item_description.trim())) { toast.error('All line items must have a description.'); return }

    setIsSubmitting(true)
    try {
      const invoice = await createInvoice(patientId, null, lineItems)
      toast.success(`Invoice ${invoice.invoice_number} created.`)
      router.push(`/billing/${invoice.id}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Invoice</h1>
        <p className="text-sm text-gray-500 mt-1">Create a new invoice for a patient visit.</p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Patient */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">Patient</h2>
          <div className="space-y-2">
            <Label>Patient ID (UUID)*</Label>
            <Input
              value={patientId}
              onChange={e => setPatientId(e.target.value)}
              placeholder="Paste patient UUID from patient profile..."
              required
            />
            <p className="text-xs text-gray-400">Navigate to a patient profile to copy their ID.</p>
          </div>
        </div>

        {/* Line Items */}
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <div className="flex justify-between items-center">
            <h2 className="font-semibold text-gray-800">Line Items</h2>
            <Button type="button" variant="outline" size="sm" onClick={addItem}>
              <Plus className="w-4 h-4 mr-1" /> Add Item
            </Button>
          </div>

          <div className="space-y-3">
            {lineItems.map((item, i) => (
              <div key={i} className="grid grid-cols-12 gap-2 items-end p-3 border rounded-md bg-gray-50">
                <div className="col-span-4 space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Description</label>
                  <Input
                    value={item.item_description}
                    onChange={e => updateItem(i, 'item_description', e.target.value)}
                    placeholder="e.g. Consultation Fee"
                  />
                </div>
                <div className="col-span-3 space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Category</label>
                  <select
                    value={item.category}
                    onChange={e => updateItem(i, 'category', e.target.value)}
                    className="w-full p-2 border rounded-md text-sm"
                  >
                    {CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Qty</label>
                  <Input
                    type="number"
                    min={1}
                    value={item.quantity}
                    onChange={e => updateItem(i, 'quantity', parseInt(e.target.value) || 1)}
                  />
                </div>
                <div className="col-span-2 space-y-1">
                  <label className="text-xs text-gray-500 font-medium">Unit Price (₹)</label>
                  <Input
                    type="number"
                    min={0}
                    step="0.01"
                    value={item.unit_price}
                    onChange={e => updateItem(i, 'unit_price', parseFloat(e.target.value) || 0)}
                  />
                </div>
                <div className="col-span-1">
                  {lineItems.length > 1 && (
                    <Button type="button" variant="ghost" size="sm" className="text-red-500 hover:text-red-700 w-full" onClick={() => removeItem(i)}>
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Total */}
          <div className="border-t pt-4 flex justify-end">
            <div className="text-right">
              <div className="text-sm text-gray-500">Total Amount</div>
              <div className="text-2xl font-bold text-gray-900">
                ₹{total.toLocaleString('en-IN', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        </div>

        <div className="flex justify-end space-x-4">
          <Button type="button" variant="outline" onClick={() => router.back()}>Cancel</Button>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Invoice
          </Button>
        </div>
      </form>
    </div>
  )
}
