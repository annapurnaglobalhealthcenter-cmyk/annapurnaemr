'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { logVitals, logMAR, logFluidBalance, logHandover } from '@/lib/services/nursing.service'
import { toast } from 'sonner'
import { Activity, Pill, Droplet, Users, Loader2 } from 'lucide-react'
import { format } from 'date-fns'

export function NursingClient({ initialPatients }: { initialPatients: any[] }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [activeDialog, setActiveDialog] = useState<string | null>(null)
  const [selectedPatient, setSelectedPatient] = useState<any>(null)

  const openDialog = (type: string, patient: any) => {
    setSelectedPatient(patient)
    setActiveDialog(type)
  }

  return (
    <div className="space-y-6 max-w-7xl mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold tracking-tight flex items-center">
            <Activity className="w-6 h-6 mr-2 text-pink-600" /> Nursing Station
          </h1>
          <p className="text-sm text-gray-500 mt-1">Manage vitals, MAR, intake/output, and handovers for active IPD patients.</p>
        </div>
      </div>

      <div className="bg-white shadow-sm border rounded-lg overflow-hidden">
        <table className="w-full text-sm text-left">
          <thead className="text-xs text-gray-500 uppercase bg-gray-50">
            <tr>
              <th className="px-4 py-3">Ward & Bed</th>
              <th className="px-4 py-3">Patient</th>
              <th className="px-4 py-3">Latest Vitals</th>
              <th className="px-4 py-3 text-right">Rapid Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {initialPatients.length === 0 ? (
              <tr><td colSpan={4} className="px-4 py-8 text-center text-gray-500">No active patients found on the floor.</td></tr>
            ) : (
              initialPatients.map(p => {
                const pat = Array.isArray(p.patients) ? p.patients[0] : p.patients
                const uhid = pat?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value
                
                return (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3">
                      <div className="font-bold text-gray-900">{p.activeBed?.bed_number || 'No Bed'}</div>
                      <div className="text-xs text-gray-500">{p.activeBed?.wards?.name}</div>
                    </td>
                    <td className="px-4 py-3">
                      <div className="font-semibold text-gray-900">{pat?.first_name} {pat?.last_name}</div>
                      <div className="text-xs text-gray-500">{uhid}</div>
                    </td>
                    <td className="px-4 py-3">
                      {p.latestVitals ? (
                        <div className="text-xs space-y-1">
                          <div><span className="font-medium">BP:</span> {p.latestVitals.systolic_bp}/{p.latestVitals.diastolic_bp} mmHg</div>
                          <div><span className="font-medium">HR:</span> {p.latestVitals.heart_rate} bpm</div>
                          <div className="text-gray-400">{format(new Date(p.latestVitals.recorded_at), 'HH:mm')}</div>
                        </div>
                      ) : (
                        <span className="text-gray-400 italic text-xs">No vitals logged</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right space-x-2">
                      <Button size="sm" variant="outline" className="border-pink-200 text-pink-700 hover:bg-pink-50 px-2" onClick={() => openDialog('vitals', p)}>
                        <Activity className="w-4 h-4 mr-1" /> Vitals
                      </Button>
                      <Button size="sm" variant="outline" className="border-blue-200 text-blue-700 hover:bg-blue-50 px-2" onClick={() => openDialog('mar', p)}>
                        <Pill className="w-4 h-4 mr-1" /> MAR
                      </Button>
                      <Button size="sm" variant="outline" className="border-cyan-200 text-cyan-700 hover:bg-cyan-50 px-2" onClick={() => openDialog('io', p)}>
                        <Droplet className="w-4 h-4 mr-1" /> I/O
                      </Button>
                      <Button size="sm" variant="outline" className="border-indigo-200 text-indigo-700 hover:bg-indigo-50 px-2" onClick={() => openDialog('handover', p)}>
                        <Users className="w-4 h-4 mr-1" /> Shift
                      </Button>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>

      {activeDialog && (
        <DialogContainer 
          onClose={() => setActiveDialog(null)}
          title={`Log ${activeDialog.toUpperCase()}`}
          patientName={`${selectedPatient?.patients?.first_name || selectedPatient?.patients?.[0]?.first_name}`}
        >
          {activeDialog === 'vitals' && <VitalsForm patient={selectedPatient} onClose={() => setActiveDialog(null)} router={router} />}
          {activeDialog === 'mar' && <MARForm patient={selectedPatient} onClose={() => setActiveDialog(null)} router={router} />}
          {activeDialog === 'io' && <IOForm patient={selectedPatient} onClose={() => setActiveDialog(null)} router={router} />}
          {activeDialog === 'handover' && <HandoverForm patient={selectedPatient} onClose={() => setActiveDialog(null)} router={router} />}
        </DialogContainer>
      )}

    </div>
  )
}

function DialogContainer({ children, onClose, title, patientName }: any) {
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl w-full max-w-lg overflow-hidden flex flex-col max-h-[90vh]">
        <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50">
          <div>
            <h2 className="text-lg font-bold">{title}</h2>
            <div className="text-xs text-gray-500">Patient: {patientName}</div>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 text-xl font-bold">&times;</button>
        </div>
        <div className="p-6 overflow-y-auto">
          {children}
        </div>
      </div>
    </div>
  )
}

function VitalsForm({ patient, onClose, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [vitals, setVitals] = useState({ systolic_bp: '', diastolic_bp: '', heart_rate: '', temperature_c: '', spo2_percent: '' })

  const handleSubmit = () => {
    startTransition(async () => {
      try {
        await logVitals(patient.encounter_id, patient.patients.id || patient.patients[0].id, vitals)
        toast.success('Vitals logged')
        router.refresh()
        onClose()
      } catch (err: any) {
        toast.error(err.message)
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div><label className="text-xs text-gray-500">Systolic BP</label><Input type="number" value={vitals.systolic_bp} onChange={e=>setVitals({...vitals, systolic_bp: e.target.value})} /></div>
        <div><label className="text-xs text-gray-500">Diastolic BP</label><Input type="number" value={vitals.diastolic_bp} onChange={e=>setVitals({...vitals, diastolic_bp: e.target.value})} /></div>
        <div><label className="text-xs text-gray-500">Heart Rate</label><Input type="number" value={vitals.heart_rate} onChange={e=>setVitals({...vitals, heart_rate: e.target.value})} /></div>
        <div><label className="text-xs text-gray-500">Temp (°C)</label><Input type="number" step="0.1" value={vitals.temperature_c} onChange={e=>setVitals({...vitals, temperature_c: e.target.value})} /></div>
        <div><label className="text-xs text-gray-500">SpO2 (%)</label><Input type="number" value={vitals.spo2_percent} onChange={e=>setVitals({...vitals, spo2_percent: e.target.value})} /></div>
      </div>
      <div className="flex justify-end pt-4"><Button onClick={handleSubmit} disabled={isPending} className="bg-pink-600 hover:bg-pink-700">Save Vitals</Button></div>
    </div>
  )
}

function MARForm({ patient, onClose, router }: any) {
  const [isPending, startTransition] = useTransition()
  const meds = patient.prescriptions || []

  const handleAdminister = (prescId: string, status: string) => {
    startTransition(async () => {
      try {
        await logMAR(patient.id, prescId, status, '')
        toast.success(`Marked as ${status}`)
        router.refresh()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  if (meds.length === 0) return <div className="text-gray-500 italic text-center">No active prescriptions</div>

  return (
    <div className="space-y-4">
      {meds.map((m:any) => (
        <div key={m.id} className="border p-3 rounded flex justify-between items-center">
          <div>
            <div className="font-bold">{m.medication_name}</div>
            <div className="text-xs text-gray-500">{m.dosage} · {m.frequency}</div>
          </div>
          <div className="flex gap-2">
            <Button size="sm" variant="outline" className="border-red-200 text-red-600" onClick={() => handleAdminister(m.id, 'Refused')} disabled={isPending}>Refused</Button>
            <Button size="sm" className="bg-blue-600" onClick={() => handleAdminister(m.id, 'Administered')} disabled={isPending}>Given</Button>
          </div>
        </div>
      ))}
    </div>
  )
}

function IOForm({ patient, onClose, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({ recordType: 'Intake', fluidType: 'Oral', volume: '', notes: '' })

  const handleSubmit = () => {
    if (!formData.volume) return
    startTransition(async () => {
      try {
        await logFluidBalance(patient.id, formData.recordType, formData.fluidType, parseInt(formData.volume), formData.notes)
        toast.success('Fluid balance logged')
        router.refresh()
        onClose()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-4">
      <div className="flex gap-4">
        <label className="flex items-center space-x-2"><input type="radio" checked={formData.recordType==='Intake'} onChange={()=>setFormData({...formData, recordType:'Intake'})} /> <span>Intake</span></label>
        <label className="flex items-center space-x-2"><input type="radio" checked={formData.recordType==='Output'} onChange={()=>setFormData({...formData, recordType:'Output'})} /> <span>Output</span></label>
      </div>
      <div>
        <label className="text-xs text-gray-500">Fluid Type</label>
        <select className="w-full p-2 border rounded" value={formData.fluidType} onChange={e=>setFormData({...formData, fluidType:e.target.value})}>
          {formData.recordType === 'Intake' ? (
            <><option>Oral</option><option>IV</option><option>Tube Feed</option></>
          ) : (
            <><option>Urine</option><option>Emesis</option><option>Drain</option><option>Stool</option></>
          )}
        </select>
      </div>
      <div><label className="text-xs text-gray-500">Volume (ml)</label><Input type="number" value={formData.volume} onChange={e=>setFormData({...formData, volume:e.target.value})} /></div>
      <div><label className="text-xs text-gray-500">Notes</label><Input value={formData.notes} onChange={e=>setFormData({...formData, notes:e.target.value})} /></div>
      <div className="flex justify-end pt-4"><Button onClick={handleSubmit} disabled={isPending} className="bg-cyan-600">Save I/O</Button></div>
    </div>
  )
}

function HandoverForm({ patient, onClose, router }: any) {
  const [isPending, startTransition] = useTransition()
  const [formData, setFormData] = useState({ shift: 'Morning', summary: '', pending: '' })

  const handleSubmit = () => {
    if (!formData.summary) return
    startTransition(async () => {
      try {
        await logHandover(patient.id, formData.shift, formData.summary, formData.pending)
        toast.success('Handover saved')
        router.refresh()
        onClose()
      } catch(e:any) { toast.error(e.message) }
    })
  }

  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs text-gray-500">Next Shift</label>
        <select className="w-full p-2 border rounded" value={formData.shift} onChange={e=>setFormData({...formData, shift:e.target.value})}>
          <option>Morning</option><option>Evening</option><option>Night</option>
        </select>
      </div>
      <div><label className="text-xs text-gray-500">Clinical Summary</label><textarea className="w-full border rounded p-2 min-h-[100px]" value={formData.summary} onChange={e=>setFormData({...formData, summary:e.target.value})} /></div>
      <div><label className="text-xs text-gray-500">Pending Tasks (To-Do for next shift)</label><textarea className="w-full border rounded p-2 min-h-[100px]" value={formData.pending} onChange={e=>setFormData({...formData, pending:e.target.value})} /></div>
      <div className="flex justify-end pt-4"><Button onClick={handleSubmit} disabled={isPending} className="bg-indigo-600">Complete Handover</Button></div>
    </div>
  )
}
