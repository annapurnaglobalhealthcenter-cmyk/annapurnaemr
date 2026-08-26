'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { 
  updatePmjayCaseClinical, 
  simulateBisVerification, 
  simulateTmsPreauth, 
  simulateTmsApproval, 
  submitPmjayDocument, 
  raiseSnaQuery 
} from '@/lib/services/pmjay.service'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck, Activity, CheckCircle2, Clock, AlertTriangle, FileText, DownloadCloud, Stethoscope } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export function PmjayDetailClient({ initialCase, packages }: { initialCase: any, packages: any[] }) {
  const router = useRouter()
  const [tab, setTab] = useState<'Clinical' | 'Timeline' | 'Documents' | 'Queries'>('Clinical')
  
  const patient = Array.isArray(initialCase.patients) ? initialCase.patients[0] : initialCase.patients
  const admission = Array.isArray(initialCase.admissions) ? initialCase.admissions[0] : initialCase.admissions
  const invoice = Array.isArray(initialCase.invoices) ? initialCase.invoices[0] : initialCase.invoices
  const selectedPackage = Array.isArray(initialCase.pmjay_package_master) ? initialCase.pmjay_package_master[0] : initialCase.pmjay_package_master

  const isVerified = initialCase.bis_verification_status === 'Verified'
  const isPreauthSubmitted = ['Submitted', 'Approved', 'Query'].includes(initialCase.preauth_status)

  const handleBisVerify = async () => {
    try {
      await simulateBisVerification(initialCase.id)
      toast.success('Beneficiary Verified via MOCK BIS API')
      router.refresh()
    } catch(e:any) { toast.error(e.message) }
  }

  const handleTmsSubmit = async () => {
    if (!selectedPackage) return toast.error('Please select a package first')
    try {
      await simulateTmsPreauth(initialCase.id, selectedPackage.default_rate)
      toast.success('Pre-auth Submitted to MOCK TMS API')
      router.refresh()
    } catch(e:any) { toast.error(e.message) }
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4 pb-12">
      <div className="flex items-center space-x-4 bg-white p-4 rounded-lg shadow-sm border border-gray-200">
        <Link href="/schemes">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center text-gray-900 tracking-tight">
            <img src="https://upload.wikimedia.org/wikipedia/commons/e/e4/Ayushman_Bharat_logo.png" className="h-8 mr-3 opacity-80" alt="PMJAY" />
            PM-JAY Case Desk
          </h1>
          <p className="text-gray-500 font-medium">
            URN: <span className="text-gray-900 font-mono">{initialCase.urn}</span> | Patient: {patient?.first_name} {patient?.last_name}
          </p>
        </div>
        <div className="ml-auto flex space-x-4 items-center">
          <div className="text-right">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">BIS Status</div>
            <div className={`font-bold flex items-center justify-end ${isVerified ? 'text-green-600' : 'text-amber-600'}`}>
              {isVerified ? <CheckCircle2 className="w-4 h-4 mr-1"/> : <AlertTriangle className="w-4 h-4 mr-1"/>}
              {initialCase.bis_verification_status}
            </div>
          </div>
          <div className="text-right border-l pl-4">
            <div className="text-xs font-bold text-gray-500 uppercase tracking-wide">TMS Pre-Auth</div>
            <div className="font-bold text-blue-700">{initialCase.preauth_status}</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-4 gap-6">
        {/* Left Column: Actions */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-lg border shadow-sm space-y-4">
            <h3 className="font-bold text-gray-800 border-b pb-2">State Actions</h3>
            {!isVerified && (
              <Button className="w-full bg-amber-600 hover:bg-amber-700" onClick={handleBisVerify}>
                Verify Beneficiary (BIS)
              </Button>
            )}
            {isVerified && !isPreauthSubmitted && (
              <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleTmsSubmit}>
                <DownloadCloud className="w-4 h-4 mr-2" /> Sync to TMS (Pre-Auth)
              </Button>
            )}
            {initialCase.preauth_status === 'Submitted' && (
              <Button className="w-full bg-green-600 hover:bg-green-700" onClick={async () => {
                await simulateTmsApproval(initialCase.id, selectedPackage.default_rate)
                router.refresh()
              }}>Simulate SNA Approval</Button>
            )}
            {initialCase.preauth_status === 'Submitted' && (
              <Button className="w-full bg-red-600 hover:bg-red-700" onClick={async () => {
                await raiseSnaQuery(initialCase.id, "Please upload clear clinical photos.")
                router.refresh()
              }}>Simulate SNA Query</Button>
            )}
          </div>
          
          <div className="bg-gray-50 p-5 rounded-lg border">
            <h3 className="font-bold text-gray-800 mb-2">Claim Overview</h3>
            <div className="space-y-2 text-sm">
              <div className="flex justify-between"><span className="text-gray-500">Requested:</span><span className="font-bold">₹{initialCase.claim_amount || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Approved:</span><span className="font-bold text-green-700">₹{initialCase.approved_amount || 0}</span></div>
              <div className="flex justify-between"><span className="text-gray-500">Status:</span><span className="font-bold">{initialCase.claim_status}</span></div>
            </div>
          </div>
        </div>

        {/* Right Column: Workspaces */}
        <div className="col-span-3">
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
              {['Clinical', 'Documents', 'Queries', 'Timeline'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t as any)}
                  className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
                    tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 min-h-[500px]">
            {tab === 'Clinical' && <ClinicalTab pmjayCase={initialCase} packages={packages} router={router} disabled={isPreauthSubmitted} />}
            {tab === 'Documents' && <DocumentsTab pmjayCase={initialCase} router={router} />}
            {tab === 'Queries' && <QueriesTab pmjayCase={initialCase} router={router} />}
            {tab === 'Timeline' && <TimelineTab pmjayCase={initialCase} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function ClinicalTab({ pmjayCase, packages, router, disabled }: any) {
  const [isPending, startTransition] = useTransition()
  const [pkgId, setPkgId] = useState(pmjayCase.package_id || '')
  const [justification, setJustification] = useState(pmjayCase.clinical_justification || '')
  
  const admission = Array.isArray(pmjayCase.admissions) ? pmjayCase.admissions[0] : pmjayCase.admissions

  const handleSave = () => {
    startTransition(async () => {
      try {
        await updatePmjayCaseClinical(pmjayCase.id, { package_id: pkgId, clinical_justification: justification })
        toast.success('Clinical details saved')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center text-gray-800 font-semibold mb-4">
        <Stethoscope className="w-5 h-5 mr-2 text-blue-600"/> Clinical Mapping
      </div>
      
      {admission ? (
        <div className="bg-blue-50 p-4 rounded-md border border-blue-100 flex justify-between items-center">
          <div>
            <div className="text-xs font-bold text-blue-800 uppercase">Linked IPD Admission</div>
            <div className="font-medium text-gray-900 mt-1">{admission.admission_reason}</div>
            <div className="text-sm text-gray-500">Admitted: {format(new Date(admission.admission_date), 'dd MMM yyyy')}</div>
          </div>
          <Link href={`/ipd/${admission.id}`}><Button variant="outline" size="sm">View Admission</Button></Link>
        </div>
      ) : (
        <div className="bg-amber-50 p-4 rounded-md border border-amber-200 text-amber-800 text-sm font-medium flex items-center">
          <AlertTriangle className="w-5 h-5 mr-2" /> This case is not linked to an active IPD Admission yet.
        </div>
      )}

      <div className="space-y-4 mt-6">
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Select HBP Package</label>
          <select className="w-full p-2 border rounded-md" value={pkgId} onChange={e=>setPkgId(e.target.value)} disabled={disabled}>
            <option value="">-- Select Package --</option>
            {packages.map((p:any) => (
              <option key={p.id} value={p.id}>{p.hbp_code} - {p.procedure_name} (₹{p.default_rate})</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-semibold text-gray-700 mb-1">Clinical Justification (For SNA)</label>
          <textarea 
            className="w-full p-3 border rounded-md h-32 text-sm" 
            placeholder="Provide mandatory clinical reasoning for this package selection..."
            value={justification}
            onChange={e=>setJustification(e.target.value)}
            disabled={disabled}
          />
        </div>
        {!disabled && <Button onClick={handleSave} disabled={isPending} className="bg-blue-600">Save Clinical Details</Button>}
      </div>
    </div>
  )
}

function DocumentsTab({ pmjayCase, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [docName, setDocName] = useState('Clinical Photo (Pre-op)')
  
  const handleUpload = () => {
    startTransition(async () => {
      try {
        await submitPmjayDocument(pmjayCase.id, docName, 'https://mock.url')
        toast.success('Document uploaded')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div>
      <div className="flex gap-2 mb-6">
        <select className="p-2 border rounded text-sm w-64" value={docName} onChange={e=>setDocName(e.target.value)}>
          <option>Clinical Photo (Pre-op)</option><option>Clinical Photo (Post-op)</option><option>Discharge Summary</option><option>Diagnostic Reports</option>
        </select>
        <Button onClick={handleUpload} disabled={isPending}>Upload Document</Button>
      </div>

      <ul className="space-y-2">
        {pmjayCase.pmjay_case_documents?.map((doc: any) => (
          <li key={doc.id} className="flex justify-between p-3 bg-gray-50 rounded border text-sm">
            <span className="font-medium">{doc.document_name}</span>
            <span className="text-gray-500 text-xs">{format(new Date(doc.created_at), 'dd MMM HH:mm')}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}

function QueriesTab({ pmjayCase, router }: any) {
  // Same structure as Insurance queries but reading from pmjay_case_queries
  return (
    <div className="space-y-4">
      {pmjayCase.pmjay_case_queries?.map((q: any) => (
        <div key={q.id} className={`p-4 rounded-lg border ${q.status === 'Pending' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
           <div className="font-semibold text-gray-900 mb-2 flex justify-between">
              SNA Query <span className="text-xs text-gray-500 font-normal">{format(new Date(q.query_date), 'dd MMM HH:mm')}</span>
           </div>
           <p className="text-sm text-gray-700">{q.query_text}</p>
        </div>
      ))}
      {(!pmjayCase.pmjay_case_queries || pmjayCase.pmjay_case_queries.length === 0) && (
        <div className="text-gray-500 italic p-4 text-center">No SNA queries received.</div>
      )}
    </div>
  )
}

function TimelineTab({ pmjayCase }: any) {
  const timeline = pmjayCase.pmjay_case_timeline?.sort((a:any, b:any) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime()) || []
  
  return (
    <div className="relative pl-6 border-l-2 border-gray-200 space-y-8 py-4">
      {timeline.map((event: any) => (
        <div key={event.id} className="relative">
          <div className="absolute -left-[33px] bg-blue-600 h-4 w-4 rounded-full border-4 border-white"></div>
          <div>
            <div className="font-bold text-gray-900">{event.event_type}</div>
            <div className="text-xs text-gray-500 mb-1">{format(new Date(event.created_at), 'dd MMM yyyy, HH:mm')}</div>
            <p className="text-sm text-gray-700">{event.event_description}</p>
            {event.metadata && (
              <pre className="mt-2 bg-gray-50 p-2 rounded text-[10px] text-gray-500 font-mono border overflow-x-auto">
                {JSON.stringify(event.metadata, null, 2)}
              </pre>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
