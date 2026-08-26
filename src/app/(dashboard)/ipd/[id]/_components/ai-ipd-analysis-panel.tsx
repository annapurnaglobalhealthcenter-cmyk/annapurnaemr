'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestIpdAnalysis } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, Activity, ShieldAlert, AlertTriangle, ListTodo, ClipboardEdit, ArrowRightLeft } from 'lucide-react'

export function AiIpdAnalysisPanel({ admissionId, initialInteraction }: { admissionId: string, initialInteraction?: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const [interaction, setInteraction] = useState<any>(initialInteraction)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await requestIpdAnalysis(admissionId)
      setInteraction(res)
      toast.success("IPD Analysis complete.")
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
            <Activity className="w-5 h-5 mr-2 text-indigo-600" />
            AI Ward Monitor
          </h2>
          <p className="text-xs text-indigo-700 mt-1">Aggregates vitals, nursing notes, I/O, labs, and orders.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700 text-white">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Activity className="w-4 h-4 mr-2" />}
          {interaction ? "Refresh Analysis" : "Analyze Admission"}
        </Button>
      </div>

      {interaction && interaction.ai_response && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="col-span-full bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 flex">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
            This analysis is AI-generated. The AI does not make treatment decisions. All alerts require explicit clinician verification.
          </div>

          <div>
            <h4 className="font-bold text-red-700 border-b pb-1 mb-2 flex items-center">
              <AlertTriangle className="w-4 h-4 mr-1" /> New Abnormalities
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.newAbnormalities?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-orange-700 border-b pb-1 mb-2 flex items-center">
              <Activity className="w-4 h-4 mr-1" /> Important Trends
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.importantTrends?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 border-b pb-1 mb-2 flex items-center">
              <ListTodo className="w-4 h-4 mr-1" /> Pending Tasks
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.pendingTasks?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-800 border-b pb-1 mb-2 flex items-center">
              <ClipboardEdit className="w-4 h-4 mr-1" /> Documentation Gaps
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.documentationGaps?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="col-span-full bg-red-50 p-4 rounded border border-red-100">
            <h4 className="font-bold text-red-800 mb-2 flex items-center">
              <ShieldAlert className="w-4 h-4 mr-1" /> Potential Clinical Concerns
            </h4>
            <ul className="list-disc pl-4 text-red-900 space-y-1">
              {interaction.ai_response.potentialConcerns?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
          
          <div className="col-span-full bg-blue-50 p-4 rounded border border-blue-100">
            <h4 className="font-bold text-blue-800 mb-2 flex items-center">
              <ArrowRightLeft className="w-4 h-4 mr-1" /> Changes Requiring Review
            </h4>
            <ul className="list-disc pl-4 text-blue-900 space-y-1">
              {interaction.ai_response.changesRequiringReview?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
