import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { OPDWorkspace } from './_components/opd-workspace'
import { enforcePermission } from '@/lib/auth/server'

export default async function EncounterConsultationPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const encounterId = (await params).id
  await enforcePermission('opd.view')

  const supabase = await createClient()

  // Fetch encounter details
  const { data: encounter } = await supabase
    .from('encounters')
    .select(`
      *,
      patients (
        id, first_name, last_name, gender, date_of_birth, blood_group,
        identity_records (identity_type, identity_value),
        patient_allergies (allergy_name, severity, notes),
        patient_conditions (condition_name, status, diagnosed_date)
      )
    `)
    .eq('id', encounterId)
    .single()

  if (!encounter) notFound()

  // Fetch active record for THIS encounter
  const { data: records } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false })
    .limit(1)

  const activeRecord = records?.[0]
  
  // Fetch associated collections if record exists
  let vitals = []
  let diagnoses = []
  let medications = []
  let investigations = []

  if (activeRecord) {
    const [v, d, m, i] = await Promise.all([
      supabase.from('vitals').select('*').eq('clinical_record_id', activeRecord.id).order('recorded_at', { ascending: false }),
      supabase.from('diagnoses').select('*').eq('clinical_record_id', activeRecord.id),
      supabase.from('medication_prescriptions').select('*').eq('clinical_record_id', activeRecord.id),
      supabase.from('investigation_orders').select('*').eq('clinical_record_id', activeRecord.id).order('created_at', { ascending: false })
    ])
    vitals = v.data || []
    diagnoses = d.data || []
    medications = m.data || []
    investigations = i.data || []
  }

  // Fetch PAST history across ALL encounters for this patient
  const { data: pastRecords } = await supabase
    .from('clinical_records')
    .select(`
      id, status, version_number, chief_complaint, created_at,
      user_profiles!provider_id(full_name),
      diagnoses(diagnosis_name)
    `)
    .eq('patient_id', encounter.patient_id)
    .neq('encounter_id', encounterId)
    .eq('status', 'Finalized')
    .order('created_at', { ascending: false })
    .limit(5)

  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('interaction_type', 'Differential_Diagnosis')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: aiDocInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('interaction_type', 'Clinical_Documentation')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: medSafetyInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('interaction_type', 'Medication_Safety')
    .order('created_at', { ascending: false })
    .limit(1)

  const { data: referralInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('encounter_id', encounterId)
    .eq('interaction_type', 'Referral_Letter')
    .order('created_at', { ascending: false })
    .limit(1)

  // Pass plain objects to Client Component
  return (
    <div className="h-[calc(100vh-6rem)] -m-6 flex flex-col bg-gray-50">
      <div className="px-6 py-4 bg-white border-b flex justify-between items-start shrink-0">
        <div>
          <h1 className="text-xl font-bold tracking-tight text-gray-900">Clinical Workspace</h1>
          <div className="flex items-center space-x-3 mt-1 text-sm text-gray-600">
            <span className="font-semibold text-blue-700">{encounter.patients?.first_name} {encounter.patients?.last_name}</span>
            <span>·</span>
            <span>{encounter.patients?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value}</span>
            <span>·</span>
            <span>{encounter.patients?.gender}</span>
            <span>·</span>
            <span>{encounter.patients?.blood_group ?? 'Blood Group Unk.'}</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-hidden">
        <OPDWorkspace 
          encounterId={encounter.id}
          patientId={encounter.patient_id}
          patientDetails={encounter.patients}
          pastRecords={pastRecords || []}
          activeRecord={activeRecord}
          vitals={vitals}
          diagnoses={diagnoses}
          medications={medications}
          investigations={investigations}
          aiInteraction={aiInteractions?.[0] || null}
          aiDocInteraction={aiDocInteractions?.[0] || null}
          medSafetyInteraction={medSafetyInteractions?.[0] || null}
          aiReferralInteraction={referralInteractions?.[0] || null}
        />
      </div>
    </div>
  )
}
