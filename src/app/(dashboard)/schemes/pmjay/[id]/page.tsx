import { enforcePermission } from '@/lib/auth/server'
import { getPmjayCaseDetails, getPmjayPackages } from '@/lib/services/pmjay.service'
import { notFound } from 'next/navigation'
import { PmjayDetailClient } from './_components/pmjay-detail-client'

export default async function PmjayCasePage({ params }: { params: Promise<{ id: string }> }) {
  await enforcePermission('pmjay.manage')
  const { id } = await params

  let pmjayCase;
  let packages;
  try {
    pmjayCase = await getPmjayCaseDetails(id)
    packages = await getPmjayPackages()
  } catch (e) {
    notFound()
  }
  return <PmjayDetailClient initialCase={pmjayCase} packages={packages} />
}
