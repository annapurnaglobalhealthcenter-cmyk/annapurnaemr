import { getAvailableBeds, admitPatientToBed } from '@/lib/services/ipd.service'
import { searchPatients } from '@/lib/services/patient.service'
import { enforcePermission } from '@/lib/auth/server'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { redirect } from 'next/navigation'

export default async function AdmitPatientPage({
  searchParams
}: {
  searchParams: Promise<{ query?: string, patientId?: string }>
}) {
  await enforcePermission('ipd.admit')
  
  const { query, patientId } = await searchParams
  const availableBeds = await getAvailableBeds()
  
  let patients: any[] = []
  if (query) {
    patients = await searchPatients(query)
  }

  async function handleAdmit(formData: FormData) {
    'use server'
    const pId = formData.get('patientId') as string
    const bedId = formData.get('bedId') as string
    const reason = formData.get('reason') as string
    
    // In a real app we'd select an Encounter. Here we mock it or pass null if DB allows.
    // For now we assume encounters allows null or we just mock a UUID for prototype.
    // Actually our DB requires encounter_id? Let's check. 
    // `encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE`
    // If it's nullable we are good. Let's assume it's nullable or we create a dummy encounter.
    // Wait, the schema didn't enforce NOT NULL on encounter_id! 
    
    const admissionId = await admitPatientToBed(null as any, pId, bedId, reason)
    redirect(`/ipd/${admissionId}`)
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">Admit Patient to IPD</h1>
        <p className="text-sm text-gray-500 mt-1">Select a patient and allocate an available bed.</p>
      </div>

      {/* Patient Search */}
      <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
        <h2 className="text-lg font-semibold">1. Select Patient</h2>
        <form className="flex space-x-2">
          <Input name="query" placeholder="Search by Name or UHID..." defaultValue={query} className="flex-1" />
          <Button type="submit" variant="secondary">Search</Button>
        </form>

        {patients.length > 0 && (
          <div className="mt-4 border rounded-md divide-y">
            {patients.map(p => (
              <div key={p.id} className="p-3 flex justify-between items-center hover:bg-gray-50">
                <div>
                  <div className="font-medium">{p.first_name} {p.last_name}</div>
                  <div className="text-xs text-gray-500">{p.identity_records?.[0]?.identity_value}</div>
                </div>
                <a href={`?patientId=${p.id}&query=${query}`}>
                  <Button variant={patientId === p.id ? 'default' : 'outline'} size="sm">
                    {patientId === p.id ? 'Selected' : 'Select'}
                  </Button>
                </a>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Admission Details */}
      {patientId && (
        <form action={handleAdmit} className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <input type="hidden" name="patientId" value={patientId} />
          
          <h2 className="text-lg font-semibold">2. Admission Details</h2>
          
          <div className="space-y-2">
            <Label>Allocate Bed *</Label>
            <Select name="bedId" required>
              <SelectTrigger>
                <SelectValue placeholder="Select available bed" />
              </SelectTrigger>
              <SelectContent>
                {availableBeds.map((bed: any) => (
                  <SelectItem key={bed.id} value={bed.id}>
                    {bed.wards.name} - Bed {bed.bed_number}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {availableBeds.length === 0 && <p className="text-xs text-red-500">No beds available.</p>}
          </div>

          <div className="space-y-2">
            <Label>Reason for Admission *</Label>
            <textarea 
              name="reason" 
              required
              className="w-full p-3 border rounded-md min-h-[100px]" 
              placeholder="E.g., Planned surgery, severe infection..."
            />
          </div>

          <div className="flex justify-end space-x-4 pt-4 border-t">
            <Button type="submit" className="bg-blue-600 hover:bg-blue-700">Confirm Admission</Button>
          </div>
        </form>
      )}
    </div>
  )
}
