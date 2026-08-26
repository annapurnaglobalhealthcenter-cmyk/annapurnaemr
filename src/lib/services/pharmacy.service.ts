'use server'

import { createClient } from '../supabase/server'

export async function getPendingPrescriptions() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('medication_prescriptions')
    .select(`
      *,
      encounters (
        patients (id, first_name, last_name, identity_records(identity_type, identity_value)),
        user_profiles!consulting_doctor_id (full_name)
      )
    `)
    .in('status', ['Finalized']) // We only dispense locked, finalized prescriptions
    .order('updated_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data
}

export async function getActiveBatches(medicineQuery?: string) {
  const supabase = await createClient()
  
  let query = supabase
    .from('pharmacy_batches')
    .select(`
      *,
      pharmacy_medicine_master (brand_name, generic_name, dosage_form, strength)
    `)
    .gt('current_stock', 0)
    .order('expiry_date', { ascending: true })

  if (medicineQuery) {
    query = query.ilike('pharmacy_medicine_master.brand_name', `%${medicineQuery}%`)
  } else {
    query = query.limit(100)
  }

  const { data, error } = await query
  if (error) throw new Error(error.message)

  // Filter out any where the join failed due to ilike in supabase filtering
  return data.filter((d:any) => d.pharmacy_medicine_master !== null)
}

export async function dispenseMedication(prescriptionId: string, batchId: string, quantity: number, notes: string = '') {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase.rpc('dispense_medication', {
    p_prescription_id: prescriptionId,
    p_batch_id: batchId,
    p_quantity: quantity,
    p_user_id: user.id,
    p_notes: notes
  })

  if (error) throw new Error(error.message)
  return data
}

export async function getDispenseHistory() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('dispense_records')
    .select(`
      *,
      patients (first_name, last_name),
      user_profiles!dispensed_by (full_name),
      pharmacy_batches (batch_number, pharmacy_medicine_master (brand_name))
    `)
    .order('dispensed_at', { ascending: false })
    .limit(50)

  if (error) throw new Error(error.message)
  return data
}
