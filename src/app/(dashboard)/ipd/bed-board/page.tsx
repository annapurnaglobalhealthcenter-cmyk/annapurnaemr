import { enforcePermission } from '@/lib/auth/server'
import { getBedBoard } from '@/lib/services/ipd.service'
import { BedBoardClient } from './_components/bed-board-client'

export default async function BedBoardPage() {
  await enforcePermission('ipd.view')
  
  const floors = await getBedBoard()

  return <BedBoardClient initialFloors={floors} />
}
