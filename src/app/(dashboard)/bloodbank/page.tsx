import { enforcePermission } from '@/lib/auth/server'
import { getBloodInventory, getBloodRequests, getBloodDonors } from '@/lib/services/bloodbank.service'
import { BloodBankClient } from './_components/bloodbank-client'

export default async function BloodBankPage() {
  await enforcePermission('opd.view') // Broad permission for demo

  const inventory = await getBloodInventory()
  const requests = await getBloodRequests()
  const donors = await getBloodDonors()

  return <BloodBankClient initialInventory={inventory} initialRequests={requests} initialDonors={donors} />
}
