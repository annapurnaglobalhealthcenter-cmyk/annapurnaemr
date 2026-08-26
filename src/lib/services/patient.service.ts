'use server'

import { createClient } from '../supabase/server'
import { Database } from '@/types/database.types'

export async function createPatient(data: {
  first_name: string
  last_name: string
  date_of_birth: string
  gender: string
  phone_number?: string
  email?: string
  address?: string
  city?: string
  state?: string
  pin?: string
  blood_group?: string
  emergency_contact?: object
  abha_number?: string
}) {
  const supabase = await createClient()

  // Use the robust RPC which handles transaction and sequences
  const { data: patientId, error } = await supabase.rpc('register_patient', {
    p_first_name: data.first_name,
    p_last_name: data.last_name,
    p_dob: data.date_of_birth,
    p_gender: data.gender,
    p_phone: data.phone_number || null,
    p_email: data.email || null,
    p_address: data.address || null,
    p_city: data.city || null,
    p_state: data.state || null,
    p_pin: data.pin || null,
    p_blood_group: data.blood_group || null,
    p_emergency_contact: data.emergency_contact || null,
    p_abha_number: data.abha_number || null
  })

  if (error) {
    throw new Error(`Failed to register patient: ${error.message}`)
  }

  return patientId as string
}

export async function searchPatients(query: string) {
  const supabase = await createClient()

  // Expanded search across Name, Phone, and Identity values (UHID/ABHA)
  const { data, error } = await supabase
    .from('patients')
    .select(`
      *,
      identity_records!inner (
        identity_type,
        identity_value,
        is_primary
      )
    `)
    .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone_number.ilike.%${query}%,identity_records.identity_value.ilike.%${query}%`)
    .limit(50)

  if (error) {
    throw new Error(`Search failed: ${error.message}`)
  }

  return data
}

export async function getPatientLongitudinalRecord(patientId: string) {
  const supabase = await createClient()

  // Fetch central profile
  const { data: patient, error: patientError } = await supabase
    .from('patients')
    .select(`
      *,
      identity_records (*)
    `)
    .eq('id', patientId)
    .single()

  if (patientError) throw new Error(patientError.message)

  // Fetch timeline (events)
  const { data: timeline } = await supabase
    .from('patient_timeline')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  // Note: we will type these as `any[]` or `unknown[]` in the UI to bypass `database.types.ts` sync issues
  return {
    patient,
    timeline: timeline || []
  }
}

export async function getPatientEncounters(patientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('encounters')
    .select(`
      *,
      user_profiles!consulting_doctor_id(full_name)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}
