import { createClient } from '@/lib/supabase/server'
import Link from 'next/link'
import { Button } from '@/components/ui/button'

export default async function PatientsPage() {
  const supabase = await createClient()
  
  const { data: patients, error } = await supabase
    .from('patients')
    .select(`
      *,
      identity_records (
        identity_type,
        identity_value,
        is_primary
      )
    `)
    .limit(20)
    .order('created_at', { ascending: false })

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold tracking-tight">Patients</h1>
        <Link href="/patients/new">
          <Button>Register Patient</Button>
        </Link>
      </div>

      <div className="bg-white rounded-md border">
        {error ? (
          <div className="p-4 text-red-500">Error loading patients: {error.message}</div>
        ) : !patients || patients.length === 0 ? (
          <div className="p-8 text-center text-gray-500">No patients found. Register a new patient to get started.</div>
        ) : (
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">UHID</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ABHA</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">DOB</th>
                <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Contact</th>
                <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
              </tr>
            </thead>
            <tbody className="bg-white divide-y divide-gray-200">
              {patients.map((patient: { id: string; first_name: string; last_name: string; date_of_birth: string; phone_number: string | null; email: string | null; identity_records: { identity_type: string; identity_value: string; is_primary: boolean }[] }) => {
                const uhid = patient.identity_records?.find((ir) => ir.identity_type === 'UHID')?.identity_value || 'N/A'
                const abha = patient.identity_records?.find((ir) => ir.identity_type === 'ABHA')?.identity_value || 'N/A'
                
                return (
                  <tr key={patient.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-blue-600">
                      <Link href={`/patients/${patient.id}`}>{uhid}</Link>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {abha}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.first_name} {patient.last_name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.date_of_birth}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                      {patient.phone_number || patient.email || '-'}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Link href={`/patients/${patient.id}`}>
                        <Button variant="ghost" size="sm">View</Button>
                      </Link>
                    </td>
                  </tr>
                )
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
