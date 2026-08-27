'use server'

import { createClient } from '../supabase/server'

export async function getStaffShifts() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('staff_shifts')
    .select('*, user_profiles (first_name, last_name, role), departments (name)')
    .order('shift_date', { ascending: false })
    .limit(100)

  if (error) throw new Error(error.message)
  return data || []
}

export async function getLeaveRequests() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('leave_requests')
    .select('*, user_profiles!user_id (first_name, last_name, role), user_profiles!approved_by (first_name, last_name)')
    .order('created_at', { ascending: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getStaffDirectory() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('user_profiles')
    .select('*')
    .order('first_name', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}
