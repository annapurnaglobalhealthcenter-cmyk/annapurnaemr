-- ============================================================
-- Migration: Blood Bank Module
-- ============================================================

CREATE TABLE IF NOT EXISTS public.blood_donors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    blood_group TEXT NOT NULL, -- A+, A-, B+, B-, O+, O-, AB+, AB-
    phone_number TEXT,
    email TEXT,
    last_donation_date DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blood_inventory (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    donor_id UUID REFERENCES public.blood_donors(id),
    blood_group TEXT NOT NULL,
    component_type TEXT NOT NULL, -- Whole Blood, Packed RBC, Plasma, Platelets
    bag_number TEXT UNIQUE NOT NULL,
    volume_ml INTEGER NOT NULL,
    collection_date DATE NOT NULL,
    expiry_date DATE NOT NULL,
    status TEXT DEFAULT 'Available', -- Available, Reserved, Dispensed, Discarded
    location TEXT, -- Refrigerator A, Shelf 2
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.blood_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    requested_by UUID REFERENCES public.user_profiles(id),
    blood_group TEXT NOT NULL,
    component_type TEXT NOT NULL,
    units_required INTEGER NOT NULL,
    priority TEXT DEFAULT 'Routine', -- Routine, Urgent, Emergency
    status TEXT DEFAULT 'Pending', -- Pending, Cross-matching, Fulfilled, Cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.blood_donors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.blood_requests ENABLE ROW LEVEL SECURITY;

-- For demo purposes, we will grant full access to authenticated users
CREATE POLICY "Full access to blood_donors for authenticated users" ON public.blood_donors FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to blood_inventory for authenticated users" ON public.blood_inventory FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to blood_requests for authenticated users" ON public.blood_requests FOR ALL TO authenticated USING (true);
