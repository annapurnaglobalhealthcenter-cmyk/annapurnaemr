-- 1. Expand Patients Table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pin TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB;

-- 2. Longitudinal Tables
CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    severity TEXT NOT NULL, -- Mild, Moderate, Severe
    reaction TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    diagnosis_date DATE,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Resolved, Chronic
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT, -- ID, Lab Report, Old Record
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- Registration, Admission, Discharge, Diagnosis
    description TEXT NOT NULL,
    actor_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Robust UHID Generation Sequence and RPC
CREATE SEQUENCE IF NOT EXISTS uhid_sequence START 10001;

CREATE OR REPLACE FUNCTION public.register_patient(
    p_first_name TEXT,
    p_last_name TEXT,
    p_dob DATE,
    p_gender TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pin TEXT,
    p_blood_group TEXT,
    p_emergency_contact JSONB,
    p_abha_number TEXT
) RETURNS UUID AS $$
DECLARE
    new_patient_id UUID;
    new_uhid TEXT;
    seq_val INT;
    date_prefix TEXT;
BEGIN
    -- Only allow if user has permission
    IF NOT public.has_permission('patient.create') THEN
        RAISE EXCEPTION 'Access Denied: Missing patient.create permission';
    END IF;

    -- 1. Insert Patient
    INSERT INTO public.patients (
        first_name, last_name, date_of_birth, gender, 
        phone_number, email, address, city, state, pin, 
        blood_group, emergency_contact, created_by
    ) VALUES (
        p_first_name, p_last_name, p_dob, p_gender,
        p_phone, p_email, p_address, p_city, p_state, p_pin,
        p_blood_group, p_emergency_contact, auth.uid()
    ) RETURNING id INTO new_patient_id;

    -- 2. Generate UHID (Format: UHID-YYMM-XXXXX)
    date_prefix := to_char(CURRENT_DATE, 'YYMM');
    seq_val := nextval('uhid_sequence');
    new_uhid := 'UHID-' || date_prefix || '-' || seq_val::TEXT;

    -- 3. Insert UHID Identity
    INSERT INTO public.identity_records (patient_id, identity_type, identity_value, is_primary)
    VALUES (new_patient_id, 'UHID', new_uhid, true);

    -- 4. Insert ABHA if provided
    IF p_abha_number IS NOT NULL AND p_abha_number != '' THEN
        INSERT INTO public.identity_records (patient_id, identity_type, identity_value, is_primary)
        VALUES (new_patient_id, 'ABHA', p_abha_number, false);
    END IF;

    -- 5. Add Timeline Event
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (new_patient_id, 'Registration', 'Patient registered and UHID assigned', auth.uid());

    RETURN new_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS for new tables
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_timeline ENABLE ROW LEVEL SECURITY;

-- Note: In a real system, these would use public.has_permission() deeply, 
-- but for now we enforce basic authenticated access to prevent UI breaks,
-- since the RPC handles the strict permission enforcement for creation.
CREATE POLICY "View allergies" ON public.patient_allergies FOR SELECT TO authenticated USING (public.has_permission('patient.view'));
CREATE POLICY "Manage allergies" ON public.patient_allergies FOR ALL TO authenticated USING (public.has_permission('patient.edit'));

CREATE POLICY "View conditions" ON public.patient_conditions FOR SELECT TO authenticated USING (public.has_permission('patient.view'));
CREATE POLICY "Manage conditions" ON public.patient_conditions FOR ALL TO authenticated USING (public.has_permission('patient.edit'));

CREATE POLICY "View timeline" ON public.patient_timeline FOR SELECT TO authenticated USING (public.has_permission('patient.view'));

-- Tighten the Patients Policy based on expanded RBAC
DROP POLICY IF EXISTS "Authenticated users can select patients" ON public.patients;
CREATE POLICY "Users with patient.view can select" ON public.patients FOR SELECT TO authenticated USING (public.has_permission('patient.view'));

DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
CREATE POLICY "Users with patient.edit can update" ON public.patients FOR UPDATE TO authenticated USING (public.has_permission('patient.edit'));
