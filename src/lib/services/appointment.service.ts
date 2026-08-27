'use server'

import { createClient } from '../supabase/server'
import { addMinutes, format, parseISO, startOfDay, endOfDay } from 'date-fns'

// ─── Departments & Doctors ───────────────────────────────────

export async function getDepartments() {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('departments')
    .select('*')
    .eq('is_active', true)
    .order('name')
  if (error) throw new Error(error.message)
  return data || []
}

export async function getDoctorsByDepartment(departmentId: string) {
  const supabase = await createClient()
  // Doctors who have a schedule in this department
  const { data, error } = await supabase
    .from('doctor_schedules')
    .select('doctor_id, user_profiles!inner(id, full_name, role)')
    .eq('department_id', departmentId)
    .eq('is_active', true)
  if (error) throw new Error(error.message)

  // Deduplicate doctors
  const seen = new Set<string>()
  return (data || []).filter(row => {
    if (seen.has(row.doctor_id)) return false
    seen.add(row.doctor_id)
    return true
  })
}

export async function getDoctorSchedule(doctorId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('doctor_schedules')
    .select('*, departments(name)')
    .eq('doctor_id', doctorId)
    .eq('is_active', true)
    .order('day_of_week')
  if (error) throw new Error(error.message)
  return data || []
}

// ─── Slot Generation ─────────────────────────────────────────

export async function getAvailableSlots(doctorId: string, dateStr: string): Promise<string[]> {
  const supabase = await createClient()
  const date = parseISO(dateStr)
  const dayOfWeek = date.getDay()

  // Get doctor's schedule for this day
  const { data: schedules } = await supabase
    .from('doctor_schedules')
    .select('*')
    .eq('doctor_id', doctorId)
    .eq('day_of_week', dayOfWeek)
    .eq('is_active', true)

  if (!schedules || schedules.length === 0) return []

  const schedule = schedules[0]

  // Generate all possible slots
  const slots: string[] = []
  const [startHour, startMin] = schedule.start_time.split(':').map(Number)
  const [endHour, endMin] = schedule.end_time.split(':').map(Number)

  let current = new Date(date)
  current.setHours(startHour, startMin, 0, 0)
  const end = new Date(date)
  end.setHours(endHour, endMin, 0, 0)

  while (current < end) {
    slots.push(current.toISOString())
    current = addMinutes(current, schedule.slot_duration_minutes)
  }

  // Fetch already booked slots for this day
  const { data: booked } = await supabase
    .from('appointments')
    .select('appointment_time')
    .eq('provider_id', doctorId)
    .gte('appointment_time', startOfDay(date).toISOString())
    .lte('appointment_time', endOfDay(date).toISOString())
    .not('status', 'in', '("Cancelled","No-show")')

  const bookedTimes = new Set((booked || []).map(b => new Date(b.appointment_time).toISOString()))
  return slots.filter(s => !bookedTimes.has(s))
}

// ─── Booking & Check-in ──────────────────────────────────────

export async function bookAppointment(
  patientId: string,
  providerId: string,
  departmentId: string,
  slotTime: string,
  notes?: string,
  appointmentType: 'Scheduled' | 'Walk-in' = 'Scheduled'
) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('book_appointment', {
    p_patient_id: patientId,
    p_provider_id: providerId,
    p_department_id: departmentId,
    p_slot_time: slotTime,
    p_notes: notes ?? null,
    p_appointment_type: appointmentType
  })
  if (error) throw new Error(error.message)
  return data as string // appointment ID
}

export async function checkInAppointment(appointmentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase.rpc('checkin_appointment', {
    p_appointment_id: appointmentId
  })
  if (error) throw new Error(error.message)
  return data as string // token number e.g. T-003
}

export async function updateAppointmentStatus(
  appointmentId: string,
  newStatus: 'Waiting' | 'In Consultation' | 'Completed' | 'Cancelled' | 'No-show',
  notes?: string
) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) throw new Error('Unauthorized')

  const { data: appt } = await supabase
    .from('appointments')
    .select('status')
    .eq('id', appointmentId)
    .single()

  await supabase.from('appointments').update({
    status: newStatus,
    updated_at: new Date().toISOString()
  }).eq('id', appointmentId)

  await supabase.from('appointment_audit_log').insert({
    appointment_id: appointmentId,
    old_status: appt?.status ?? null,
    new_status: newStatus,
    changed_by: user.id,
    notes: notes ?? null
  })
}

// ─── Queue & Listing ─────────────────────────────────────────

export async function getQueue(doctorId: string, dateStr?: string) {
  const supabase = await createClient()
  const targetDate = dateStr ? parseISO(dateStr) : new Date()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, token_number, queue_position, status, check_in_time, appointment_time, appointment_type, notes,
      patients(id, first_name, last_name, phone_number, identity_records(identity_type, identity_value))
    `)
    .eq('provider_id', doctorId)
    .gte('appointment_time', startOfDay(targetDate).toISOString())
    .lte('appointment_time', endOfDay(targetDate).toISOString())
    .not('status', 'in', '("Cancelled","No-show")')
    .order('queue_position', { ascending: true, nullsFirst: false })
    .order('appointment_time', { ascending: true })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getDepartmentQueue(departmentId: string, dateStr?: string) {
  const supabase = await createClient()
  const targetDate = dateStr ? parseISO(dateStr) : new Date()

  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, token_number, queue_position, status, check_in_time, appointment_time, appointment_type,
      patients(first_name, last_name, phone_number, identity_records(identity_type, identity_value)),
      user_profiles!provider_id(full_name)
    `)
    .eq('department_id', departmentId)
    .gte('appointment_time', startOfDay(targetDate).toISOString())
    .lte('appointment_time', endOfDay(targetDate).toISOString())
    .order('queue_position', { ascending: true, nullsFirst: false })

  if (error) throw new Error(error.message)
  return data || []
}

export async function getPatientAppointmentHistory(patientId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, appointment_time, appointment_type, status, token_number, notes,
      departments(name),
      user_profiles!provider_id(full_name)
    `)
    .eq('patient_id', patientId)
    .order('appointment_time', { ascending: false })
    .limit(50)
  if (error) throw new Error(error.message)
  return data || []
}

export async function getTodayAppointments(dateStr?: string) {
  const supabase = await createClient()
  const targetDate = dateStr ? parseISO(dateStr) : new Date()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      id, token_number, status, appointment_time, appointment_type,
      patients(first_name, last_name, identity_records(identity_type, identity_value)),
      departments(name),
      user_profiles!provider_id(full_name)
    `)
    .gte('appointment_time', startOfDay(targetDate).toISOString())
    .lte('appointment_time', endOfDay(targetDate).toISOString())
    .order('appointment_time', { ascending: true })
  if (error) throw new Error(error.message)
  return data || []
}

export async function getAppointmentById(id: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointments')
    .select(`
      *,
      patients(*, identity_records(*)),
      departments(name),
      user_profiles!provider_id(full_name)
    `)
    .eq('id', id)
    .single()
  if (error) throw new Error(error.message)
  return data
}

export async function getAppointmentAuditLog(appointmentId: string) {
  const supabase = await createClient()
  const { data, error } = await supabase
    .from('appointment_audit_log')
    .select('*, user_profiles!changed_by(full_name)')
    .eq('appointment_id', appointmentId)
    .order('created_at', { ascending: false })
  if (error) throw new Error(error.message)
  return data || []
}
