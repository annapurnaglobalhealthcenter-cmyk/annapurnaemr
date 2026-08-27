import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { DownloadPdfButton } from '@/components/ui/download-pdf-button'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { ArrowLeft, Printer } from 'lucide-react'

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
  const { data: record } = await supabase
    .from('clinical_records')
    .select('id, chief_complaint, history_of_present_illness, examination_notes, status')
    .eq('encounter_id', encounterId)
    .order('created_at', { ascending: false })
    .limit(1)
    .single()

  // Fetch vitals
  const { data: vitals } = await supabase
    .from('vitals')
    .select('*')
    .eq('encounter_id', encounterId)
    .order('recorded_at', { ascending: false })
    .limit(1)

  // Fetch diagnoses
  const { data: diagnoses } = record ? await supabase
    .from('diagnoses')
    .select('*')
    .eq('clinical_record_id', record.id)
  : { data: [] }

  // Fetch prescriptions
  const { data: prescriptions } = record ? await supabase
    .from('medication_prescriptions')
    .select('*')
    .eq('clinical_record_id', record.id)
  : { data: [] }

  const patient = encounter.patients
  const uhid = patient?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
  const latestVitals = vitals?.[0]

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      {/* Action Bar (Not printed) */}
      <div className="max-w-4xl mx-auto flex justify-between mb-4 print:hidden">
        <Link href={`/encounters/${encounterId}`}>
          <Button variant="outline" className="bg-white"><ArrowLeft className="w-4 h-4 mr-2"/> Back to Encounter</Button>
        </Link>
        <div className="flex gap-2">
          {/* We keep native print because it works beautifully, but add the JS-driven PDF as requested */}
          <DownloadPdfButton targetId="prescription-doc" filename={`prescription_${uhid}.pdf`} />
          <Button onClick={() => typeof window !== 'undefined' && window.print()} className="bg-blue-600 hover:bg-blue-700">
            <Printer className="w-4 h-4 mr-2" /> Print Native
          </Button>
        </div>
      </div>

      <div id="prescription-doc" className="max-w-4xl mx-auto bg-white p-10 shadow-lg print:shadow-none print:p-0 text-black" style={{ printColorAdjust: 'exact' }}>
        
        {/* Hospital Header */}
        <div className="text-center border-b-2 border-black pb-4 mb-6">
          <h1 className="text-3xl font-black uppercase tracking-wider text-blue-900">Annapurna Hospital</h1>
          <p className="text-sm font-medium">123 Health Avenue, Medical District, City - 123456</p>
          <p className="text-sm">Phone: +91 98765 43210 | Email: care@annapurna.com</p>
        </div>

        {/* Prescription Header Data */}
        <div className="flex justify-between items-start mb-6 border-b border-gray-300 pb-4">
          <div className="space-y-1 text-sm">
            <div><span className="font-semibold w-24 inline-block">Patient Name:</span> <span className="uppercase font-bold">{patient?.first_name} {patient?.last_name}</span></div>
            <div><span className="font-semibold w-24 inline-block">Age / Gender:</span> {patient?.gender}</div>
            <div><span className="font-semibold w-24 inline-block">UHID:</span> <span className="font-mono">{uhid}</span></div>
            <div><span className="font-semibold w-24 inline-block">Mobile:</span> {patient?.phone_number || 'N/A'}</div>
          </div>
          <div className="space-y-1 text-sm text-right">
            <div><span className="font-semibold inline-block mr-2">Date:</span> {format(new Date(encounter.created_at), 'dd MMM yyyy, hh:mm a')}</div>
            <div><span className="font-semibold inline-block mr-2">Encounter:</span> <span className="font-mono text-gray-600">#{encounter.id.split('-')[0]}</span></div>
            <div className="font-bold text-blue-800 mt-2">Dr. {encounter.user_profiles?.full_name}</div>
          </div>
        </div>

        {/* Vitals & Allergies (Sidebar style) */}
        <div className="flex gap-8">
          <div className="w-1/3 border-r pr-4">
            <h3 className="font-bold border-b pb-1 mb-3 text-sm">Vitals</h3>
            {latestVitals ? (
              <div className="space-y-2 text-sm">
                <div className="flex justify-between"><span>BP:</span> <strong>{latestVitals.systolic_bp}/{latestVitals.diastolic_bp} mmHg</strong></div>
                <div className="flex justify-between"><span>HR:</span> <strong>{latestVitals.heart_rate} bpm</strong></div>
                <div className="flex justify-between"><span>Temp:</span> <strong>{latestVitals.temperature_c} °C</strong></div>
                <div className="flex justify-between"><span>SpO2:</span> <strong>{latestVitals.spo2_percent}%</strong></div>
                <div className="flex justify-between"><span>Wt:</span> <strong>{latestVitals.weight_kg} kg</strong></div>
              </div>
            ) : <div className="text-sm text-gray-500">No vitals recorded.</div>}

            <h3 className="font-bold border-b pb-1 mt-6 mb-3 text-sm text-red-600">Allergies</h3>
            {patient?.patient_allergies && patient.patient_allergies.length > 0 ? (
              <ul className="list-disc pl-4 text-sm text-red-600 font-medium space-y-1">
                {patient.patient_allergies.map((a: any, i: number) => (
                  <li key={i}>{a.allergy_name} ({a.severity})</li>
                ))}
              </ul>
            ) : <div className="text-sm text-gray-500">No known allergies.</div>}
          </div>

          {/* Main Content */}
          <div className="w-2/3">
            
            {/* Clinical Notes */}
            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 flex items-center"><span className="text-blue-600 mr-2">C/O</span> Chief Complaint</h3>
              <p className="text-sm whitespace-pre-wrap">{record?.chief_complaint || 'None recorded'}</p>
            </div>

            <div className="mb-6">
              <h3 className="font-bold text-lg mb-2 flex items-center"><span className="text-blue-600 mr-2">Dx</span> Diagnosis</h3>
              {diagnoses && diagnoses.length > 0 ? (
                <ul className="list-decimal pl-5 text-sm space-y-1 font-semibold">
                  {diagnoses.map((d: any) => (
                    <li key={d.id}>{d.condition_name} {d.certainty ? `(${d.certainty})` : ''}</li>
                  ))}
                </ul>
              ) : <p className="text-sm">None recorded</p>}
            </div>

            {/* Prescriptions (Rx) */}
            <div className="mt-8 border-t-2 border-black pt-4">
              <h1 className="text-4xl font-serif font-bold italic mb-6">Rx</h1>
              
              {prescriptions && prescriptions.length > 0 ? (
                <div className="space-y-6">
                  {prescriptions.map((rx: any, idx: number) => (
                    <div key={rx.id} className="border-b border-gray-100 pb-4 last:border-0 last:pb-0">
                      <div className="font-bold text-lg">{idx + 1}. {rx.medication_name} <span className="font-normal text-gray-600 text-sm ml-2">{rx.dosage}</span></div>
                      <div className="mt-1 flex items-center gap-4 text-sm text-gray-800">
                        <span className="bg-gray-100 px-2 py-1 rounded font-medium">{rx.frequency}</span>
                        <span>for <strong>{rx.duration}</strong></span>
                      </div>
                      {rx.instructions && <div className="mt-2 text-sm text-gray-500 italic">" {rx.instructions} "</div>}
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-sm text-gray-500 text-center py-10">No medications prescribed.</div>
              )}
            </div>

          </div>
        </div>

        {/* Footer Signature */}
        <div className="mt-20 pt-10 flex justify-between items-end border-t border-gray-300">
          <div className="text-xs text-gray-500">
            <div>Valid for 30 days from date of issue.</div>
            <div>Generated by Annapurna EMR</div>
          </div>
          <div className="text-center w-48">
            <div className="border-b-2 border-black border-dashed mb-2 h-10"></div>
            <div className="font-bold text-sm">Dr. {encounter.user_profiles?.full_name}</div>
            <div className="text-xs text-gray-500">Signature / Seal</div>
          </div>
        </div>

      </div>
    </div>
  )
}
