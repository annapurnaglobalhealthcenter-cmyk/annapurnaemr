'use server'

import { createClient } from '../supabase/server'
import { revalidatePath } from 'next/cache'

export async function getBloodInventory() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blood_inventory')
    .select('*, blood_donors (first_name, last_name)')
    .order('expiry_date', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getBloodRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blood_requests')
    .select(
      *,
      patients (first_name, last_name, identity_records(identity_type, identity_value)),
      user_profiles!requested_by (full_name)
    )
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getBloodDonors() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('blood_donors')
    .select('*')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}
