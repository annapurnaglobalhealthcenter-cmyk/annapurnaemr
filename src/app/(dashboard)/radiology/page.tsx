import { enforcePermission } from '@/lib/auth/server'
import { getRadiologyOrders } from '@/lib/services/radiology.service'
import { RadiologyClient } from './_components/radiology-client'

export default async function RadiologyPage() {
  await enforcePermission('opd.view') 
  
  const orders = await getRadiologyOrders()

  return <RadiologyClient initialOrders={orders} />
}
