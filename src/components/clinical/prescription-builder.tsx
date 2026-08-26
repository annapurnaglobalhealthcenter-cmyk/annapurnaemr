'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { searchMedicines, addPrescriptionToRecord, deletePrescription } from '@/lib/services/prescription.service'
import { requestMedicationSafetyCheck, resolveAiInteraction } from '@/lib/services/ai.service'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { toast } from 'sonner'
import { Loader2, Search, X, Pill, Trash2, ShieldAlert, Check, CheckCircle2 } from 'lucide-react'

export function PrescriptionBuilder({ 
  encounterId,
  patientId,
  recordId, 
  isDraft,
  existingMeds = [],
  medSafetyInteraction
}: { 
  encounterId: string
  patientId: string
  recordId: string, 
  isDraft: boolean,
  existingMeds?: any[],
  medSafetyInteraction?: any
}) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [isAdding, setIsAdding] = useState(false)
  const [query, setQuery] = useState('')
  const [results, setResults] = useState<any[]>([])
  const [searching, setSearching] = useState(false)
  
  const [selectedMed, setSelectedMed] = useState<any>(null)
  const [formData, setFormData] = useState({
    dosage: '',
    frequency: '1-0-1',
    duration_days: '5',
    instructions: 'After meals'
  })

  const [isCheckingSafety, setIsCheckingSafety] = useState(false)

  const handleSearch = async (val: string) => {
    setQuery(val)
    if (val.length < 2) {
      setResults([])
      return
    }
    setSearching(true)
    const res = await searchMedicines(val)
    setResults(res)
    setSearching(false)
  }

  const handleSelect = (med: any) => {
    setSelectedMed(med)
    setResults([])
    setQuery(med.brand_name)
  }

  const handleAdd = async () => {
    if (!selectedMed) return
    startTransition(async () => {
      try {
        await addPrescriptionToRecord(recordId, {
          medicine_id: selectedMed.id,
          medication_name: selectedMed.brand_name,
          dosage: formData.dosage,
          frequency: formData.frequency,
          route: 'Oral',
          duration_days: parseInt(formData.duration_days) || 1,
          quantity: (parseInt(formData.duration_days) || 1) * 3, // Safe mock math
          instructions: formData.instructions
        })
        setIsAdding(false)
        setSelectedMed(null)
        setQuery('')
        toast.success("Medication added")
        router.refresh()
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleDelete = async (id: string) => {
    startTransition(async () => {
      try {
        await deletePrescription(id)
        toast.success("Medication removed")
        router.refresh()
      } catch (e: any) {
        toast.error(e.message)
      }
    })
  }

  const handleCheckSafety = async () => {
    if (existingMeds.length === 0) return toast.error("No medications prescribed yet.")
    setIsCheckingSafety(true)
    try {
      await requestMedicationSafetyCheck(patientId, encounterId, existingMeds)
      toast.success("Safety check complete.")
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    } finally {
      setIsCheckingSafety(false)
    }
  }

  const handleResolveSafety = async (resolution: 'Accepted' | 'Rejected') => {
    if (!medSafetyInteraction) return
    try {
      await resolveAiInteraction(medSafetyInteraction.id, resolution)
      toast.success(`Warning ${resolution === 'Rejected' ? 'Ignored' : 'Resolved'}`)
      router.refresh()
    } catch (e:any) {
      toast.error(e.message)
    }
  }

  const isSafetyPending = medSafetyInteraction?.status === 'Pending'
  const safetyData = medSafetyInteraction?.ai_response

  return (
    <div className="space-y-4">
      {/* Existing Medications */}
      {existingMeds.length > 0 ? (
        <div className="space-y-2">
          {existingMeds.map((med) => (
            <div key={med.id} className="flex justify-between items-center p-3 bg-gray-50 border rounded-md">
              <div>
                <div className="font-semibold text-gray-800 flex items-center">
                  <Pill className="w-4 h-4 mr-2 text-indigo-600"/>
                  {med.medication_name} <span className="text-gray-500 ml-2 font-normal">{med.dosage}</span>
                </div>
                <div className="text-sm text-gray-600 mt-1">
                  {med.frequency} x {med.duration_days} days — {med.instructions}
                </div>
              </div>
              {isDraft && (
                <Button variant="ghost" size="sm" className="text-red-500 hover:text-red-700" onClick={() => handleDelete(med.id)}>
                  <Trash2 className="w-4 h-4" />
                </Button>
              )}
            </div>
          ))}

          {/* AI Safety Panel */}
          {isDraft && (
            <div className="mt-4 border rounded-md overflow-hidden shadow-sm">
              <div className="bg-slate-50 border-b px-4 py-3 flex justify-between items-center">
                <h3 className="font-semibold text-slate-800 flex items-center">
                  <ShieldAlert className="w-4 h-4 mr-2 text-slate-600" /> AI Safety Check
                </h3>
                <Button 
                  size="sm" 
                  variant="outline"
                  onClick={handleCheckSafety}
                  disabled={isCheckingSafety || isSafetyPending}
                >
                  {isCheckingSafety ? <Loader2 className="w-4 h-4 mr-2 animate-spin"/> : "Verify Rx Safety"}
                </Button>
              </div>

              {isSafetyPending && safetyData && (
                <div className="p-4 bg-white space-y-4 text-sm">
                  {safetyData.safeToProceed ? (
                    <div className="flex items-center text-green-700 bg-green-50 p-3 rounded">
                      <CheckCircle2 className="w-5 h-5 mr-2" /> No major contraindications or interactions detected.
                    </div>
                  ) : (
                    <>
                      <div className="bg-red-50 text-red-800 p-3 rounded border border-red-200 font-medium">
                        Attention: Potential Safety Concerns Detected. Clinician review required.
                      </div>

                      {safetyData.allergyConflicts?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-red-700">Allergy Conflicts</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.allergyConflicts.map((a:any, i:number) => (
                              <li key={i}>{a.drug} (Allergen: {a.allergen}) - {a.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {safetyData.drugInteractions?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-orange-700">Drug Interactions</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.drugInteractions.map((a:any, i:number) => (
                              <li key={i}>{a.drugA} + {a.drugB} ({a.severity}) - {a.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {safetyData.contraindications?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-red-700">Contraindications</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.contraindications.map((a:any, i:number) => (
                              <li key={i}>{a.drug} contraindicated for {a.condition} - {a.description}</li>
                            ))}
                          </ul>
                        </div>
                      )}

                      {safetyData.duplicateTherapy?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-orange-700">Duplicate Therapy</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.duplicateTherapy.map((a:string, i:number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}

                      {safetyData.doseConcerns?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-800">Dosing Concerns</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.doseConcerns.map((a:string, i:number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}

                      {safetyData.missingInformation?.length > 0 && (
                        <div>
                          <h4 className="font-bold text-slate-800">Missing Information</h4>
                          <ul className="list-disc pl-5">
                            {safetyData.missingInformation.map((a:string, i:number) => <li key={i}>{a}</li>)}
                          </ul>
                        </div>
                      )}

                      <div className="flex justify-end space-x-3 pt-4 border-t">
                        <Button variant="outline" className="text-red-600 hover:bg-red-50" onClick={() => handleResolveSafety('Rejected')}>
                          Ignore Warnings
                        </Button>
                        <Button className="bg-green-600 hover:bg-green-700" onClick={() => handleResolveSafety('Accepted')}>
                          Accept & Adjust Rx
                        </Button>
                      </div>
                    </>
                  )}
                </div>
              )}
            </div>
          )}

        </div>
      ) : (
        <div className="text-sm text-gray-500 italic p-4 border border-dashed rounded-md text-center">
          No medications prescribed yet.
        </div>
      )}

      {/* Add Medication Form */}
      {isDraft && (
        <div className="mt-4">
          {!isAdding ? (
            <Button variant="outline" className="w-full border-dashed" onClick={() => setIsAdding(true)}>
              + Add Medication
            </Button>
          ) : (
            <div className="border rounded-md p-4 bg-gray-50 space-y-4 relative">
              <Button variant="ghost" size="sm" className="absolute top-2 right-2 text-gray-500" onClick={() => setIsAdding(false)}>
                <X className="w-4 h-4" />
              </Button>
              
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
                <Input 
                  className="pl-9" 
                  placeholder="Search medicine brand or generic name..." 
                  value={query}
                  onChange={e => handleSearch(e.target.value)}
                />
                {searching && <Loader2 className="w-4 h-4 absolute right-3 top-3 animate-spin text-gray-400" />}
                
                {results.length > 0 && (
                  <div className="absolute top-full left-0 right-0 bg-white border shadow-lg rounded-md mt-1 z-10 max-h-60 overflow-y-auto">
                    {results.map(r => (
                      <div 
                        key={r.id} 
                        className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-0"
                        onClick={() => handleSelect(r)}
                      >
                        <div className="font-semibold">{r.brand_name}</div>
                        <div className="text-xs text-gray-500">{r.generic_name} • {r.form} • {r.strength}</div>
                      </div>
                    ))}
                  </div>
                )}
              </div>

              {selectedMed && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-semibold text-gray-600">Dosage</label>
                    <Input 
                      placeholder="e.g. 500mg" 
                      value={formData.dosage}
                      onChange={e => setFormData({...formData, dosage: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-semibold text-gray-600">Frequency</label>
                    <Input 
                      placeholder="e.g. 1-0-1" 
                      value={formData.frequency}
                      onChange={e => setFormData({...formData, frequency: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1">
                    <label className="text-xs font-semibold text-gray-600">Duration (Days)</label>
                    <Input 
                      type="number" 
                      min="1"
                      value={formData.duration_days}
                      onChange={e => setFormData({...formData, duration_days: e.target.value})}
                    />
                  </div>
                  <div className="col-span-2 md:col-span-1 flex items-end">
                    <Button className="w-full bg-indigo-600 hover:bg-indigo-700" onClick={handleAdd} disabled={isPending}>
                      {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : 'Add'}
                    </Button>
                  </div>
                  <div className="col-span-full">
                    <label className="text-xs font-semibold text-gray-600">Instructions</label>
                    <Input 
                      placeholder="e.g. After meals" 
                      value={formData.instructions}
                      onChange={e => setFormData({...formData, instructions: e.target.value})}
                    />
                  </div>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
