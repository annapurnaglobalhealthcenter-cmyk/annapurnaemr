'use server'

import { createClient } from '../supabase/server'
import { Database } from '@/types/database.types'

type ClinicalRecordInsert = Database['public']['Tables']['clinical_records']['Insert']
type DiagnosisInsert = Database['public']['Tables']['diagnoses']['Insert']
type VitalsInsert = Database['public']['Tables']['vitals']['Insert']
type MedicationInsert = Database['public']['Tables']['medication_prescriptions']['Insert']

export async function createDraftRecord(encounterId: string, patientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from('clinical_records')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      provider_id: user.id,
      status: 'Draft',
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create draft record: ${error.message}`)
  }

  return data
}

export async function saveClinicalNote(recordId: string, notes: { 
  chief_complaint?: string, 
  hpi?: string, 
  exam?: string,
  symptoms?: string,
  past_history?: string,
  assessment?: string,
  advice?: string,
  follow_up_plan?: string
}) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('clinical_records')
    .update({
      chief_complaint: notes.chief_complaint,
      history_of_present_illness: notes.hpi,
      examination_notes: notes.exam,
      symptoms: notes.symptoms,
      past_history: notes.past_history,
      assessment: notes.assessment,
      advice: notes.advice,
      follow_up_plan: notes.follow_up_plan,
      updated_at: new Date().toISOString()
    })
    .eq('id', recordId)
    .eq('status', 'Draft')

  if (error) throw new Error(error.message)
}

export async function finalizeRecord(recordId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // RLS will block this if it's already finalized, but we also enforce it logically
  const { data, error } = await supabase
    .from('clinical_records')
    .update({
      status: 'Finalized',
      finalized_at: new Date().toISOString(),
      finalized_by: user.id
    })
    .eq('id', recordId)
    .eq('status', 'Draft')
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to finalize record: ${error.message}`)
  }

  await supabase.from('clinical_audit_log').insert({
    clinical_record_id: recordId,
    action: 'Finalized',
    actor_id: user.id,
    notes: 'Record finalized by provider'
  })

  return data
}

export async function amendClinicalRecord(recordId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('amend_clinical_record', {
    p_record_id: recordId
  })
  
  if (error) {
    throw new Error(`Failed to amend record: ${error.message}`)
  }
  
  return data // Returns the new draft record ID
}

export async function addDiagnosis(diagnosisData: DiagnosisInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('diagnoses').insert(diagnosisData).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function addVitals(vitalsData: VitalsInsert) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { data, error } = await supabase.from('vitals').insert({
    ...vitalsData,
    recorded_by: user?.id
  }).select().single()
  
  if (error) throw new Error(error.message)
  return data
}

export async function addMedication(medData: MedicationInsert) {
  const supabase = await createClient()
  const { data, error } = await supabase.from('medication_prescriptions').insert(medData).select().single()
  if (error) throw new Error(error.message)
  return data
}
