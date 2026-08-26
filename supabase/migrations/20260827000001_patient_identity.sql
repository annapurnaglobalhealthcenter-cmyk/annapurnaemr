-- Patient Registry
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Identity Records (UHID, ABHA, PM-JAY, etc.)
CREATE TABLE public.identity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    identity_type TEXT NOT NULL, -- e.g., 'UHID', 'ABHA', 'PMJAY'
    identity_value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identity_type, identity_value)
);

-- Appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id), -- The doctor
    department TEXT,
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Cancelled, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encounters (The actual visit)
CREATE TABLE public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id),
    provider_id UUID REFERENCES public.user_profiles(id),
    encounter_type TEXT NOT NULL, -- OPD, IPD, Emergency
    status TEXT NOT NULL DEFAULT 'Planned', -- Planned, Arrived, In-Progress, Completed, Cancelled
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Draft for development)
-- Authenticated users can read and write patients
CREATE POLICY "Authenticated users can select patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write identities
CREATE POLICY "Authenticated users can select identities" ON public.identity_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert identities" ON public.identity_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update identities" ON public.identity_records FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write encounters
CREATE POLICY "Authenticated users can select encounters" ON public.encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert encounters" ON public.encounters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update encounters" ON public.encounters FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write appointments
CREATE POLICY "Authenticated users can select appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
