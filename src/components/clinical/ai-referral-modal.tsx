'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { requestReferralLetter, resolveAiInteraction } from '@/lib/services/ai.service'
import { toast } from 'sonner'
import { Loader2, UserPlus, Check, X, ShieldAlert } from 'lucide-react'
import { saveClinicalNote } from '@/lib/services/clinical.service'

export function AiReferralModal({ 
  isOpen, 
  onClose, 
  encounterId, 
  recordId, 
  currentInteraction 
}: { 
  isOpen: boolean
  onClose: () => void
  encounterId: string
  recordId: string
  currentInteraction?: any
}) {
  const router = useRouter()
  const [isLoading, setIsLoading] = useState(false)

  const handleGenerate = async () => {
    setIsLoading(true)
    try {
      await requestReferralLetter(encounterId)
      toast.success("AI Referral draft generated.")
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleApprove = async () => {
    try {
      const data = currentInteraction.ai_response
      // Map to the SOAP note or store as a referral document. 
      // For simplicity in this EMR, we'll append it to the 'plan' section or store in clinical_records
      await saveClinicalNote(recordId, { 
        follow_up_plan: `REFERRAL LETTER:\n\nTo the Specialist,\n\nReason: ${data.reasonForReferral}\n\nClinical Findings: ${data.clinicalFindings}\n\nQuestions: ${data.questionsForSpecialist.join(', ')}` 
      })
      
      await resolveAiInteraction(currentInteraction.id, 'Accepted')
      toast.success("Referral appended to clinical record!")
      onClose()
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const handleReject = async () => {
    try {
      await resolveAiInteraction(currentInteraction.id, 'Rejected')
      toast.info("Draft rejected.")
      onClose()
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const draft = currentInteraction?.ai_response
  const isPending = currentInteraction?.status === 'Pending'

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center">
            <UserPlus className="w-5 h-5 mr-2 text-indigo-600" />
            AI Referral Assistant
          </DialogTitle>
          <DialogDescription>
            Generate a structured referral letter based on the current clinical context.
          </DialogDescription>
        </DialogHeader>

        {!isPending || !draft ? (
          <div className="flex flex-col items-center justify-center p-8 text-center space-y-4 bg-indigo-50/50 rounded-lg border border-dashed border-indigo-200">
            <p className="text-sm text-gray-600">The AI will analyze the patient's history, current findings, and investigations to draft a referral.</p>
            <Button onClick={handleGenerate} disabled={isLoading} className="bg-indigo-600 hover:bg-indigo-700">
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <UserPlus className="w-4 h-4 mr-2" />}
              Generate Referral Draft
            </Button>
          </div>
        ) : (
          <div className="space-y-4 mt-2">
            <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded border border-yellow-200 flex">
              <ShieldAlert className="w-4 h-4 mr-2 shrink-0" />
              This is an AI-generated draft. You must review and finalize the content before authorizing the referral.
            </div>

            <div className="space-y-3 text-sm">
              <div>
                <label className="font-bold text-gray-700">Patient Summary</label>
                <textarea className="w-full border rounded-md p-2 text-sm mt-1" defaultValue={draft.patientSummary} />
              </div>
              <div>
                <label className="font-bold text-gray-700">Reason for Referral</label>
                <textarea className="w-full border rounded-md p-2 text-sm mt-1" defaultValue={draft.reasonForReferral} />
              </div>
              <div>
                <label className="font-bold text-gray-700">Clinical Findings & History</label>
                <textarea className="w-full border rounded-md p-2 text-sm mt-1 h-32" defaultValue={`${draft.relevantHistory}\n\n${draft.currentProblem}\n\n${draft.clinicalFindings}`} />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="font-bold text-gray-700">Investigations</label>
                  <ul className="list-disc pl-5 mt-1 text-gray-600">
                    {draft.investigations?.map((p:string, i:number) => <li key={i}>{p}</li>)}
                  </ul>
                </div>
                <div>
                  <label className="font-bold text-gray-700">Questions for Specialist</label>
                  <ul className="list-disc pl-5 mt-1 text-gray-600">
                    {draft.questionsForSpecialist?.map((m:string, i:number) => <li key={i}>{m}</li>)}
                  </ul>
                </div>
              </div>
            </div>

            <div className="pt-4 flex justify-end space-x-3 border-t mt-4">
              <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={handleReject}>
                <X className="w-4 h-4 mr-2"/> Discard Draft
              </Button>
              <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                <Check className="w-4 h-4 mr-2"/> Approve & Add to Plan
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
