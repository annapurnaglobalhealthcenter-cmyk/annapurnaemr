'use server'

import { createClient } from '../supabase/server'

export async function searchRadiologyProcedures(query: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('radiology_procedure_master')
    .select('*')
    .ilike('procedure_name', `%${query}%`)
    .eq('is_active', true)
    .limit(20)

  if (error) throw new Error(error.message)
  return data
}

export async function getRadiologyOrders(statusFilter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('investigation_orders')
    .select(`
      *,
      patients (id, first_name, last_name, gender, date_of_birth, identity_records(identity_type, identity_value)),
      user_profiles!ordered_by (full_name),
      radiology_procedure_master (modality),
      radiology_reports (
        id, findings, impression, status, drafted_by, verified_by, verified_at,
        radiology_attachments (id, file_url, dicom_study_uid, series_description)
      )
    `)
    .eq('department', 'Radiology')
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter && statusFilter !== 'All') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function scheduleRadiologyOrder(orderId: string, scheduledTime: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('investigation_orders')
    .update({ 
      status: 'Scheduled',
      scheduled_time: scheduledTime,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}

export async function markImagingComplete(orderId: string, dicomUid: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Update order status
  const { error } = await supabase
    .from('investigation_orders')
    .update({ status: 'Imaging Complete', updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (error) throw new Error(error.message)

  // Initialize a draft report and attach the DICOM UID if provided
  const { data: report, error: repErr } = await supabase
    .from('radiology_reports')
    .insert({ order_id: orderId })
    .select()
    .single()
  if (repErr) throw new Error(repErr.message)

  if (dicomUid) {
    await supabase.from('radiology_attachments').insert({
      report_id: report.id,
      dicom_study_uid: dicomUid,
      uploaded_by: user.id
    })
  }
}

export async function saveDraftRadiologyReport(reportId: string, findings: string, impression: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('radiology_reports')
    .update({
      findings,
      impression,
      drafted_by: user.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)

  if (error) throw new Error(error.message)
}

export async function verifyRadiologyReport(orderId: string, reportId: string, findings: string, impression: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Save final changes and mark verified
  const { error: repErr } = await supabase
    .from('radiology_reports')
    .update({
      findings,
      impression,
      status: 'Verified',
      verified_by: user.id,
      verified_at: new Date().toISOString(),
      updated_at: new Date().toISOString()
    })
    .eq('id', reportId)
  if (repErr) throw new Error(repErr.message)

  // Mark order as completed
  const { error: ordErr } = await supabase
    .from('investigation_orders')
    .update({ status: 'Completed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
  if (ordErr) throw new Error(ordErr.message)
}
