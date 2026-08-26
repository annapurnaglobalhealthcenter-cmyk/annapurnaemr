import { z } from 'zod'

// 1. Clinical Decision Support Schema
export const DifferentialDiagnosisSchema = z.object({
  clinicalSummary: z.string(),
  differentialConsiderations: z.array(z.object({
    condition: z.string(),
    probability: z.enum(['High', 'Medium', 'Low']),
    rationale: z.string(),
  })),
  supportingFindings: z.array(z.string()),
  contradictoryInformation: z.array(z.string()),
  redFlags: z.array(z.string()),
  investigationConsiderations: z.array(z.string()),
  medicationConsiderations: z.array(z.object({
    drugClass: z.string(),
    reason: z.string(),
    caution: z.string()
  })),
  managementConsiderations: z.array(z.string()),
  referralConsiderations: z.array(z.string()),
  uncertainty: z.string()
})

export type DifferentialDiagnosisType = z.infer<typeof DifferentialDiagnosisSchema>

// 2. Clinical Documentation Schema (SOAP / Referral / Discharge)
export const ClinicalDocumentationSchema = z.object({
  subjective: z.string(),
  objective: z.string(),
  assessment: z.string(),
  plan: z.string(),
  referrals: z.array(z.string()).optional(),
  followUp: z.string().optional()
})

export type ClinicalDocumentationType = z.infer<typeof ClinicalDocumentationSchema>

// 3. Medication Safety Schema
export const MedicationSafetySchema = z.object({
  allergyConflicts: z.array(z.object({
    drug: z.string(),
    allergen: z.string(),
    severity: z.string(),
    description: z.string()
  })),
  drugInteractions: z.array(z.object({
    drugA: z.string(),
    drugB: z.string(),
    severity: z.enum(['Contraindicated', 'Major', 'Moderate', 'Minor']),
    description: z.string()
  })),
  duplicateTherapy: z.array(z.string()),
  contraindications: z.array(z.object({
    drug: z.string(),
    condition: z.string(),
    description: z.string()
  })),
  doseConcerns: z.array(z.string()),
  missingInformation: z.array(z.string()),
  safeToProceed: z.boolean()
})

export type MedicationSafetyType = z.infer<typeof MedicationSafetySchema>

// 4. Patient History Summary Schema
export const PatientHistorySummarySchema = z.object({
  majorDiagnoses: z.array(z.string()),
  previousAdmissions: z.array(z.string()),
  importantProcedures: z.array(z.string()),
  medicationHistory: z.array(z.string()),
  allergies: z.array(z.string()),
  significantInvestigations: z.array(z.string()),
  trends: z.array(z.string()),
  recentEvents: z.array(z.string()),
  outstandingIssues: z.array(z.string())
})

// 5. Investigation Analysis Schema
export const InvestigationAnalysisSchema = z.object({
  abnormalValues: z.array(z.string()),
  trends: z.array(z.string()),
  significantChanges: z.array(z.string()),
  repeatedAbnormalities: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  missingFollowUp: z.array(z.string())
})

// 6. Admitted Patient Analysis Schema
export const AdmittedPatientAnalysisSchema = z.object({
  importantTrends: z.array(z.string()),
  newAbnormalities: z.array(z.string()),
  potentialConcerns: z.array(z.string()),
  pendingTasks: z.array(z.string()),
  documentationGaps: z.array(z.string()),
  changesRequiringReview: z.array(z.string())
})

// 7. Discharge Summary Schema
export const DischargeSummarySchema = z.object({
  admissionReason: z.string(),
  hospitalCourse: z.string(),
  finalDiagnosis: z.string(),
  proceduresPerformed: z.array(z.string()),
  dischargeMedications: z.array(z.string()),
  dischargeAdvice: z.string(),
  conditionAtDischarge: z.string()
})

// 9. Admin Analytics Schema
export const AdminAnalyticsSchema = z.object({
  answer: z.string(),
  chartData: z.array(z.object({
    label: z.string(),
    value: z.number()
  })).optional(),
  suggestedFollowUps: z.array(z.string())
})
export const ReferralSchema = z.object({
  patientSummary: z.string(),
  relevantHistory: z.string(),
  currentProblem: z.string(),
  clinicalFindings: z.string(),
  investigations: z.array(z.string()),
  treatmentGiven: z.string(),
  reasonForReferral: z.string(),
  questionsForSpecialist: z.array(z.string())
})
