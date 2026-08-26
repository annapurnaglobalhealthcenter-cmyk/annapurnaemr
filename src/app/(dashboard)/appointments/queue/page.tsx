'use client'

import { useState, useEffect, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { getDepartments, getQueue, updateAppointmentStatus, checkInAppointment } from '@/lib/services/appointment.service'
import { toast } from 'sonner'
import { format } from 'date-fns'
import { Loader2, RefreshCw } from 'lucide-react'

const STATUS_STYLES: Record<string, string> = {
  'Scheduled':       'bg-blue-100 text-blue-700',
  'Checked-in':      'bg-purple-100 text-purple-700',
  'Waiting':         'bg-amber-100 text-amber-700',
  'In Consultation': 'bg-green-100 text-green-700',
  'Completed':       'bg-gray-100 text-gray-500',
  'Cancelled':       'bg-red-100 text-red-400',
  'No-show':         'bg-red-50 text-red-300 italic',
}

const NEXT_STATUS: Record<string, string> = {
  'Scheduled':       'Checked-in',
  'Checked-in':      'Waiting',
  'Waiting':         'In Consultation',
  'In Consultation': 'Completed',
}

export default function QueuePage() {
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDeptId, setSelectedDeptId] = useState<string>('')
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedDoctorId, setSelectedDoctorId] = useState<string>('')
  const [queue, setQueue] = useState<any[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    getDepartments().then(setDepartments).catch(console.error)
  }, [])

  const loadQueue = async (doctorId: string) => {
    setIsLoading(true)
    try {
      const q = await getQueue(doctorId)
      setQueue(q)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDoctors = async (deptId: string) => {
    setSelectedDeptId(deptId)
    setSelectedDoctorId('')
    setQueue([])
    const { getDoctorsByDepartment } = await import('@/lib/services/appointment.service')
    const docs = await getDoctorsByDepartment(deptId)
    setDoctors(docs)
  }

  const handleCheckIn = async (appointmentId: string) => {
    startTransition(async () => {
      try {
        const token = await checkInAppointment(appointmentId)
        toast.success(`Checked in! Token: ${token}`)
        await loadQueue(selectedDoctorId)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  const handleStatusChange = async (appointmentId: string, newStatus: string) => {
    startTransition(async () => {
      try {
        await updateAppointmentStatus(appointmentId, newStatus as any)
        toast.success(`Status → ${newStatus}`)
        await loadQueue(selectedDoctorId)
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Live Queue</h1>
          <p className="text-gray-500 text-sm mt-1">Manage patient flow in real-time.</p>
        </div>
        {selectedDoctorId && (
          <Button variant="outline" onClick={() => loadQueue(selectedDoctorId)} disabled={isLoading}>
            <RefreshCw className={`w-4 h-4 mr-2 ${isLoading ? 'animate-spin' : ''}`} /> Refresh
          </Button>
        )}
      </div>

      {/* Filters */}
      <div className="bg-white p-4 rounded-lg border shadow-sm flex flex-wrap gap-4">
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Department</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={selectedDeptId}
            onChange={e => loadDoctors(e.target.value)}
          >
            <option value="">Select Department</option>
            {departments.map((d: any) => (
              <option key={d.id} value={d.id}>{d.name}</option>
            ))}
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs font-medium text-gray-500 mb-1 block">Doctor</label>
          <select
            className="w-full border rounded p-2 text-sm"
            value={selectedDoctorId}
            onChange={e => { setSelectedDoctorId(e.target.value); loadQueue(e.target.value) }}
            disabled={!selectedDeptId}
          >
            <option value="">Select Doctor</option>
            {doctors.map((d: any) => (
              <option key={d.doctor_id} value={d.doctor_id}>
                Dr. {d.user_profiles?.full_name}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Queue Table */}
      {selectedDoctorId && (
        <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
          <div className="px-6 py-4 border-b bg-gray-50">
            <h2 className="font-semibold text-gray-800">
              Queue — {queue.length} patient{queue.length !== 1 ? 's' : ''}
            </h2>
          </div>
          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
                  <tr>
                    <th className="px-6 py-3">Token</th>
                    <th className="px-6 py-3">Patient</th>
                    <th className="px-6 py-3">Appt Time</th>
                    <th className="px-6 py-3">Type</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200">
                  {queue.map((appt: any) => {
                    const uhid = appt.patients?.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                    const nextStatus = NEXT_STATUS[appt.status]
                    return (
                      <tr key={appt.id}
                        className={`${appt.status === 'In Consultation' ? 'bg-green-50' :
                          appt.status === 'Waiting' ? 'bg-amber-50' : 'hover:bg-gray-50'}`}
                      >
                        <td className="px-6 py-4 font-mono font-bold text-xl text-blue-700">
                          {appt.token_number ?? '—'}
                        </td>
                        <td className="px-6 py-4">
                          <div className="font-medium text-gray-800">
                            {appt.patients?.first_name} {appt.patients?.last_name}
                          </div>
                          <div className="text-xs text-gray-500">{uhid} · {appt.patients?.phone_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-gray-600">
                          {format(new Date(appt.appointment_time), 'HH:mm')}
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs px-2 py-0.5 rounded ${appt.appointment_type === 'Walk-in' ? 'bg-orange-100 text-orange-600' : 'bg-blue-50 text-blue-600'}`}>
                            {appt.appointment_type}
                          </span>
                        </td>
                        <td className="px-6 py-4">
                          <span className={`text-xs font-medium px-2 py-1 rounded ${STATUS_STYLES[appt.status] ?? ''}`}>
                            {appt.status}
                          </span>
                        </td>
                        <td className="px-6 py-4 text-right space-x-2">
                          {appt.status === 'Scheduled' && (
                            <Button size="sm" onClick={() => handleCheckIn(appt.id)} disabled={isPending}
                              className="bg-purple-600 hover:bg-purple-700 text-white">
                              Check In
                            </Button>
                          )}
                          {nextStatus && appt.status !== 'Scheduled' && (
                            <Button size="sm" variant="outline"
                              onClick={() => handleStatusChange(appt.id, nextStatus)}
                              disabled={isPending}>
                              → {nextStatus}
                            </Button>
                          )}
                          {['Scheduled', 'Checked-in', 'Waiting'].includes(appt.status) && (
                            <Button size="sm" variant="ghost" className="text-red-500"
                              onClick={() => handleStatusChange(appt.id, 'No-show')}
                              disabled={isPending}>
                              No-show
                            </Button>
                          )}
                        </td>
                      </tr>
                    )
                  })}
                  {queue.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500 italic">
                        Queue is empty for today.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
