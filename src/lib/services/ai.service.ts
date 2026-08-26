'use server'

import { createClient } from '../supabase/server'
import { ClinicalContextBuilder } from '../ai/context-builder'
import { MockAiProvider } from '../ai/providers/mock.provider'
import { 
  DifferentialDiagnosisSchema, 
  ClinicalDocumentationSchema, 
  PatientHistorySummarySchema, 
  InvestigationAnalysisSchema,
  MedicationSafetySchema,
  AdmittedPatientAnalysisSchema,
  DischargeSummarySchema,
  ReferralSchema,
  AdminAnalyticsSchema
} from '../ai/schemas'

// Dependency Injection (could be swapped to OpenAiProvider in production)
const aiProvider = new MockAiProvider()

export async function requestDifferentialDiagnosis(encounterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // 1. Fetch User Role for Provenance
  const { data: roleData } = await supabase
    .from('user_roles')
    .select('roles(name)')
    .eq('user_id', user.id)
    .single()
  
  const userRole = (roleData?.roles as any)?.name || 'Unknown'

  // 2. Rate Limiting Check
  const { count } = await supabase
    .from('ai_usage_logs')
    .select('*', { count: 'exact', head: true })
    .eq('provider_id', user.id)
    .gte('created_at', new Date(Date.now() - 60 * 60 * 1000).toISOString()) // Last hour
  
  if (count && count > 50) {
    throw new Error("Rate limit exceeded. Maximum 50 AI requests per hour.")
  }

  // 3. Context Building (Anonymized & Minimized)
  const { contextString, contextIdentifier, patientId } = await ClinicalContextBuilder.buildAnonymizedEncounterContext(encounterId)

  // 4. Safe AI Execution via Interface
  const systemPrompt = `You are a strict clinical decision support AI. 
    Analyze the provided anonymized patient context. 
    Respond EXACTLY with a JSON object conforming to the requested schema. 
    Do NOT invent data.`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, 
      contextString, 
      DifferentialDiagnosisSchema
    )

    // 5. Full Provenance Logging
    const { data: interaction, error: logError } = await supabase
      .from('ai_interactions')
      .insert({
        patient_id: patientId,
        encounter_id: encounterId,
        provider_id: user.id,
        role_at_time: userRole,
        interaction_type: 'Differential_Diagnosis',
        model_used: aiResponse.model,
        context_identifier: contextIdentifier,
        prompt_context: { anonymizedPayloadHash: contextIdentifier, raw_string: contextString },
        ai_response: aiResponse.data as any,
        execution_time_ms: aiResponse.executionTimeMs,
        status: 'Pending'
      })
      .select()
      .single()

    if (logError) throw new Error(logError.message)

    // 6. Usage & Billing Logging
    await supabase.from('ai_usage_logs').insert({
      provider_id: user.id,
      interaction_id: interaction.id,
      model: aiResponse.model,
      prompt_tokens: aiResponse.usage.promptTokens,
      completion_tokens: aiResponse.usage.completionTokens,
      total_tokens: aiResponse.usage.totalTokens
    })

    return interaction

  } catch (error: any) {
    // Fail safely
    console.error("AI Orchestrator Error:", error)
    throw new Error("AI Service failed to process request securely. " + error.message)
  }
}

export async function requestClinicalDocumentation(encounterId: string, roughNotes: string, docType: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { data: roleData } = await supabase.from('user_roles').select('roles(name)').eq('user_id', user.id).single()
  const userRole = (roleData?.roles as any)?.name || 'Unknown'

  const { contextString, contextIdentifier, patientId } = await ClinicalContextBuilder.buildAnonymizedEncounterContext(encounterId)

  // Explicitly trigger the documentation mock
  const systemPrompt = `You are a clinical documentation assistant. Draft a professional ${docType} note based on the provided anonymized context and the physician's rough notes. Return exactly the requested JSON schema.`
  
  const payloadToAi = `Context:\n${contextString}\n\nPhysician Rough Notes / Transcript:\n${roughNotes}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, 
      payloadToAi, 
      ClinicalDocumentationSchema
    )

    const { data: interaction, error: logError } = await supabase
      .from('ai_interactions')
      .insert({
        patient_id: patientId,
        encounter_id: encounterId,
        provider_id: user.id,
        role_at_time: userRole,
        interaction_type: 'Clinical_Documentation',
        model_used: aiResponse.model,
        context_identifier: contextIdentifier,
        prompt_context: { anonymizedPayloadHash: contextIdentifier, roughNotes },
        ai_response: aiResponse.data as any,
        execution_time_ms: aiResponse.executionTimeMs,
        status: 'Pending'
      })
      .select()
      .single()

    if (logError) throw new Error(logError.message)

    await supabase.from('ai_usage_logs').insert({
      provider_id: user.id,
      interaction_id: interaction.id,
      model: aiResponse.model,
      prompt_tokens: aiResponse.usage.promptTokens,
      completion_tokens: aiResponse.usage.completionTokens,
      total_tokens: aiResponse.usage.totalTokens
    })

    return interaction
  } catch (error: any) {
    throw new Error("AI Documentation failed to process securely. " + error.message)
  }
}

export async function resolveAiInteraction(
  interactionId: string, 
  resolution: 'Accepted' | 'Rejected' | 'Modified'
) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('ai_interactions')
    .update({
      status: resolution,
      resolved_at: new Date().toISOString()
    })
    .eq('id', interactionId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function requestPatientSummary(patientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier } = await ClinicalContextBuilder.buildLongitudinalPatientContext(patientId)

  const systemPrompt = `You are a clinical AI. Analyze the patient history summary context provided and output a strict JSON matching the PatientHistorySummarySchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, PatientHistorySummarySchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      provider_id: user.id,
      interaction_type: 'Patient_Summary',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestInvestigationAnalysis(reportId: string, patientId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier } = await ClinicalContextBuilder.buildInvestigationContext(reportId)

  const systemPrompt = `You are a clinical AI. Analyze the investigation analysis context provided and output a strict JSON matching the InvestigationAnalysisSchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, InvestigationAnalysisSchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      provider_id: user.id,
      interaction_type: 'Investigation_Analysis',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestMedicationSafetyCheck(patientId: string, encounterId: string, proposedPrescription: any[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier } = await ClinicalContextBuilder.buildPrescriptionSafetyContext(patientId, proposedPrescription)

  const systemPrompt = `You are a medication safety check clinical AI. Analyze the safety context provided against the proposed prescription and output a strict JSON matching the MedicationSafetySchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, MedicationSafetySchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      encounter_id: encounterId,
      provider_id: user.id,
      interaction_type: 'Medication_Safety',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestIpdAnalysis(admissionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier, patientId } = await ClinicalContextBuilder.buildIpdContext(admissionId)

  const systemPrompt = `You are a clinical AI analyzing an admitted patient. Analyze the provided context and output a strict JSON matching the AdmittedPatientAnalysisSchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, AdmittedPatientAnalysisSchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      provider_id: user.id,
      interaction_type: 'Admitted_Patient_Analysis',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestDischargeSummary(admissionId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier, patientId } = await ClinicalContextBuilder.buildIpdContext(admissionId)

  const systemPrompt = `You are a clinical AI. Analyze the provided admitted patient context and draft a structured discharge summary. Output a strict JSON matching the DischargeSummarySchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, DischargeSummarySchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      provider_id: user.id,
      interaction_type: 'Discharge_Summary',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestReferralLetter(encounterId: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { contextString, contextIdentifier, patientId } = await ClinicalContextBuilder.buildAnonymizedEncounterContext(encounterId)

  const systemPrompt = `You are a clinical AI. Analyze the provided encounter context and draft a structured specialist referral letter. Output a strict JSON matching the ReferralSchema.`
  const payloadToAi = `Context:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, ReferralSchema
    )

    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: patientId,
      encounter_id: encounterId,
      provider_id: user.id,
      interaction_type: 'Referral_Letter',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Pending'
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}

export async function requestAdminAnalytics(query: string) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Ensure caller is an admin
  const { data: profile } = await supabase.from('user_profiles').select('role').eq('id', user.id).single()
  if (profile?.role !== 'Admin' && profile?.role !== 'SuperAdmin') {
    throw new Error("Only administrators can query hospital-wide analytics.")
  }

  const { contextString, contextIdentifier } = await ClinicalContextBuilder.buildAdminContext()

  const systemPrompt = `You are an administrative hospital analytics AI. You help administrators understand hospital performance. Analyze the context and the user query to provide an answer. Output a strict JSON matching the AdminAnalyticsSchema.`
  const payloadToAi = `Query: ${query}\n\nContext:\n${contextString}`

  try {
    const aiResponse = await aiProvider.requestStructured(
      systemPrompt, payloadToAi, AdminAnalyticsSchema
    )

    // For admin queries, we might not strictly need to save to ai_interactions since it's conversational,
    // but saving it keeps audit trails for analytics queries intact.
    const { data: interaction } = await supabase.from('ai_interactions').insert({
      patient_id: null, // Admin queries are not patient-specific
      provider_id: user.id,
      interaction_type: 'Admin_Analytics',
      model_used: aiResponse.model,
      context_identifier: contextIdentifier,
      prompt_context: { query, contextIdentifier },
      ai_response: aiResponse.data as any,
      status: 'Completed' // No manual approval needed for admin analytics answers
    }).select().single()

    return interaction
  } catch (e: any) { throw new Error(e.message) }
}
