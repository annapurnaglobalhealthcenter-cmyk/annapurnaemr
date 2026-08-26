import { enforcePermission } from '@/lib/auth/server'
import { getClaimDetails } from '@/lib/services/schemes.service'
import { notFound } from 'next/navigation'
import { ClaimDetailClient } from './_components/claim-detail-client'

export default async function InsuranceClaimPage({ params }: { params: Promise<{ id: string }> }) {
  await enforcePermission('pmjay.manage')
  const { id } = await params

  let claim;
  try {
    claim = await getClaimDetails(id)
  } catch (e) {
    notFound()
  }
  return <ClaimDetailClient initialClaim={claim} />
}
