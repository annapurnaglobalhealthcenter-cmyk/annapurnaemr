'use server'

import { createClient } from '../supabase/server'

export async function getPatientConsents(patientId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abdm_consents')
    .select('*')
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

export async function requestConsent(
  patientId: string, 
  purpose: string, 
  hiTypes: string[]
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // SIMULATED ABDM GATEWAY INTERACTION
  const mockConsentId = `CONSENT-${crypto.randomUUID().substring(0, 8).toUpperCase()}`

  const { data, error } = await supabase
    .from('abdm_consents')
    .insert({
      patient_id: patientId,
      consent_id: mockConsentId,
      purpose_of_request: purpose,
      hi_types: hiTypes,
      status: 'Granted', // Bypassing 'Requested' state for the mock
      date_range_from: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000).toISOString(), // Past 1 year
      date_range_to: new Date().toISOString()
    })
    .select()
    .single()

  if (error) throw new Error(error.message)

  // Log to timeline
  await supabase.from('patient_timeline').insert({
    patient_id: patientId,
    event_type: 'Consent',
    description: `ABDM Consent granted for ${purpose} (${hiTypes.join(', ')})`,
    actor_id: user.id
  })

  return data
}

export async function revokeConsent(consentId: string) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('abdm_consents')
    .update({ 
      status: 'Revoked',
      updated_at: new Date().toISOString()
    })
    .eq('id', consentId)
    .select('patient_id, consent_id')
    .single()

  if (error) throw new Error(error.message)

  // Log to timeline
  const { data: { user } } = await supabase.auth.getUser()
  if (user && data) {
    await supabase.from('patient_timeline').insert({
      patient_id: data.patient_id,
      event_type: 'Consent',
      description: `ABDM Consent revoked (ID: ${data.consent_id})`,
      actor_id: user.id
    })
  }

  return true
}
