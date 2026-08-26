'use server'

import { createClient } from '../supabase/server'

export async function getChargeMaster() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_charge_master')
    .select('*')
    .order('category')
    .order('charge_code')

  if (error) throw new Error(error.message)
  return data
}

export async function getPaymentMethods() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('billing_payment_methods')
    .select('*')
    .eq('is_active', true)

  if (error) throw new Error(error.message)
  return data
}
