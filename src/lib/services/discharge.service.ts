'use server'

import { createClient } from '../supabase/server'
import { format } from 'date-fns'

export async function generateDischargeDraft(encounterId: string) {
  const supabase = await createClient()

  // Gather clinical context
  const [
    { data: records },
    { data: diagnoses },
    { data: medications },
    { data: vitals },
    { data: investigations }
  ] = await Promise.all([
    supabase.from('clinical_records').select('chief_complaint, examination_notes, created_at, status').eq('encounter_id', encounterId).order('created_at', { ascending: false }),
    supabase.from('diagnoses').select('diagnosis_name, status, diagnosis_type').eq('encounter_id', encounterId),
    supabase.from('medication_prescriptions').select('medication_name, dosage, frequency, duration_days, instructions').eq('encounter_id', encounterId),
    supabase.from('vitals').select('temperature_c, heart_rate, systolic_bp, diastolic_bp, recorded_at').eq('encounter_id', encounterId).order('recorded_at', { ascending: false }).limit(3),
    supabase.from('investigation_orders').select('test_name, status, investigation_results(parameter_name, result_value, unit, is_abnormal)').eq('encounter_id', encounterId)
  ])

  // Build the markdown summary
  let summary = `### COURSE IN HOSPITAL\n\n`
  
  if (records && records.length > 0) {
    summary += `**Presenting Complaint:** ${records[records.length - 1].chief_complaint || 'N/A'}\n\n`
  }

  if (diagnoses && diagnoses.length > 0) {
    summary += `**Final Diagnoses:**\n`
    diagnoses.forEach((d: any) => summary += `- ${d.diagnosis_name} (${d.status})\n`)
    summary += '\n'
  }

  if (vitals && vitals.length > 0) {
    summary += `**Latest Vitals at Discharge:**\n`
    summary += `BP: ${vitals[0].systolic_bp}/${vitals[0].diastolic_bp}, HR: ${vitals[0].heart_rate}, Temp: ${vitals[0].temperature_c}°C\n\n`
  }

  if (investigations && investigations.length > 0) {
    summary += `**Key Investigations:**\n`
    investigations.forEach((inv: any) => {
      summary += `- ${inv.test_name}: `
      if (inv.investigation_results && inv.investigation_results.length > 0) {
        summary += inv.investigation_results.map((r: any) => `${r.parameter_name} = ${r.result_value}${r.unit}`).join(', ')
      } else {
        summary += inv.status
      }
      summary += '\n'
    })
    summary += '\n'
  }

  summary += `**Discharge Medications:**\n`
  if (medications && medications.length > 0) {
    medications.forEach((m: any) => {
      summary += `- ${m.medication_name} ${m.dosage}, ${m.frequency} for ${m.duration_days} days. ${m.instructions || ''}\n`
    })
  } else {
    summary += `None prescribed.\n`
  }

  summary += `\n**Follow-up Advice:**\n\n`

  return summary
}

export async function processDischarge(
  admissionId: string, 
  encounterId: string, 
  patientId: string, 
  summaryText: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1. Create a Finalized clinical record to store the discharge summary
  const { data: record, error: recordError } = await supabase
    .from('clinical_records')
    .insert({
      encounter_id: encounterId,
      patient_id: patientId,
      provider_id: user.id,
      record_type: 'Discharge Summary',
      chief_complaint: summaryText, // Overloading this field for the summary text for simplicity
      status: 'Finalized',
      version_number: 1
    })
    .select('id')
    .single()

  if (recordError) throw new Error(recordError.message)

  // 2. Call the RPC to release bed and finalize admission
  const { error: rpcError } = await supabase.rpc('discharge_patient', {
    p_admission_id: admissionId,
    p_discharge_summary_id: record.id
  })

  if (rpcError) throw new Error(rpcError.message)

  return true
}
