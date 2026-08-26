'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { transferPatient } from '@/lib/services/ipd.service'
import { toast } from 'sonner'
import { Loader2, ArrowRightLeft } from 'lucide-react'

export function TransferBedDialog({ admissionId, currentBedId, availableBeds }: { admissionId: string, currentBedId: string, availableBeds: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isOpen, setIsOpen] = useState(false)
  const [selectedBed, setSelectedBed] = useState('')

  const handleTransfer = () => {
    if (!selectedBed) return toast.error('Select a bed to transfer to')

    startTransition(async () => {
      try {
        await transferPatient(admissionId, currentBedId, selectedBed)
        toast.success('Patient transferred successfully')
        setIsOpen(false)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  if (isOpen) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center">
        <div className="bg-white p-6 rounded-lg shadow-xl w-[400px]">
          <h2 className="text-lg font-bold mb-4">Transfer Patient</h2>
          
          <label className="block text-sm font-medium text-gray-700 mb-2">Select New Bed</label>
          <select 
            className="w-full p-2 border rounded-md mb-6 bg-white"
            value={selectedBed}
            onChange={e => setSelectedBed(e.target.value)}
            disabled={isPending}
          >
            <option value="">-- Select Available Bed --</option>
            {availableBeds.map(bed => (
              <option key={bed.id} value={bed.id}>
                {bed.wards.name} - {bed.bed_number}
              </option>
            ))}
          </select>

          <div className="flex justify-end gap-2">
            <Button variant="outline" onClick={() => setIsOpen(false)} disabled={isPending}>Cancel</Button>
            <Button onClick={handleTransfer} disabled={isPending || !selectedBed} className="bg-blue-600 hover:bg-blue-700">
              {isPending && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Transfer
            </Button>
          </div>
        </div>
      </div>
    )
  }

  return (
    <button 
      onClick={() => setIsOpen(true)}
      className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded-md hover:bg-blue-100"
    >
      <ArrowRightLeft className="w-4 h-4 mr-2" />
      Transfer Bed
    </button>
  )
}
