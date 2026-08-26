-- ============================================================
-- Migration: Radiology Module Expansion
-- ============================================================

-- 1. Radiology Procedure Master
CREATE TABLE public.radiology_procedure_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    modality TEXT NOT NULL, -- CT, MRI, X-Ray, USG, PET
    procedure_name TEXT NOT NULL UNIQUE,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE INDEX idx_rad_procedure_name_trgm ON public.radiology_procedure_master USING gin (procedure_name gin_trgm_ops);

-- Add scheduled_time to investigation_orders for radiology scheduling
ALTER TABLE public.investigation_orders ADD COLUMN scheduled_time TIMESTAMP WITH TIME ZONE;
ALTER TABLE public.investigation_orders ADD COLUMN radiology_procedure_id UUID REFERENCES public.radiology_procedure_master(id);

-- 2. Radiology Reports
CREATE TABLE public.radiology_reports (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID NOT NULL REFERENCES public.investigation_orders(id) ON DELETE CASCADE,
    findings TEXT,
    impression TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Verified
    drafted_by UUID REFERENCES public.user_profiles(id),
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Radiology Attachments (PACS/DICOM Hook)
CREATE TABLE public.radiology_attachments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    report_id UUID NOT NULL REFERENCES public.radiology_reports(id) ON DELETE CASCADE,
    file_url TEXT, -- For static key images (JPG/PNG) stored in Supabase Storage
    dicom_study_uid TEXT, -- Hook for future PACS/VNA integration
    series_description TEXT,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.radiology_procedure_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.radiology_attachments ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select rad master" ON public.radiology_procedure_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select rad reports" ON public.radiology_reports FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rad reports" ON public.radiology_reports FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update rad reports" ON public.radiology_reports FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select rad attachments" ON public.radiology_attachments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert rad attachments" ON public.radiology_attachments FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================
DO $$
BEGIN
    INSERT INTO public.radiology_procedure_master (modality, procedure_name) VALUES 
        ('X-Ray', 'X-Ray Chest PA View'),
        ('X-Ray', 'X-Ray Knee Joint AP/LAT'),
        ('CT', 'CT Head without Contrast'),
        ('CT', 'CT Abdomen and Pelvis with Contrast'),
        ('MRI', 'MRI Brain without Contrast'),
        ('MRI', 'MRI Lumbar Spine'),
        ('USG', 'USG Whole Abdomen'),
        ('USG', 'USG KUB (Kidney, Ureter, Bladder)')
    ON CONFLICT (procedure_name) DO NOTHING;
END;
$$;
