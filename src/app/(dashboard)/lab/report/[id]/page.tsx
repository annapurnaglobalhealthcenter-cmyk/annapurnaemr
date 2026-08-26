import { createClient } from '@/lib/supabase/server'
import { notFound } from 'next/navigation'
import { format } from 'date-fns'
import { FlaskConical, FileSignature, Printer } from 'lucide-react'
import { AiInvestigationAnalysis } from './_components/ai-investigation-analysis'

export default async function LabReportPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const supabase = await createClient()

  // Fetch the order and ONLY verified results
  const { data: order } = await supabase
    .from('investigation_orders')
    .select(`
      *,
      patients (id, first_name, last_name, gender, date_of_birth, identity_records(identity_type, identity_value)),
      user_profiles!ordered_by (full_name),
      investigation_results (*)
    `)
    .eq('id', id)
    .single()

  if (!order) notFound()

  // Fetch AI interactions
  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('encounter_id', order.encounter_id)
    .eq('interaction_type', 'Investigation_Analysis')
    .order('created_at', { ascending: false })
    .limit(1)

  // STRICTLY filter out unverified results
  const verifiedResults = (order.investigation_results || []).filter((r: any) => r.status === 'Verified')
  
  if (verifiedResults.length === 0) {
    return (
      <div className="p-12 text-center">
        <h2 className="text-2xl font-bold text-red-600 mb-2">Report Not Ready</h2>
        <p className="text-gray-600">This lab report has not been verified by a Pathologist yet.</p>
        <p className="text-sm text-gray-500 mt-4">Unverified results are restricted from final printing to ensure clinical safety.</p>
      </div>
    )
  }

  const patient = Array.isArray(order.patients) ? order.patients[0] : order.patients
  const uhid = patient?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value
  const age = patient?.date_of_birth ? Math.floor((new Date().getTime() - new Date(patient.date_of_birth).getTime()) / 3.15576e+10) : 'N/A'

  // Assume all verified by the same person for simplicity of display, grab the first one
  let verifiedBy = 'Dr. Pathologist'
  if (verifiedResults[0]?.verified_by) {
    const { data: vUser } = await supabase.from('user_profiles').select('full_name').eq('id', verifiedResults[0].verified_by).single()
    if (vUser) verifiedBy = vUser.full_name
  }

  return (
    <div className="max-w-4xl mx-auto p-8 min-h-screen text-black">
      
      <AiInvestigationAnalysis reportId={id} patientId={order.patient_id} initialInteraction={aiInteractions?.[0]} />

      <div className="bg-white border p-8">
        {/* Header */}
      <div className="border-b-2 border-gray-800 pb-6 mb-6 flex justify-between items-start">
        <div className="flex items-center">
          <FlaskConical className="w-10 h-10 mr-3 text-gray-800" />
          <div>
            <h1 className="text-3xl font-black uppercase tracking-tight">Annapurna Hospital</h1>
            <p className="text-sm font-medium text-gray-600">Department of Laboratory Medicine</p>
          </div>
        </div>
        <div className="text-right">
          <h2 className="text-xl font-bold text-gray-800 uppercase tracking-widest">Laboratory Report</h2>
          <div className="text-sm mt-1">Report ID: <span className="font-mono">{order.id.split('-')[0].toUpperCase()}</span></div>
          <div className="text-sm">Date: {format(new Date(), 'dd MMM yyyy HH:mm')}</div>
        </div>
      </div>

      {/* Patient Info */}
      <div className="grid grid-cols-2 gap-4 mb-8 text-sm border-b-2 border-gray-200 pb-6">
        <div>
          <table className="w-full">
            <tbody>
              <tr><td className="py-1 font-semibold text-gray-600 w-32">Patient Name:</td><td className="py-1 font-bold">{patient?.first_name} {patient?.last_name}</td></tr>
              <tr><td className="py-1 font-semibold text-gray-600">UHID:</td><td className="py-1">{uhid}</td></tr>
              <tr><td className="py-1 font-semibold text-gray-600">Age / Gender:</td><td className="py-1">{age} Yrs / {patient?.gender}</td></tr>
            </tbody>
          </table>
        </div>
        <div>
          <table className="w-full">
            <tbody>
              <tr><td className="py-1 font-semibold text-gray-600 w-32">Referred By:</td><td className="py-1">{Array.isArray(order.user_profiles) ? order.user_profiles[0]?.full_name : order.user_profiles?.full_name}</td></tr>
              <tr><td className="py-1 font-semibold text-gray-600">Test Ordered:</td><td className="py-1 font-bold">{order.test_name}</td></tr>
              <tr><td className="py-1 font-semibold text-gray-600">Collected At:</td><td className="py-1">{format(new Date(order.created_at), 'dd MMM yyyy HH:mm')}</td></tr>
            </tbody>
          </table>
        </div>
      </div>

      {/* Results */}
      <div className="mb-12">
        <h3 className="text-lg font-bold uppercase tracking-wider mb-4 border-b border-gray-300 pb-2">{order.test_name}</h3>
        
        <table className="w-full text-left text-sm">
          <thead className="border-b-2 border-gray-800">
            <tr>
              <th className="py-3 font-bold uppercase">Parameter</th>
              <th className="py-3 font-bold uppercase">Result</th>
              <th className="py-3 font-bold uppercase">Unit</th>
              <th className="py-3 font-bold uppercase">Biological Ref. Interval</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {verifiedResults.map((r: any) => (
              <tr key={r.id}>
                <td className="py-3 font-medium">{r.parameter_name}</td>
                <td className="py-3">
                  <span className={`font-bold ${r.critical_flag ? 'text-red-700 underline decoration-2' : r.is_abnormal ? 'text-gray-900 font-black' : 'text-gray-700'}`}>
                    {r.result_value}
                  </span>
                  {r.is_abnormal && !r.critical_flag && <span className="ml-2 font-bold">*</span>}
                  {r.critical_flag && <span className="ml-2 font-bold text-red-700">** CRITICAL</span>}
                </td>
                <td className="py-3 text-gray-600">{r.unit}</td>
                <td className="py-3 text-gray-600">{r.reference_range}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Footer Signatures */}
      <div className="mt-20 pt-8 border-t-2 border-gray-200 grid grid-cols-2 gap-8">
        <div>
          <p className="text-xs text-gray-500 mb-8">*** End of Report ***<br/>Electronically verified, no signature required.</p>
        </div>
        <div className="text-right">
          <div className="inline-block text-center">
            <FileSignature className="w-12 h-12 mx-auto text-gray-400 mb-2" />
            <div className="font-bold border-t border-gray-400 pt-2 px-4">{verifiedBy}</div>
            <div className="text-xs text-gray-500">Consultant Pathologist</div>
            <div className="text-xs text-gray-400 mt-1">Verified: {format(new Date(verifiedResults[0]?.verified_at), 'dd MMM yyyy HH:mm')}</div>
          </div>
        </div>
      </div>
      </div>

      {/* Print Button Wrapper */}
      <div className="fixed bottom-8 right-8 print:hidden">
        <button 
          onClick={() => window.print()}
          className="bg-blue-600 text-white px-6 py-3 rounded-full shadow-lg font-bold flex items-center hover:bg-blue-700 transition"
        >
          <Printer className="w-5 h-5 mr-2" /> Print Report
        </button>
      </div>
    </div>
  )
}
