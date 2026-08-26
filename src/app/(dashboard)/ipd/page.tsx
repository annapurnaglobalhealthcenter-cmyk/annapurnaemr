import { getWardOccupancy, getActiveAdmissions, seedWardsAndBeds } from '@/lib/services/ipd.service'
import { Button } from '@/components/ui/button'
import Link from 'next/link'
import { Bed, User, Activity, AlertCircle } from 'lucide-react'
import { enforcePermission } from '@/lib/auth/server'

export default async function IPDDashboard() {
  await enforcePermission('ipd.view')
  const wards = await getWardOccupancy()
  const admissions = await getActiveAdmissions()

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-white p-6 rounded-lg shadow-sm border">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">IPD Control Center</h1>
          <p className="text-sm text-gray-500 mt-1">Manage inpatients, ward capacity, and bed allocations</p>
        </div>
        <div className="flex gap-3">
          <Link href="/ipd/bed-board">
            <Button variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50">
              Hospital Bed Board
            </Button>
          </Link>
          <Link href="/ipd/admit">
            <Button className="bg-blue-600 hover:bg-blue-700">+ Admit Patient</Button>
          </Link>
        </div>
      </div>

      {wards.length === 0 && (
        <div className="bg-yellow-50 border border-yellow-200 p-6 rounded-md text-center">
          <AlertCircle className="w-8 h-8 text-yellow-500 mx-auto mb-2" />
          <h3 className="text-yellow-800 font-semibold mb-2">No Wards Configured</h3>
          <p className="text-yellow-700 text-sm mb-4">Initialize the default wards and beds to start admitting patients.</p>
          <form action={async () => {
            'use server'
            await seedWardsAndBeds()
          }}>
            <Button variant="outline" type="submit">Initialize Demo Wards</Button>
          </form>
        </div>
      )}

      {/* Ward Occupancy Map */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {wards.map((ward: any) => {
          const occupied = ward.beds.filter((b: any) => b.status === 'Occupied').length
          const total = ward.beds.length
          const perc = total > 0 ? Math.round((occupied / total) * 100) : 0
          
          return (
            <div key={ward.id} className="bg-white border rounded-lg shadow-sm p-5">
              <div className="flex justify-between items-center mb-4 border-b pb-2">
                <h2 className="text-lg font-semibold text-gray-800">{ward.name}</h2>
                <div className="text-sm font-medium text-gray-500">
                  {occupied} / {total} Occupied ({perc}%)
                </div>
              </div>
              
              <div className="grid grid-cols-5 gap-3">
                {ward.beds.map((bed: any) => (
                  <div 
                    key={bed.id} 
                    className={`p-3 rounded flex flex-col items-center justify-center border text-xs font-semibold
                      ${bed.status === 'Available' ? 'bg-green-50 border-green-200 text-green-700' : 
                        bed.status === 'Occupied' ? 'bg-red-50 border-red-200 text-red-700' : 
                        'bg-gray-50 border-gray-200 text-gray-500'}`}
                  >
                    <Bed className="w-5 h-5 mb-1" />
                    {bed.bed_number}
                  </div>
                ))}
              </div>
            </div>
          )
        })}
      </div>

      {/* Active Admissions Table */}
      <div className="bg-white border rounded-lg shadow-sm">
        <div className="px-6 py-4 border-b">
          <h2 className="text-lg font-semibold text-gray-800">Active Admissions</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase">
              <tr>
                <th className="px-6 py-3">Patient</th>
                <th className="px-6 py-3">UHID</th>
                <th className="px-6 py-3">Bed Allocation</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {admissions.map((adm: any) => {
                const uhid = adm.patients.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                const activeAllocation = adm.bed_allocations?.find((ba: any) => ba.beds) // Quick extraction
                
                return (
                  <tr key={adm.id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                      {adm.patients.first_name} {adm.patients.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{uhid}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      {activeAllocation ? (
                        <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-blue-100 text-blue-800">
                          {activeAllocation.beds.wards.name} - {activeAllocation.beds.bed_number}
                        </span>
                      ) : (
                        <span className="text-red-500">No active bed</span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-sm text-gray-500 truncate max-w-[200px]">{adm.admission_reason}</td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm">
                      <Link href={`/ipd/${adm.id}`}>
                        <Button variant="ghost" size="sm">Workspace</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
              {admissions.length === 0 && (
                <tr>
                  <td colSpan={5} className="px-6 py-8 text-center text-gray-500 italic">No active admissions.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
