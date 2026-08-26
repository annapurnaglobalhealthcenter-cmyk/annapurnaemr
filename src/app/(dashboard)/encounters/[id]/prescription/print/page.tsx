import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'

export default async function PrintPrescriptionPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const encounterId = (await params).id
  const supabase = await createClient()

  // Fetch encounter and patient
  const { data: encounter } = await supabase
    .from('encounters')
    .select(`
      *,
      patients (
        id, first_name, last_name, gender, date_of_birth, blood_group, phone_number,
        identity_records (identity_type, identity_value),
        patient_allergies (allergy_name, severity)
      ),
      user_profiles!provider_id(full_name)
    `)
    .eq('id', encounterId)
    .single()

  if (!encounter) notFound()

  // Fetch active record
  const { data: records } = await supabase
    .from('clinical_records')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false })
    .limit(1)

  const activeRecord = records?.[0]
  if (!activeRecord) notFound()

  // Fetch meds and vitals
  const { data: medications } = await supabase
    .from('medication_prescriptions')
    .select('*')
    .eq('clinical_record_id', activeRecord.id)

  const { data: vitals } = await supabase
    .from('vitals')
    .select('*')
    .eq('clinical_record_id', activeRecord.id)
    .order('recorded_at', { ascending: false })
    .limit(1)

  const { data: diagnoses } = await supabase
    .from('diagnoses')
    .select('*')
    .eq('clinical_record_id', activeRecord.id)

  const patient = encounter.patients
  const uhid = patient?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
  const latestVitals = vitals?.[0]

  return (
    <div className="print-only max-w-4xl mx-auto bg-white p-10 min-h-screen text-black" style={{ printColorAdjust: 'exact' }}>
      
      {/* Script to trigger print on load */}
      <script dangerouslySetInnerHTML={{ __html: 'window.onload = function() { window.print(); }' }} />

      {/* Hospital Header */}
      <div className="text-center border-b-2 border-black pb-4 mb-6">
        <h1 className="text-3xl font-black uppercase tracking-wider">Annapurna Hospital</h1>
        <p className="text-sm">123 Health Avenue, Medical District, City - 123456</p>
        <p className="text-sm">Phone: +91 98765 43210 | Email: care@annapurna.com</p>
      </div>

      {/* Prescription Header Data */}
      <div className="flex justify-between items-start mb-6 border-b border-gray-300 pb-4">
        <div className="space-y-1 text-sm">
          <div><span className="font-semibold w-24 inline-block">Patient Name:</span> {patient?.first_name} {patient?.last_name}</div>
          <div><span className="font-semibold w-24 inline-block">Age / Gender:</span> {patient?.gender}</div>
          <div><span className="font-semibold w-24 inline-block">UHID:</span> {uhid}</div>
          <div><span className="font-semibold w-24 inline-block">Mobile:</span> {patient?.phone_number || 'N/A'}</div>
        </div>
        <div className="space-y-1 text-sm text-right">
          <div><span className="font-semibold">Dr. {encounter.user_profiles?.full_name}</span></div>
          <div><span className="font-semibold">Date:</span> {format(new Date(activeRecord.created_at), 'dd MMM yyyy')}</div>
          <div><span className="font-semibold">Encounter ID:</span> {encounter.id.split('-')[0]}</div>
        </div>
      </div>

      {/* Clinical Context */}
      <div className="mb-6 space-y-4">
        {latestVitals && (
          <div className="text-sm bg-gray-50 p-2 rounded">
            <span className="font-semibold">Vitals: </span>
            BP: {latestVitals.systolic_bp}/{latestVitals.diastolic_bp} mmHg, 
            HR: {latestVitals.heart_rate} bpm, 
            Temp: {latestVitals.temperature_c}°C, 
            Wt: {latestVitals.weight_kg} kg
          </div>
        )}

        {patient?.patient_allergies && patient.patient_allergies.length > 0 && (
          <div className="text-sm text-red-700">
            <span className="font-bold">Allergies: </span>
            {patient.patient_allergies.map((a: any) => a.allergy_name).join(', ')}
          </div>
        )}

        {diagnoses && diagnoses.length > 0 && (
          <div className="text-sm">
            <span className="font-semibold">Diagnosis: </span>
            {diagnoses.map((d: any) => d.diagnosis_name).join(', ')}
          </div>
        )}
      </div>

      {/* Rx Symbol */}
      <div className="text-4xl font-serif font-bold italic mb-6">Rx</div>

      {/* Medications Table */}
      {medications && medications.length > 0 ? (
        <table className="w-full text-left border-collapse mb-10">
          <thead>
            <tr className="border-b-2 border-black text-sm">
              <th className="py-2 w-10">S.No</th>
              <th className="py-2">Medicine Name & Strength</th>
              <th className="py-2">Dosage</th>
              <th className="py-2">Freq & Route</th>
              <th className="py-2">Duration</th>
              <th className="py-2">Qty</th>
            </tr>
          </thead>
          <tbody>
            {medications.map((m: any, i: number) => (
              <tr key={m.id} className="border-b border-gray-200">
                <td className="py-3 text-sm align-top">{i + 1}.</td>
                <td className="py-3 align-top">
                  <div className="font-bold text-sm">{m.medication_name}</div>
                  {m.instructions && <div className="text-xs italic mt-1 text-gray-700">{m.instructions}</div>}
                </td>
                <td className="py-3 text-sm align-top">{m.dosage}</td>
                <td className="py-3 text-sm align-top">{m.frequency} <span className="text-gray-500">({m.route})</span></td>
                <td className="py-3 text-sm align-top">{m.duration_days} Days</td>
                <td className="py-3 text-sm align-top font-semibold">{m.quantity}</td>
              </tr>
            ))}
          </tbody>
        </table>
      ) : (
        <p className="italic text-gray-500 mb-10">No medications prescribed.</p>
      )}

      {/* Advice / Follow up */}
      <div className="text-sm space-y-4 mb-16">
        {activeRecord.advice && (
          <div>
            <div className="font-semibold underline mb-1">Advice / Instructions:</div>
            <div className="whitespace-pre-wrap">{activeRecord.advice}</div>
          </div>
        )}
        {activeRecord.follow_up_plan && (
          <div>
            <span className="font-semibold">Follow-up: </span> {activeRecord.follow_up_plan}
          </div>
        )}
      </div>

      {/* Signature */}
      <div className="mt-20 flex justify-end">
        <div className="text-center">
          <div className="w-48 border-t border-black mb-2"></div>
          <div className="font-bold">Dr. {encounter.user_profiles?.full_name}</div>
          <div className="text-xs text-gray-500">Authorized Signature</div>
        </div>
      </div>

    </div>
  )
}
