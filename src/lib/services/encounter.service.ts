import { createClient } from '../supabase/server'
import { Database } from '@/types/database.types'

type AppointmentInsert = Database['public']['Tables']['appointments']['Insert']
type EncounterInsert = Database['public']['Tables']['encounters']['Insert']

export async function createAppointment(appointmentData: AppointmentInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('appointments')
    .insert(appointmentData)
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to create appointment: ${error.message}`)
  }

  return data
}

export async function startEncounter(encounterData: EncounterInsert) {
  const supabase = await createClient()

  const { data, error } = await supabase
    .from('encounters')
    .insert({
      ...encounterData,
      status: 'In-Progress',
      start_time: new Date().toISOString()
    })
    .select()
    .single()

  if (error) {
    throw new Error(`Failed to start encounter: ${error.message}`)
  }

  // Update appointment status if this encounter originated from an appointment
  if (encounterData.appointment_id) {
    await supabase
      .from('appointments')
      .update({ status: 'Completed' })
      .eq('id', encounterData.appointment_id)
  }

  return data
}
