import { enforcePermission } from '@/lib/auth/server'
import { getPendingPrescriptions, getActiveBatches, getDispenseHistory } from '@/lib/services/pharmacy.service'
import { PharmacyClient } from './_components/pharmacy-client'

export default async function PharmacyPage() {
  // Pharmacy usually needs specific perm but we'll use opd.view for demo
  await enforcePermission('opd.view') 
  
  const pending = await getPendingPrescriptions()
  const batches = await getActiveBatches()
  const history = await getDispenseHistory()

  return <PharmacyClient pending={pending} batches={batches} history={history} />
}
