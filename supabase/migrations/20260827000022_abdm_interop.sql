-- ============================================================
-- Migration: ABDM / ABHA Interoperability Layer
-- ============================================================

-- 1. HIE (Health Information Exchange) Audit Log
CREATE TABLE public.abdm_hie_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID NOT NULL REFERENCES public.patients(id),
    consent_id TEXT, -- Might be null for discovery/linking, populated for data transfer
    transaction_id TEXT NOT NULL, -- ABDM Gateway transaction ID
    direction TEXT NOT NULL, -- 'Inbound' or 'Outbound'
    interaction_type TEXT NOT NULL, -- 'Discovery', 'Link', 'Data Push', 'Data Pull'
    resource_type TEXT, -- e.g., 'Bundle', 'MedicationRequest'
    status TEXT NOT NULL, -- 'Initiated', 'Success', 'Failed'
    encrypted_payload_ref TEXT, -- Reference to offline/secure storage if payload is large
    performed_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. FHIR Bundles Storage (Optional cache for generated resources)
CREATE TABLE public.abdm_fhir_bundles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    encounter_id UUID REFERENCES public.encounters(id),
    fhir_version TEXT DEFAULT 'R4',
    bundle_type TEXT DEFAULT 'document',
    payload JSONB NOT NULL,
    generated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Care Context Linking (Mapping Encounters to ABDM)
CREATE TABLE public.abdm_care_contexts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id),
    encounter_id UUID UNIQUE REFERENCES public.encounters(id),
    care_context_reference TEXT UNIQUE NOT NULL, -- e.g., 'ENC-1234' sent to ABDM
    is_linked BOOLEAN DEFAULT false,
    linked_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. Immutable Audit Trigger
CREATE OR REPLACE FUNCTION enforce_abdm_audit_immutability()
RETURNS TRIGGER AS $$
BEGIN
    RAISE EXCEPTION 'ABDM Audit Logs cannot be modified or deleted.';
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_abdm_audit_immutability
    BEFORE UPDATE OR DELETE ON public.abdm_hie_audit_log
    FOR EACH ROW EXECUTE FUNCTION enforce_abdm_audit_immutability();

-- RLS
ALTER TABLE public.abdm_hie_audit_log ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abdm_fhir_bundles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.abdm_care_contexts ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read audit log" ON public.abdm_hie_audit_log FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert audit log" ON public.abdm_hie_audit_log FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read bundles" ON public.abdm_fhir_bundles FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow insert bundles" ON public.abdm_fhir_bundles FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Allow read contexts" ON public.abdm_care_contexts FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow write contexts" ON public.abdm_care_contexts FOR ALL TO authenticated USING (true);
