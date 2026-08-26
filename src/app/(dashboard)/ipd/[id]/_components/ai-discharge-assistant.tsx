'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { requestDischargeSummary, resolveAiInteraction } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, FileText, Check, X, ShieldAlert } from 'lucide-react'

export function AiDischargeAssistant({ admissionId, initialInteraction }: { admissionId: string, initialInteraction?: any }) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)
  
  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      await requestDischargeSummary(admissionId)
      toast.success("Discharge draft generated. Please review.")
      router.refresh()
    } catch(e:any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (action: 'Accepted' | 'Rejected') => {
    if (!initialInteraction) return
    try {
      await resolveAiInteraction(initialInteraction.id, action)
      toast.success(`Discharge Summary ${action}`)
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const isPending = initialInteraction?.status === 'Pending'
  const draft = initialInteraction?.ai_response

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-6">
      <div className="bg-slate-50 border-b px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-slate-900 font-semibold flex items-center">
            <FileText className="w-5 h-5 mr-2 text-slate-600" />
            AI Discharge Assistant
          </h2>
          <p className="text-xs text-slate-500 mt-1">Generates a discharge summary draft from longitudinal hospital records.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isLoading || isPending} variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileText className="w-4 h-4 mr-2" />}
          Generate Draft
        </Button>
      </div>

      {isPending && draft && (
        <div className="p-6 text-sm space-y-4 bg-yellow-50/30">
          <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 flex">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
            This is an AI-generated draft. You must review and finalize the content before it becomes the official medical record.
          </div>

          <div className="space-y-4">
            <div>
              <label className="font-bold text-gray-700">Reason for Admission</label>
              <textarea className="w-full border rounded-md p-2 text-sm mt-1" defaultValue={draft.admissionReason} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Hospital Course</label>
              <textarea className="w-full border rounded-md p-2 text-sm mt-1 h-24" defaultValue={draft.hospitalCourse} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Final Diagnosis</label>
              <textarea className="w-full border rounded-md p-2 text-sm mt-1" defaultValue={draft.finalDiagnosis} />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="font-bold text-gray-700">Procedures Performed</label>
                <ul className="list-disc pl-5 mt-1 text-gray-600">
                  {draft.proceduresPerformed?.map((p:string, i:number) => <li key={i}>{p}</li>)}
                </ul>
              </div>
              <div>
                <label className="font-bold text-gray-700">Discharge Medications</label>
                <ul className="list-disc pl-5 mt-1 text-gray-600">
                  {draft.dischargeMedications?.map((m:string, i:number) => <li key={i}>{m}</li>)}
                </ul>
              </div>
            </div>
            <div>
              <label className="font-bold text-gray-700">Discharge Advice</label>
              <textarea className="w-full border rounded-md p-2 text-sm mt-1 h-20" defaultValue={draft.dischargeAdvice} />
            </div>
            <div>
              <label className="font-bold text-gray-700">Condition at Discharge</label>
              <textarea className="w-full border rounded-md p-2 text-sm mt-1" defaultValue={draft.conditionAtDischarge} />
            </div>
          </div>

          <div className="pt-4 flex justify-end space-x-3 border-t">
            <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleResolve('Rejected')}>
              <X className="w-4 h-4 mr-2"/> Discard Draft
            </Button>
            <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleResolve('Accepted')}>
              <Check className="w-4 h-4 mr-2"/> Approve & Finalize
            </Button>
          </div>
        </div>
      )}
      
      {initialInteraction?.status === 'Accepted' && (
        <div className="p-6 text-sm text-green-700 bg-green-50 border-t border-green-100 flex items-center">
          <Check className="w-5 h-5 mr-2" /> Discharge summary finalized.
        </div>
      )}
    </div>
  )
}
