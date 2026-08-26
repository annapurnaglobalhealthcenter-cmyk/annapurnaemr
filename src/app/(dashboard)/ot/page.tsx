import { createClient } from '@/lib/supabase/server'
import { enforcePermission } from '@/lib/auth/server'
import { getOtSchedules } from '@/lib/services/ot.service'
import { OTWorkspaceClient } from './_components/ot-workspace-client'
import { Calendar, ShieldAlert } from 'lucide-react'

export default async function OTWorkspacePage() {
  await enforcePermission('ot.view')
  const schedules = await getOtSchedules()

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-sm border">
        <h1 className="text-2xl font-bold tracking-tight text-gray-900 flex items-center">
          <Calendar className="w-8 h-8 mr-3 text-indigo-600" />
          Operation Theatre (OT) Scheduling & Live Board
        </h1>
        <p className="text-gray-500 mt-2">Manage surgical schedules, Pre-Anesthetic Checkups (PAC), Intra-Op logs, and Post-Op PACU.</p>
      </div>

      <div className="bg-yellow-50 text-yellow-800 p-4 rounded-lg border border-yellow-200 flex items-start">
        <ShieldAlert className="w-5 h-5 mr-3 mt-0.5 shrink-0" />
        <div className="text-sm">
          <strong>Strict Clinical Tracking Enforced:</strong> 
          <ul className="list-disc pl-5 mt-1 space-y-1">
            <li>A surgery cannot proceed to <strong>In Progress</strong> until Anesthesia marks the PAC as <strong>Fit</strong>.</li>
            <li>Intra-op records strictly log Incision Time and Anesthesia Start Time for audit purposes.</li>
            <li>Post-op PACU vitals must be recorded before transferring the patient back to the ward.</li>
          </ul>
        </div>
      </div>

      <OTWorkspaceClient initialSchedules={schedules} />
    </div>
  )
}
