'use client'

import { useState } from 'react'
import { format } from 'date-fns'
import { Button } from '@/components/ui/button'
import { Clock, CheckCircle2, Activity, Play, FileText, ArrowRight } from 'lucide-react'
import { Badge } from '@/components/ui/badge'

export function OTWorkspaceClient({ initialSchedules }: { initialSchedules: any[] }) {
  const [schedules] = useState<any[]>(initialSchedules)

  const getStatusColor = (status: string) => {
    switch(status) {
      case 'Scheduled': return 'bg-gray-100 text-gray-800'
      case 'PAC_Cleared': return 'bg-blue-100 text-blue-800'
      case 'In_Progress': return 'bg-yellow-100 text-yellow-800'
      case 'Recovery': return 'bg-orange-100 text-orange-800'
      case 'Completed': return 'bg-green-100 text-green-800'
      case 'Cancelled': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const getStatusLabel = (status: string) => {
    return status.replace('_', ' ')
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border overflow-hidden">
      <div className="p-4 border-b bg-gray-50 flex justify-between items-center">
        <h3 className="font-semibold text-gray-800">Today's Surgeries</h3>
        <Button className="bg-indigo-600 hover:bg-indigo-700">+ Schedule Surgery</Button>
      </div>
      
      {schedules.length === 0 ? (
        <div className="p-12 text-center text-gray-500">
          No surgeries scheduled.
        </div>
      ) : (
        <table className="w-full text-sm text-left text-gray-600">
          <thead className="bg-gray-50 border-b text-gray-900 uppercase text-xs font-semibold">
            <tr>
              <th className="px-6 py-4">Time</th>
              <th className="px-6 py-4">OT Room</th>
              <th className="px-6 py-4">Patient</th>
              <th className="px-6 py-4">Procedure</th>
              <th className="px-6 py-4">Surgical Team</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y">
            {schedules.map((s) => (
              <tr key={s.id} className="hover:bg-gray-50/50">
                <td className="px-6 py-4 font-medium text-gray-900">
                  {format(new Date(s.scheduled_start), 'HH:mm')} - {format(new Date(s.scheduled_end), 'HH:mm')}
                </td>
                <td className="px-6 py-4">
                  <Badge variant="outline" className="bg-slate-50">{s.ot_rooms?.name}</Badge>
                </td>
                <td className="px-6 py-4">
                  <div className="font-bold text-gray-900">{s.patients?.first_name} {s.patients?.last_name}</div>
                  <div className="text-xs text-gray-500">UHID: {s.patients?.identity_records?.[0]?.identity_value}</div>
                </td>
                <td className="px-6 py-4 font-medium text-indigo-700">
                  {s.ot_procedure_master?.name}
                </td>
                <td className="px-6 py-4">
                  <div><span className="text-xs text-gray-500">Surgeon:</span> {s.surgeon?.full_name}</div>
                  <div><span className="text-xs text-gray-500">Anesth:</span> {s.anesthetist?.full_name}</div>
                </td>
                <td className="px-6 py-4">
                  <span className={`px-2.5 py-1 rounded-full text-xs font-bold ${getStatusColor(s.status)}`}>
                    {getStatusLabel(s.status)}
                  </span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  {s.status === 'Scheduled' && (
                    <Button variant="outline" size="sm" className="text-blue-600 border-blue-200 hover:bg-blue-50">
                      <FileText className="w-4 h-4 mr-1" /> PAC Clearance
                    </Button>
                  )}
                  {s.status === 'PAC_Cleared' && (
                    <Button variant="outline" size="sm" className="text-yellow-600 border-yellow-200 hover:bg-yellow-50">
                      <Play className="w-4 h-4 mr-1" /> Start Surgery
                    </Button>
                  )}
                  {s.status === 'In_Progress' && (
                    <Button variant="outline" size="sm" className="text-orange-600 border-orange-200 hover:bg-orange-50">
                      <Activity className="w-4 h-4 mr-1" /> End & Move to PACU
                    </Button>
                  )}
                  {s.status === 'Recovery' && (
                    <Button variant="outline" size="sm" className="text-green-600 border-green-200 hover:bg-green-50">
                      <CheckCircle2 className="w-4 h-4 mr-1" /> Finalize Post-Op
                    </Button>
                  )}
                  <Button variant="ghost" size="sm">
                    <ArrowRight className="w-4 h-4" />
                  </Button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
