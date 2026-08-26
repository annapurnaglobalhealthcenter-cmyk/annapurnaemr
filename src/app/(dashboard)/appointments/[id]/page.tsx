import { getAppointmentById, getAppointmentAuditLog, checkInAppointment, updateAppointmentStatus } from '@/lib/services/appointment.service'
import { enforcePermission } from '@/lib/auth/server'
import { notFound, redirect } from 'next/navigation'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { format, parseISO } from 'date-fns'

const STATUS_STYLES: Record<string, string> = {
  'Scheduled':       'bg-blue-100 text-blue-700',
  'Checked-in':      'bg-purple-100 text-purple-700',
  'Waiting':         'bg-amber-100 text-amber-700',
  'In Consultation': 'bg-green-100 text-green-700',
  'Completed':       'bg-gray-100 text-gray-500',
  'Cancelled':       'bg-red-100 text-red-500',
  'No-show':         'bg-red-50 text-red-400',
}

export default async function AppointmentDetailPage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await enforcePermission('appointment.view')
  const { id } = await params

  let appointment: any
  let auditLog: any[]
  try {
    [appointment, auditLog] = await Promise.all([
      getAppointmentById(id),
      getAppointmentAuditLog(id)
    ])
  } catch {
    notFound()
  }

  const uhid = appointment.patients?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value

  async function handleCheckIn() {
    'use server'
    await checkInAppointment(id)
    redirect(`/appointments/${id}`)
  }

  async function handleCancel() {
    'use server'
    await updateAppointmentStatus(id, 'Cancelled')
    redirect(`/appointments/${id}`)
  }

  async function handleNoShow() {
    'use server'
    await updateAppointmentStatus(id, 'No-show')
    redirect(`/appointments/${id}`)
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <div className="flex justify-between items-start flex-wrap gap-4">
          <div>
            <div className="flex items-center space-x-3 mb-2">
              <h1 className="text-xl font-bold text-gray-900">
                {appointment.patients?.first_name} {appointment.patients?.last_name}
              </h1>
              {uhid && <span className="text-sm font-medium bg-blue-50 text-blue-700 px-2 py-0.5 rounded">{uhid}</span>}
            </div>
            <div className="text-sm text-gray-600 space-y-1">
              <div><span className="text-gray-400">Date & Time: </span>
                <strong>{format(parseISO(appointment.appointment_time), 'EEEE, dd MMM yyyy — HH:mm')}</strong>
              </div>
              <div><span className="text-gray-400">Doctor: </span>Dr. {appointment.user_profiles?.full_name ?? '—'}</div>
              <div><span className="text-gray-400">Department: </span>{appointment.departments?.name ?? '—'}</div>
              <div><span className="text-gray-400">Type: </span>
                <span className={appointment.appointment_type === 'Walk-in' ? 'text-orange-600 font-medium' : 'text-blue-600 font-medium'}>
                  {appointment.appointment_type}
                </span>
              </div>
              {appointment.notes && <div><span className="text-gray-400">Notes: </span>{appointment.notes}</div>}
            </div>
          </div>

          <div className="flex flex-col items-end space-y-3">
            {appointment.token_number && (
              <div className="text-center bg-blue-50 border-2 border-blue-200 rounded-xl p-4">
                <div className="text-xs text-blue-500 font-medium">TOKEN</div>
                <div className="text-4xl font-black text-blue-700 font-mono">{appointment.token_number}</div>
              </div>
            )}
            <span className={`text-sm font-medium px-3 py-1.5 rounded-full ${STATUS_STYLES[appointment.status] ?? 'bg-gray-100'}`}>
              {appointment.status}
            </span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t">
          <Link href={`/patients/${appointment.patient_id}`}>
            <Button variant="outline" size="sm">View Patient Record</Button>
          </Link>
          <Link href="/appointments/queue">
            <Button variant="outline" size="sm">Back to Queue</Button>
          </Link>
          {appointment.status === 'Scheduled' && (
            <>
              <form action={handleCheckIn}>
                <Button type="submit" size="sm" className="bg-purple-600 hover:bg-purple-700">
                  Check In & Assign Token
                </Button>
              </form>
              <form action={handleCancel}>
                <Button type="submit" size="sm" variant="outline" className="text-red-600 border-red-200">Cancel</Button>
              </form>
              <form action={handleNoShow}>
                <Button type="submit" size="sm" variant="ghost" className="text-red-400">Mark No-show</Button>
              </form>
            </>
          )}
        </div>
      </div>

      {/* Audit Log */}
      <div className="bg-white border rounded-lg shadow-sm p-5">
        <h2 className="font-semibold text-gray-800 mb-4">Appointment Audit Trail</h2>
        <div className="space-y-3">
          {auditLog.map((log: any) => (
            <div key={log.id} className="flex items-start space-x-3 text-sm">
              <div className="w-2 h-2 rounded-full bg-blue-400 mt-1.5 shrink-0" />
              <div>
                <div className="text-gray-600">
                  {log.old_status
                    ? <><span className="line-through text-gray-400">{log.old_status}</span> → <span className="font-medium text-gray-800">{log.new_status}</span></>
                    : <span className="font-medium text-gray-800">{log.new_status}</span>
                  }
                  {log.notes && <span className="text-gray-500 ml-2">· {log.notes}</span>}
                </div>
                <div className="text-xs text-gray-400 mt-0.5">
                  {format(parseISO(log.created_at), 'dd MMM yyyy, HH:mm')}
                  {log.user_profiles?.full_name && ` · ${log.user_profiles.full_name}`}
                </div>
              </div>
            </div>
          ))}
          {auditLog.length === 0 && <p className="text-sm text-gray-500 italic">No audit events yet.</p>}
        </div>
      </div>
    </div>
  )
}
