'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { searchPatients } from '@/lib/services/patient.service'
import { getDoctorsByDepartment, getAvailableSlots, bookAppointment } from '@/lib/services/appointment.service'
import { toast } from 'sonner'
import { format, parseISO } from 'date-fns'
import { Loader2, Search, User, ChevronRight } from 'lucide-react'

type Step = 'patient' | 'doctor' | 'slot' | 'confirm'

export default function NewAppointmentPage() {
  const router = useRouter()
  const [step, setStep] = useState<Step>('patient')
  const [isLoading, setIsLoading] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Patient step
  const [query, setQuery] = useState('')
  const [patients, setPatients] = useState<any[]>([])
  const [selectedPatient, setSelectedPatient] = useState<any>(null)
  const [isWalkin, setIsWalkin] = useState(false)

  // Doctor step
  const [departments, setDepartments] = useState<any[]>([])
  const [selectedDept, setSelectedDept] = useState<any>(null)
  const [doctors, setDoctors] = useState<any[]>([])
  const [selectedDoctor, setSelectedDoctor] = useState<any>(null)

  // Slot step
  const [selectedDate, setSelectedDate] = useState(format(new Date(), 'yyyy-MM-dd'))
  const [slots, setSlots] = useState<string[]>([])
  const [selectedSlot, setSelectedSlot] = useState<string>('')
  const [notes, setNotes] = useState('')

  const searchForPatients = async () => {
    if (!query.trim()) return
    setIsLoading(true)
    try {
      const results = await searchPatients(query)
      setPatients(results)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadDepartments = async () => {
    setIsLoading(true)
    try {
      const { getDepartments } = await import('@/lib/services/appointment.service')
      const depts = await getDepartments()
      setDepartments(depts)
      setStep('doctor')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const selectDepartment = async (dept: any) => {
    setSelectedDept(dept)
    setIsLoading(true)
    try {
      const docs = await getDoctorsByDepartment(dept.id)
      setDoctors(docs)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const loadSlots = async () => {
    if (!selectedDoctor || !selectedDate) return
    setIsLoading(true)
    try {
      const available = await getAvailableSlots(selectedDoctor.doctor_id, selectedDate)
      setSlots(available)
      setStep('slot')
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleConfirm = async () => {
    if (!selectedPatient || !selectedDoctor || !selectedSlot || !selectedDept) return
    setIsSubmitting(true)
    try {
      const appointmentId = await bookAppointment(
        selectedPatient.id,
        selectedDoctor.doctor_id,
        selectedDept.id,
        selectedSlot,
        notes,
        isWalkin ? 'Walk-in' : 'Scheduled'
      )
      toast.success('Appointment booked successfully!')
      router.push(`/appointments/${appointmentId}`)
    } catch (err: any) {
      toast.error(err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  const StepIndicator = () => (
    <div className="flex items-center space-x-2 text-sm mb-6">
      {(['patient','doctor','slot','confirm'] as Step[]).map((s, i) => (
        <div key={s} className="flex items-center">
          <div className={`w-7 h-7 rounded-full flex items-center justify-center font-medium text-xs
            ${step === s ? 'bg-blue-600 text-white' :
              ['patient','doctor','slot','confirm'].indexOf(step) > i ? 'bg-green-500 text-white' :
              'bg-gray-200 text-gray-500'}`}>
            {i + 1}
          </div>
          <span className={`ml-1.5 hidden sm:inline ${step === s ? 'text-blue-600 font-medium' : 'text-gray-400'}`}>
            {s.charAt(0).toUpperCase() + s.slice(1)}
          </span>
          {i < 3 && <ChevronRight className="w-4 h-4 text-gray-300 mx-2" />}
        </div>
      ))}
    </div>
  )

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div className="border-b pb-4">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Appointment</h1>
        <p className="text-sm text-gray-500 mt-1">Walk through the receptionist booking workflow.</p>
      </div>

      <StepIndicator />

      {/* STEP 1: Patient Search */}
      {step === 'patient' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">1. Select Patient</h2>
          
          <div className="flex items-center space-x-2">
            <Input
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && searchForPatients()}
              placeholder="Search by Name, UHID, Mobile, or ABHA..."
              className="flex-1"
            />
            <Button onClick={searchForPatients} disabled={isLoading} variant="secondary">
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Search className="w-4 h-4" />}
            </Button>
          </div>

          {patients.length > 0 && (
            <div className="border rounded-md divide-y max-h-64 overflow-y-auto">
              {patients.map((p: any) => {
                const uhid = p.identity_records?.find((ir: any) => ir.identity_type === 'UHID')?.identity_value
                return (
                  <button
                    key={p.id}
                    onClick={() => { setSelectedPatient(p); setIsWalkin(false) }}
                    className={`w-full text-left p-3 hover:bg-gray-50 flex justify-between items-center
                      ${selectedPatient?.id === p.id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                  >
                    <div>
                      <div className="font-medium text-gray-800">{p.first_name} {p.last_name}</div>
                      <div className="text-xs text-gray-500">{uhid} · {p.phone_number}</div>
                    </div>
                    {selectedPatient?.id === p.id && <User className="w-4 h-4 text-blue-600" />}
                  </button>
                )
              })}
            </div>
          )}

          <div className="flex items-center space-x-3 pt-2 border-t">
            <Button
              variant="outline"
              onClick={() => { setIsWalkin(true); setSelectedPatient({ id: 'walkin', first_name: 'Walk-in', last_name: 'Patient' }); }}
              className="flex-1"
            >
              Walk-in (No Registration)
            </Button>
            <Button
              onClick={loadDepartments}
              disabled={!selectedPatient || isLoading}
              className="flex-1 bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Next: Select Doctor →
            </Button>
          </div>

          {selectedPatient && (
            <div className="bg-blue-50 border border-blue-200 p-3 rounded text-sm">
              Selected: <strong>{selectedPatient.first_name} {selectedPatient.last_name}</strong>
              {isWalkin && <span className="ml-2 text-orange-600">(Walk-in)</span>}
            </div>
          )}
        </div>
      )}

      {/* STEP 2: Department & Doctor */}
      {step === 'doctor' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">2. Select Department &amp; Doctor</h2>

          <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
            {departments.map((dept: any) => (
              <button
                key={dept.id}
                onClick={() => selectDepartment(dept)}
                className={`p-3 border rounded-md text-sm font-medium text-left hover:bg-gray-50
                  ${selectedDept?.id === dept.id ? 'border-blue-500 bg-blue-50 text-blue-700' : 'text-gray-700'}`}
              >
                <div className="font-mono text-xs text-gray-400 mb-0.5">{dept.code}</div>
                {dept.name}
              </button>
            ))}
          </div>

          {selectedDept && doctors.length > 0 && (
            <div className="border rounded-md divide-y mt-4">
              {doctors.map((doc: any) => (
                <button
                  key={doc.doctor_id}
                  onClick={() => setSelectedDoctor(doc)}
                  className={`w-full text-left p-3 hover:bg-gray-50
                    ${selectedDoctor?.doctor_id === doc.doctor_id ? 'bg-blue-50 border-l-4 border-l-blue-500' : ''}`}
                >
                  <div className="font-medium text-gray-800">Dr. {doc.user_profiles?.full_name}</div>
                </button>
              ))}
            </div>
          )}

          {selectedDept && doctors.length === 0 && !isLoading && (
            <p className="text-sm text-amber-600 italic">No doctors scheduled for this department.</p>
          )}

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep('patient')}>← Back</Button>
            <Button
              onClick={loadSlots}
              disabled={!selectedDoctor || isLoading}
              className="bg-blue-600 hover:bg-blue-700"
            >
              {isLoading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
              Next: Select Slot →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 3: Slot Selection */}
      {step === 'slot' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-4">
          <h2 className="font-semibold text-gray-800">3. Select Appointment Slot</h2>

          <div className="flex items-center space-x-3">
            <Label className="shrink-0">Date</Label>
            <input
              type="date"
              value={selectedDate}
              onChange={e => setSelectedDate(e.target.value)}
              className="border rounded p-2 text-sm"
              min={format(new Date(), 'yyyy-MM-dd')}
            />
            <Button variant="secondary" size="sm" onClick={loadSlots} disabled={isLoading}>
              {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Refresh'}
            </Button>
          </div>

          {slots.length === 0 && !isLoading && (
            <p className="text-sm text-amber-600 italic">No available slots for this date. Try another date.</p>
          )}

          <div className="grid grid-cols-4 md:grid-cols-6 gap-2">
            {slots.map(slot => (
              <button
                key={slot}
                onClick={() => setSelectedSlot(slot)}
                className={`py-2 px-3 border rounded text-sm font-medium hover:bg-blue-50
                  ${selectedSlot === slot ? 'border-blue-500 bg-blue-100 text-blue-700' : 'text-gray-700'}`}
              >
                {format(parseISO(slot), 'HH:mm')}
              </button>
            ))}
          </div>

          <div className="space-y-2 mt-2">
            <Label>Notes (optional)</Label>
            <Input value={notes} onChange={e => setNotes(e.target.value)} placeholder="Chief complaint, referral notes..." />
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep('doctor')}>← Back</Button>
            <Button
              onClick={() => selectedSlot && setStep('confirm')}
              disabled={!selectedSlot}
              className="bg-blue-600 hover:bg-blue-700"
            >
              Next: Confirm →
            </Button>
          </div>
        </div>
      )}

      {/* STEP 4: Confirm */}
      {step === 'confirm' && (
        <div className="bg-white p-6 rounded-lg border shadow-sm space-y-6">
          <h2 className="font-semibold text-gray-800">4. Confirm Appointment</h2>

          <div className="bg-gray-50 rounded-lg p-4 space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-gray-500">Patient</span>
              <span className="font-medium">{selectedPatient?.first_name} {selectedPatient?.last_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Doctor</span>
              <span className="font-medium">Dr. {selectedDoctor?.user_profiles?.full_name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Department</span>
              <span className="font-medium">{selectedDept?.name}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Date &amp; Time</span>
              <span className="font-medium">{format(parseISO(selectedSlot), 'dd MMM yyyy, HH:mm')}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-500">Type</span>
              <span className={`font-medium ${isWalkin ? 'text-orange-600' : 'text-blue-600'}`}>
                {isWalkin ? 'Walk-in' : 'Scheduled'}
              </span>
            </div>
            {notes && (
              <div className="flex justify-between">
                <span className="text-gray-500">Notes</span>
                <span className="font-medium text-right max-w-[200px]">{notes}</span>
              </div>
            )}
          </div>

          <div className="flex justify-between pt-4 border-t">
            <Button variant="outline" onClick={() => setStep('slot')}>← Back</Button>
            <Button
              onClick={handleConfirm}
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700"
            >
              {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
              Confirm &amp; Book
            </Button>
          </div>
        </div>
      )}
    </div>
  )
}
