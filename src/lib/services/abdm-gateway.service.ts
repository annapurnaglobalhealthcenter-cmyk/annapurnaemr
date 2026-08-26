'use server'

import { createClient } from '../supabase/server'
import { FhirMapper } from './fhir-mapper.service'

/**
 * ABDM Gateway Service (Interoperability Layer)
 * Handles Discovery, Linking, and Data Transfer using official ABDM standards.
 */

export async function verifyAbhaNumberAndLink(patientId: string, abhaNumber: string, otp: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. MOCK: Call ABDM Gateway /v1/auth/confirmWithAadhaarOtp to verify
  const isVerified = otp === '123456' // Mock validation
  if (!isVerified) throw new Error("Invalid OTP for ABHA verification")

  // 2. Strict Separation: Insert as discrete identity record, do NOT overwrite UHID
  const { error } = await supabase.from('patient_identity_records').insert({
    patient_id: patientId,
    identity_type: 'ABHA',
    identity_value: abhaNumber
  })

  if (error) throw new Error(error.message)

  // 3. Log to timeline
  await supabase.from('patient_timeline').insert({
    patient_id: patientId,
    event_type: 'Identity Linked',
    description: `ABHA Number ${abhaNumber} successfully verified and linked.`,
    actor_id: user?.id
  })

  return true
}

export async function linkCareContext(patientId: string, encounterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  
  const careContextRef = `ENC-${encounterId.split('-')[0].toUpperCase()}`

  // 1. Insert local link mapping
  const { error: linkError } = await supabase.from('abdm_care_contexts').insert({
    patient_id: patientId,
    encounter_id: encounterId,
    care_context_reference: careContextRef,
    is_linked: true,
    linked_at: new Date().toISOString()
  })

  if (linkError) throw new Error(linkError.message)

  // 2. MOCK: Push to ABDM /v1/links/link/add-contexts
  const transactionId = crypto.randomUUID()

  // 3. Immutable HIE Audit Log
  await supabase.from('abdm_hie_audit_log').insert({
    patient_id: patientId,
    transaction_id: transactionId,
    direction: 'Outbound',
    interaction_type: 'Link',
    status: 'Success',
    performed_by: user?.id
  })

  return careContextRef
}

export async function fetchAbdmAuditLog(patientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('abdm_hie_audit_log')
    .select(`
      *,
      user_profiles (full_name)
    `)
    .eq('patient_id', patientId)
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data
}

/**
 * Simulates receiving a data pull request from the ABDM Health Information Provider (HIP) facade,
 * generating a FHIR bundle, and logging the exchange.
 */
export async function simulateDataTransferToAbdm(patientId: string, consentId: string, encounterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()

  // 1. Fetch Clinical Data
  const { data: encounter } = await supabase.from('encounters').select('*').eq('id', encounterId).single()
  const { data: patient } = await supabase.from('patients').select('*, identity_records(*)').eq('id', patientId).single()
  const { data: prescriptions } = await supabase.from('medication_prescriptions').select('*').eq('encounter_id', encounterId)
  
  if (!encounter || !patient) throw new Error("Data not found")

  const abhaNumber = patient.identity_records.find((r:any) => r.identity_type === 'ABHA')?.identity_value

  // 2. Map to FHIR
  const fhirResources = []
  fhirResources.push(FhirMapper.mapPatient(patient, abhaNumber))
  fhirResources.push(FhirMapper.mapEncounter(encounter, patient.id, encounter.consulting_doctor_id))
  
  if (prescriptions) {
    for (const rx of prescriptions) {
      fhirResources.push(FhirMapper.mapMedicationRequest(rx, patient.id, encounter.id))
    }
  }

  const bundle = FhirMapper.generateBundle(patientId, fhirResources)

  // 3. Store the Bundle (Optional caching)
  const { data: storedBundle, error: bundleError } = await supabase.from('abdm_fhir_bundles').insert({
    patient_id: patientId,
    encounter_id: encounterId,
    payload: bundle
  }).select().single()

  if (bundleError) throw new Error(bundleError.message)

  // 4. MOCK: Push encrypted payload to ABDM Gateway
  const transactionId = crypto.randomUUID()

  // 5. Immutable HIE Audit Log
  await supabase.from('abdm_hie_audit_log').insert({
    patient_id: patientId,
    consent_id: consentId,
    transaction_id: transactionId,
    direction: 'Outbound',
    interaction_type: 'Data Push',
    resource_type: 'Bundle',
    status: 'Success',
    encrypted_payload_ref: storedBundle.id,
    performed_by: user?.id
  })

  return bundle
}
