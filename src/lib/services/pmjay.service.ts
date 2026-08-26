'use server'

import { createClient } from '../supabase/server'

export async function getPmjayPackages() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('pmjay_package_master').select('*').order('hbp_code')
  if (error) throw new Error(error.message)
  return data
}

export async function getPmjayCaseDetails(caseId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('pmjay_cases')
    .select(`
      *,
      patients (id, first_name, last_name, gender, date_of_birth, identity_records(identity_type, identity_value)),
      pmjay_package_master (*),
      admissions (id, admission_reason, admission_date),
      invoices (id, invoice_number, net_amount, status),
      pmjay_case_documents (*),
      pmjay_case_queries (*),
      pmjay_case_timeline (*)
    `)
    .eq('id', caseId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updatePmjayCaseClinical(caseId: string, updates: { 
  package_id?: string, 
  clinical_justification?: string, 
  proposed_surgery_date?: string 
}) {
  const supabase = await createClient()
  const { error } = await supabase.from('pmjay_cases').update(updates).eq('id', caseId)
  if (error) throw new Error(error.message)
}

export async function simulateBisVerification(caseId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  // 1. Update status
  await supabase.from('pmjay_cases')
    .update({ bis_verification_status: 'Verified', pmjay_card_number: `PMJAY-${Date.now()}` })
    .eq('id', caseId)

  // 2. Log to timeline
  await supabase.from('pmjay_case_timeline')
    .insert({
      case_id: caseId,
      event_type: 'BIS Verified',
      event_description: 'Successfully verified beneficiary against NHA BIS Database (MOCK API).',
      performed_by: user?.id,
      metadata: { source: 'BIS_API', statusCode: 200 }
    })
}

export async function simulateTmsPreauth(caseId: string, amount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Update status
  await supabase.from('pmjay_cases')
    .update({ preauth_status: 'Submitted', claim_amount: amount })
    .eq('id', caseId)

  // 2. Log to timeline
  await supabase.from('pmjay_case_timeline')
    .insert({
      case_id: caseId,
      event_type: 'Pre-Auth Submitted',
      event_description: `Pre-authorization payload submitted to TMS for ₹${amount} (MOCK API).`,
      performed_by: user?.id,
      metadata: { source: 'TMS_API', payload_amount: amount, statusCode: 202 }
    })
}

export async function simulateTmsApproval(caseId: string, approvedAmount: number) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  await supabase.from('pmjay_cases')
    .update({ preauth_status: 'Approved', approved_amount: approvedAmount })
    .eq('id', caseId)

  await supabase.from('pmjay_case_timeline')
    .insert({
      case_id: caseId,
      event_type: 'Approved',
      event_description: `TMS SNA approved pre-auth for ₹${approvedAmount}.`,
      performed_by: user?.id,
      metadata: { source: 'TMS_WEBHOOK' }
    })
}

export async function submitPmjayDocument(caseId: string, docName: string, fileUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('pmjay_case_documents')
    .insert({ case_id: caseId, document_name: docName, file_url: fileUrl, uploaded_by: user?.id })
  
  if (error) throw new Error(error.message)
}

export async function raiseSnaQuery(caseId: string, text: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const { error } = await supabase
    .from('pmjay_case_queries')
    .insert({ case_id: caseId, query_text: text })
  if (error) throw new Error(error.message)

  await supabase.from('pmjay_cases').update({ preauth_status: 'Query' }).eq('id', caseId)

  await supabase.from('pmjay_case_timeline')
    .insert({
      case_id: caseId,
      event_type: 'SNA Query',
      event_description: 'SNA raised an objection/query: ' + text,
      performed_by: user?.id
    })
}
