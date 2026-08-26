'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { generateDischargeDraft, processDischarge } from '@/lib/services/discharge.service'
import { toast } from 'sonner'
import { Loader2, ArrowLeft, Wand2, FileCheck2 } from 'lucide-react'
import Link from 'next/link'

export function DischargeClient({ admission }: { admission: any }) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()
  
  const [summary, setSummary] = useState('')
  const [isGenerating, setIsGenerating] = useState(false)

  const handleGenerate = async () => {
    setIsGenerating(true)
    try {
      const draft = await generateDischargeDraft(admission.encounter_id)
      setSummary(draft)
      toast.success('AI-assisted draft generated successfully.')
    } catch (err: any) {
      toast.error('Failed to generate draft: ' + err.message)
    } finally {
      setIsGenerating(false)
    }
  }

  const handleFinalize = () => {
    if (!summary.trim()) return toast.error('Discharge summary cannot be empty.')
    
    if (!confirm('Are you sure you want to finalize this discharge? The patient will be checked out and the bed will be released for housekeeping.')) {
      return
    }

    startTransition(async () => {
      try {
        await processDischarge(
          admission.id,
          admission.encounter_id,
          admission.patient_id,
          summary
        )
        toast.success('Patient successfully discharged!')
        router.push('/ipd')
        router.refresh()
      } catch (err: any) {
        toast.error('Discharge failed: ' + err.message)
      }
    })
  }

  const uhid = admission.patients?.identity_records?.find((ir:any)=>ir.identity_type==='UHID')?.identity_value

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div className="flex items-center space-x-4 border-b pb-4">
        <Link href={`/ipd/${admission.id}`}>
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">Process Discharge</h1>
          <p className="text-sm text-gray-500 mt-1">
            {admission.patients?.first_name} {admission.patients?.last_name} · {uhid}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-lg border shadow-sm p-6 space-y-6">
        <div className="flex justify-between items-center border-b pb-3">
          <h2 className="font-semibold text-lg text-gray-800">Discharge Summary</h2>
          <Button 
            variant="outline" 
            onClick={handleGenerate} 
            disabled={isGenerating || isPending}
            className="text-purple-600 border-purple-200 hover:bg-purple-50"
          >
            {isGenerating ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <Wand2 className="w-4 h-4 mr-2" />}
            Auto-generate Summary
          </Button>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            Clinical Summary & Follow-up Instructions
          </label>
          <textarea
            className="w-full min-h-[400px] p-4 border rounded-md font-mono text-sm leading-relaxed"
            placeholder="Click 'Auto-generate' or manually enter the discharge summary here..."
            value={summary}
            onChange={e => setSummary(e.target.value)}
            disabled={isPending}
          />
          <p className="text-xs text-gray-500 mt-2">
            This summary will be permanently saved to the patient's clinical record upon discharge.
          </p>
        </div>

        <div className="flex justify-end pt-4 border-t gap-3">
          <Link href={`/ipd/${admission.id}`}>
            <Button variant="outline" disabled={isPending}>Cancel</Button>
          </Link>
          <Button 
            onClick={handleFinalize} 
            disabled={isPending || !summary.trim()}
            className="bg-red-600 hover:bg-red-700"
          >
            {isPending ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <FileCheck2 className="w-4 h-4 mr-2" />}
            Finalize & Checkout Patient
          </Button>
        </div>
      </div>
    </div>
  )
}
