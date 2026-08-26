export class FhirMapper {
  
  static mapPatient(patientData: any, abhaNumber?: string) {
    const identifiers = []
    
    // Internal UHID
    const uhid = patientData.identity_records?.find((r:any) => r.identity_type === 'UHID')?.identity_value
    if (uhid) {
      identifiers.push({
        type: { coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0203", code: "MR", display: "Medical record number" }] },
        system: "https://annapurnaemr.local/uhid",
        value: uhid
      })
    }

    // ABHA
    if (abhaNumber) {
      identifiers.push({
        type: { coding: [{ system: "https://ndhm.gov.in/standards", code: "ABHA", display: "ABHA" }] },
        system: "https://healthid.ndhm.gov.in",
        value: abhaNumber
      })
    }

    return {
      resourceType: "Patient",
      id: patientData.id,
      identifier: identifiers,
      name: [{
        use: "official",
        text: `${patientData.first_name} ${patientData.last_name}`,
        family: patientData.last_name,
        given: [patientData.first_name]
      }],
      gender: patientData.gender?.toLowerCase() || "unknown",
      birthDate: patientData.date_of_birth
    }
  }

  static mapEncounter(encounterData: any, patientRef: string, doctorRef: string) {
    return {
      resourceType: "Encounter",
      id: encounterData.id,
      status: encounterData.status === 'Completed' ? 'finished' : 'in-progress',
      class: {
        system: "http://terminology.hl7.org/CodeSystem/v3-ActCode",
        code: encounterData.encounter_type === 'OPD' ? 'AMB' : 'IMP',
        display: encounterData.encounter_type === 'OPD' ? 'ambulatory' : 'inpatient encounter'
      },
      subject: { reference: `Patient/${patientRef}` },
      participant: [{
        type: [{ coding: [{ system: "http://terminology.hl7.org/CodeSystem/v3-ParticipationType", code: "ATND" }] }],
        individual: { reference: `Practitioner/${doctorRef}` }
      }],
      period: {
        start: encounterData.created_at
      }
    }
  }

  static mapMedicationRequest(prescriptionData: any, patientRef: string, encounterRef: string) {
    return {
      resourceType: "MedicationRequest",
      id: prescriptionData.id,
      status: prescriptionData.status === 'Cancelled' ? 'cancelled' : 'active',
      intent: "order",
      medicationCodeableConcept: {
        text: prescriptionData.medication_name
      },
      subject: { reference: `Patient/${patientRef}` },
      encounter: { reference: `Encounter/${encounterRef}` },
      authoredOn: prescriptionData.created_at,
      dosageInstruction: [{
        text: `${prescriptionData.dosage} ${prescriptionData.frequency} for ${prescriptionData.duration}`
      }]
    }
  }

  static mapObservation(vitalsData: any, patientRef: string, encounterRef: string) {
    // E.g., mapping heart rate
    if (!vitalsData.heart_rate) return null

    return {
      resourceType: "Observation",
      id: vitalsData.id,
      status: "final",
      category: [{
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/observation-category", code: "vital-signs", display: "Vital Signs" }]
      }],
      code: {
        coding: [{ system: "http://loinc.org", code: "8867-4", display: "Heart rate" }]
      },
      subject: { reference: `Patient/${patientRef}` },
      encounter: { reference: `Encounter/${encounterRef}` },
      effectiveDateTime: vitalsData.recorded_at,
      valueQuantity: {
        value: vitalsData.heart_rate,
        unit: "beats/minute",
        system: "http://unitsofmeasure.org",
        code: "/min"
      }
    }
  }

  static mapDiagnosticReport(reportData: any, patientRef: string, encounterRef: string) {
    return {
      resourceType: "DiagnosticReport",
      id: reportData.id,
      status: reportData.status === 'Verified' ? 'final' : 'partial',
      category: [{
        coding: [{ system: "http://terminology.hl7.org/CodeSystem/v2-0074", code: "RAD", display: "Radiology" }]
      }],
      code: { text: reportData.procedure_name || "Diagnostic Study" },
      subject: { reference: `Patient/${patientRef}` },
      encounter: { reference: `Encounter/${encounterRef}` },
      issued: reportData.updated_at,
      conclusion: reportData.impression || reportData.findings
    }
  }

  static generateBundle(patientId: string, resources: any[]) {
    return {
      resourceType: "Bundle",
      id: crypto.randomUUID(),
      type: "document",
      timestamp: new Date().toISOString(),
      entry: resources.map(r => ({
        fullUrl: `urn:uuid:${r.id}`,
        resource: r
      }))
    }
  }
}
