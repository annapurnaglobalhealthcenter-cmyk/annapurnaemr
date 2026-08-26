'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { requestDifferentialDiagnosis, resolveAiInteraction } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, Sparkles, Check, X, Edit3, ShieldAlert } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AiAssistantPanel({ 
  recordId, 
  isDraft, 
  vitals, 
  chiefComplaint,
  exam,
  encounterId,
  currentInteraction
}: { 
  recordId: string, 
  isDraft: boolean, 
  vitals: any, 
  chiefComplaint: string,
  exam: string,
  encounterId: string,
  currentInteraction?: any
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    if (!chiefComplaint || chiefComplaint.trim().length < 10) {
      toast.error('Please enter a more detailed Chief Complaint first.')
      return
    }

    setIsLoading(true)
    try {
      await requestDifferentialDiagnosis(encounterId)
      toast.success('AI Suggestions generated securely')
      router.refresh()
    } catch (err: any) {
      toast.error(err.message || 'AI request failed')
    } finally {
      setIsLoading(false)
    }
  }

  const handleResolve = async (action: 'Accepted' | 'Rejected' | 'Modified') => {
    try {
      await resolveAiInteraction(currentInteraction.id, action)
      toast.success(`AI Suggestion ${action}`)
      router.refresh()
    } catch(e:any) {
      toast.error(e.message)
    }
  }

  const handleModify = () => {
    toast.info("In a full implementation, this opens a modal to let you edit the AI's suggestions before appending them to the record.")
    handleResolve('Modified')
  }

  const suggestions = currentInteraction?.ai_response

  return (
    <div className="bg-indigo-50 border border-indigo-200 p-5 rounded-md shadow-sm">
      <h3 className="font-semibold mb-2 text-indigo-900 flex items-center justify-between">
        <span className="flex items-center"><Sparkles className="w-4 h-4 mr-2" /> AI Clinical Assistant</span>
        <span className="text-[10px] uppercase font-bold bg-indigo-200 text-indigo-800 px-2 py-0.5 rounded">Experimental</span>
      </h3>
      
      {!currentInteraction || currentInteraction.status !== 'Pending' ? (
        <>
          <p className="text-xs text-indigo-800 mb-4 opacity-80">
            Generate diagnostic considerations based on anonymized clinical context. 
            <br/><br/>
            <strong>Note:</strong> AI suggestions must be reviewed. Nothing is automatically finalized.
          </p>
          <Button 
            onClick={handleGenerate} 
            disabled={!isDraft || isLoading} 
            size="sm" 
            className="w-full bg-indigo-600 hover:bg-indigo-700 text-white"
          >
            {isLoading && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Generate Clinical Insights
          </Button>
          {!isDraft && <div className="text-xs text-gray-500 italic mt-2 text-center">Available only in Draft mode.</div>}

          {currentInteraction && currentInteraction.status !== 'Pending' && (
             <div className="mt-4 p-3 bg-white rounded border text-xs text-gray-700">
               Last interaction was <strong>{currentInteraction.status}</strong>.
             </div>
          )}
        </>
      ) : (
        <div className="space-y-6 mt-4">
          
          <div className="bg-white p-3 rounded border border-indigo-100 shadow-inner max-h-[500px] overflow-y-auto space-y-5 text-sm">
            
            <div className="bg-yellow-50 border border-yellow-200 p-2 rounded text-xs text-yellow-800 flex">
              <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
              This is AI-generated output. It requires physician review. Do not rely solely on this information. Medication suggestions must be manually verified.
            </div>

            <div>
              <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">1. Clinical Summary</h4>
              <p className="text-gray-700 text-xs">{suggestions?.clinicalSummary}</p>
            </div>

            <div>
              <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">2. Differential Considerations</h4>
              <ul className="text-xs space-y-2">
                {suggestions?.differentialConsiderations?.map((d: any, i: number) => (
                  <li key={i} className="bg-gray-50 p-2 rounded border">
                    <div className="font-bold text-gray-900">{d.condition} <span className="text-gray-500 font-normal">({d.probability})</span></div>
                    <div className="text-gray-600 mt-1">{d.rationale}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div className="grid grid-cols-2 gap-4 text-xs">
              <div>
                <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">3. Supporting Findings</h4>
                <ul className="list-disc pl-4 text-gray-700 space-y-1">
                  {suggestions?.supportingFindings?.map((s:any, i:number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
              <div>
                <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">4. Contradictory Info</h4>
                <ul className="list-disc pl-4 text-gray-700 space-y-1">
                  {suggestions?.contradictoryInformation?.map((s:any, i:number) => <li key={i}>{s}</li>)}
                </ul>
              </div>
            </div>

            <div>
              <h4 className="font-bold text-red-700 border-b pb-1 mb-2 flex items-center"><ShieldAlert className="w-3 h-3 mr-1" /> 5. Red Flags</h4>
              <ul className="list-disc pl-4 text-gray-700 space-y-1 text-xs">
                {suggestions?.redFlags?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">6. Investigations</h4>
              <ul className="list-disc pl-4 text-gray-700 space-y-1 text-xs">
                {suggestions?.investigationConsiderations?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-amber-700 border-b pb-1 mb-2">7. Medication Suggestions (Review Required)</h4>
              <ul className="text-xs space-y-2">
                {suggestions?.medicationConsiderations?.map((m: any, i: number) => (
                  <li key={i} className="bg-amber-50 p-2 rounded border border-amber-100">
                    <div className="font-bold text-amber-900">{m.drugClass}</div>
                    <div className="text-gray-600 mt-1">Reason: {m.reason}</div>
                    <div className="text-red-600 mt-1 font-medium">Caution: {m.caution}</div>
                  </li>
                ))}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">8. Management</h4>
              <ul className="list-disc pl-4 text-gray-700 space-y-1 text-xs">
                {suggestions?.managementConsiderations?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-indigo-900 border-b pb-1 mb-2">9. Referrals</h4>
              <ul className="list-disc pl-4 text-gray-700 space-y-1 text-xs">
                {suggestions?.referralConsiderations?.map((s:any, i:number) => <li key={i}>{s}</li>)}
              </ul>
            </div>

            <div>
              <h4 className="font-bold text-gray-700 border-b pb-1 mb-2">10. Uncertainty</h4>
              <p className="text-gray-600 text-xs italic">{suggestions?.uncertainty}</p>
            </div>

          </div>

          <div className="grid grid-cols-3 gap-2">
            <Button size="sm" variant="outline" className="text-red-600 border-red-200 hover:bg-red-50 text-xs" onClick={() => handleResolve('Rejected')}>
              <X className="w-3 h-3 mr-1 shrink-0" /> Reject
            </Button>
            <Button size="sm" variant="outline" className="text-blue-600 border-blue-200 hover:bg-blue-50 text-xs" onClick={handleModify}>
              <Edit3 className="w-3 h-3 mr-1 shrink-0" /> Modify & Accept
            </Button>
            <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs" onClick={() => handleResolve('Accepted')}>
              <Check className="w-3 h-3 mr-1 shrink-0" /> Accept All
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
