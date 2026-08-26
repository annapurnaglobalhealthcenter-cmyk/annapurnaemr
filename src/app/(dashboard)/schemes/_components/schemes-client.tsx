'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

// --- Status badge -------------------------------------------------------------

function StatusBadge({ status }: { status: string | null }) {
  const s = status ?? 'Pending'
  const colours: Record<string, string> = {
    Pending: 'bg-amber-100 text-amber-800',
    Approved: 'bg-green-100 text-green-800',
    Rejected: 'bg-red-100 text-red-800',
    Query: 'bg-blue-100 text-blue-800',
    Settled: 'bg-teal-100 text-teal-800',
  }
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold ${colours[s] ?? colours.Pending}`}>
      {s}
    </span>
  )
}

// --- Types mirroring service return shapes ------------------------------------

type PatientRef = {
  id: string
  first_name: string
  last_name: string
  identity_records: { identity_type: string; identity_value: string }[]
}

export type PmjayRow = {
  id: string
  urn: string
  package_code: string | null
  preauth_status: string | null
  claim_status: string | null
  claim_amount: number | null
  approved_amount: number | null
  created_at: string
  patients: PatientRef | null
}

export type InsuranceRow = {
  id: string
  policy_number: string
  member_id: string | null
  preauth_status: string | null
  claim_status: string | null
  claim_amount: number | null
  approved_amount: number | null
  created_at: string
  patients: PatientRef | null
  insurance_providers: { id: string; name: string } | null
}

// --- Helpers ------------------------------------------------------------------

function uhidOf(p: PatientRef | null) {
  return p?.identity_records?.find((r) => r.identity_type === 'UHID')?.identity_value ?? '-'
}

function fmt(n: number | null) {
  if (n == null) return '-'
  return '₹' + n.toLocaleString('en-IN', { minimumFractionDigits: 2 })
}

// --- Component ----------------------------------------------------------------

interface Props {
  pmjayCases: PmjayRow[]
  insuranceClaims: InsuranceRow[]
}

export function SchemesClient({ pmjayCases, insuranceClaims }: Props) {
  const [tab, setTab] = useState<'pmjay' | 'insurance'>('pmjay')

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Schemes &amp; Insurance</h1>
          <p className="text-sm text-gray-500 mt-1">PM-JAY beneficiary cases and TPA insurance claims</p>
        </div>
        <div className="flex gap-2">
          {tab === 'pmjay' ? (
            <Link href="/schemes/pmjay/new">
              <Button className="bg-blue-600 hover:bg-blue-700">+ New PM-JAY Case</Button>
            </Link>
          ) : (
            <Link href="/schemes/insurance/new">
              <Button className="bg-green-600 hover:bg-green-700">+ New Insurance Claim</Button>
            </Link>
          )}
        </div>
      </div>

      {/* Tab bar */}
      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTab('pmjay')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'pmjay'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            PM-JAY Cases
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {pmjayCases.length}
            </span>
          </button>
          <button
            onClick={() => setTab('insurance')}
            className={`py-2 px-1 border-b-2 text-sm font-medium transition-colors ${
              tab === 'insurance'
                ? 'border-blue-600 text-blue-600'
                : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            Insurance / TPA
            <span className="ml-2 inline-flex items-center rounded-full bg-gray-100 px-2 py-0.5 text-xs text-gray-600">
              {insuranceClaims.length}
            </span>
          </button>
        </nav>
      </div>

      {/* PM-JAY Table */}
      {tab === 'pmjay' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {pmjayCases.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No PM-JAY cases found. Click &quot;+ New PM-JAY Case&quot; to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Patient', 'UHID', 'URN', 'Package', 'Pre-Auth', 'Claim', 'Claim Amount', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {pmjayCases.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm text-gray-500">{uhidOf(c.patients)}</td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{c.urn}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.package_code ?? '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.preauth_status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.claim_status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmt(c.claim_amount)}</td>
                      <td className="px-4 py-3 text-sm">
                        <Link href={`/schemes/pmjay/${c.id}`}>
                          <Button variant="outline" size="sm">Manage Case</Button>
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Insurance Table */}
      {tab === 'insurance' && (
        <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
          {insuranceClaims.length === 0 ? (
            <div className="p-10 text-center text-gray-500">No insurance claims found. Click &quot;+ New Insurance Claim&quot; to add one.</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    {['Patient', 'Policy Number', 'Provider', 'Pre-Auth', 'Claim', 'Amount', 'Actions'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-100">
                  {insuranceClaims.map((c) => (
                    <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 text-sm font-medium text-gray-900">
                        {c.patients ? `${c.patients.first_name} ${c.patients.last_name}` : '-'}
                      </td>
                      <td className="px-4 py-3 text-sm font-mono text-gray-700">{c.policy_number}</td>
                      <td className="px-4 py-3 text-sm text-gray-500">{c.insurance_providers?.name ?? '-'}</td>
                      <td className="px-4 py-3"><StatusBadge status={c.preauth_status} /></td>
                      <td className="px-4 py-3"><StatusBadge status={c.claim_status} /></td>
                      <td className="px-4 py-3 text-sm text-gray-700">{fmt(c.claim_amount)}</td>
                      <td className="px-4 py-3 text-sm">
                        {c.patients && (
                          <Link href={`/patients/${c.patients.id}`}>
                            <Button variant="ghost" size="sm">View Patient</Button>
                          </Link>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
