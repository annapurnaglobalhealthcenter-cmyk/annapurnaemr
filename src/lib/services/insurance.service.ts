import { createClient } from '../supabase/server'
import { Database } from '@/types/database.types'

type PMJAYCaseInsert = Database['public']['Tables']['pmjay_cases']['Insert']
type InsuranceClaimInsert = Database['public']['Tables']['insurance_claims']['Insert']

export async function initiatePMJAYCase(caseData: PMJAYCaseInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('pmjay_cases')
    .insert(caseData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function initiateInsuranceClaim(claimData: InsuranceClaimInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('insurance_claims')
    .insert(claimData)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}

export async function updatePMJAYStatus(
  caseId: string, 
  preauthStatus: string, 
  claimStatus: string, 
  approvedAmount?: number
) {
  const supabase = await createClient()

  const updatePayload: Record<string, unknown> = {
    preauth_status: preauthStatus,
    claim_status: claimStatus
  }
  
  if (approvedAmount !== undefined) {
    updatePayload.approved_amount = approvedAmount
  }

  const { data, error } = await supabase
    .from('pmjay_cases')
    .update(updatePayload)
    .eq('id', caseId)
    .select()
    .single()

  if (error) throw new Error(error.message)
  return data
}
