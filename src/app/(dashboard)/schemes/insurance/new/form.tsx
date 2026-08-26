'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { createInsuranceClaim } from '@/lib/services/schemes.service'
import { toast } from 'sonner'
import { Loader2, ArrowLeft } from 'lucide-react'

interface Provider {
  id: string
  name: string
  is_active: boolean | null
}

export function NewInsuranceClaimForm({ providers }: { providers: Provider[] }) {
  const router = useRouter()
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault()
    setIsSubmitting(true)

    const fd = new FormData(e.currentTarget)
    const patientId = fd.get('patient_id') as string
    const providerId = fd.get('provider_id') as string
    const policyNumber = fd.get('policy_number') as string
    const memberId = fd.get('member_id') as string
    const claimAmount = parseFloat(fd.get('claim_amount') as string)

    if (!patientId.trim() || !providerId || !policyNumber.trim()) {
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
      await createInsuranceClaim(patientId, null, providerId, policyNumber, memberId, claimAmount)
      toast.success('Insurance claim created successfully.')
      router.push('/schemes')
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to create insurance claim.')
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
          <h1 className="text-2xl font-bold tracking-tight text-gray-900">New Insurance Claim</h1>
          <p className="text-sm text-gray-500 mt-0.5">Register a new TPA / private insurance claim.</p>
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
          <Label htmlFor="provider_id">Insurance Provider *</Label>
          <select
            id="provider_id"
            name="provider_id"
            required
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">-- Select Provider --</option>
            {providers.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
          {providers.length === 0 && (
            <p className="text-xs text-amber-600">No active insurance providers found. Please add providers first.</p>
          )}
        </div>

        <div className="space-y-2">
          <Label htmlFor="policy_number">Policy Number *</Label>
          <Input
            id="policy_number"
            name="policy_number"
            placeholder="e.g. MED/2024/001234"
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="member_id">Member ID</Label>
          <Input
            id="member_id"
            name="member_id"
            placeholder="e.g. MBR-12345"
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
            placeholder="e.g. 50000.00"
            required
          />
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Link href="/schemes">
            <Button type="button" variant="outline">Cancel</Button>
          </Link>
          <Button type="submit" disabled={isSubmitting} className="bg-green-600 hover:bg-green-700">
            {isSubmitting && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            Submit Claim
          </Button>
        </div>
      </form>
    </div>
  )
}
