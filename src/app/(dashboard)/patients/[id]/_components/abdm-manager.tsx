'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { requestConsent, revokeConsent } from '@/lib/services/abdm.service'
import { verifyAbhaNumberAndLink, linkCareContext, simulateDataTransferToAbdm } from '@/lib/services/abdm-gateway.service'
import { toast } from 'sonner'
import { Shield, ShieldCheck, Activity, Key, Link2, Network, Lock, FileJson } from 'lucide-react'
import { format } from 'date-fns'

export function AbdmManager({ patientId, consents, encounters, auditLogs, abhaNumber }: any) {
  const router = useRouter()
  const [tab, setTab] = useState<'Identity' | 'Consent' | 'CareContexts' | 'Audit'>('Identity')

  return (
    <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
      <div className="px-6 py-4 border-b bg-gray-50 flex justify-between items-center">
        <div>
          <h2 className="font-semibold text-gray-800 flex items-center">
            <Shield className="w-5 h-5 mr-2 text-indigo-600" /> ABDM / ABHA Interoperability Gateway
          </h2>
          <p className="text-xs text-gray-500 mt-1">Official NHA FHIR integration layer. Mocks API interactions for dev.</p>
        </div>
      </div>
      
      <div className="border-b border-gray-200">
        <nav className="flex space-x-8 px-6">
          {['Identity', 'Consent', 'CareContexts', 'Audit'].map(t => (
            <button
              key={t}
              onClick={() => setTab(t as any)}
              className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors ${
                tab === t ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {t === 'CareContexts' ? 'Care Contexts' : t}
            </button>
          ))}
        </nav>
      </div>

      <div className="p-6">
        {tab === 'Identity' && <IdentityTab patientId={patientId} abhaNumber={abhaNumber} router={router} />}
        {tab === 'Consent' && <ConsentTab patientId={patientId} consents={consents} router={router} />}
        {tab === 'CareContexts' && <CareContextTab patientId={patientId} encounters={encounters} consents={consents} router={router} />}
        {tab === 'Audit' && <AuditTab auditLogs={auditLogs} />}
      </div>
    </div>
  )
}

function IdentityTab({ patientId, abhaNumber, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [abha, setAbha] = useState('')
  const [otp, setOtp] = useState('123456') // Mock OTP

  const handleVerify = () => {
    startTransition(async () => {
      try {
        await verifyAbhaNumberAndLink(patientId, abha, otp)
        toast.success("ABHA verified and securely linked via identity_records.")
        router.refresh()
      } catch (e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-6">
      {abhaNumber !== 'N/A' ? (
        <div className="bg-green-50 p-6 rounded border border-green-200 text-center">
          <ShieldCheck className="w-12 h-12 text-green-500 mx-auto mb-2" />
          <h3 className="font-bold text-green-900">ABHA Linked Successfully</h3>
          <p className="text-sm font-mono mt-2 text-green-700">{abhaNumber}</p>
        </div>
      ) : (
        <div className="max-w-md space-y-4">
          <p className="text-sm text-gray-600">This patient does not have an ABHA number linked. To link, verify their ABHA via Aadhaar OTP.</p>
          <div>
            <label className="text-xs font-semibold text-gray-700">ABHA Number</label>
            <Input placeholder="e.g. 12-3456-7890-1234" value={abha} onChange={e=>setAbha(e.target.value)} />
          </div>
          <div>
            <label className="text-xs font-semibold text-gray-700">Aadhaar OTP (Mock: 123456)</label>
            <Input value={otp} onChange={e=>setOtp(e.target.value)} />
          </div>
          <Button onClick={handleVerify} disabled={isPending || !abha} className="bg-indigo-600 hover:bg-indigo-700">
            <Key className="w-4 h-4 mr-2" /> Verify & Link ABHA
          </Button>
        </div>
      )}
    </div>
  )
}

function ConsentTab({ patientId, consents, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [purpose, setPurpose] = useState('Care Management')
  const [hiTypes, setHiTypes] = useState<string[]>(['Prescription', 'Diagnostic Report', 'Discharge Summary'])

  const handleRequest = () => {
    startTransition(async () => {
      try {
        await requestConsent(patientId, purpose, hiTypes)
        toast.success('ABDM Consent request simulated and granted successfully')
        router.refresh()
      } catch (e:any) { toast.error(e.message) }
    })
  }

  const handleRevoke = (id: string) => {
    startTransition(async () => {
      try {
        await revokeConsent(id)
        toast.success('Consent revoked')
        router.refresh()
      } catch (e:any) { toast.error(e.message) }
    })
  }

  const toggleHiType = (type: string) => setHiTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type])

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-2 gap-4 max-w-2xl">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Purpose of Request</label>
          <select className="w-full border-gray-300 rounded-md shadow-sm text-sm p-2 border" value={purpose} onChange={(e) => setPurpose(e.target.value)}>
            <option>Care Management</option>
            <option>Self Requested</option>
            <option>Research</option>
            <option>Public Health</option>
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">Health Info Types (HI Types)</label>
          <div className="space-y-2 mt-2">
            {['Prescription', 'Diagnostic Report', 'Discharge Summary'].map(type => (
              <label key={type} className="flex items-center text-sm">
                <input type="checkbox" className="mr-2 rounded text-indigo-600 focus:ring-indigo-500" checked={hiTypes.includes(type)} onChange={() => toggleHiType(type)} />
                {type}
              </label>
            ))}
          </div>
        </div>
      </div>
      <Button onClick={handleRequest} disabled={isPending || hiTypes.length === 0} className="bg-indigo-600 hover:bg-indigo-700">Request New Consent</Button>

      <div className="mt-8">
        <h3 className="font-semibold text-gray-800 mb-4">Active Consents</h3>
        <ul className="space-y-3">
          {consents.map((c: any) => (
            <li key={c.id} className="p-4 border rounded-lg bg-gray-50 flex justify-between items-start">
              <div>
                <div className="font-mono text-sm font-bold text-gray-900">{c.consent_id}</div>
                <div className="text-sm text-gray-600 mt-1">Purpose: {c.purpose_of_request}</div>
                <div className="text-xs text-gray-500 mt-1">Types: {c.hi_types.join(', ')}</div>
                <div className="text-xs text-gray-500 mt-1">Status: <span className={c.status === 'Granted' ? 'text-green-600 font-bold' : 'text-red-600 font-bold'}>{c.status}</span></div>
              </div>
              {c.status === 'Granted' && <Button variant="ghost" size="sm" className="text-red-600" onClick={() => handleRevoke(c.id)}>Revoke</Button>}
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function CareContextTab({ patientId, encounters, consents, router }: any) {
  const [isPending, startTransition] = useTransition()
  
  const handleLink = (encounterId: string) => {
    startTransition(async () => {
      try {
        await linkCareContext(patientId, encounterId)
        toast.success("Care Context Linked to ABDM")
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  const handleSimulateTransfer = (encounterId: string) => {
    const activeConsent = consents.find((c:any) => c.status === 'Granted')
    if (!activeConsent) return toast.error("No active consent available for data transfer.")

    startTransition(async () => {
      try {
        await simulateDataTransferToAbdm(patientId, activeConsent.id, encounterId)
        toast.success("Data pushed to ABDM via FHIR Bundle.")
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div>
      <p className="text-sm text-gray-600 mb-4">Care Contexts map hospital encounters to the patient's ABHA account. Once linked, other hospitals can request this data via ABDM.</p>
      <table className="min-w-full divide-y divide-gray-200 border rounded">
        <thead className="bg-gray-50">
          <tr><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Date</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Type</th><th className="px-4 py-2 text-left text-xs font-medium text-gray-500">Doctor</th><th className="px-4 py-2 text-right text-xs font-medium text-gray-500">ABDM Actions</th></tr>
        </thead>
        <tbody className="divide-y divide-gray-100 bg-white">
          {encounters.map((e:any) => (
            <tr key={e.id}>
              <td className="px-4 py-2 text-sm">{format(new Date(e.created_at), 'dd MMM yyyy')}</td>
              <td className="px-4 py-2 text-sm">{e.encounter_type}</td>
              <td className="px-4 py-2 text-sm">{e.user_profiles?.full_name}</td>
              <td className="px-4 py-2 text-right space-x-2">
                <Button size="sm" variant="outline" className="text-xs h-7 border-indigo-200 text-indigo-700" onClick={() => handleLink(e.id)} disabled={isPending}>
                  <Link2 className="w-3 h-3 mr-1" /> Link Context
                </Button>
                <Button size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-xs h-7" onClick={() => handleSimulateTransfer(e.id)} disabled={isPending}>
                  <Network className="w-3 h-3 mr-1" /> Push FHIR Data
                </Button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AuditTab({ auditLogs }: any) {
  if (!auditLogs || auditLogs.length === 0) return <div className="text-gray-500 p-4 text-center">No ABDM exchange events recorded.</div>

  return (
    <div className="space-y-4">
      {auditLogs.map((log:any) => (
        <div key={log.id} className="p-4 border rounded bg-gray-50 flex items-start">
          <div className="mr-4 mt-1">
            {log.interaction_type === 'Data Push' ? <FileJson className="w-5 h-5 text-indigo-600" /> : <Lock className="w-5 h-5 text-gray-500" />}
          </div>
          <div className="flex-1">
            <div className="flex justify-between">
              <span className="font-bold text-gray-900">{log.interaction_type} ({log.direction})</span>
              <span className="text-xs text-gray-500">{format(new Date(log.created_at), 'dd MMM HH:mm:ss')}</span>
            </div>
            <div className="text-xs text-gray-600 mt-1">
              Transaction ID: <span className="font-mono">{log.transaction_id}</span>
            </div>
            {log.resource_type && (
              <div className="text-xs font-mono bg-gray-200 px-2 py-1 rounded inline-block mt-2 text-gray-700">
                Resource: {log.resource_type}
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  )
}
