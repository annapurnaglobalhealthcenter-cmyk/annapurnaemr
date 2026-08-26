-- Clinical Records (The main document for an encounter)
CREATE TABLE public.clinical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id),
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Finalized, Amended
    parent_record_id UUID REFERENCES public.clinical_records(id), -- For amendments
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    examination_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES public.user_profiles(id)
);

-- Vitals
CREATE TABLE public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    temperature_c NUMERIC,
    spo2_percent INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES public.user_profiles(id)
);

-- Diagnoses
CREATE TABLE public.diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    code TEXT, -- e.g., ICD-10 or SNOMED
    code_system TEXT,
    certainty TEXT DEFAULT 'Provisional', -- Provisional, Confirmed, Refuted
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medications (Prescriptions)
CREATE TABLE public.medication_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    route TEXT,
    duration_days INTEGER,
    instructions TEXT,
    status TEXT DEFAULT 'Active', -- Active, Discontinued, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_prescriptions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Authenticated users can select clinical_records" ON public.clinical_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clinical_records" ON public.clinical_records FOR INSERT TO authenticated WITH CHECK (true);

-- IMPORTANT: Prevent updates to Finalized or Amended records
CREATE POLICY "Prevent updates to finalized records" 
    ON public.clinical_records 
    FOR UPDATE TO authenticated 
    USING (status = 'Draft')
    WITH CHECK (status IN ('Draft', 'Finalized')); 
    -- Allows transitioning from Draft to Finalized, but if it's already Finalized, the USING clause blocks it.

CREATE POLICY "Authenticated users can select vitals" ON public.vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vitals" ON public.vitals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vitals" ON public.vitals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select diagnoses" ON public.diagnoses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diagnoses" ON public.diagnoses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update diagnoses" ON public.diagnoses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select medications" ON public.medication_prescriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert medications" ON public.medication_prescriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update medications" ON public.medication_prescriptions FOR UPDATE TO authenticated USING (true);
