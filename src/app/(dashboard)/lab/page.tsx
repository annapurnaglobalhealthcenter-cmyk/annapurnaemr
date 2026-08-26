import { enforcePermission } from '@/lib/auth/server'
import { getDepartmentOrders } from '@/lib/services/investigation.service'
import { LabClient } from './_components/lab-client'

export default async function LabPage({
  searchParams
}: {
  searchParams: Promise<{ status?: string }>
}) {
  await enforcePermission('opd.view') // Replace with lab permission when available
  
  const status = (await searchParams).status || 'Pending'
  
  // We fetch 'All' and filter on client, or fetch specific. Let's just fetch all to allow fast client-side tab switching
  const orders = await getDepartmentOrders('Laboratory')

  return <LabClient initialOrders={orders} />
}
