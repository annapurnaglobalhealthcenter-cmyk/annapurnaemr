import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { enforcePermission } from '@/lib/auth/server'
import { IPDWorkspaceClient } from './_components/ipd-workspace-client'
import { TransferBedDialog } from './_components/transfer-bed-dialog'
import { getAvailableBeds } from '@/lib/services/ipd.service'
import { AiIpdAnalysisPanel } from './_components/ai-ipd-analysis-panel'

export default async function IPDAdmissionWorkspace({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await enforcePermission('ipd.view')
  const { id: admissionId } = await params
  
  const supabase = await createClient()

  // Fetch central admission data
  const { data: admission } = await supabase
    .from('admissions')
    .select(`
      *,
      patients (*, identity_records(*)),
      bed_allocations (id, start_time, status, bed_id, beds (id, bed_number, wards(name)))
    `)
    .eq('id', admissionId)
    .single()

  if (!admission) notFound()

  const availableBeds = await getAvailableBeds()
  const activeAllocation = admission.bed_allocations?.find((ba: any) => ba.status === 'Active')

  // Fetch Progress Notes
  const { data: progressNotes } = await supabase
    .from('daily_progress_notes')
    .select('*')
    .eq('admission_id', admissionId)
    .order('created_at', { ascending: false })

  // Fetch Nursing Records
  const { data: nursingRecords } = await supabase
    .from('nursing_records')
    .select('*')
    .eq('admission_id', admissionId)
    .order('created_at', { ascending: false })

  // Fetch AI analysis
  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('patient_id', admission.patient_id)
    .eq('interaction_type', 'Admitted_Patient_Analysis')
    .order('created_at', { ascending: false })
    .limit(1)

  return (
    <div className="max-w-7xl mx-auto space-y-4">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">
            {admission.patients.first_name} {admission.patients.last_name}
          </h1>
          <div className="mt-1 flex items-center space-x-4 text-sm text-gray-600">
            <span>{admission.patients.identity_records?.[0]?.identity_value}</span>
            <span>{admission.patients.gender}</span>
            <span className="font-semibold text-blue-700">Reason: {admission.admission_reason}</span>
          </div>
        </div>
        <div className="text-right flex flex-col items-end gap-2">
          {activeAllocation ? (
            <div className="bg-blue-50 text-blue-800 px-4 py-2 rounded-md font-medium border border-blue-200">
              {activeAllocation.beds.wards.name} - 
              {activeAllocation.beds.bed_number}
            </div>
          ) : (
            <div className="bg-gray-100 text-gray-500 px-4 py-2 rounded-md font-medium">Discharged</div>
          )}
          
          <div className="flex gap-2">
            {activeAllocation && (
              <TransferBedDialog 
                admissionId={admission.id} 
                currentBedId={activeAllocation.bed_id} 
                availableBeds={availableBeds} 
              />
            )}
            
            {!admission.actual_discharge_date && (
              <a href={`/ipd/${admissionId}/discharge`} className="inline-flex items-center justify-center px-4 py-2 text-sm font-medium text-white bg-red-600 rounded-md hover:bg-red-700">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="mr-2"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"></path><polyline points="16 17 21 12 16 7"></polyline><line x1="21" y1="12" x2="9" y2="12"></line></svg>
                Process Discharge
              </a>
            )}
          </div>
        </div>
      </div>

      <AiIpdAnalysisPanel admissionId={admissionId} initialInteraction={aiInteractions?.[0]} />

      {/* Workspace */}
      <IPDWorkspaceClient 
        admissionId={admissionId} 
        admission={admission}
        progressNotes={progressNotes || []} 
        nursingRecords={nursingRecords || []}
      />
    </div>
  )
}
