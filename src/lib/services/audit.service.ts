'use server'

import { createClient } from '../supabase/server'

export async function getClinicalAuditLogs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('clinical_audit_log')
    .select(`
      id,
      action,
      notes,
      created_at,
      clinical_records (status, patients (first_name, last_name, identity_records(identity_type, identity_value))),
      user_profiles!actor_id (full_name, role)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getAppointmentAuditLogs() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointment_audit_log')
    .select(`
      id,
      old_status,
      new_status,
      notes,
      created_at,
      appointments (appointment_time, patients (first_name, last_name, identity_records(identity_type, identity_value))),
      user_profiles!changed_by (full_name)
    `)
    .order('created_at', { ascending: false })
    .limit(200)

  if (error) throw new Error(error.message)
  return data || []
}
