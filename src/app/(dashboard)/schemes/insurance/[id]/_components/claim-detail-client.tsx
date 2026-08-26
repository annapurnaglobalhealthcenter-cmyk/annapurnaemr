'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { submitClaimDocument, respondToQuery, raiseMockQuery, updateClaimStatusDetail } from '@/lib/services/schemes.service'
import { toast } from 'sonner'
import { ArrowLeft, ShieldCheck, FileText, MessageSquare, IndianRupee, Clock, CheckCircle2 } from 'lucide-react'
import { format } from 'date-fns'
import Link from 'next/link'

export function ClaimDetailClient({ initialClaim }: { initialClaim: any }) {
  const router = useRouter()
  const [tab, setTab] = useState<'Documents' | 'Queries' | 'Settlement'>('Documents')

  const patient = Array.isArray(initialClaim.patients) ? initialClaim.patients[0] : initialClaim.patients
  const provider = Array.isArray(initialClaim.insurance_providers) ? initialClaim.insurance_providers[0] : initialClaim.insurance_providers
  const invoice = Array.isArray(initialClaim.invoices) ? initialClaim.invoices[0] : initialClaim.invoices

  return (
    <div className="space-y-6 max-w-6xl mx-auto p-4">
      <div className="flex items-center space-x-4">
        <Link href="/schemes">
          <Button variant="ghost" size="icon"><ArrowLeft className="w-5 h-5" /></Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold flex items-center tracking-tight">
            <ShieldCheck className="w-6 h-6 mr-2 text-blue-600" /> 
            Insurance Desk: {provider?.name}
          </h1>
          <p className="text-gray-500">
            {patient?.first_name} {patient?.last_name} | Policy: {initialClaim.policy_number}
          </p>
        </div>
        <div className="ml-auto flex space-x-2">
          <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border">
            Pre-Auth: {initialClaim.preauth_status}
          </span>
          <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider border border-blue-200">
            Claim: {initialClaim.claim_status}
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Left Side: Context */}
        <div className="col-span-1 space-y-4">
          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Claim Context</h3>
            <div className="space-y-3 text-sm">
              <div><span className="text-gray-500">Member ID:</span> <span className="font-mono ml-1 text-gray-900">{initialClaim.member_id || 'N/A'}</span></div>
              {invoice && (
                <div><span className="text-gray-500">Linked Invoice:</span> <span className="font-mono ml-1 text-blue-600">{invoice.invoice_number}</span></div>
              )}
              {invoice && (
                <div><span className="text-gray-500">Invoice Net:</span> <span className="font-mono ml-1 font-bold text-gray-900">₹{invoice.net_amount}</span></div>
              )}
              <div><span className="text-gray-500">Claim Amount:</span> <span className="font-mono ml-1 font-bold text-blue-700">₹{initialClaim.claim_amount || 0}</span></div>
              <div><span className="text-gray-500">Approved:</span> <span className="font-mono ml-1 font-bold text-green-700">₹{initialClaim.approved_amount || 0}</span></div>
            </div>
          </div>
          
          <div className="bg-white p-5 rounded-lg border shadow-sm">
            <h3 className="font-semibold text-gray-800 mb-3 border-b pb-2">Status Control</h3>
            <StatusForm claim={initialClaim} router={router} />
          </div>
        </div>

        {/* Right Side: Workspaces */}
        <div className="col-span-2">
          <div className="border-b border-gray-200 mb-4">
            <nav className="-mb-px flex space-x-6">
              {['Documents', 'Queries', 'Settlement'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t as any)}
                  className={`py-2 px-1 border-b-2 text-sm font-medium ${
                    tab === t ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
                  }`}
                >
                  {t}
                  {t === 'Queries' && initialClaim.insurance_claim_queries?.filter((q:any)=>q.status==='Pending').length > 0 && (
                    <span className="ml-2 bg-red-100 text-red-600 px-2 py-0.5 rounded-full text-xs font-bold">
                      {initialClaim.insurance_claim_queries.filter((q:any)=>q.status==='Pending').length}
                    </span>
                  )}
                </button>
              ))}
            </nav>
          </div>

          <div className="bg-white rounded-lg border shadow-sm p-6 min-h-[400px]">
            {tab === 'Documents' && <DocumentsTab claim={initialClaim} router={router} />}
            {tab === 'Queries' && <QueriesTab claim={initialClaim} router={router} />}
            {tab === 'Settlement' && <SettlementTab claim={initialClaim} />}
          </div>
        </div>
      </div>
    </div>
  )
}

function StatusForm({ claim, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [preauth, setPreauth] = useState(claim.preauth_status)
  const [status, setStatus] = useState(claim.claim_status)
  const [approved, setApproved] = useState(claim.approved_amount || 0)

  const handleUpdate = () => {
    startTransition(async () => {
      try {
        await updateClaimStatusDetail(claim.id, preauth, status, parseFloat(approved))
        toast.success('Status updated')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-3">
      <div>
        <label className="text-xs text-gray-500">Pre-Auth Status</label>
        <select className="w-full text-sm p-2 border rounded mt-1" value={preauth} onChange={e=>setPreauth(e.target.value)}>
          <option>Pending</option><option>Query</option><option>Approved</option><option>Rejected</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Claim Status</label>
        <select className="w-full text-sm p-2 border rounded mt-1" value={status} onChange={e=>setStatus(e.target.value)}>
          <option>Draft</option><option>Submitted</option><option>Query</option><option>Approved</option><option>Settled</option><option>Rejected</option>
        </select>
      </div>
      <div>
        <label className="text-xs text-gray-500">Approved Amount (₹)</label>
        <Input type="number" value={approved} onChange={e=>setApproved(e.target.value)} className="mt-1" />
      </div>
      <Button className="w-full mt-2" onClick={handleUpdate} disabled={isPending}>Save Status</Button>
    </div>
  )
}

function DocumentsTab({ claim, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [docType, setDocType] = useState('Discharge Summary')
  
  const handleUpload = () => {
    startTransition(async () => {
      try {
        await submitClaimDocument(claim.id, docType, 'https://mock-storage.url/file.pdf')
        toast.success('Document uploaded to TPA')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div>
      <h3 className="font-semibold text-gray-800 mb-4 flex items-center"><FileText className="w-4 h-4 mr-2"/> Required Documents</h3>
      
      <div className="flex gap-2 mb-6">
        <select className="p-2 border rounded text-sm w-48" value={docType} onChange={e=>setDocType(e.target.value)}>
          <option>ID Proof</option><option>Discharge Summary</option><option>Final Bill</option><option>Investigation Reports</option>
        </select>
        <Button onClick={handleUpload} disabled={isPending} className="bg-blue-600 hover:bg-blue-700">Upload Mock File</Button>
      </div>

      <ul className="space-y-2">
        {claim.insurance_claim_documents?.map((doc: any) => (
          <li key={doc.id} className="flex justify-between items-center p-3 bg-gray-50 rounded border text-sm">
            <span className="font-medium text-gray-700">{doc.document_type}</span>
            <div className="flex items-center text-xs text-gray-500">
              <CheckCircle2 className="w-4 h-4 mr-1 text-green-500" /> Uploaded {format(new Date(doc.created_at), 'dd MMM HH:mm')}
            </div>
          </li>
        ))}
        {(!claim.insurance_claim_documents || claim.insurance_claim_documents.length === 0) && (
          <div className="text-gray-500 italic p-4 text-center">No documents uploaded yet.</div>
        )}
      </ul>
    </div>
  )
}

function QueriesTab({ claim, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [response, setResponse] = useState('')
  const [selectedQuery, setSelectedQuery] = useState<string | null>(null)

  const handleReply = () => {
    if (!selectedQuery || !response) return
    startTransition(async () => {
      try {
        await respondToQuery(selectedQuery, response)
        toast.success('Reply sent to TPA')
        setSelectedQuery(null)
        setResponse('')
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  const simulateTpaQuery = () => {
    startTransition(async () => {
      await raiseMockQuery(claim.id, "Please provide the detailed line-by-line hospital bill.")
      toast.success("Simulated incoming TPA query")
      router.refresh()
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h3 className="font-semibold text-gray-800 flex items-center"><MessageSquare className="w-4 h-4 mr-2"/> TPA Queries</h3>
        <Button variant="outline" size="sm" onClick={simulateTpaQuery} disabled={isPending}>Simulate Incoming Query</Button>
      </div>

      <div className="space-y-4">
        {claim.insurance_claim_queries?.map((q: any) => (
          <div key={q.id} className={`p-4 rounded-lg border ${q.status === 'Pending' ? 'bg-amber-50 border-amber-200' : 'bg-gray-50'}`}>
            <div className="flex justify-between items-start mb-2">
              <div className="font-semibold text-gray-900">Query from TPA</div>
              <div className="text-xs text-gray-500">{format(new Date(q.raised_at), 'dd MMM HH:mm')}</div>
            </div>
            <p className="text-sm text-gray-700 mb-4">{q.query_text}</p>

            {q.status === 'Pending' ? (
              <div className="space-y-2">
                <textarea 
                  className="w-full p-2 border rounded text-sm" 
                  placeholder="Type your reply to the TPA..."
                  rows={2}
                  value={selectedQuery === q.id ? response : ''}
                  onChange={e => { setSelectedQuery(q.id); setResponse(e.target.value); }}
                />
                <Button size="sm" onClick={handleReply} disabled={isPending || selectedQuery !== q.id || !response} className="bg-amber-600 hover:bg-amber-700">Submit Reply</Button>
              </div>
            ) : (
              <div className="pl-4 border-l-2 border-green-500 pt-2 mt-4 text-sm">
                <div className="text-xs text-gray-500 mb-1 flex items-center"><CheckCircle2 className="w-3 h-3 mr-1 text-green-500"/> Replied {q.responded_at ? format(new Date(q.responded_at), 'dd MMM HH:mm') : ''}</div>
                <p className="text-gray-800">{q.response_text}</p>
              </div>
            )}
          </div>
        ))}
        {(!claim.insurance_claim_queries || claim.insurance_claim_queries.length === 0) && (
          <div className="text-gray-500 italic p-4 text-center">No queries from TPA.</div>
        )}
      </div>
    </div>
  )
}

function SettlementTab({ claim }: any) {
  return (
    <div className="p-8 text-center border-2 border-dashed border-gray-200 rounded-lg">
      <IndianRupee className="w-12 h-12 mx-auto text-gray-300 mb-4" />
      <h3 className="text-lg font-bold text-gray-700">Bank Reconciliation</h3>
      <p className="text-gray-500 text-sm mt-2 max-w-md mx-auto">
        When the TPA deposits a bulk settlement to the hospital bank account, it will be uploaded via the Reconciliations module and automatically mapped to this claim based on the UTR reference.
      </p>
      <div className="mt-6 px-4 py-3 bg-gray-50 inline-block rounded border text-sm font-mono text-gray-600">
        Reconciliation ID: {claim.reconciliation_id || 'Pending Settlement'}
      </div>
    </div>
  )
}
