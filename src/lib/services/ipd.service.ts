'use server'

import { createClient } from '../supabase/server'
import { Database } from '@/types/database.types'

export async function getWardOccupancy() {
  const supabase = await createClient()

  // Fetch all wards and their beds
  const { data, error } = await supabase
    .from('wards')
    .select(`
      id, name, type, capacity,
      beds (id, bed_number, status)
    `)
    .order('name')

  if (error) throw new Error(error.message)
  return data
}

export async function getAvailableBeds() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('beds')
    .select(`
      id, bed_number, status,
      wards (id, name, type)
    `)
    .eq('status', 'Available')
    .order('bed_number')

  if (error) throw new Error(error.message)
  return data
}

export async function getActiveAdmissions() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('admissions')
    .select(`
      id, admission_reason, created_at,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value)),
      bed_allocations (beds (bed_number, wards (name)))
    `)
    .is('actual_discharge_date', null)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function admitPatientToBed(encounterId: string, patientId: string, bedId: string, reason: string) {
  const supabase = await createClient()
  
  // Call atomic RPC
  const { data, error } = await supabase.rpc('admit_patient_to_bed', {
    p_encounter_id: encounterId,
    p_patient_id: patientId,
    p_bed_id: bedId,
    p_reason: reason
  })

  if (error) throw new Error(error.message)
  return data as string // Admission ID
}

export async function addProgressNote(admissionId: string, notes: { subjective?: string, objective?: string, assessment?: string, plan?: string }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from('daily_progress_notes')
    .insert({
      admission_id: admissionId,
      provider_id: user.id,
      subjective: notes.subjective,
      objective: notes.objective,
      assessment: notes.assessment,
      plan: notes.plan
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function addNursingRecord(admissionId: string, shift: string, notes: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data, error } = await supabase
    .from('nursing_records')
    .insert({
      admission_id: admissionId,
      nurse_id: user.id,
      shift,
      notes
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function seedWardsAndBeds() {
  const supabase = await createClient()
  const { data: ward } = await supabase.from('wards').insert({ name: 'General Ward A', type: 'General', capacity: 10 }).select().single()
  if (!ward) return
  const beds = [1,2,3,4,5].map(i => ({ ward_id: ward.id, bed_number: 'A-'+(100+i), status: 'Available' }))
  await supabase.from('beds').insert(beds)
}

export async function getBedBoard() {
  const supabase = await createClient()

  // We pull from floors to capture the hierarchy. 
  // Note: if wards don't have floors in legacy data, they might be dropped by an inner join. 
  // We'll rely on the new seeds.
  const { data, error } = await supabase
    .from('floors')
    .select(`
      id, name, level,
      wards (
        id, name, type,
        rooms (
          id, room_number, room_type,
          beds (
            id, bed_number, status,
            bed_allocations (
              id, status,
              admissions (
                id,
                patients (id, first_name, last_name, identity_records(identity_type, identity_value))
              )
            )
          )
        ),
        beds (
          id, bed_number, status,
          bed_allocations (
            id, status,
            admissions (
              id,
              patients (id, first_name, last_name, identity_records(identity_type, identity_value))
            )
          )
        )
      )
    `)
    .order('level')

  if (error) throw new Error(error.message)
  return data
}

export async function transferPatient(admissionId: string, oldBedId: string, newBedId: string) {
  const supabase = await createClient()
  const { error } = await supabase.rpc('transfer_bed', {
    p_admission_id: admissionId,
    p_old_bed_id: oldBedId,
    p_new_bed_id: newBedId
  })
  if (error) throw new Error(error.message)
  return true
}

export async function updateBedStatus(bedId: string, status: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('beds')
    .update({ status })
    .eq('id', bedId)
  if (error) throw new Error(error.message)
  return true
}
