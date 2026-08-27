'use client'

import { useState } from 'react'
import { CalendarDays, UserCheck, Users, Plus, FileText } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'

export function HRClient({ initialShifts, initialLeaves, initialStaff }: { initialShifts: any[], initialLeaves: any[], initialStaff: any[] }) {
  const [activeTab, setActiveTab] = useState<'shifts' | 'leaves' | 'staff'>('shifts')

  const stats = {
    totalStaff: initialStaff.length,
    todayShifts: initialShifts.filter(s => s.shift_date === new Date().toISOString().slice(0,10)).length,
    pendingLeaves: initialLeaves.filter(l => l.status === 'Pending').length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">HR & Rostering</h1>
          <p className="text-gray-500 text-sm mt-1">Manage staff schedules, leave requests, and directory.</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline"><FileText className="w-4 h-4 mr-2" /> Request Leave</Button>
          <Button className="bg-blue-600 hover:bg-blue-700 text-white">
            <Plus className="w-4 h-4 mr-2" /> Assign Shift
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.totalStaff}</p><p className="text-xs text-gray-500">Total Staff</p></div>
        </div>
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-indigo-100 text-indigo-600 rounded-full"><CalendarDays className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.todayShifts}</p><p className="text-xs text-gray-500">Shifts Today</p></div>
        </div>
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full"><UserCheck className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.pendingLeaves}</p><p className="text-xs text-gray-500">Pending Leaves</p></div>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="border-b px-4 flex gap-4 bg-gray-50">
          <button onClick={() => setActiveTab('shifts')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'shifts' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Duty Roster</button>
          <button onClick={() => setActiveTab('leaves')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'leaves' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Leave Requests</button>
          <button onClick={() => setActiveTab('staff')} className={`px-4 py-3 text-sm font-medium border-b-2 ${activeTab === 'staff' ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>Staff Directory</button>
        </div>

        <div className="p-0">
          {activeTab === 'shifts' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Staff Member</th><th className="px-6 py-3">Department</th><th className="px-6 py-3">Shift Time</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialShifts.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No shifts scheduled</td></tr>
                ) : (
                  initialShifts.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{format(parseISO(s.shift_date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{s.user_profiles?.first_name} {s.user_profiles?.last_name}</div>
                        <div className="text-xs text-gray-500">{s.user_profiles?.role}</div>
                      </td>
                      <td className="px-6 py-4">{s.departments?.name || 'General'}</td>
                      <td className="px-6 py-4">{s.start_time.slice(0,5)} - {s.end_time.slice(0,5)} <span className="text-xs text-gray-500 bg-gray-100 px-1 rounded ml-1">{s.shift_type}</span></td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${s.status === 'Scheduled' ? 'bg-blue-100 text-blue-700' : s.status === 'Completed' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>{s.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activeTab === 'leaves' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Date Filed</th><th className="px-6 py-3">Staff Member</th><th className="px-6 py-3">Duration</th><th className="px-6 py-3">Type</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialLeaves.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No leave requests</td></tr>
                ) : (
                  initialLeaves.map(l => (
                    <tr key={l.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{format(new Date(l.created_at), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 font-medium">{l.user_profiles?.first_name} {l.user_profiles?.last_name}</td>
                      <td className="px-6 py-4 text-xs">{format(parseISO(l.start_date), 'dd MMM')} to {format(parseISO(l.end_date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4">{l.leave_type}</td>
                      <td className="px-6 py-4"><span className={`px-2 py-1 rounded-full text-xs font-semibold ${l.status === 'Approved' ? 'bg-green-100 text-green-700' : l.status === 'Rejected' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'}`}>{l.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activeTab === 'staff' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Role</th><th className="px-6 py-3">Department</th><th className="px-6 py-3">Phone</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialStaff.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No staff found</td></tr>
                ) : (
                  initialStaff.map(s => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{s.first_name} {s.last_name}</td>
                      <td className="px-6 py-4 font-bold text-gray-700">{s.role}</td>
                      <td className="px-6 py-4">{s.department || '—'}</td>
                      <td className="px-6 py-4">{s.phone_number || '—'}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  )
}
