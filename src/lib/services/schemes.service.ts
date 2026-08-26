'use server'

import { createClient } from '../supabase/server'

// --- PM-JAY ------------------------------------------------------------------

export async function createPmjayCase(
  patientId: string,
  encounterId: string | null,
  urn: string,
  packageCode: string,
  claimAmount: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('pmjay_cases')
    .insert({
      patient_id: patientId,
      encounter_id: encounterId,
      urn,
      package_code: packageCode,
      claim_amount: claimAmount,
      preauth_status: 'Pending',
      claim_status: 'Pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updatePmjayCaseStatus(
  id: string,
  preauthStatus?: string,
  claimStatus?: string,
  approvedAmount?: number,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (preauthStatus !== undefined) patch.preauth_status = preauthStatus
  if (claimStatus !== undefined) patch.claim_status = claimStatus
  if (approvedAmount !== undefined) patch.approved_amount = approvedAmount
  if (notes !== undefined) patch.notes = notes

  const { data, error } = await supabase
    .from('pmjay_cases')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getPmjayCases() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pmjay_cases')
    .select(`
      id, urn, package_code, preauth_status, claim_status, claim_amount, approved_amount, notes, created_at,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value))
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data
}

// --- Insurance / TPA ---------------------------------------------------------

export async function createInsuranceClaim(
  patientId: string,
  encounterId: string | null,
  providerId: string,
  policyNumber: string,
  memberId: string,
  claimAmount: number
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data, error } = await supabase
    .from('insurance_claims')
    .insert({
      patient_id: patientId,
      encounter_id: encounterId,
      provider_id: providerId,
      policy_number: policyNumber,
      member_id: memberId,
      claim_amount: claimAmount,
      preauth_status: 'Pending',
      claim_status: 'Pending',
    })
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updateInsuranceClaim(
  id: string,
  preauthStatus?: string,
  claimStatus?: string,
  approvedAmount?: number,
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() }
  if (preauthStatus !== undefined) patch.preauth_status = preauthStatus
  if (claimStatus !== undefined) patch.claim_status = claimStatus
  if (approvedAmount !== undefined) patch.approved_amount = approvedAmount
  if (notes !== undefined) patch.notes = notes

  const { data, error } = await supabase
    .from('insurance_claims')
    .update(patch)
    .eq('id', id)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function getInsuranceClaims() {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('insurance_claims')
    .select(`
      id, policy_number, member_id, preauth_status, claim_status, claim_amount, approved_amount, notes, created_at,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value)),
      insurance_providers (id, name)
    `)
    .order('created_at', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data
}

export async function getInsuranceProviders() {
  const supabase = await createClient()
  const { data, error } = await supabase.from('insurance_providers').select('*').order('name')
  if (error) throw new Error(error.message)
  return data
}

export async function getClaimDetails(claimId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('insurance_claims')
    .select(`
      *,
      patients (id, first_name, last_name, gender, date_of_birth, identity_records(identity_type, identity_value)),
      insurance_providers (name),
      patient_insurance_policies (*),
      admissions (id, admission_reason, admission_date),
      invoices (id, invoice_number, net_amount, status),
      insurance_claim_documents (*),
      insurance_claim_queries (*)
    `)
    .eq('id', claimId)
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function submitClaimDocument(claimId: string, docType: string, fileUrl: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('insurance_claim_documents')
    .insert({ claim_id: claimId, document_type: docType, file_url: fileUrl, uploaded_by: user?.id })
  
  if (error) throw new Error(error.message)
}

export async function respondToQuery(queryId: string, responseText: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  const { error } = await supabase
    .from('insurance_claim_queries')
    .update({ 
      response_text: responseText, 
      status: 'Answered',
      responded_by: user?.id,
      responded_at: new Date().toISOString()
    })
    .eq('id', queryId)

  if (error) throw new Error(error.message)
}

export async function raiseMockQuery(claimId: string, text: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('insurance_claim_queries')
    .insert({ claim_id: claimId, query_text: text })
  if (error) throw new Error(error.message)
}

export async function updateClaimStatusDetail(claimId: string, preauth: string, claim: string, approvedAmount?: number) {
  const supabase = await createClient()
  const updateData: any = { preauth_status: preauth, claim_status: claim, updated_at: new Date().toISOString() }
  if (approvedAmount !== undefined) updateData.approved_amount = approvedAmount

  const { error } = await supabase.from('insurance_claims').update(updateData).eq('id', claimId)
  if (error) throw new Error(error.message)
}
