'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { dispenseMedication } from '@/lib/services/pharmacy.service'
import { toast } from 'sonner'
import { Pill, Search, CheckCircle2, AlertTriangle, Clock, Calendar, Loader2 } from 'lucide-react'
import { format, differenceInDays } from 'date-fns'

export function PharmacyClient({ pending, batches, history }: { pending: any[], batches: any[], history: any[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'Dispensary' | 'Inventory' | 'History'>('Dispensary')

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <Pill className="w-6 h-6 mr-2 text-green-700" /> Central Pharmacy
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage dispensing, batch inventory, and stock levels.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          {['Dispensary', 'Inventory', 'History'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === t ? 'border-green-600 text-green-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t} 
              {t === 'Dispensary' && <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">{pending.length}</span>}
            </button>
          ))}
        </nav>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        {tab === 'Dispensary' && <DispensaryTab pending={pending} batches={batches} router={router} />}
        {tab === 'Inventory' && <InventoryTab batches={batches} />}
        {tab === 'History' && <HistoryTab history={history} />}
      </div>
    </div>
  )
}

function DispensaryTab({ pending, batches, router }: any) {
  const [expandedId, setExpandedId] = useState<string | null>(null)
  
  if (pending.length === 0) {
    return <div className="p-12 text-center text-gray-500 font-medium">No pending finalized prescriptions.</div>
  }

  return (
    <ul className="divide-y divide-gray-100">
      {pending.map((p: any) => {
        const patient = Array.isArray(p.encounters?.patients) ? p.encounters.patients[0] : p.encounters?.patients
        const doctor = Array.isArray(p.encounters?.user_profiles) ? p.encounters.user_profiles[0]?.full_name : p.encounters?.user_profiles?.full_name
        const isExpanded = expandedId === p.id

        return (
          <li key={p.id} className="p-4 hover:bg-gray-50 flex flex-col">
            <div className="flex justify-between items-center cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : p.id)}>
              <div>
                <div className="flex items-center space-x-3">
                  <span className="font-bold text-gray-900 text-lg">{p.medication_name}</span>
                  <span className="bg-green-100 text-green-800 text-[10px] px-2 py-0.5 rounded-full font-bold uppercase">{p.status}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  <span className="font-semibold text-gray-800">{p.dosage}</span> · {p.frequency} · {p.duration}
                </div>
                <div className="text-xs text-gray-500 mt-1">
                  Patient: <span className="font-medium text-gray-900">{patient?.first_name} {patient?.last_name}</span> | Prescribed by: {doctor}
                </div>
              </div>
              <Button size="sm" className="bg-green-600 hover:bg-green-700">Fulfill Prescription ↓</Button>
            </div>

            {isExpanded && (
              <div className="mt-4 pt-4 border-t border-green-200">
                <DispenseForm prescription={p} batches={batches} router={router} onClose={() => setExpandedId(null)} />
              </div>
            )}
          </li>
        )
      })}
    </ul>
  )
}

function DispenseForm({ prescription, batches, router, onClose }: any) {
  const [isPending, startTransition] = useTransition()
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [quantity, setQuantity] = useState<number>(0)

  // Try to find matching batches (fuzzy match on brand or generic)
  const matchingBatches = batches.filter((b:any) => {
    const brand = b.pharmacy_medicine_master?.brand_name?.toLowerCase() || ''
    const generic = b.pharmacy_medicine_master?.generic_name?.toLowerCase() || ''
    const term = prescription.medication_name.toLowerCase()
    return brand.includes(term) || generic.includes(term) || term.includes(brand)
  })

  const handleDispense = () => {
    if (!selectedBatch || !quantity || quantity <= 0) return toast.error('Select batch and valid quantity')

    startTransition(async () => {
      try {
        await dispenseMedication(prescription.id, selectedBatch, quantity, `Dispensed for Rx ${prescription.id}`)
        toast.success('Medication dispensed & stock deducted atomically.')
        router.refresh()
        onClose()
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  return (
    <div className="bg-green-50 p-4 rounded-md border border-green-100 space-y-4">
      <h3 className="font-bold text-sm text-green-900 mb-2">Select Batch to Dispense</h3>
      
      {matchingBatches.length > 0 ? (
        <div className="grid gap-2">
          {matchingBatches.map((b:any) => (
            <label key={b.id} className={`flex items-center justify-between p-3 border rounded cursor-pointer ${selectedBatch === b.id ? 'bg-green-100 border-green-500 ring-1 ring-green-500' : 'bg-white hover:bg-gray-50'}`}>
              <div className="flex items-center space-x-3">
                <input type="radio" name="batch" value={b.id} checked={selectedBatch === b.id} onChange={() => setSelectedBatch(b.id)} className="text-green-600 focus:ring-green-500" />
                <div>
                  <div className="font-bold text-gray-900">{b.pharmacy_medicine_master.brand_name} <span className="text-xs font-normal text-gray-500">({b.pharmacy_medicine_master.strength})</span></div>
                  <div className="text-xs text-gray-500">Batch: <span className="font-mono font-medium">{b.batch_number}</span> | Exp: {format(new Date(b.expiry_date), 'MMM yyyy')}</div>
                </div>
              </div>
              <div className="text-right">
                <div className="text-xs text-gray-500 mb-1">Available Stock</div>
                <div className="font-black text-lg text-green-700">{b.current_stock}</div>
              </div>
            </label>
          ))}
        </div>
      ) : (
        <div className="text-sm text-amber-700 bg-amber-50 p-3 rounded flex items-start">
          <AlertTriangle className="w-5 h-5 mr-2 flex-shrink-0" />
          <div>
            <strong>No direct match found in stock for "{prescription.medication_name}".</strong>
            <p className="mt-1">Please select an alternative manually below if substituting.</p>
          </div>
        </div>
      )}

      {/* Manual Fallback Select */}
      {matchingBatches.length === 0 && (
        <select className="w-full p-2 border rounded bg-white text-sm" value={selectedBatch} onChange={e=>setSelectedBatch(e.target.value)}>
          <option value="">-- Select Any Available Batch --</option>
          {batches.map((b:any) => (
            <option key={b.id} value={b.id}>
              {b.pharmacy_medicine_master.brand_name} ({b.batch_number}) - Stock: {b.current_stock}
            </option>
          ))}
        </select>
      )}

      <div className="flex items-end justify-between pt-4 border-t border-green-200">
        <div>
          <label className="block text-xs font-bold text-gray-700 uppercase tracking-wider mb-1">Quantity to Dispense</label>
          <Input type="number" min="1" className="w-32 bg-white font-bold text-lg" value={quantity || ''} onChange={e=>setQuantity(parseInt(e.target.value))} />
        </div>
        <Button size="lg" className="bg-green-600 hover:bg-green-700 font-bold" onClick={handleDispense} disabled={isPending || !selectedBatch || !quantity}>
          {isPending ? <Loader2 className="w-5 h-5 mr-2 animate-spin" /> : <CheckCircle2 className="w-5 h-5 mr-2" />}
          Confirm & Dispense
        </Button>
      </div>
    </div>
  )
}

function InventoryTab({ batches }: { batches: any[] }) {
  const [search, setSearch] = useState('')

  const filtered = batches.filter((b:any) => 
    b.pharmacy_medicine_master?.brand_name?.toLowerCase().includes(search.toLowerCase()) ||
    b.batch_number.toLowerCase().includes(search.toLowerCase())
  )

  return (
    <div className="p-4">
      <div className="mb-4 relative max-w-md">
        <Search className="absolute left-2.5 top-2.5 w-4 h-4 text-gray-400" />
        <Input className="pl-9" placeholder="Search by brand or batch number..." value={search} onChange={e=>setSearch(e.target.value)} />
      </div>

      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b border-t">
          <tr>
            <th className="px-4 py-3">Medicine</th>
            <th className="px-4 py-3">Batch Number</th>
            <th className="px-4 py-3">Expiry Date</th>
            <th className="px-4 py-3 text-right">Current Stock</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {filtered.map((b:any) => {
            const daysToExpiry = differenceInDays(new Date(b.expiry_date), new Date())
            const isExpiring = daysToExpiry <= 90
            const isLowStock = b.current_stock < 50

            return (
              <tr key={b.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">{b.pharmacy_medicine_master.brand_name}</div>
                  <div className="text-xs text-gray-500">{b.pharmacy_medicine_master.generic_name} ({b.pharmacy_medicine_master.strength})</div>
                </td>
                <td className="px-4 py-3 font-mono text-gray-700">{b.batch_number}</td>
                <td className="px-4 py-3">
                  <span className={`flex items-center ${isExpiring ? 'text-red-600 font-bold' : 'text-gray-700'}`}>
                    {isExpiring && <Clock className="w-3 h-3 mr-1" />}
                    {format(new Date(b.expiry_date), 'MMM yyyy')}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <span className={`px-2 py-1 rounded text-sm font-bold ${isLowStock ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'}`}>
                    {b.current_stock}
                  </span>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function HistoryTab({ history }: { history: any[] }) {
  if (history.length === 0) return <div className="p-8 text-center text-gray-500">No dispense history.</div>

  return (
    <div className="p-0">
      <table className="w-full text-sm text-left">
        <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
          <tr>
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Medicine (Batch)</th>
            <th className="px-4 py-3 text-right">Qty</th>
            <th className="px-4 py-3">Patient</th>
            <th className="px-4 py-3">Dispensed By</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-gray-100">
          {history.map((h:any) => {
            const patient = Array.isArray(h.patients) ? h.patients[0] : h.patients
            const staff = Array.isArray(h.user_profiles) ? h.user_profiles[0]?.full_name : h.user_profiles?.full_name
            const batch = Array.isArray(h.pharmacy_batches) ? h.pharmacy_batches[0] : h.pharmacy_batches

            return (
              <tr key={h.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{format(new Date(h.dispensed_at), 'dd MMM yy HH:mm')}</td>
                <td className="px-4 py-3">
                  <div className="font-bold text-gray-900">{batch?.pharmacy_medicine_master?.brand_name}</div>
                  <div className="text-xs text-gray-500 font-mono">{batch?.batch_number}</div>
                </td>
                <td className="px-4 py-3 text-right font-bold text-red-600">-{h.quantity_dispensed}</td>
                <td className="px-4 py-3 text-gray-700">{patient?.first_name} {patient?.last_name}</td>
                <td className="px-4 py-3 text-xs text-gray-500">{staff}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}
