-- ============================================================
-- Migration: Insurance & TPA Expansion
-- ============================================================

-- 1. Patient Insurance Policies
CREATE TABLE public.patient_insurance_policies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID NOT NULL REFERENCES public.insurance_providers(id),
    policy_number TEXT NOT NULL,
    member_id TEXT NOT NULL,
    coverage_details JSONB, -- E.g. {"room_rent_cap": 2000, "maternity_covered": false}
    validity_start DATE,
    validity_end DATE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Alter Insurance Claims to tightly couple with IPD and Billing
ALTER TABLE public.insurance_claims ADD COLUMN admission_id UUID REFERENCES public.admissions(id) ON DELETE SET NULL;
ALTER TABLE public.insurance_claims ADD COLUMN invoice_id UUID REFERENCES public.invoices(id) ON DELETE SET NULL;
ALTER TABLE public.insurance_claims ADD COLUMN policy_id UUID REFERENCES public.patient_insurance_policies(id) ON DELETE SET NULL;

-- 3. Claim Documents
CREATE TABLE public.insurance_claim_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
    document_type TEXT NOT NULL, -- ID Proof, Discharge Summary, Final Bill, Investigation Report
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. TPA Queries Log
CREATE TABLE public.insurance_claim_queries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    claim_id UUID NOT NULL REFERENCES public.insurance_claims(id) ON DELETE CASCADE,
    query_text TEXT NOT NULL,
    raised_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    response_text TEXT,
    responded_by UUID REFERENCES public.user_profiles(id),
    responded_at TIMESTAMP WITH TIME ZONE,
    status TEXT DEFAULT 'Pending' -- Pending, Answered
);

-- 5. Settlements / Reconciliations
CREATE TABLE public.insurance_reconciliations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.insurance_providers(id),
    transaction_ref TEXT NOT NULL UNIQUE, -- UTR / Cheque No
    total_amount NUMERIC(10,2) NOT NULL,
    reconciled_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    reconciled_by UUID REFERENCES public.user_profiles(id)
);

ALTER TABLE public.insurance_claims ADD COLUMN reconciliation_id UUID REFERENCES public.insurance_reconciliations(id) ON DELETE SET NULL;

-- RLS
ALTER TABLE public.patient_insurance_policies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claim_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_claim_queries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.insurance_reconciliations ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated can read policies" ON public.patient_insurance_policies FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write policies" ON public.patient_insurance_policies FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read claim docs" ON public.insurance_claim_documents FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write claim docs" ON public.insurance_claim_documents FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read queries" ON public.insurance_claim_queries FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write queries" ON public.insurance_claim_queries FOR ALL TO authenticated USING (true);

CREATE POLICY "Authenticated can read recon" ON public.insurance_reconciliations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated can write recon" ON public.insurance_reconciliations FOR ALL TO authenticated USING (true);

-- Seed Providers if missing
DO $$
BEGIN
    INSERT INTO public.insurance_providers (name) VALUES 
        ('Star Health'),
        ('HDFC ERGO'),
        ('ICICI Lombard'),
        ('Aditya Birla Health')
    ON CONFLICT (name) DO NOTHING;
END;
$$;
