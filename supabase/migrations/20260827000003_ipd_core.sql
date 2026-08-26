-- Wards & Rooms
CREATE TABLE public.wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT, -- General, ICU, NICU, Private, etc.
    capacity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beds
CREATE TABLE public.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES public.wards(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available', -- Available, Occupied, Maintenance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ward_id, bed_number)
);

-- Admissions (Extension of encounters)
CREATE TABLE public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    attending_provider_id UUID REFERENCES public.user_profiles(id),
    admission_reason TEXT NOT NULL,
    expected_discharge_date TIMESTAMP WITH TIME ZONE,
    actual_discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_summary_id UUID REFERENCES public.clinical_records(id), -- Final discharge summary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bed Allocations
CREATE TABLE public.bed_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES public.beds(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Transferred, Discharged
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Progress Notes (Doctor's Notes)
CREATE TABLE public.daily_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Finalized
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE
);

-- Nursing Records
CREATE TABLE public.nursing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    nurse_id UUID REFERENCES public.user_profiles(id),
    shift TEXT, -- Morning, Evening, Night
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
CREATE POLICY "Authenticated users can select wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select beds" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update beds" ON public.beds FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select admissions" ON public.admissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert admissions" ON public.admissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update admissions" ON public.admissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select allocations" ON public.bed_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert allocations" ON public.bed_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update allocations" ON public.bed_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select notes" ON public.daily_progress_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert notes" ON public.daily_progress_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notes" ON public.daily_progress_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select nursing" ON public.nursing_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nursing" ON public.nursing_records FOR INSERT TO authenticated WITH CHECK (true);
