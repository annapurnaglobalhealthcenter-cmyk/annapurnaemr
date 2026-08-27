'use client'

import { useState } from 'react'
import { Droplet, Users, ClipboardList, Plus } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { format, parseISO } from 'date-fns'

export function BloodBankClient({ initialInventory, initialRequests, initialDonors }: { initialInventory: any[], initialRequests: any[], initialDonors: any[] }) {
  const [activeTab, setActiveTab] = useState<'inventory' | 'requests' | 'donors'>('inventory')

  const stats = {
    totalUnits: initialInventory.filter(i => i.status === 'Available').length,
    pendingRequests: initialRequests.filter(r => r.status === 'Pending').length,
    totalDonors: initialDonors.length,
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Blood Bank Management</h1>
          <p className="text-gray-500 text-sm mt-1">Manage inventory, donors, and transfusion requests.</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <Plus className="w-4 h-4 mr-2" /> Add Blood Bag
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-red-100 text-red-600 rounded-full"><Droplet className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.totalUnits}</p><p className="text-xs text-gray-500">Available Units</p></div>
        </div>
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-amber-100 text-amber-600 rounded-full"><ClipboardList className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.pendingRequests}</p><p className="text-xs text-gray-500">Pending Requests</p></div>
        </div>
        <div className="bg-white border rounded-lg p-5 flex items-center gap-4 shadow-sm">
          <div className="p-3 bg-blue-100 text-blue-600 rounded-full"><Users className="w-6 h-6" /></div>
          <div><p className="text-2xl font-bold">{stats.totalDonors}</p><p className="text-xs text-gray-500">Registered Donors</p></div>
        </div>
      </div>

      <div className="bg-white border rounded-lg shadow-sm overflow-hidden">
        <div className="border-b px-4 flex gap-4 bg-gray-50">
          <button onClick={() => setActiveTab('inventory')} className={\px-4 py-3 text-sm font-medium border-b-2 \\}>Inventory</button>
          <button onClick={() => setActiveTab('requests')} className={\px-4 py-3 text-sm font-medium border-b-2 \\}>Transfusion Requests</button>
          <button onClick={() => setActiveTab('donors')} className={\px-4 py-3 text-sm font-medium border-b-2 \\}>Donors</button>
        </div>

        <div className="p-0">
          {activeTab === 'inventory' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Bag #</th><th className="px-6 py-3">Blood Group</th><th className="px-6 py-3">Component</th><th className="px-6 py-3">Expiry Date</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialInventory.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No inventory found</td></tr>
                ) : (
                  initialInventory.map(item => (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-mono font-medium">{item.bag_number}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{item.blood_group}</td>
                      <td className="px-6 py-4">{item.component_type}</td>
                      <td className="px-6 py-4">{format(parseISO(item.expiry_date), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4"><span className={\px-2 py-1 rounded-full text-xs font-semibold \\}>{item.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activeTab === 'requests' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Date</th><th className="px-6 py-3">Patient</th><th className="px-6 py-3">Req Group</th><th className="px-6 py-3">Units</th><th className="px-6 py-3">Status</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialRequests.length === 0 ? (
                  <tr><td colSpan={5} className="px-6 py-8 text-center text-gray-500">No requests found</td></tr>
                ) : (
                  initialRequests.map(req => (
                    <tr key={req.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4">{format(new Date(req.created_at), 'dd MMM yyyy')}</td>
                      <td className="px-6 py-4 font-medium">{req.patients?.first_name} {req.patients?.last_name}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{req.blood_group}</td>
                      <td className="px-6 py-4">{req.units_required}</td>
                      <td className="px-6 py-4"><span className="px-2 py-1 bg-amber-100 text-amber-700 rounded-full text-xs font-semibold">{req.status}</span></td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          )}
          {activeTab === 'donors' && (
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr><th className="px-6 py-3">Name</th><th className="px-6 py-3">Blood Group</th><th className="px-6 py-3">Phone</th><th className="px-6 py-3">Last Donation</th></tr>
              </thead>
              <tbody className="divide-y">
                {initialDonors.length === 0 ? (
                  <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No donors found</td></tr>
                ) : (
                  initialDonors.map(d => (
                    <tr key={d.id} className="hover:bg-gray-50">
                      <td className="px-6 py-4 font-medium">{d.first_name} {d.last_name}</td>
                      <td className="px-6 py-4 font-bold text-red-600">{d.blood_group}</td>
                      <td className="px-6 py-4">{d.phone_number || '—'}</td>
                      <td className="px-6 py-4">{d.last_donation_date ? format(parseISO(d.last_donation_date), 'dd MMM yyyy') : 'Never'}</td>
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
