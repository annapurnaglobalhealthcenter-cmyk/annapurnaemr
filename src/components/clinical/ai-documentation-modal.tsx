'use client'

import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestClinicalDocumentation, resolveAiInteraction } from '@/lib/services/ai.service'
import { saveClinicalNote } from '@/lib/services/clinical.service'
import { toast } from 'sonner'
import { Loader2, Sparkles, Mic, FileText, Check, X, Wand2 } from 'lucide-react'
import { useRouter } from 'next/navigation'

export function AiDocumentationModal({ 
  isOpen, 
  onClose, 
  encounterId, 
  recordId, 
  currentInteraction 
}: any) {
  const router = useRouter()
  const [roughNotes, setRoughNotes] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [docType, setDocType] = useState('SOAP Note')

  if (!isOpen) return null

  const handleDraft = async () => {
    if (!roughNotes.trim()) return toast.error("Please enter some rough notes first.")
    setIsLoading(true)
    try {
      await requestClinicalDocumentation(encounterId, roughNotes, docType)
      toast.success("AI draft generated successfully.")
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
      await saveClinicalNote(recordId, { chief_complaint: data.subjective })
      await saveClinicalNote(recordId, { exam: data.objective })
      await saveClinicalNote(recordId, { assessment: data.assessment })
      await saveClinicalNote(recordId, { follow_up_plan: data.plan })
      
      await resolveAiInteraction(currentInteraction.id, 'Accepted')
      toast.success("AI Note appended to clinical record!")
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
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const generated = currentInteraction?.status === 'Pending' ? currentInteraction.ai_response : null

  return (
    <div className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-xl shadow-2xl w-full max-w-5xl flex overflow-hidden max-h-[90vh]">
        
        {/* Left Side: Input */}
        <div className="w-1/3 bg-gray-50 border-r p-6 flex flex-col">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <Mic className="w-5 h-5 mr-2 text-indigo-600" /> Shorthand / Voice
          </h2>
          <p className="text-xs text-gray-500 mb-4">Type rough, unstructured notes, or use future voice dictation.</p>
          <textarea 
            className="flex-1 w-full border rounded-lg p-3 text-sm focus:ring-2 focus:ring-indigo-500"
            placeholder="E.g., 45m chest pain 2 days worse on breathing, bp 140/90, probably costochondritis, give ibuprofen..."
            value={roughNotes}
            onChange={e=>setRoughNotes(e.target.value)}
          />
          <div className="mt-4 space-y-3">
            <select className="w-full p-2 border rounded text-sm" value={docType} onChange={e=>setDocType(e.target.value)}>
              <option>SOAP Note</option>
              <option>Referral Letter</option>
              <option>Discharge Summary</option>
            </select>
            <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleDraft} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
              Generate Structured Draft
            </Button>
            <Button variant="outline" className="w-full" onClick={onClose}>Cancel</Button>
          </div>
        </div>

        {/* Right Side: Review */}
        <div className="w-2/3 p-6 flex flex-col bg-white">
          <h2 className="text-lg font-bold text-gray-800 mb-4 flex items-center">
            <FileText className="w-5 h-5 mr-2 text-indigo-600" /> AI Draft Review
          </h2>

          {!generated ? (
            <div className="flex-1 flex flex-col items-center justify-center text-gray-400">
              <Sparkles className="w-12 h-12 mb-4 opacity-20" />
              <p>Generated draft will appear here for review.</p>
            </div>
          ) : (
            <div className="flex-1 flex flex-col">
              <div className="bg-yellow-50 text-yellow-800 text-xs p-3 rounded mb-4 border border-yellow-200">
                <strong>Attention:</strong> Review and edit the AI-generated text below. It will remain a draft until you click "Approve & Append".
              </div>
              
              <div className="flex-1 overflow-y-auto space-y-4 pr-2">
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Subjective</label>
                  <textarea className="w-full border rounded p-2 text-sm mt-1 h-20" defaultValue={generated.subjective} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Objective</label>
                  <textarea className="w-full border rounded p-2 text-sm mt-1 h-20" defaultValue={generated.objective} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Assessment</label>
                  <textarea className="w-full border rounded p-2 text-sm mt-1 h-20" defaultValue={generated.assessment} />
                </div>
                <div>
                  <label className="text-xs font-bold text-gray-700 uppercase">Plan</label>
                  <textarea className="w-full border rounded p-2 text-sm mt-1 h-20" defaultValue={generated.plan} />
                </div>
              </div>

              <div className="pt-4 mt-4 border-t flex justify-end space-x-3">
                <Button variant="outline" className="text-red-600 border-red-200 hover:bg-red-50" onClick={handleReject}>
                  <X className="w-4 h-4 mr-2" /> Reject Draft
                </Button>
                <Button className="bg-green-600 hover:bg-green-700" onClick={handleApprove}>
                  <Check className="w-4 h-4 mr-2" /> Approve & Append to Record
                </Button>
              </div>
            </div>
          )}

        </div>
      </div>
    </div>
  )
}
