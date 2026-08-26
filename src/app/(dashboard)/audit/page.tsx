import { enforcePermission } from '@/lib/auth/server'
import { getClinicalAuditLogs, getAppointmentAuditLogs } from '@/lib/services/audit.service'
import { AuditClient } from './_components/audit-client'

export default async function AuditPage() {
  // Ideally this would be 'audit.view' or 'system.manage'
  await enforcePermission('patient.view') 
  
  const [clinicalLogs, appointmentLogs] = await Promise.all([
    getClinicalAuditLogs(),
    getAppointmentAuditLogs()
  ])

  return <AuditClient clinicalLogs={clinicalLogs} appointmentLogs={appointmentLogs} />
}
