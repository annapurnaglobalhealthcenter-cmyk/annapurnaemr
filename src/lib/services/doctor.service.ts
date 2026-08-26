'use server'

import { createClient } from '../supabase/server'
import { startOfDay, endOfDay } from 'date-fns'

export async function getDoctorDashboardStats() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error("Unauthorized")

  const todayStart = startOfDay(new Date()).toISOString()
  const todayEnd = endOfDay(new Date()).toISOString()

  const { data: appointments, error } = await supabase
    .from('appointments')
    .select(`
      id, status, token_number, appointment_time, appointment_type,
      patients (id, first_name, last_name, identity_records(identity_type, identity_value))
    `)
    .eq('provider_id', user.id)
    .gte('appointment_time', todayStart)
    .lte('appointment_time', todayEnd)
    .not('status', 'in', '("Cancelled","No-show")')
    .order('queue_position', { ascending: true, nullsFirst: false })
    .order('appointment_time', { ascending: true })

  if (error) throw new Error(error.message)

  return {
    appointments: appointments || [],
    waiting: appointments?.filter(a => ['Checked-in', 'Waiting'].includes(a.status)) || [],
    current: appointments?.filter(a => a.status === 'In Consultation') || [],
    completed: appointments?.filter(a => a.status === 'Completed') || [],
  }
}
