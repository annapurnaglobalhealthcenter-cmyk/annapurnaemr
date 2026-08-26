'use server'

import { createClient } from '../supabase/server'

export async function getNursingDashboard() {
  const supabase = await createClient()

  // Fetch all active admissions with their current bed, latest vitals, and pending meds
  const { data, error } = await supabase
    .from('admissions')
    .select(`
      id,
      encounter_id,
      admission_reason,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value)),
      bed_allocations (beds (bed_number, wards(name))),
      vitals (id, heart_rate, systolic_bp, diastolic_bp, temperature_c, recorded_at),
      encounters (
        medication_prescriptions (
          id, medication_name, dosage, frequency, instructions, status
        )
      )
    `)
    .is('actual_discharge_date', null)
    .eq('bed_allocations.status', 'Active')

  if (error) throw new Error(error.message)

  // Map to get the single active bed and the latest vitals
  return data.map(adm => {
    const activeBed = adm.bed_allocations?.find((ba: any) => ba.beds)
    
    // Sort vitals by recorded_at desc and take first
    const sortedVitals = (adm.vitals || []).sort((a: any, b: any) => 
      new Date(b.recorded_at).getTime() - new Date(a.recorded_at).getTime()
    )
    
    const enc = Array.isArray(adm.encounters) ? adm.encounters[0] : adm.encounters
    const prescriptions = enc?.medication_prescriptions || []
    
    return {
      ...adm,
      activeBed: activeBed ? activeBed.beds : null,
      latestVitals: sortedVitals.length > 0 ? sortedVitals[0] : null,
      prescriptions
    }
  })
}

export async function logVitals(encounterId: string, patientId: string, data: any) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('vitals')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      recorded_by: user.id,
      systolic_bp: data.systolic_bp,
      diastolic_bp: data.diastolic_bp,
      heart_rate: data.heart_rate,
      temperature_c: data.temperature_c,
      spo2_percent: data.spo2_percent
    })

  if (error) throw new Error(error.message)
  return true
}

export async function logMAR(admissionId: string, prescriptionId: string, status: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('medication_administrations')
    .insert({
      admission_id: admissionId,
      prescription_id: prescriptionId,
      nurse_id: user.id,
      status,
      notes
    })

  if (error) throw new Error(error.message)
  return true
}

export async function logFluidBalance(admissionId: string, recordType: string, fluidType: string, volume: number, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('fluid_balance')
    .insert({
      admission_id: admissionId,
      nurse_id: user.id,
      record_type: recordType,
      fluid_type: fluidType,
      volume_ml: volume,
      notes
    })

  if (error) throw new Error(error.message)
  return true
}

export async function logHandover(admissionId: string, shift: string, summary: string, pending: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('shift_handovers')
    .insert({
      admission_id: admissionId,
      outgoing_nurse_id: user.id,
      shift,
      clinical_summary: summary,
      pending_tasks: pending
    })

  if (error) throw new Error(error.message)
  return true
}
