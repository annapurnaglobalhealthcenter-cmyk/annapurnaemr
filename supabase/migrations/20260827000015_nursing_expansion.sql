-- ============================================================
-- Migration: Nursing Module Expansion
-- ============================================================

-- 1. Alter Vitals
-- Allow vitals to be linked directly to an encounter/patient without needing a clinical record wrapper
ALTER TABLE public.vitals ADD COLUMN encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE;
ALTER TABLE public.vitals ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.vitals ADD COLUMN recorded_by UUID REFERENCES public.user_profiles(id);

-- Make clinical_record_id nullable so independent nursing vitals can exist
ALTER TABLE public.vitals ALTER COLUMN clinical_record_id DROP NOT NULL;

-- 2. Medication Administration Record (MAR)
CREATE TABLE public.medication_administrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES public.medication_prescriptions(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL, -- Administered, Refused, Missed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Intake / Output (Fluid Balance)
CREATE TABLE public.fluid_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    record_type TEXT NOT NULL, -- Intake, Output
    fluid_type TEXT NOT NULL, -- Oral, IV, Urine, Drain, Emesis
    volume_ml INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 4. Shift Handovers
CREATE TABLE public.shift_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    outgoing_nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    incoming_nurse_id UUID REFERENCES public.user_profiles(id), -- Can be null if broadcasting to shift
    handover_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shift TEXT NOT NULL, -- Morning, Evening, Night
    clinical_summary TEXT NOT NULL,
    pending_tasks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluid_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select nursing" ON public.medication_administrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nursing" ON public.medication_administrations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select fluid" ON public.fluid_balance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fluid" ON public.fluid_balance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select handover" ON public.shift_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert handover" ON public.shift_handovers FOR INSERT TO authenticated WITH CHECK (true);
