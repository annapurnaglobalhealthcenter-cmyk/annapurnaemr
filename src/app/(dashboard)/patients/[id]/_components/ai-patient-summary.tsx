'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestPatientSummary } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, Sparkles, History, CheckCircle, ShieldAlert } from 'lucide-react'

export function AiPatientSummary({ patientId, initialInteraction }: { patientId: string, initialInteraction?: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const [interaction, setInteraction] = useState<any>(initialInteraction)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await requestPatientSummary(patientId)
      setInteraction(res)
      toast.success("Longitudinal summary generated.")
    } catch(e:any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-6">
      <div className="bg-indigo-50 border-b border-indigo-100 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-indigo-900 font-semibold flex items-center">
            <Sparkles className="w-5 h-5 mr-2 text-indigo-600" />
            AI Longitudinal Summary
          </h2>
          <p className="text-xs text-indigo-700 mt-1">Aggregates history, encounters, admissions, and vitals.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <History className="w-4 h-4 mr-2" />}
          {interaction ? "Regenerate Summary" : "Generate Summary"}
        </Button>
      </div>

      {interaction && interaction.ai_response && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 text-sm">
          <div className="col-span-full bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 flex">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
            This summary is AI-generated from the patient's record. It may not be exhaustive. Always refer to the original source documents for critical clinical decisions.
          </div>

          <div>
            <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">Major Diagnoses</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.majorDiagnoses?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">Previous Admissions</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.previousAdmissions?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          <div>
            <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">Important Procedures</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.importantProcedures?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-gray-900 border-b pb-1 mb-2">Trends & Recent Events</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.trends?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              {interaction.ai_response.recentEvents?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="col-span-full md:col-span-2">
            <h4 className="font-bold text-red-700 border-b pb-1 mb-2">Outstanding Issues</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.outstandingIssues?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
