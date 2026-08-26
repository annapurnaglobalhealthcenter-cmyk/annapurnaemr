'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { addProgressNote, addNursingRecord } from '@/lib/services/ipd.service'
import { toast } from 'sonner'
import { useRouter } from 'next/navigation'
import { format } from 'date-fns'
import { Loader2, LogOut } from 'lucide-react'
import Link from 'next/link'

export function IPDWorkspaceClient({ 
  admissionId, 
  admission,
  progressNotes, 
  nursingRecords 
}: { 
  admissionId: string, 
  admission: any,
  progressNotes: any[], 
  nursingRecords: any[] 
}) {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<'doctor' | 'nursing'>('doctor')
  const [isSubmitting, setIsSubmitting] = useState(false)
  const isDischarged = !!admission.actual_discharge_date

  async function handleAddProgress(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      await addProgressNote(admissionId, {
        subjective: fd.get('subjective') as string,
        objective: fd.get('objective') as string,
        assessment: fd.get('assessment') as string,
        plan: fd.get('plan') as string,
      })
      toast.success('Progress note added')
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  async function handleAddNursing(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)
    const fd = new FormData(e.currentTarget)
    try {
      await addNursingRecord(
        admissionId, 
        fd.get('shift') as string, 
        fd.get('notes') as string
      )
      toast.success('Nursing record added')
      ;(e.target as HTMLFormElement).reset()
      router.refresh()
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
      
      {/* Tabs */}
      <div className="flex border-b bg-gray-50">
        <button 
          onClick={() => setActiveTab('doctor')}
          className={`flex-1 py-4 text-sm font-medium border-b-2 ${activeTab === 'doctor' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Doctor's Progress Notes
        </button>
        <button 
          onClick={() => setActiveTab('nursing')}
          className={`flex-1 py-4 text-sm font-medium border-b-2 ${activeTab === 'nursing' ? 'border-blue-600 text-blue-600 bg-white' : 'border-transparent text-gray-500 hover:text-gray-700'}`}
        >
          Nursing Records
        </button>
      </div>

      <div className="p-6">
        {activeTab === 'doctor' ? (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 border-r pr-6 space-y-4 max-h-[600px] overflow-y-auto">
              <h3 className="font-semibold text-gray-800 sticky top-0 bg-white py-2 border-b">Note History</h3>
              {progressNotes.length === 0 && <p className="text-sm text-gray-500 italic">No notes yet.</p>}
              {progressNotes.map(n => (
                <div key={n.id} className="p-3 bg-gray-50 border rounded-md text-sm">
                  <div className="font-semibold text-gray-700 mb-2">{format(new Date(n.created_at), 'MMM d, HH:mm')}</div>
                  <div className="space-y-1">
                    {n.subjective && <div><span className="font-medium text-gray-600">S:</span> {n.subjective}</div>}
                    {n.objective && <div><span className="font-medium text-gray-600">O:</span> {n.objective}</div>}
                    {n.assessment && <div><span className="font-medium text-gray-600">A:</span> {n.assessment}</div>}
                    {n.plan && <div><span className="font-medium text-gray-600">P:</span> {n.plan}</div>}
                  </div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4">Add New Progress Note (SOAP)</h3>
              <form onSubmit={handleAddProgress} className="space-y-4">
                <textarea name="subjective" placeholder="Subjective (Patient's complaints)" className="w-full p-2 border rounded text-sm min-h-[60px]" />
                <textarea name="objective" placeholder="Objective (Vitals, Exam findings)" className="w-full p-2 border rounded text-sm min-h-[60px]" />
                <textarea name="assessment" placeholder="Assessment (Diagnosis/Impression)" className="w-full p-2 border rounded text-sm min-h-[60px]" />
                <textarea name="plan" placeholder="Plan (Treatment, Meds, Orders)" className="w-full p-2 border rounded text-sm min-h-[60px]" />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Note
                  </Button>
                </div>
              </form>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <div className="lg:col-span-1 border-r pr-6 space-y-4 max-h-[600px] overflow-y-auto">
              <h3 className="font-semibold text-gray-800 sticky top-0 bg-white py-2 border-b">Shift Records</h3>
              {nursingRecords.length === 0 && <p className="text-sm text-gray-500 italic">No records yet.</p>}
              {nursingRecords.map(n => (
                <div key={n.id} className="p-3 bg-gray-50 border rounded-md text-sm">
                  <div className="flex justify-between items-center mb-2">
                    <span className="font-semibold text-gray-700">{format(new Date(n.created_at), 'MMM d, HH:mm')}</span>
                    <span className="text-xs font-medium bg-blue-100 text-blue-800 px-2 rounded">{n.shift}</span>
                  </div>
                  <div className="text-gray-600 whitespace-pre-wrap">{n.notes}</div>
                </div>
              ))}
            </div>
            <div className="lg:col-span-2">
              <h3 className="font-semibold text-gray-800 mb-4">Add Nursing Record</h3>
              <form onSubmit={handleAddNursing} className="space-y-4">
                <select name="shift" className="w-full p-2 border rounded text-sm" required>
                  <option value="">Select Shift</option>
                  <option value="Morning">Morning</option>
                  <option value="Evening">Evening</option>
                  <option value="Night">Night</option>
                </select>
                <textarea name="notes" required placeholder="Enter shift observations, vitals, meds administered..." className="w-full p-2 border rounded text-sm min-h-[200px]" />
                <div className="flex justify-end">
                  <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
                    {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />} Save Record
                  </Button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
