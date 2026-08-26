'use client'

import { useState, useCallback, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { saveClinicalNote, finalizeRecord, createDraftRecord, amendClinicalRecord } from '@/lib/services/clinical.service'
import { toast } from 'sonner'
import { Loader2, AlertCircle, History, Lock, Unlock, FileEdit, FileClock, Activity, Stethoscope } from 'lucide-react'
import debounce from 'lodash/debounce'
import { AiAssistantPanel } from './ai-assistant'
import { AiDocumentationModal } from '@/components/clinical/ai-documentation-modal'
import { AiReferralModal } from '@/components/clinical/ai-referral-modal'
import { PrescriptionBuilder } from '@/components/clinical/prescription-builder'
import { InvestigationBuilder } from '@/components/clinical/investigation-builder'
import { format } from 'date-fns'

interface OPDWorkspaceProps {
  encounterId: string
  patientId: string
  patientDetails: any
  pastRecords: any[]
  activeRecord: any
  vitals: any[]
  diagnoses: any[]
  medications: any[]
  investigations: any[]
  aiInteraction?: any
  aiDocInteraction?: any
  aiReferralInteraction?: any
  medSafetyInteraction?: any
}

export function OPDWorkspace({
  encounterId,
  patientId,
  patientDetails,
  pastRecords,
  activeRecord,
  vitals,
  diagnoses,
  medications,
  investigations,
  aiInteraction,
  aiDocInteraction,
  aiReferralInteraction,
  medSafetyInteraction
}: OPDWorkspaceProps) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  const [isAiDocModalOpen, setIsAiDocModalOpen] = useState(false)
  const [isAiReferralModalOpen, setIsAiReferralModalOpen] = useState(false)
  
  const isDraft = activeRecord?.status === 'Draft'
  const isFinalized = activeRecord?.status === 'Finalized'

  const debouncedSave = useCallback(
    debounce(async (id: string, field: string, value: string) => {
      try {
        await saveClinicalNote(id, { [field]: value })
        toast.success('Auto-saved')
      } catch (err: any) {
        toast.error('Auto-save failed: ' + err.message)
      }
    }, 1500),
    []
  )

  const handleNoteChange = (field: string, value: string) => {
    if (!activeRecord?.id || !isDraft) return
    debouncedSave(activeRecord.id, field, value)
  }

  const handleCreateDraft = () => {
    startTransition(async () => {
      try {
        await createDraftRecord(encounterId, patientId)
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleFinalize = () => {
    startTransition(async () => {
      try {
        await finalizeRecord(activeRecord.id)
        toast.success('Record Finalized & Locked')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleAmend = () => {
    if (!confirm('Are you sure you want to amend this record? A new Draft will be created and this version will be archived.')) return
    startTransition(async () => {
      try {
        await amendClinicalRecord(activeRecord.id)
        toast.success('New version drafted')
        router.refresh()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="flex h-full overflow-hidden">
      
      {/* Left Panel: Patient History (Read-only) */}
      <div className="w-80 bg-gray-50 border-r overflow-y-auto p-4 space-y-6 shrink-0">
        
        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Allergies</h3>
          {patientDetails.patient_allergies?.length > 0 ? (
            <ul className="space-y-2">
              {patientDetails.patient_allergies.map((a: any, i: number) => (
                <li key={i} className="text-sm bg-red-50 text-red-800 p-2 rounded border border-red-100 flex justify-between">
                  <span className="font-medium">{a.allergy_name}</span>
                  <span className="text-xs text-red-600">{a.severity}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">No known allergies</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Chronic Conditions</h3>
          {patientDetails.patient_conditions?.length > 0 ? (
            <ul className="space-y-1">
              {patientDetails.patient_conditions.map((c: any, i: number) => (
                <li key={i} className="text-sm flex items-center space-x-2">
                  <div className={`w-2 h-2 rounded-full ${c.status === 'Active' ? 'bg-orange-500' : 'bg-gray-400'}`} />
                  <span>{c.condition_name}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-gray-500 italic">None recorded</p>
          )}
        </div>

        <div>
          <h3 className="text-xs font-bold text-gray-500 uppercase tracking-wider mb-2">Past Consultations</h3>
          {pastRecords.length > 0 ? (
            <div className="space-y-3">
              {pastRecords.map((r: any) => (
                <div key={r.id} className="bg-white border rounded p-3 text-sm shadow-sm">
                  <div className="text-xs text-gray-500 mb-1">{format(new Date(r.created_at), 'dd MMM yyyy')}</div>
                  <div className="font-medium text-gray-800 truncate">{r.chief_complaint || 'No complaint recorded'}</div>
                  <div className="text-xs text-gray-500 mt-1">Dr. {r.user_profiles?.full_name}</div>
                  <div className="flex space-x-1 mt-2">
                    {r.diagnoses?.slice(0,2).map((d:any, i:number) => (
                      <span key={i} className="bg-gray-100 text-gray-600 px-1.5 py-0.5 rounded text-[10px]">{d.diagnosis_name}</span>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-gray-500 italic">No prior visits found</p>
          )}
        </div>

      </div>

      {/* Right Panel: Clinical Workspace */}
      <div className="flex-1 flex flex-col h-full bg-white relative">
        
        {/* Status Bar */}
        <div className="px-6 py-2 bg-gray-50 border-b flex justify-between items-center shrink-0">
          <div className="flex items-center space-x-3">
            {!activeRecord ? (
              <span className="text-sm text-gray-500 flex items-center"><AlertCircle className="w-4 h-4 mr-1"/> No active record</span>
            ) : isFinalized ? (
              <span className="text-sm font-medium text-green-700 bg-green-100 px-2 py-1 rounded flex items-center">
                <Lock className="w-4 h-4 mr-1"/> Finalized (v{activeRecord.version_number})
              </span>
            ) : activeRecord.status === 'Amended' ? (
              <span className="text-sm font-medium text-gray-500 bg-gray-200 px-2 py-1 rounded flex items-center">
                <FileClock className="w-4 h-4 mr-1"/> Superseded (v{activeRecord.version_number})
              </span>
            ) : (
              <span className="text-sm font-medium text-blue-700 bg-blue-100 px-2 py-1 rounded flex items-center">
                <Unlock className="w-4 h-4 mr-1"/> Draft in progress (v{activeRecord.version_number})
              </span>
            )}
          </div>
          <div className="flex space-x-2">
            {!activeRecord && (
              <Button size="sm" onClick={handleCreateDraft} disabled={isPending}>Start Consultation</Button>
            )}
            {isDraft && (
              <Button size="sm" onClick={handleFinalize} disabled={isPending} className="bg-green-600 hover:bg-green-700">
                Finalize Record
              </Button>
            )}
            {isFinalized && (
              <>
                <Button size="sm" variant="outline" onClick={handleAmend} disabled={isPending}>
                  <FileEdit className="w-4 h-4 mr-2" /> Amend Record
                </Button>
                <Button size="sm" variant="outline" onClick={() => window.open(`/encounters/${encounterId}/prescription/print`, '_blank')}>
                  🖨️ Print Prescription
                </Button>
              </>
            )}
          </div>
        </div>

        {/* Note Taking Area */}
        <div className="flex-1 overflow-y-auto p-6">
          {!activeRecord ? (
            <div className="h-full flex flex-col items-center justify-center text-gray-400">
              <History className="w-12 h-12 mb-4 opacity-20" />
              <p>Click "Start Consultation" to begin drafting notes.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 xl:grid-cols-3 gap-6 max-w-7xl mx-auto">
              
              {/* Active Clinical Notes */}
              <div className="xl:col-span-2 space-y-6">
                
                <section className="bg-white border rounded-md shadow-sm overflow-hidden">
                  <div className="bg-gray-50 border-b px-4 py-3 flex justify-between items-center">
                    <h2 className="font-semibold text-gray-800 flex items-center">
                      <FileEdit className="w-5 h-5 mr-2 text-indigo-600" />
                      Consultation Notes
                    </h2>
                    {isDraft && (
                      <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 h-8 text-xs" onClick={() => setIsAiDocModalOpen(true)}>
                        ✨ AI Note Writer
                      </Button>
                    )}
                  </div>
                  <div className="p-4 space-y-6">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Chief Complaint</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[60px]" 
                        defaultValue={activeRecord.chief_complaint || ''}
                        onChange={(e) => handleNoteChange('chief_complaint', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">History of Present Illness</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[80px]" 
                        defaultValue={activeRecord.history_of_present_illness || ''}
                        onChange={(e) => handleNoteChange('hpi', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Review of Symptoms & Past History</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[60px]" 
                        defaultValue={activeRecord.past_history || ''}
                        onChange={(e) => handleNoteChange('past_history', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-800 mb-2 border-b pb-1">Objective</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Examination Notes</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[100px]" 
                        defaultValue={activeRecord.examination_notes || ''}
                        onChange={(e) => handleNoteChange('exam', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                  </div>
                </section>

                <section>
                  <h3 className="font-semibold text-gray-800 mb-2 border-b pb-1">Assessment & Plan</h3>
                  <div className="space-y-3">
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Assessment / Clinical Impression</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[80px]" 
                        defaultValue={activeRecord.assessment || ''}
                        onChange={(e) => handleNoteChange('assessment', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Advice / Instructions</label>
                      <textarea 
                        className="w-full p-2 border rounded-md text-sm min-h-[60px]" 
                        defaultValue={activeRecord.advice || ''}
                        onChange={(e) => handleNoteChange('advice', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                    <div>
                      <label className="text-xs text-gray-500 font-medium">Follow-up Plan</label>
                      <input 
                        type="text"
                        className="w-full p-2 border rounded-md text-sm" 
                        defaultValue={activeRecord.follow_up_plan || ''}
                        onChange={(e) => handleNoteChange('follow_up_plan', e.target.value)}
                        disabled={!isDraft}
                      />
                    </div>
                  </div>
                </section>

              </div>

              {/* Sidebar Modules (Vitals, Rx, AI) */}
              <div className="xl:col-span-1 space-y-6">
                
                <AiAssistantPanel 
                  recordId={activeRecord.id}
                  encounterId={encounterId}
                  isDraft={isDraft}
                  vitals={vitals[0]}
                  chiefComplaint={activeRecord.chief_complaint}
                  exam={activeRecord.examination_notes}
                  currentInteraction={aiInteraction}
                />

                <div className="bg-white border rounded-md shadow-sm p-4">
                  <h3 className="font-semibold text-gray-800 mb-3 border-b pb-1 flex justify-between items-center">
                    Diagnoses
                    {isDraft && <Button variant="ghost" size="sm" className="h-6 text-xs text-blue-600">+ Add</Button>}
                  </h3>
                  {diagnoses.length > 0 ? (
                    <ul className="space-y-2 text-sm">
                      {diagnoses.map((d: any) => (
                        <li key={d.id} className="flex flex-col">
                          <span className="font-medium text-gray-800">{d.diagnosis_name}</span>
                          <span className="text-xs text-gray-500">{d.diagnosis_type} · {d.status}</span>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="text-xs text-gray-500 italic">No diagnoses recorded</p>
                  )}
                </div>

                <PrescriptionBuilder 
                  encounterId={encounterId}
                  patientId={patientId}
                  recordId={activeRecord.id}
                  isDraft={isDraft}
                  existingMeds={medications}
                  medSafetyInteraction={medSafetyInteraction}
                />

                <InvestigationBuilder 
                  recordId={activeRecord.id}
                  encounterId={encounterId}
                  patientId={patientId}
                  isDraft={isDraft}
                  existingOrders={investigations}
                />
                
                {isDraft && (
                  <div className="flex space-x-2">
                    <Button variant="outline" size="sm" onClick={() => setIsAiReferralModalOpen(true)} className="text-blue-700 border-blue-200 bg-blue-50 hover:bg-blue-100">
                      <Stethoscope className="w-4 h-4 mr-2" /> AI Referral
                    </Button>
                    <Button variant="outline" size="sm" onClick={() => setIsAiDocModalOpen(true)} className="text-indigo-700 border-indigo-200 bg-indigo-50 hover:bg-indigo-100">
                      <Activity className="w-4 h-4 mr-2" /> AI Dictate / Note
                    </Button>
                  </div>
                )}
              </div>

            </div>
          )}
        </div>
      </div>

      <AiDocumentationModal 
        isOpen={isAiDocModalOpen}
        onClose={() => setIsAiDocModalOpen(false)}
        encounterId={encounterId}
        recordId={activeRecord.id}
        currentInteraction={aiDocInteraction}
      />
      
      <AiReferralModal
        isOpen={isAiReferralModalOpen}
        onClose={() => setIsAiReferralModalOpen(false)}
        encounterId={encounterId}
        recordId={activeRecord.id}
        currentInteraction={aiReferralInteraction}
      />
    </div>
  )
}
