import { enforcePermission } from '@/lib/auth/server'
import { getStaffShifts, getLeaveRequests, getStaffDirectory } from '@/lib/services/hr.service'
import { HRClient } from './_components/hr-client'

export default async function HRPage() {
  await enforcePermission('opd.view') // Broad permission for demo

  const shifts = await getStaffShifts()
  const leaves = await getLeaveRequests()
  const staff = await getStaffDirectory()

  return <HRClient initialShifts={shifts} initialLeaves={leaves} initialStaff={staff} />
}
