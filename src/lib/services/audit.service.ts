'use server'

import { createClient } from '../supabase/server'

export async function getClinicalAuditLogs() {
  const supabase = await createClient()

  // clinical_audit_log joins with clinical_records to get patient, and user_profiles to get the actor
  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select(`
      id,
      action,
      notes,
      created_at,
      clinical_records (record_type, patients (first_name, last_name, identity_records(identity_type, identity_value))),
      user_profiles!actor_id (full_name, role_id)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return data
}

export async function getAppointmentAuditLogs() {
  const supabase = await createClient()

  // appointment_audit_log joins with appointments to get patient, and user_profiles for the actor
  const { data, error } = await supabase
    .from('appointment_audit_log')
    .select(`
      id,
      old_status,
      new_status,
      notes,
      created_at,
      appointments (appointment_date, patients (first_name, last_name, identity_records(identity_type, identity_value))),
      user_profiles!changed_by (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return data
}
