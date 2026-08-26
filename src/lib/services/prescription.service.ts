'use server'

import { createClient } from '../supabase/server'

export async function searchMedicines(query: string) {
  const supabase = await createClient()
  
  if (!query.trim()) return []

  // Using simple ilike for now instead of full text search to avoid complex syntax issues
  const { data, error } = await supabase
    .from('medicine_master')
    .select('*')
    .eq('is_active', true)
    .or(`generic_name.ilike.%${query}%,brand_name.ilike.%${query}%`)
    .limit(20)

  if (error) throw new Error(error.message)
  return data
}

export async function addPrescriptionToRecord(
  clinicalRecordId: string,
  medicineData: {
    medicine_id?: string
    medication_name: string
    dosage: string
    frequency: string
    route: string
    duration_days: number
    quantity: number
    instructions?: string
  }
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from('medication_prescriptions')
    .insert({
      clinical_record_id: clinicalRecordId,
      medicine_id: medicineData.medicine_id || null,
      medication_name: medicineData.medication_name,
      dosage: medicineData.dosage,
      frequency: medicineData.frequency,
      route: medicineData.route,
      duration_days: medicineData.duration_days,
      quantity: medicineData.quantity,
      instructions: medicineData.instructions || null,
      status: 'Active',
      dispense_status: 'Pending'
    })
    .select()
    .single()

  if (error) {
    if (error.message.includes('Cannot modify prescriptions')) {
      throw new Error('This clinical record is finalized. You cannot add medications without amending it first.')
    }
    throw new Error(error.message)
  }

  return data
}

export async function deletePrescription(prescriptionId: string) {
  const supabase = await createClient()
  
  const { error } = await supabase
    .from('medication_prescriptions')
    .delete()
    .eq('id', prescriptionId)

  if (error) {
    if (error.message.includes('Cannot modify prescriptions')) {
      throw new Error('This clinical record is finalized. You cannot delete medications without amending it first.')
    }
    throw new Error(error.message)
  }
}

// Stub for AI medication safety checks
export async function checkMedicationSafety(patientId: string, medicineName: string) {
  // In a real system, this would query patient_allergies and current active meds,
  // then send them to an AI/decision-support API to check for interactions.
  // Requirement: "Do not automatically recommend or prescribe medicines."
  // This just checks safety of what the doctor already selected.
  
  // Fake response for prototype
  return {
    isSafe: true,
    warnings: []
  }
}
