import { getDoctorDashboardStats } from '@/lib/services/doctor.service'
import { enforcePermission } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Users, Clock, CheckCircle, UserCheck } from 'lucide-react'

export default async function DoctorDashboardPage() {
  // Doctors need at least clinical view permissions
  await enforcePermission('opd.view')
  const { appointments, waiting, current, completed } = await getDoctorDashboardStats()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">My Workspace</h1>
          <p className="text-gray-500 text-sm mt-1">{format(new Date(), 'EEEE, dd MMM yyyy')}</p>
        </div>
      </div>

      {/* Top Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Total", value: appointments.length, icon: Users, color: 'text-blue-600' },
          { label: 'Waiting', value: waiting.length, icon: Clock, color: 'text-amber-600' },
          { label: 'In Consultation', value: current.length, icon: UserCheck, color: 'text-green-600' },
          { label: 'Completed', value: completed.length, icon: CheckCircle, color: 'text-gray-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-lg shadow-sm p-5 flex items-center space-x-4">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        
        {/* Left Column: Current & Waiting */}
        <div className="lg:col-span-2 space-y-6">
          
          {/* Currently In Consultation */}
          <div className="bg-white border-2 border-green-200 rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 bg-green-50 border-b border-green-200 flex justify-between items-center">
              <h2 className="font-semibold text-green-800 flex items-center">
                <span className="relative flex h-3 w-3 mr-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-green-500"></span>
                </span>
                Currently In Consultation
              </h2>
            </div>
            <div className="p-6">
              {current.length > 0 ? (
                <div className="space-y-4">
                  {current.map(appt => {
                    const patient: any = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
                    const uhid = patient?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                    return (
                      <div key={appt.id} className="flex justify-between items-center bg-gray-50 p-4 rounded-md border">
                        <div>
                          <div className="text-sm font-mono text-blue-600 font-bold mb-1">{appt.token_number}</div>
                          <div className="text-lg font-bold text-gray-900">{patient?.first_name} {patient?.last_name}</div>
                          <div className="text-sm text-gray-500">{uhid}</div>
                        </div>
                        <Link href={`/encounters/${appt.id}`}>
                          <Button className="bg-green-600 hover:bg-green-700">Open Clinical Workspace →</Button>
                        </Link>
                      </div>
                    )
                  })}
                </div>
              ) : (
                <p className="text-gray-500 text-sm text-center italic py-4">No active consultation.</p>
              )}
            </div>
          </div>

          {/* Up Next (Waiting) */}
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Up Next (Waiting)</h2>
            </div>
            <div className="divide-y divide-gray-100">
              {waiting.map(appt => {
                const patient: any = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
                const uhid = patient?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                return (
                  <div key={appt.id} className="p-4 hover:bg-gray-50 flex justify-between items-center">
                    <div className="flex items-center space-x-4">
                      <div className="w-16 h-16 bg-amber-50 text-amber-700 rounded-md border border-amber-200 flex flex-col items-center justify-center shrink-0">
                        <span className="text-xs font-semibold">TOKEN</span>
                        <span className="font-mono font-bold text-lg leading-none">{appt.token_number?.replace('T-','') || '--'}</span>
                      </div>
                      <div>
                        <div className="font-bold text-gray-900">{patient?.first_name} {patient?.last_name}</div>
                        <div className="text-xs text-gray-500 space-x-2">
                          <span>{uhid}</span>
                          <span>·</span>
                          <span>{format(parseISO(appt.appointment_time), 'HH:mm')}</span>
                        </div>
                      </div>
                    </div>
                    <Link href={`/encounters/${appt.id}`}>
                      <Button variant="outline" size="sm">Review Chart</Button>
                    </Link>
                  </div>
                )
              })}
              {waiting.length === 0 && (
                <p className="text-gray-500 text-sm text-center italic py-8">No patients waiting.</p>
              )}
            </div>
          </div>

        </div>

        {/* Right Column: Completed */}
        <div className="lg:col-span-1 space-y-6">
          <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
            <div className="px-6 py-4 border-b bg-gray-50">
              <h2 className="font-semibold text-gray-800">Completed Today</h2>
            </div>
            <div className="divide-y divide-gray-100 max-h-[600px] overflow-y-auto">
              {completed.map(appt => {
                const patient: any = Array.isArray(appt.patients) ? appt.patients[0] : appt.patients
                const uhid = patient?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                return (
                  <div key={appt.id} className="p-4 hover:bg-gray-50">
                    <div className="flex justify-between items-start mb-1">
                      <div className="font-semibold text-gray-800">{patient?.first_name} {patient?.last_name}</div>
                      <div className="text-xs text-gray-400 font-mono">{appt.token_number}</div>
                    </div>
                    <div className="text-xs text-gray-500 flex justify-between items-center mt-2">
                      <span>{uhid}</span>
                      <Link href={`/encounters/${appt.id}`} className="text-blue-600 hover:underline">View Notes</Link>
                    </div>
                  </div>
                )
              })}
              {completed.length === 0 && (
                <p className="text-gray-500 text-sm text-center italic py-8">No completed consultations yet.</p>
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  )
}
