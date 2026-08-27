-- ============================================================
-- Migration: Appointments Scheduling & Queue System
-- ============================================================

-- 1. Departments Master Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE, -- Short code e.g. CARD, ORTHO
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Doctor Schedules (Recurring Weekly Templates)
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
    max_appointments INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, day_of_week, start_time)
);

-- 3. Alter Appointments Table to Full Feature Set
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
    ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Walk-in
    ADD COLUMN IF NOT EXISTS token_number TEXT,
    ADD COLUMN IF NOT EXISTS queue_position INTEGER,
    ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- Update status check to include all statuses
-- (Existing status column already exists, we just ensure proper values)

-- 4. Daily Token Sequences (per doctor per date)
CREATE TABLE IF NOT EXISTS public.daily_token_counters (
    doctor_id UUID REFERENCES public.user_profiles(id),
    token_date DATE NOT NULL,
    last_token INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (doctor_id, token_date)
);

-- 5. Appointment Audit Log (immutable)
CREATE TABLE IF NOT EXISTS public.appointment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- Unique partial index: prevent double-booking same doctor same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_book
    ON public.appointments(provider_id, appointment_time)
    WHERE status NOT IN ('Cancelled', 'No-show');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON public.appointments(appointment_time);

CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON public.appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_provider
    ON public.appointments(provider_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_dept
    ON public.appointments(department_id);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor
    ON public.doctor_schedules(doctor_id);

-- ============================================================
-- ATOMIC RPC: book_appointment
-- Prevents double-booking at DB level
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_patient_id UUID,
    p_provider_id UUID,
    p_department_id UUID,
    p_slot_time TIMESTAMP WITH TIME ZONE,
    p_notes TEXT DEFAULT NULL,
    p_appointment_type TEXT DEFAULT 'Scheduled'
) RETURNS UUID AS $$
DECLARE
    new_appointment_id UUID;
BEGIN
    IF NOT public.has_permission('appointment.create') THEN
        RAISE EXCEPTION 'Access Denied: Missing appointment.create permission';
    END IF;

    -- Insert appointment; unique index will reject duplicates automatically
    INSERT INTO public.appointments (
        patient_id, provider_id, department_id,
        appointment_time, appointment_type, notes,
        status, created_by
    ) VALUES (
        p_patient_id, p_provider_id, p_department_id,
        p_slot_time, p_appointment_type, p_notes,
        'Scheduled', auth.uid()
    ) RETURNING id INTO new_appointment_id;

    -- Audit log
    INSERT INTO public.appointment_audit_log (appointment_id, new_status, changed_by, notes)
    VALUES (new_appointment_id, 'Scheduled', auth.uid(), 'Appointment created');

    -- Patient timeline
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (p_patient_id, 'Appointment', 'Appointment scheduled', auth.uid());

    RETURN new_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ATOMIC RPC: checkin_appointment
-- Assigns a unique daily token per doctor
-- ============================================================
CREATE OR REPLACE FUNCTION public.checkin_appointment(
    p_appointment_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_doctor_id UUID;
    v_patient_id UUID;
    v_today DATE := CURRENT_DATE;
    v_next_token INTEGER;
    v_token_text TEXT;
BEGIN
    -- Fetch doctor from appointment
    SELECT provider_id, patient_id INTO v_doctor_id, v_patient_id
    FROM public.appointments
    WHERE id = p_appointment_id AND status = 'Scheduled';

    IF v_doctor_id IS NULL THEN
        RAISE EXCEPTION 'Appointment not found or not in Scheduled status';
    END IF;

    -- Get/increment daily token counter atomically
    INSERT INTO public.daily_token_counters (doctor_id, token_date, last_token)
    VALUES (v_doctor_id, v_today, 1)
    ON CONFLICT (doctor_id, token_date)
    DO UPDATE SET last_token = daily_token_counters.last_token + 1
    RETURNING last_token INTO v_next_token;

    v_token_text := 'T-' || LPAD(v_next_token::TEXT, 3, '0');

    -- Update appointment
    UPDATE public.appointments SET
        status = 'Checked-in',
        token_number = v_token_text,
        queue_position = v_next_token,
        check_in_time = NOW()
    WHERE id = p_appointment_id;

    -- Audit log
    INSERT INTO public.appointment_audit_log (appointment_id, old_status, new_status, changed_by)
    VALUES (p_appointment_id, 'Scheduled', 'Checked-in', auth.uid());

    -- Patient timeline
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (v_patient_id, 'Check-in', 'Patient checked in, token ' || v_token_text, auth.uid());

    RETURN v_token_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_token_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view departments"
    ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage departments"
    ON public.departments FOR ALL TO authenticated
    USING (public.has_permission('appointment.create'));

CREATE POLICY "Anyone authenticated can view doctor schedules"
    ON public.doctor_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage doctor schedules"
    ON public.doctor_schedules FOR ALL TO authenticated
    USING (public.has_permission('appointment.create'));

-- Tighten appointment RLS to use RBAC
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;

CREATE POLICY "View appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (public.has_permission('appointment.view'));

CREATE POLICY "Audit log is append-only read"
    ON public.appointment_audit_log FOR SELECT TO authenticated
    USING (public.has_permission('appointment.view'));

-- Seed default departments
INSERT INTO public.departments (name, code) VALUES
    ('General Medicine', 'GM'),
    ('Paediatrics', 'PAED'),
    ('Gynaecology & Obstetrics', 'GYNO'),
    ('Orthopaedics', 'ORTHO'),
    ('Cardiology', 'CARD'),
    ('Dermatology', 'DERM'),
    ('Ophthalmology', 'OPTHAL'),
    ('ENT', 'ENT'),
    ('Neurology', 'NEURO'),
    ('Surgery', 'SURG'),
    ('Emergency', 'EMER')
ON CONFLICT (name) DO NOTHING;
