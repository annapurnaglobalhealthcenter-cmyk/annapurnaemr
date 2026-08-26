'use server'

import { createClient } from '../supabase/server'

export async function getDepartmentOrders(department: 'Laboratory' | 'Radiology', statusFilter?: string) {
  const supabase = await createClient()

  let query = supabase
    .from('investigation_orders')
    .select(`
      *,
      patients (id, first_name, last_name, gender, date_of_birth, identity_records(identity_type, identity_value)),
      user_profiles!ordered_by (full_name),
      investigation_results (*)
    `)
    .eq('department', department)
    .order('created_at', { ascending: false })
    .limit(100)

  if (statusFilter && statusFilter !== 'All') {
    query = query.eq('status', statusFilter)
  }

  const { data, error } = await query

  if (error) throw new Error(error.message)
  return data
}

export async function updateOrderStatus(orderId: string, newStatus: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('investigation_orders')
    .update({ 
      status: newStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', orderId)

  if (error) throw new Error(error.message)
}

export async function searchLabTests(query: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_test_master')
    .select('*')
    .ilike('test_name', `%${query}%`)
    .eq('is_active', true)
    .limit(20)

  if (error) throw new Error(error.message)
  return data
}

export async function getLabTestParameters(testId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('lab_test_parameters')
    .select('*')
    .eq('test_id', testId)
    .order('display_order', { ascending: true })

  if (error) throw new Error(error.message)
  return data
}

export async function submitInvestigationResult(
  orderId: string, 
  parameterName: string, 
  resultValue: string, 
  unit: string = '', 
  referenceRange: string = '', 
  isAbnormal: boolean = false, 
  remarks: string = '',
  criticalFlag: boolean = false
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const { error } = await supabase
    .from('investigation_results')
    .insert({
      order_id: orderId,
      parameter_name: parameterName,
      result_value: resultValue,
      unit,
      reference_range: referenceRange,
      is_abnormal: isAbnormal,
      remarks,
      critical_flag: criticalFlag,
      status: 'Draft'
    })

  if (error) throw new Error(error.message)
}

export async function verifyInvestigationResults(orderId: string, resultIds: string[]) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  // Update results to Verified
  const { error: resErr } = await supabase
    .from('investigation_results')
    .update({
      status: 'Verified',
      verified_by: user.id,
      verified_at: new Date().toISOString()
    })
    .in('id', resultIds)

  if (resErr) throw new Error(resErr.message)

  // Mark order as Completed
  await supabase
    .from('investigation_orders')
    .update({ status: 'Completed', updated_at: new Date().toISOString() })
    .eq('id', orderId)
}

export async function deleteInvestigationResult(resultId: string) {
  const supabase = await createClient()
  const { error } = await supabase
    .from('investigation_results')
    .delete()
    .eq('id', resultId)

  if (error) throw new Error(error.message)
}
