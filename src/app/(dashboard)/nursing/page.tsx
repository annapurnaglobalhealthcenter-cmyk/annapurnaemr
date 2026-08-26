import { enforcePermission } from '@/lib/auth/server'
import { getNursingDashboard } from '@/lib/services/nursing.service'
import { NursingClient } from './_components/nursing-client'

export default async function NursingPage() {
  await enforcePermission('ipd.view') 
  
  const patients = await getNursingDashboard()

  return <NursingClient initialPatients={patients} />
}
