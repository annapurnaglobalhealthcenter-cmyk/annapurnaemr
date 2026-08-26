import { enforcePermission } from '@/lib/auth/server'
import { getPmjayCases, getInsuranceClaims } from '@/lib/services/schemes.service'
import { SchemesClient, type PmjayRow, type InsuranceRow } from './_components/schemes-client'

export default async function SchemesPage() {
  await enforcePermission('pmjay.manage')

  const [pmjayCases, insuranceClaims] = await Promise.all([
    getPmjayCases(),
    getInsuranceClaims(),
  ])

  return (
    <SchemesClient
      pmjayCases={(pmjayCases ?? []) as unknown as PmjayRow[]}
      insuranceClaims={(insuranceClaims ?? []) as unknown as InsuranceRow[]}
    />
  )
}