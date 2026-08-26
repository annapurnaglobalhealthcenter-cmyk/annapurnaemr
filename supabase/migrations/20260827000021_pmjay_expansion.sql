-- ============================================================
-- Migration: PM-JAY / Ayushman Bharat Expansion
-- ============================================================

-- 1. PM-JAY Package Master (Health Benefit Packages)
CREATE TABLE public.pmjay_package_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    hbp_code TEXT UNIQUE NOT NULL,
    procedure_name TEXT NOT NULL,
    specialty TEXT,
    category TEXT, -- Medical, Surgical, Day Care
    default_rate NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Alter PM-JAY Cases Table to support full clinical links and BIS info
ALTER TABLE public.pmjay_cases ADD COLUMN admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL;
ALTER TABLE public.pmjay_cases ADD COLUMN diagnosis_id UUID REFERENCES public.clinical_records(id) ON DELETE SET NULL;
ALTER TABLE public.pmjay_cases ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.pmjay_cases ADD COLUMN package_id UUID REFERENCES public.pmjay_package_master(id) ON DELETE SET NULL;

ALTER TABLE public.pmjay_cases ADD COLUMN abha_number TEXT;
ALTER TABLE public.pmjay_cases ADD COLUMN pmjay_card_number TEXT;
ALTER TABLE public.pmjay_cases ADD COLUMN bis_verification_status TEXT DEFAULT 'Unverified'; -- Unverified, Verified, Failed
ALTER TABLE public.pmjay_cases ADD COLUMN clinical_justification TEXT;
ALTER TABLE public.pmjay_cases ADD COLUMN proposed_surgery_date DATE;

-- 3. Case Documents
CREATE TABLE public.pmjay_case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.pmjay_cases(id) ON DELETE CASCADE,
    document_name TEXT NOT NULL, -- Clinical Photo, Pre-Auth Form, Final Bill
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. SNA (State Nodal Agency) Queries
CREATE TABLE public.pmjay_case_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.pmjay_cases(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    query_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_text TEXT,
    responded_by UUID REFERENCES public.user_profiles(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Pending' -- Pending, Answered
);

-- 5. Immutable Timeline (API Logs and State Changes)
CREATE TABLE public.pmjay_case_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID NOT NULL REFERENCES public.pmjay_cases(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- Created, BIS Verified, Pre-Auth Submitted, SNA Query, Approved, Claim Submitted, Settled
    event_description TEXT NOT NULL,
    performed_by UUID REFERENCES public.user_profiles(id),
    metadata JSONB, -- For storing mock API payloads/responses
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Triggers for timeline
CREATE OR REPLACE FUNCTION log_pmjay_creation()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.pmjay_case_timeline (case_id, event_type, event_description)
    VALUES (NEW.id, 'Case Created', 'PM-JAY case initiated for URN: ' || NEW.urn);
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_pmjay_creation_timeline
    AFTER INSERT ON public.pmjay_cases
    FOR EACH ROW EXECUTE FUNCTION log_pmjay_creation();

-- RLS
ALTER TABLE public.pmjay_package_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmjay_case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmjay_case_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pmjay_case_timeline ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read packages" ON public.pmjay_package_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read pmjay docs" ON public.pmjay_case_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write pmjay docs" ON public.pmjay_case_documents FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow read pmjay queries" ON public.pmjay_case_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write pmjay queries" ON public.pmjay_case_queries FOR ALL TO authenticated USING (true);
CREATE POLICY "Allow read pmjay timeline" ON public.pmjay_case_timeline FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert pmjay timeline" ON public.pmjay_case_timeline FOR INSERT TO authenticated WITH CHECK (true);

-- Seed Packages
DO $$
BEGIN
    INSERT INTO public.pmjay_package_master (hbp_code, procedure_name, specialty, category, default_rate) VALUES 
        ('H0001001', 'General Ward Care', 'General Medicine', 'Medical', 1500.00),
        ('S0002005', 'Appendectomy', 'General Surgery', 'Surgical', 12000.00),
        ('S0003001', 'Cataract Surgery', 'Ophthalmology', 'Day Care', 8000.00),
        ('M0004010', 'ICU Care with Ventilator', 'Critical Care', 'Medical', 5000.00)
    ON CONFLICT (hbp_code) DO NOTHING;
END;
$$;
