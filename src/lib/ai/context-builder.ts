/**
 * Clinical Context Builder
 * Responsible for fetching raw clinical data and strictly anonymizing it 
 * before it is ever sent to an external AI provider.
 */
import { createClient } from '../supabase/server'
import { differenceInYears } from 'date-fns'
import crypto from 'crypto'

export class ClinicalContextBuilder {
  
  /**
   * Fetches the encounter, anonymizes the patient data (strips name, exact DOB, PII),
   * and returns a minimal stringified JSON blob suitable for LLM prompting.
   */
  static async buildAnonymizedEncounterContext(encounterId: string): Promise<{ contextString: string, contextIdentifier: string, patientId: string }> {
    const supabase = await createClient()

    // 1. Fetch raw data
    const { data: encounter, error: encError } = await supabase
      .from('encounters')
      .select(`
        *,
        patients (id, date_of_birth, gender),
        clinical_records (*),
        patient_vitals (*),
        medication_prescriptions (*)
      `)
      .eq('id', encounterId)
      .single()

    if (encError || !encounter) throw new Error("Failed to fetch encounter for AI context")

    // 2. Anonymize and Minimize
    const patientAge = encounter.patients?.date_of_birth 
      ? differenceInYears(new Date(), new Date(encounter.patients.date_of_birth)) 
      : 'Unknown'

    const anonymizedPayload = {
      patientProfile: {
        age: patientAge,
        gender: encounter.patients?.gender,
        allergies: encounter.patients?.patient_allergies?.map((a:any) => `${a.allergy_name} (${a.severity})`),
        pastConditions: encounter.patients?.patient_conditions?.map((c:any) => c.condition_name)
      },
      encounterDetails: {
        chiefComplaint: encounter.chief_complaint,
        type: encounter.encounter_type,
        examination: encounter.clinical_records?.[0]?.physical_examination || "Not recorded"
      },
      vitals: encounter.patient_vitals?.map((v:any) => ({
        heartRate: v.heart_rate,
        bloodPressure: v.blood_pressure,
        temperature: v.temperature,
        spo2: v.spo2
      })) || [],
      existingDiagnoses: encounter.clinical_records?.map((c:any) => c.diagnosis),
      currentMedications: encounter.medication_prescriptions?.map((m:any) => m.medication_name)
    }

    const contextString = JSON.stringify(anonymizedPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier, patientId: encounter.patients.id }
  }

  static async buildLongitudinalPatientContext(patientId: string): Promise<{ contextString: string, contextIdentifier: string }> {
    const supabase = await createClient()

    const { data: patient } = await supabase
      .from('patients')
      .select(`
        id, gender, date_of_birth, blood_group,
        patient_conditions (condition_name, status, diagnosed_date),
        patient_allergies (allergy_name, severity),
        patient_timeline (event_type, event_date, description),
        encounters (
          encounter_type, created_at, chief_complaint, status,
          clinical_records(diagnosis),
          medication_prescriptions(medication_name, dosage, status)
        )
      `)
      .eq('id', patientId)
      .single()

    if (!patient) throw new Error("Failed to fetch longitudinal data")

    const patientAge = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : 'Unknown'

    const anonymizedPayload = {
      profile: { age: patientAge, gender: patient.gender, bloodGroup: patient.blood_group },
      allergies: patient.patient_allergies,
      conditions: patient.patient_conditions,
      timeline: patient.patient_timeline?.slice(0, 20),
      encounters: patient.encounters?.map((e:any) => ({
        type: e.encounter_type,
        date: e.created_at,
        complaint: e.chief_complaint,
        diagnoses: e.clinical_records?.map((c:any) => c.diagnosis),
        medications: e.medication_prescriptions?.map((m:any) => m.medication_name)
      })).slice(0, 10)
    }

    const contextString = JSON.stringify(anonymizedPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier }
  }

  static async buildInvestigationContext(reportId: string): Promise<{ contextString: string, contextIdentifier: string }> {
    const supabase = await createClient()

    const { data: report } = await supabase
      .from('investigation_orders')
      .select('*, investigation_results(*)')
      .eq('id', reportId)
      .single()

    if (!report) throw new Error("Report not found")

    // Fetch past reports for the same patient to find trends
    const { data: pastReports } = await supabase
      .from('investigation_orders')
      .select('*, investigation_results(*)')
      .eq('patient_id', report.patient_id)
      .lt('created_at', report.created_at)
      .order('created_at', { ascending: false })
      .limit(3)

    const anonymizedPayload = {
      currentReport: { type: report.order_type, observations: report.investigation_results, date: report.created_at },
      historicalReports: pastReports?.map((r:any) => ({ type: r.order_type, observations: r.investigation_results, date: r.created_at }))
    }

    const contextString = JSON.stringify(anonymizedPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier }
  }

  static async buildPrescriptionSafetyContext(patientId: string, proposedPrescription: any[]): Promise<{ contextString: string, contextIdentifier: string }> {
    const supabase = await createClient()

    const { data: patient } = await supabase
      .from('patients')
      .select(`
        gender, date_of_birth, weight_kg,
        patient_conditions (condition_name, status),
        patient_allergies (allergy_name, severity),
        encounters (medication_prescriptions(medication_name, dosage, status))
      `)
      .eq('id', patientId)
      .single()

    if (!patient) throw new Error("Failed to fetch safety context")

    const patientAge = patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) : 'Unknown'

    // Extract all active/historical medications
    const currentMeds = patient.encounters?.flatMap((e:any) => e.medication_prescriptions) || []

    const anonymizedPayload = {
      patient: { age: patientAge, gender: patient.gender, weight: patient.weight_kg },
      allergies: patient.patient_allergies,
      diagnoses: patient.patient_conditions,
      currentMedications: currentMeds,
      proposedPrescription: proposedPrescription
    }

    const contextString = JSON.stringify(anonymizedPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier }
  }

  static async buildIpdContext(admissionId: string): Promise<{ contextString: string, contextIdentifier: string, patientId: string }> {
    const supabase = await createClient()

    const { data: admission } = await supabase
      .from('admissions')
      .select(`
        *,
        patients (date_of_birth, gender),
        daily_progress_notes (created_at, subjective, objective, assessment, plan),
        nursing_records (created_at, note, vitals_recorded),
        encounters (
          investigation_orders (
            investigation_results (test_name, result_value, reference_range, status)
          )
        )
      `)
      .eq('id', admissionId)
      .single()

    if (!admission) throw new Error("Admission not found")

    const anonymizedPayload = {
      profile: { gender: admission.patients?.gender },
      doctorNotes: admission.daily_progress_notes,
      nursingNotes: admission.nursing_records,
      labs: admission.encounters?.investigation_orders?.flatMap((o:any) => o.investigation_results)
    }

    const contextString = JSON.stringify(anonymizedPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier, patientId: admission.patient_id }
  }

  static async buildAdminContext(): Promise<{ contextString: string, contextIdentifier: string }> {
    const supabase = await createClient()

    // 1. Fetch Bed Occupancy
    const { data: beds } = await supabase.from('beds').select('id, wards(name)')
    const { data: allocs } = await supabase.from('bed_allocations').select('bed_id').eq('status', 'Active')
    
    // 2. Fetch OPD Encounter counts
    const startOfMonth = new Date()
    startOfMonth.setDate(1)
    const { count: opdCount } = await supabase.from('encounters').select('*', { count: 'exact', head: true }).gte('start_time', startOfMonth.toISOString())

    // 3. Fetch Pharmacy Expiry
    const { count: expiringMeds } = await supabase.from('inventory_batches').select('*', { count: 'exact', head: true }).lt('expiry_date', new Date(Date.now() + 30*24*60*60*1000).toISOString())

    // 4. Pending Lab Reports
    const { count: pendingLabs } = await supabase.from('investigation_results').select('*', { count: 'exact', head: true }).eq('status', 'Pending')

    const contextPayload = {
      hospitalStats: {
        totalBeds: beds?.length || 0,
        occupiedBeds: allocs?.length || 0,
        opdPatientsThisMonth: opdCount || 0,
        expiringMedicinesWithin30Days: expiringMeds || 0,
        pendingLabReports: pendingLabs || 0
      }
    }

    const contextString = JSON.stringify(contextPayload, null, 2)
    const contextIdentifier = crypto.createHash('sha256').update(contextString).digest('hex')

    return { contextString, contextIdentifier }
  }
}
