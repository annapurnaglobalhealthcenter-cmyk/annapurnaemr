'use client'

import { useState } from 'react'
import { Shield, FileText, CalendarDays, History } from 'lucide-react'
import { format } from 'date-fns'

export function AuditClient({ 
  clinicalLogs, 
  appointmentLogs 
}: { 
  clinicalLogs: any[]
  appointmentLogs: any[]
}) {
  const [tab, setTab] = useState<'Clinical' | 'Appointments'>('Clinical')

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <Shield className="w-6 h-6 mr-2 text-indigo-700" /> Compliance & Audit Logs
          </h1>
          <p className="text-sm text-gray-500 mt-1">Immutable record of all sensitive changes and status transitions.</p>
        </div>
      </div>

      <div className="border-b border-gray-200">
        <nav className="-mb-px flex space-x-8">
          <button
            onClick={() => setTab('Clinical')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center ${
              tab === 'Clinical' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <FileText className="w-4 h-4 mr-2" /> Clinical Modifications
          </button>
          <button
            onClick={() => setTab('Appointments')}
            className={`py-3 px-1 border-b-2 text-sm font-medium transition-colors flex items-center ${
              tab === 'Appointments' ? 'border-indigo-600 text-indigo-600' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
            }`}
          >
            <CalendarDays className="w-4 h-4 mr-2" /> Appointment Workflow
          </button>
        </nav>
      </div>

      <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
        {tab === 'Clinical' && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Actor</th>
                <th className="px-6 py-3">Action</th>
                <th className="px-6 py-3">Record / Patient</th>
                <th className="px-6 py-3">Audit Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {clinicalLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No clinical audit events found.</td></tr>
              ) : (
                clinicalLogs.map(log => {
                  const patient = log.clinical_records?.patients
                  let patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'
                  if (Array.isArray(patient)) {
                    patientName = patient.length > 0 ? `${patient[0].first_name} ${patient[0].last_name}` : 'Unknown'
                  }

                  const actor = log.user_profiles || {}
                  const actorName = Array.isArray(actor) ? actor[0]?.full_name : actor.full_name

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {actorName || 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <span className={`px-2.5 py-0.5 rounded text-xs font-semibold uppercase tracking-wide ${
                          log.action === 'Amended' ? 'bg-amber-100 text-amber-800' :
                          log.action === 'Finalized' ? 'bg-green-100 text-green-800' :
                          'bg-blue-100 text-blue-800'
                        }`}>
                          {log.action}
                        </span>
                      </td>
                      <td className="px-6 py-4">
                        <div className="text-gray-900 font-medium">{log.clinical_records?.record_type}</div>
                        <div className="text-gray-500 text-xs">Patient: {patientName}</div>
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}

        {tab === 'Appointments' && (
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-gray-500 uppercase bg-gray-50">
              <tr>
                <th className="px-6 py-3">Timestamp</th>
                <th className="px-6 py-3">Actor</th>
                <th className="px-6 py-3">Transition</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Notes</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointmentLogs.length === 0 ? (
                <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No appointment audit events found.</td></tr>
              ) : (
                appointmentLogs.map(log => {
                  const patient = log.appointments?.patients
                  let patientName = patient ? `${patient.first_name} ${patient.last_name}` : 'Unknown'
                  if (Array.isArray(patient)) {
                    patientName = patient.length > 0 ? `${patient[0].first_name} ${patient[0].last_name}` : 'Unknown'
                  }

                  const actor = log.user_profiles || {}
                  const actorName = Array.isArray(actor) ? actor[0]?.full_name : actor.full_name

                  return (
                    <tr key={log.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 whitespace-nowrap text-gray-500">
                        {format(new Date(log.created_at), 'dd MMM yyyy, HH:mm:ss')}
                      </td>
                      <td className="px-6 py-4 font-medium text-gray-900">
                        {actorName || 'System'}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex items-center space-x-2">
                          {log.old_status && (
                            <>
                              <span className="text-gray-500">{log.old_status}</span>
                              <History className="w-3 h-3 text-gray-400" />
                            </>
                          )}
                          <span className="font-semibold text-gray-900">{log.new_status}</span>
                        </div>
                      </td>
                      <td className="px-6 py-4 text-gray-900 font-medium">
                        {patientName}
                      </td>
                      <td className="px-6 py-4 text-gray-600">
                        {log.notes || '-'}
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
