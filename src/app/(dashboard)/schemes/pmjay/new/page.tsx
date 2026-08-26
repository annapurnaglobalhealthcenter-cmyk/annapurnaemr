'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createPmjayCase } from '@/lib/services/schemes.service'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

export default function NewPmjayCasePage() {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const fd = new FormData(e.currentTarget)
    const patientId = fd.get('patient_id') as string
    const urn = fd.get('urn') as string
    const packageCode = fd.get('package_code') as string
    const claimAmount = parseFloat(fd.get('claim_amount') as string)

    if (!patientId.trim() || !urn.trim() || !packageCode.trim()) {
      toast.error('Please fill in all required fields.')
      setIsSubmitting(false)
      return
    }
    if (isNaN(claimAmount) || claimAmount <= 0) {
      toast.error('Claim Amount must be a positive number.')
      setIsSubmitting(false)
      return
    }

    try {
      await createPmjayCase(patientId, null, urn, packageCode, claimAmount)
      toast.success('PM-JAY case created successfully.')
      router.push('/schemes')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create PM-JAY case.')
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <div className="flex items-center gap-3 border-b pb-4">
        <Link href="/schemes">
          <Button variant="ghost" size="sm" className="p-0 h-auto">
            <ArrowLeft className="w-4 h-4 mr-1" /> Back
          </Button>
        </Link>
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">New PM-JAY Case</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a new Pradhan Mantri Jan Arogya Yojana case.</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white rounded-lg border shadow-sm p-6 space-y-5">
        <div className="space-y-2">
          <Label htmlFor="patient_id">Patient ID (UUID) *</Label>
          <Input
            id="patient_id"
            name="patient_id"
            placeholder="e.g. 550e8400-e29b-41d4-a716-446655440000"
            required
          />
          <p className="text-xs text-gray-400">Copy from the patient profile URL or record.</p>
        </div>

        <div className="space-y-2">
          <Label htmlFor="urn">URN (Beneficiary ID) *</Label>
          <Input
            id="urn"
            name="urn"
            placeholder="e.g. PB24000012345"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="package_code">Package Code *</Label>
          <Input
            id="package_code"
            name="package_code"
            placeholder="e.g. H0001001"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="claim_amount">Claim Amount (?) *</Label>
          <Input
            id="claim_amount"
            name="claim_amount"
            type="number"
            min={1}
            step="0.01"
            placeholder="e.g. 25000.00"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/schemes">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit PM-JAY Case
          </Button>
        </div>
      </form>
    </div>
  )
}
