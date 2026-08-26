'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestInvestigationAnalysis } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, ActivitySquare, AlertTriangle, TrendingUp, ShieldAlert } from 'lucide-react'

export function AiInvestigationAnalysis({ reportId, patientId, initialInteraction }: { reportId: string, patientId: string, initialInteraction?: any }) {
  const [isLoading, setIsLoading] = useState(false)
  const [interaction, setInteraction] = useState<any>(initialInteraction)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      const res = await requestInvestigationAnalysis(reportId, patientId)
      setInteraction(res)
      toast.success("AI Investigation Analysis complete.")
    } catch(e:any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div className="bg-white border rounded-lg shadow-sm overflow-hidden mb-6">
      <div className="bg-slate-50 border-b border-slate-200 px-6 py-4 flex justify-between items-center">
        <div>
          <h2 className="text-slate-900 font-semibold flex items-center">
            <ActivitySquare className="w-5 h-5 mr-2 text-slate-600" />
            AI Trend & Investigation Analysis
          </h2>
          <p className="text-xs text-slate-600 mt-1">Cross-references this report against the patient's historical labs.</p>
        </div>
        <Button onClick={handleGenerate} disabled={isLoading} className="bg-slate-800 hover:bg-slate-900 text-white">
          {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <TrendingUp className="w-4 h-4 mr-2" />}
          {interaction ? "Re-Analyze Trends" : "Analyze Trends"}
        </Button>
      </div>

      {interaction && interaction.ai_response && (
        <div className="p-6 grid grid-cols-1 md:grid-cols-2 gap-6 text-sm">
          <div className="col-span-full bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 flex">
            <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
            This analysis is AI-generated and is not an independent diagnosis. Clinician review is strictly required to interpret observed results.
          </div>

          <div>
            <h4 className="font-bold text-red-700 border-b pb-1 mb-2 flex items-center">
              <AlertTriangle className="w-3 h-3 mr-1" /> Abnormal Values
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.abnormalValues?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-orange-700 border-b pb-1 mb-2 flex items-center">
              <TrendingUp className="w-3 h-3 mr-1" /> Repeated Abnormalities
            </h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.repeatedAbnormalities?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">Historical Trends</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.trends?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div>
            <h4 className="font-bold text-slate-900 border-b pb-1 mb-2">Significant Changes</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.significantChanges?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>

          <div className="col-span-full bg-slate-50 p-4 rounded border">
            <h4 className="font-bold text-slate-900 mb-2">Potential Clinical Concerns & Missing Follow-up (Needs Review)</h4>
            <ul className="list-disc pl-4 text-gray-700 space-y-1">
              {interaction.ai_response.potentialConcerns?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              {interaction.ai_response.missingFollowUp?.map((s:any, i:number) => <li key={i}>{s}</li>)}
            </ul>
          </div>
        </div>
      )}
    </div>
  )
}
