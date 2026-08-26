import { createClient } from '@/lib/supabase/server'
import { notFound, redirect } from 'next/navigation'
import { enforcePermission } from '@/lib/auth/server'
import { DischargeClient } from './_components/discharge-client'
import { AiDischargeAssistant } from '../_components/ai-discharge-assistant'

export default async function IPDDischargePage({
  params
}: {
  params: Promise<{ id: string }>
}) {
  await enforcePermission('ipd.manage')
  const { id: admissionId } = await params
  
  const supabase = await createClient()

  // Fetch admission and encounter mapping
  const { data: admission } = await supabase
    .from('admissions')
    .select(`
      *,
      patients (*, identity_records(*))
    `)
    .eq('id', admissionId)
    .single()

  if (!admission) notFound()

  // If already discharged, redirect back
  if (admission.actual_discharge_date) {
    redirect(`/ipd/${admissionId}`)
  }

  // Fetch AI analysis
  const { data: aiInteractions } = await supabase
    .from('ai_interactions')
    .select('*')
    .eq('patient_id', admission.patient_id)
    .eq('interaction_type', 'Discharge_Summary')
    .order('created_at', { ascending: false })
    .limit(1)

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <AiDischargeAssistant admissionId={admissionId} initialInteraction={aiInteractions?.[0]} />
      <DischargeClient admission={admission} />
    </div>
  )
}
