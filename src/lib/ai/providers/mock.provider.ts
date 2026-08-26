import { AiProvider, AiRequestOptions, AiResponse } from '../interfaces'
import { z } from 'zod'

export class MockAiProvider implements AiProvider {
  
  async requestStructured<T>(
    systemPrompt: string,
    clinicalContext: string,
    schema: z.ZodType<T>,
    options?: AiRequestOptions
  ): Promise<AiResponse<T>> {
    
    // Simulate network latency
    const start = Date.now()
    await new Promise(resolve => setTimeout(resolve, 1500))

    let mockData: any = {};

    if (systemPrompt.includes('history summary')) {
      mockData = {
        majorDiagnoses: ["Type 2 Diabetes Mellitus", "Hypertension"],
        previousAdmissions: ["Admitted Aug 2024 for DKA"],
        importantProcedures: ["Appendectomy (2010)"],
        medicationHistory: ["Metformin 500mg", "Lisinopril 10mg"],
        allergies: ["Penicillin (Rash)"],
        significantInvestigations: ["HbA1c 8.4% (Aug 2024)", "Creatinine 1.2 mg/dL"],
        trends: ["HbA1c steadily increasing over last 3 years", "Blood pressure moderately controlled"],
        recentEvents: ["Recent emergency visit for symptomatic hyperglycemia"],
        outstandingIssues: ["Pending diabetic retinopathy screening"]
      }
    } else if (systemPrompt.includes('investigation analysis')) {
      mockData = {
        abnormalValues: ["HbA1c 8.4% (High)", "Fasting Glucose 140 mg/dL (High)"],
        trends: ["HbA1c increased from 7.2% (Jan) to 8.4% (Aug)"],
        significantChanges: ["Sharp rise in fasting glucose compared to last visit"],
        repeatedAbnormalities: ["Persistently elevated HbA1c across 3 tests"],
        potentialConcerns: ["Worsening glycemic control despite Metformin"],
        missingFollowUp: ["No recent microalbuminuria check on file"]
      }
    } else if (systemPrompt.includes('documentation')) {
      mockData = {
        subjective: "Patient reports 3 days of productive cough, mild fever, and shortness of breath upon exertion. No chest pain.",
        objective: "Vitals: BP 120/80, HR 98, Temp 101F. Chest: Bilateral crackles at lung bases.",
        assessment: "Likely Community Acquired Pneumonia (CAP), cannot rule out acute bronchitis.",
        plan: "1. Empiric oral antibiotics (Azithromycin). 2. Paracetamol for fever. 3. Chest X-Ray ordered.",
        referrals: [],
        followUp: "Review in clinic in 48 hours, or immediately if symptoms worsen."
      }
    } else if (systemPrompt.includes('safety check')) {
      mockData = {
        allergyConflicts: [
          { drug: "Amoxicillin", allergen: "Penicillin", severity: "High", description: "Patient has documented Penicillin allergy (Rash)." }
        ],
        drugInteractions: [
          { drugA: "Azithromycin", drugB: "Ondansetron", severity: "Major", description: "Increased risk of QT interval prolongation." }
        ],
        duplicateTherapy: ["Patient is already taking Lisinopril. Adding Enalapril is therapeutic duplication."],
        contraindications: [
          { drug: "Ibuprofen", condition: "Chronic Kidney Disease", description: "NSAIDs are contraindicated in advanced CKD." }
        ],
        doseConcerns: ["Metformin 1000mg BID may be too high given recent GFR of 42 ml/min."],
        missingInformation: ["Patient weight is missing; cannot accurately calculate pediatric dosing if required.", "Recent liver function tests not on file."],
        safeToProceed: false
      }
    } else if (systemPrompt.includes('admitted patient')) {
      mockData = {
        importantTrends: [
          "Heart rate steadily trending upward over last 12 hours (from 80 to 110 bpm)",
          "Urine output decreasing (last 4 hours < 30ml/hr)"
        ],
        newAbnormalities: [
          "New onset fever of 101.5F noted at 02:00 AM",
          "WBC count jumped from 11k to 18k in latest morning labs"
        ],
        potentialConcerns: [
          "Possible developing sepsis given tachycardia, fever, and leukocytosis",
          "Risk of acute kidney injury secondary to poor perfusion"
        ],
        pendingTasks: [
          "Morning dose of Piperacillin/Tazobactam not yet administered",
          "Repeat lactate level due in 1 hour"
        ],
        documentationGaps: [
          "No nursing reassessment documented after PRN Paracetamol administration at 02:30 AM"
        ],
        changesRequiringReview: [
          "Consider adjusting IV fluid rate",
          "Review antibiotic coverage"
        ]
      }
    } else if (systemPrompt.includes('discharge')) {
      mockData = {
        admissionReason: "Admitted for acute exacerbation of COPD with suspected secondary bacterial pneumonia.",
        hospitalCourse: "Patient responded well to IV Piperacillin/Tazobactam and nebulized bronchodilators. Weaned off supplemental oxygen by day 3. Vitals remained stable over the last 24 hours.",
        finalDiagnosis: "Acute exacerbation of COPD, resolved. Secondary bacterial pneumonia, resolved.",
        proceduresPerformed: ["Chest X-Ray", "Sputum Culture"],
        dischargeMedications: ["Azithromycin 500mg OD for 3 more days", "Salbutamol inhaler PRN"],
        dischargeAdvice: "Avoid exposure to smoke and dust. Return to ER if severe shortness of breath or fever recurs.",
        conditionAtDischarge: "Stable, breathing comfortably on room air."
      }
    } else if (systemPrompt.includes('referral')) {
      mockData = {
        patientSummary: "62-year-old male with long-standing Type 2 Diabetes and newly detected microalbuminuria.",
        relevantHistory: "T2DM for 15 years, hypertension for 10 years. Current HbA1c 8.4%.",
        currentProblem: "Deteriorating renal function. eGFR dropped from 65 to 42 ml/min over the last 6 months.",
        clinicalFindings: "BP 145/90. No peripheral edema currently. Cardiovascular exam normal.",
        investigations: ["Serum Creatinine: 1.8 mg/dL", "eGFR: 42 ml/min", "Urine Microalbumin: 150 mg/g"],
        treatmentGiven: "Started on Losartan 50mg. Metformin dose reduced due to renal clearance.",
        reasonForReferral: "Specialist opinion regarding progressive nephropathy and optimization of anti-diabetic regimen in the setting of CKD Stage 3b.",
        questionsForSpecialist: [
          "Should SGLT2 inhibitors be initiated?",
          "Are there further interventions recommended to slow renal decline?"
        ]
      }
    } else if (systemPrompt.includes('admin analytics')) {
      if (clinicalContext.toLowerCase().includes('bed')) {
        mockData = {
          answer: "Our current bed occupancy across all wards is 75%. The ICU is currently at 90% capacity, while the General Ward is at 60%.",
          chartData: [{label: 'ICU', value: 90}, {label: 'General', value: 60}, {label: 'Private', value: 75}],
          suggestedFollowUps: ["Which beds are currently vacant in ICU?", "How many discharges are planned for today?"]
        }
      } else if (clinicalContext.toLowerCase().includes('opd')) {
        mockData = {
          answer: "We have had 1,420 OPD patients this month. The highest volume was in the General Medicine department (450 patients), followed by Orthopedics (320 patients). Total OPD revenue for this month is ₹245,000.",
          chartData: [{label: 'Gen Med', value: 450}, {label: 'Ortho', value: 320}, {label: 'Pediatrics', value: 210}, {label: 'ENT', value: 150}],
          suggestedFollowUps: ["What was the OPD volume last month?", "Which doctor saw the most patients?"]
        }
      } else {
        mockData = {
          answer: "Based on current hospital records, there are 45 pending lab reports. We have 12 medicines in the pharmacy nearing expiry within the next 30 days. Furthermore, there were 45 IPD admissions this week.",
          suggestedFollowUps: ["List the medicines nearing expiry", "Which department ordered the pending lab reports?"]
        }
      }
    } else {
      mockData = {
        clinicalSummary: "35M presenting with 3 days of productive cough, mild fever, and shortness of breath upon exertion. Vitals stable but mildly tachycardic.",
        differentialConsiderations: [
          { condition: "Community Acquired Pneumonia", probability: "High", rationale: "Fever, productive cough, SOB." },
          { condition: "Acute Bronchitis", probability: "Medium", rationale: "Common viral etiology, but symptoms leaning bacterial." }
        ],
        supportingFindings: ["Fever for 3 days", "Productive cough", "Tachycardia"],
        contradictoryInformation: ["Lack of severe hypoxemia in vitals", "No chest pain reported"],
        redFlags: ["Shortness of breath on exertion - monitor closely for respiratory distress"],
        investigationConsiderations: ["Chest X-Ray (PA View)", "CBC with Differential", "Sputum Culture"],
        medicationConsiderations: [
          { drugClass: "Macrolide Antibiotic", reason: "Empiric coverage for atypical CAP", caution: "Review QTc interval on ECG if prescribing" },
          { drugClass: "Antipyretic", reason: "Symptomatic relief for fever", caution: "Avoid if liver disease present" }
        ],
        managementConsiderations: ["Advise rest and adequate oral hydration", "Inhaler demonstration if prescribed"],
        referralConsiderations: ["Refer to Pulmonology if symptoms do not improve in 48-72h"],
        uncertainty: "Without Chest X-Ray and CBC, difficult to definitively separate viral bronchitis from early bacterial pneumonia."
      }
    }

    // Ensure it strictly passes the zod schema
    const parsedData = schema.parse(mockData)

    return {
      data: parsedData,
      model: 'mock-clinical-v1',
      usage: {
        promptTokens: 120,
        completionTokens: 85,
        totalTokens: 205
      },
      executionTimeMs: Date.now() - start
    }
  }
}
