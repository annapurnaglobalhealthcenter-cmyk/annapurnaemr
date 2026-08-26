import { getTodayAppointments, getDepartments } from '@/lib/services/appointment.service'
import { enforcePermission } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'
import { Calendar, Users, Clock, CheckCircle } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  'Scheduled':      'bg-blue-100 text-blue-700',
  'Checked-in':     'bg-purple-100 text-purple-700',
  'Waiting':        'bg-amber-100 text-amber-700',
  'In Consultation':'bg-green-100 text-green-700',
  'Completed':      'bg-gray-100 text-gray-600',
  'Cancelled':      'bg-red-100 text-red-500 line-through',
  'No-show':        'bg-red-50 text-red-400 italic',
}

export default async function AppointmentsPage({
  searchParams
}: {
  searchParams: Promise<{ date?: string }>
}) {
  await enforcePermission('appointment.view')
  const { date } = await searchParams
  const appointments = await getTodayAppointments(date)
  const departments = await getDepartments()

  const stats = {
    total: appointments.length,
    checkedIn: appointments.filter(a => ['Checked-in','Waiting','In Consultation'].includes(a.status)).length,
    completed: appointments.filter(a => a.status === 'Completed').length,
    waiting: appointments.filter(a => a.status === 'Waiting').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Appointments</h1>
          <p className="text-gray-500 text-sm mt-1">
            {date ? format(parseISO(date), 'EEEE, dd MMM yyyy') : format(new Date(), 'EEEE, dd MMM yyyy')}
          </p>
        </div>
        <div className="flex space-x-2">
          <Link href="/appointments/queue">
            <Button variant="outline">Live Queue</Button>
          </Link>
          <Link href="/appointments/new">
            <Button className="bg-blue-600 hover:bg-blue-700">+ New Appointment</Button>
          </Link>
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: "Today's Total", value: stats.total, icon: Calendar, color: 'text-blue-600' },
          { label: 'Checked In',    value: stats.checkedIn, icon: Users, color: 'text-purple-600' },
          { label: 'Waiting',       value: stats.waiting, icon: Clock, color: 'text-amber-600' },
          { label: 'Completed',     value: stats.completed, icon: CheckCircle, color: 'text-green-600' },
        ].map(stat => (
          <div key={stat.label} className="bg-white border rounded-lg shadow-sm p-5 flex items-center space-x-4">
            <stat.icon className={`w-8 h-8 ${stat.color}`} />
            <div>
              <div className="text-2xl font-bold text-gray-900">{stat.value}</div>
              <div className="text-xs text-gray-500">{stat.label}</div>
            </div>
          </div>
        ))}
      </div>

      {/* Department Quick Links */}
      <div className="flex flex-wrap gap-2">
        <Link href="/appointments/queue">
          <Button variant="outline" size="sm">All Departments</Button>
        </Link>
        {departments.slice(0, 6).map((dept: any) => (
          <Link key={dept.id} href={`/appointments/queue?departmentId=${dept.id}`}>
            <Button variant="ghost" size="sm">{dept.code} Queue</Button>
          </Link>
        ))}
      </div>

      {/* Appointment Table */}
      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b bg-gray-50 flex justify-between">
          <h2 className="font-semibold text-gray-800">Today&apos;s Schedule</h2>
          <form className="flex space-x-2">
            <input type="date" name="date" defaultValue={date} className="text-sm border rounded px-2 py-1" />
            <Button type="submit" variant="outline" size="sm">Go</Button>
          </form>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Token</th>
                <th className="px-6 py-3">Time</th>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">Doctor</th>
                <th className="px-6 py-3">Department</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Status</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {appointments.map((appt: any) => (
                <tr key={appt.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 font-mono font-bold text-blue-700">
                    {appt.token_number ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {format(parseISO(appt.appointment_time), 'HH:mm')}
                  </td>
                  <td className="px-6 py-4">
                    <div className="font-medium text-gray-800">
                      {appt.patients?.first_name} {appt.patients?.last_name}
                    </div>
                    <div className="text-xs text-gray-500">
                      {appt.patients?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                    {appt.user_profiles?.full_name ?? '—'}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                    {appt.departments?.name ?? '—'}
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs px-2 py-0.5 rounded ${appt.appointment_type === 'Walk-in' ? 'bg-orange-100 text-orange-700' : 'bg-blue-50 text-blue-600'}`}>
                      {appt.appointment_type}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[appt.status] ?? 'bg-gray-100 text-gray-600'}`}>
                      {appt.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link href={`/appointments/${appt.id}`}>
                      <Button variant="ghost" size="sm">Manage</Button>
                    </Link>
                  </td>
                </tr>
              ))}
              {appointments.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-6 py-10 text-center text-gray-500 italic">
                    No appointments for this date.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
