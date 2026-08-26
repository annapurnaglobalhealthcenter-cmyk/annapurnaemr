-- Ayushman Bharat / PM-JAY Cases
CREATE TABLE public.pmjay_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    urn TEXT NOT NULL, -- PM-JAY Beneficiary ID
    package_code TEXT, -- Selected treatment package
    preauth_status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected, Query
    claim_status TEXT DEFAULT 'Draft', -- Draft, Submitted, Approved, Settled, Rejected
    claim_amount NUMERIC(10, 2),
    approved_amount NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Master table for Insurance Providers / TPAs
CREATE TABLE public.insurance_providers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Private Insurance / TPA Claims
CREATE TABLE public.insurance_claims (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.insurance_providers(id),
    policy_number TEXT NOT NULL,
    member_id TEXT,
    preauth_status TEXT DEFAULT 'Pending',
    claim_status TEXT DEFAULT 'Draft',
    claim_amount NUMERIC(10, 2),
    approved_amount NUMERIC(10, 2),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ABDM / ABHA Consent Management
CREATE TABLE public.abdm_consents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    consent_id TEXT NOT NULL UNIQUE, -- Provided by ABDM gateway
    purpose_of_request TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Requested', -- Requested, Granted, Revoked, Expired
    hi_types TEXT[], -- Array of Health Information types requested (e.g., Prescription, Discharge Summary)
    date_range_from TIMESTAMP WITH TIME ZONE,
    date_range_to TIMESTAMP WITH TIME ZONE,
    data_erase_at TIMESTAMP WITH TIME ZONE, -- When the fetched data should be erased locally
    granted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.pmjay_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claims ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abdm_consents ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
CREATE POLICY "Authenticated users can select pmjay" ON public.pmjay_cases FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert pmjay" ON public.pmjay_cases FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update pmjay" ON public.pmjay_cases FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select providers" ON public.insurance_providers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert providers" ON public.insurance_providers FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select claims" ON public.insurance_claims FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert claims" ON public.insurance_claims FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update claims" ON public.insurance_claims FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select consents" ON public.abdm_consents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert consents" ON public.abdm_consents FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update consents" ON public.abdm_consents FOR UPDATE TO authenticated USING (true);
