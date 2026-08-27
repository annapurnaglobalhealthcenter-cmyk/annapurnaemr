import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { ChevronLeft, ChevronRight, UserPlus } from 'lucide-react'

export default async function PatientsPage({
  searchParams
}: {
  searchParams: Promise<{ page?: string }>
}) {
  const page = parseInt((await searchParams).page || '1', 10)
  const pageSize = 20
  const offset = (page - 1) * pageSize

  const supabase = await createClient()
  
  // Use count: 'exact' to get total number of patients for pagination
  const { data: patients, error, count } = await supabase
    .from('patients')
    .select(`
      *,
      identity_records (
        identity_type,
        identity_value,
        is_primary
      )
    `, { count: 'exact' })
    .range(offset, offset + pageSize - 1)
    .order('created_at', { ascending: false })

  const totalPages = count ? Math.ceil(count / pageSize) : 1
  const hasNextPage = page < totalPages
  const hasPrevPage = page > 1

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Patient Directory</h1>
          <p className="text-gray-500 text-sm mt-1">Showing {patients?.length || 0} of {count || 0} total patients</p>
        </div>
        <Link href="/patients/new">
          <Button className="bg-blue-600 hover:bg-blue-700">
            <UserPlus className="w-4 h-4 mr-2" /> Register Patient
          </Button>
        </Link>
      </div>

      <div className="bg-white rounded-lg border shadow-sm overflow-hidden">
        {error ? (
          <div className="p-4 text-red-500 bg-red-50">Error loading patients: {error.message}</div>
        ) : !patients || patients.length === 0 ? (
          <div className="p-16 text-center text-gray-500">No patients found on this page.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="bg-gray-50 text-gray-500 text-xs uppercase border-b">
                <tr>
                  <th className="px-6 py-4 font-semibold">UHID</th>
                  <th className="px-6 py-4 font-semibold">Patient Name</th>
                  <th className="px-6 py-4 font-semibold">Gender / DOB</th>
                  <th className="px-6 py-4 font-semibold">Contact</th>
                  <th className="px-6 py-4 text-right font-semibold">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {patients.map((patient) => {
                  const uhidRecord = patient.identity_records?.find((ir: any) => ir.identity_type === 'UHID')
                  const abhaRecord = patient.identity_records?.find((ir: any) => ir.identity_type === 'ABHA')
                  return (
                    <tr key={patient.id} className="hover:bg-gray-50/50 transition-colors">
                      <td className="px-6 py-4">
                        <div className="font-mono font-bold text-blue-700">{uhidRecord?.identity_value || 'Pending'}</div>
                        {abhaRecord && <div className="text-xs text-green-700 font-mono mt-1">ABHA: {abhaRecord.identity_value}</div>}
                      </td>
                      <td className="px-6 py-4">
                        <div className="font-semibold text-gray-900">{patient.first_name} {patient.last_name}</div>
                        <div className="text-xs text-gray-500 mt-1">Blood: <span className="font-medium text-red-600">{patient.blood_group}</span></div>
                      </td>
                      <td className="px-6 py-4">
                        <div className="capitalize">{patient.gender}</div>
                        <div className="text-xs text-gray-500 mt-1">{patient.date_of_birth}</div>
                      </td>
                      <td className="px-6 py-4">
                        <div>{patient.phone_number || 'No phone'}</div>
                      </td>
                      <td className="px-6 py-4 text-right">
                        <Link href={`/patients/${patient.id}`}>
                          <Button variant="outline" size="sm">View Chart</Button>
                        </Link>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
        
        {/* Pagination Controls */}
        <div className="border-t bg-gray-50 px-6 py-4 flex items-center justify-between">
          <div className="text-sm text-gray-500">
            Page <span className="font-bold text-gray-900">{page}</span> of <span className="font-bold text-gray-900">{totalPages}</span>
          </div>
          <div className="flex gap-2">
            <Link href={hasPrevPage ? `/patients?page=${page - 1}` : '#'} className={!hasPrevPage ? 'pointer-events-none opacity-50' : ''}>
              <Button variant="outline" size="sm" disabled={!hasPrevPage}>
                <ChevronLeft className="w-4 h-4 mr-1" /> Previous
              </Button>
            </Link>
            <Link href={hasNextPage ? `/patients?page=${page + 1}` : '#'} className={!hasNextPage ? 'pointer-events-none opacity-50' : ''}>
              <Button variant="outline" size="sm" disabled={!hasNextPage}>
                Next <ChevronRight className="w-4 h-4 ml-1" />
              </Button>
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
