import { getInsuranceProviders } from '@/lib/services/schemes.service'
import { NewInsuranceClaimForm } from './form'

export default async function NewInsuranceClaimPage() {
  const rawProviders = await getInsuranceProviders()
  const providers = (rawProviders ?? []).map((p) => ({
    id: p.id,
    name: p.name,
    is_active: p.is_active,
  }))
  return <NewInsuranceClaimForm providers={providers} />
}