'use server'

import { createClient } from '@/lib/supabase/server'
import { enforcePermission } from '@/lib/auth/server'

export async function getOtRooms() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ot_rooms').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getOtProcedures() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('ot_procedure_master').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getOtSchedules() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('ot_schedules')
    .select(`
      *,
      patients (first_name, last_name, identity_records(identity_type, identity_value)),
      ot_rooms (name),
      ot_procedure_master (name, code),
      surgeon:user_profiles!ot_schedules_primary_surgeon_id_fkey(full_name),
      anesthetist:user_profiles!ot_schedules_anesthetist_id_fkey(full_name),
      ot_pac_records (fitness_status),
      ot_intraop_records (id),
      ot_postop_records (id)
    `)
    .order('scheduled_start')
  if (error) throw new Error(error.message)
  return data
}

export async function scheduleSurgery(payload: {
  patient_id: string,
  ot_room_id: string,
  procedure_id: string,
  primary_surgeon_id?: string,
  anesthetist_id?: string,
  scheduled_start: string,
  scheduled_end: string,
  admission_id?: string
}) {
  await enforcePermission('ot.manage')
  const supabase = await createClient()
  const { data, error } = await supabase.from('ot_schedules').insert(payload).select().single()
  if (error) throw new Error(error.message)
  return data
}

export async function submitPacRecord(scheduleId: string, payload: any) {
  await enforcePermission('ot.manage')
  const supabase = await createClient()
  
  const { data, error } = await supabase.from('ot_pac_records').insert({
    schedule_id: scheduleId,
    ...payload
  }).select().single()
  
  if (error) throw new Error(error.message)
  
  // Auto-update schedule status if fit
  if (payload.fitness_status === 'Fit') {
    await supabase.from('ot_schedules').update({ status: 'PAC_Cleared' }).eq('id', scheduleId)
  }
  
  return data
}

export async function submitIntraOpRecord(scheduleId: string, payload: any) {
  await enforcePermission('ot.manage')
  const supabase = await createClient()
  
  const { data, error } = await supabase.from('ot_intraop_records').insert({
    schedule_id: scheduleId,
    ...payload
  }).select().single()
  
  if (error) throw new Error(error.message)
  
  // Auto-update schedule status
  await supabase.from('ot_schedules').update({ status: 'Recovery' }).eq('id', scheduleId)
  
  return data
}

export async function submitPostOpRecord(scheduleId: string, payload: any) {
  await enforcePermission('ot.manage')
  const supabase = await createClient()
  
  const { data, error } = await supabase.from('ot_postop_records').insert({
    schedule_id: scheduleId,
    ...payload
  }).select().single()
  
  if (error) throw new Error(error.message)
  
  // Auto-update schedule status
  await supabase.from('ot_schedules').update({ status: 'Completed' }).eq('id', scheduleId)
  
  return data
}
