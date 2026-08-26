import { getPatientLongitudinalRecord, getPatientEncounters } from '@/lib/services/patient.service'
import { getPatientConsents } from '@/lib/services/abdm.service'
import { fetchAbdmAuditLog } from '@/lib/services/abdm-gateway.service'
import { notFound } from 'next/navigation'
import { format, differenceInYears } from 'date-fns'
import { User, Phone, MapPin, AlertTriangle, Activity, Clock, ShieldCheck } from 'lucide-react'
import { AbdmManager } from './_components/abdm-manager'
import { AiPatientSummary } from './_components/ai-patient-summary'
import { createClient } from '@/lib/supabase/server'

export default async function PatientProfilePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()
  
  let record;
  let consents = [];
  let encounters = [];
  let auditLogs = [];
  try {
    record = await getPatientLongitudinalRecord(id)
    consents = await getPatientConsents(id)
    encounters = await getPatientEncounters(id)
    auditLogs = await fetchAbdmAuditLog(id)
  } catch (err) {
    notFound()
  }

  const { patient, timeline } = record
  
  // Fetch the latest summary
  const { data: aiSummaries } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('patient_id', id)
    .eq('interaction_type', 'Patient_Summary')
    .order('created_at', { ascending: false })
    .limit(1)

  // Cast identities explicitly to bypass loose typing from loose service layer
  const identities = patient.identity_records as Array<{ identity_type: string, identity_value: string, is_primary: boolean }>
  const uhid = identities?.find(id => id.identity_type === 'UHID')?.identity_value || 'N/A'
  const abha = identities?.find(id => id.identity_type === 'ABHA')?.identity_value || 'N/A'

  const emergencyContact = patient.emergency_contact as { name?: string, phone?: string, relation?: string } | null

  return (
    <div className="space-y-6 pb-12">
      
      {/* Header Profile Card */}
      <div className="bg-white p-6 rounded-lg shadow-sm border flex items-start justify-between">
        <div className="flex items-center space-x-6">
          <div className="h-24 w-24 bg-blue-100 rounded-full flex items-center justify-center">
            <User className="h-12 w-12 text-blue-600" />
          </div>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">
              {patient.first_name} {patient.last_name}
            </h1>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-600">
              <span className="font-semibold px-2 py-0.5 bg-gray-100 rounded text-gray-800">UHID: {uhid}</span>
              <span>{patient.gender}</span>
              <span>{patient.date_of_birth ? differenceInYears(new Date(), new Date(patient.date_of_birth)) + ' yrs' : ''}</span>
              <span className="flex items-center"><Activity className="w-3 h-3 mr-1"/> Blood: {patient.blood_group}</span>
            </div>
            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
              <span className="flex items-center"><Phone className="w-3 h-3 mr-1"/> {patient.phone_number}</span>
              <span className="flex items-center"><MapPin className="w-3 h-3 mr-1"/> {patient.address || 'No address on file'}</span>
            </div>
          </div>
        </div>
      </div>

      <AiPatientSummary patientId={id} initialInteraction={aiSummaries?.[0]} />

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Col: Info & Emergency */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-semibold text-gray-900 flex items-center">
              <MapPin className="h-4 w-4 mr-2" /> Contact & Address
            </h3>
            <div className="text-sm text-gray-600">
              <p>{patient.address || 'No street address'}</p>
              <p>{[patient.city, patient.state, patient.pin].filter(Boolean).join(', ')}</p>
            </div>
            
            <div className="border-t pt-4 mt-4">
              <h4 className="font-semibold text-gray-800 text-sm mb-2">Emergency Contact</h4>
              {emergencyContact?.name ? (
                <div className="text-sm text-gray-600">
                  <p className="font-medium">{emergencyContact.name} ({emergencyContact.relation})</p>
                  <p>{emergencyContact.phone}</p>
                </div>
              ) : (
                <p className="text-sm text-gray-500 italic">None provided</p>
              )}
            </div>
          </div>
        </div>

        {/* Middle Col: Clinical Core (Conditions/Allergies placeholder) */}
        <div className="space-y-6">
          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-red-700 flex items-center mb-4">
              <AlertTriangle className="h-4 w-4 mr-2" /> Known Allergies
            </h3>
            <div className="text-sm text-gray-500 italic border-l-2 border-red-200 pl-3">
              No allergies recorded yet.
            </div>
          </div>

          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-900 flex items-center mb-4">
              <Activity className="h-4 w-4 mr-2" /> Chronic Conditions
            </h3>
            <div className="text-sm text-gray-500 italic border-l-2 border-gray-200 pl-3">
              No active conditions.
            </div>
          </div>
        </div>

        {/* Right Col: Timeline */}
        <div className="bg-white p-5 rounded-lg border shadow-sm h-[600px] overflow-y-auto">
          <h3 className="font-semibold text-gray-900 flex items-center mb-6">
            <Clock className="h-4 w-4 mr-2" /> Patient Timeline
          </h3>
          <div className="space-y-6">
            {timeline.length === 0 ? (
              <p className="text-sm text-gray-500">No events found.</p>
            ) : (
              timeline.map((event: any) => (
                <div key={event.id} className="relative pl-6 border-l-2 border-blue-200 last:border-l-0">
                  <div className="absolute -left-[5px] top-1 h-2 w-2 rounded-full bg-blue-600"></div>
                  <div className="text-xs text-gray-400 mb-1">
                    {format(new Date(event.created_at), 'MMM d, yyyy HH:mm')}
                  </div>
                  <div className="text-sm font-medium text-gray-900">{event.event_type}</div>
                  <div className="text-sm text-gray-600">{event.description}</div>
                </div>
              ))
            )}
          </div>
        </div>

      </div>

      <div className="mt-6">
        <AbdmManager patientId={patient.id} consents={consents} encounters={encounters} auditLogs={auditLogs} abhaNumber={abha} />
      </div>

    </div>
  )
}
