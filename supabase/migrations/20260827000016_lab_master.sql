-- ============================================================
-- Migration: Laboratory Master and Verification Pipeline
-- ============================================================

-- 1. Lab Test Master
CREATE TABLE public.lab_test_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_name TEXT NOT NULL UNIQUE,
    category TEXT NOT NULL, -- Hematology, Biochemistry, Microbiology, etc.
    sample_type TEXT NOT NULL, -- Blood, Urine, Sputum, etc.
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pg_trgm for test master searching (if not already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_lab_test_name_trgm ON public.lab_test_master USING gin (test_name gin_trgm_ops);

-- 2. Lab Test Parameters
CREATE TABLE public.lab_test_parameters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    test_id UUID REFERENCES public.lab_test_master(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    unit TEXT,
    min_reference_value NUMERIC,
    max_reference_value NUMERIC,
    text_reference TEXT,
    display_order INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Update Investigation Orders
ALTER TABLE public.investigation_orders ADD COLUMN test_master_id UUID REFERENCES public.lab_test_master(id);
-- We already have status (Ordered, Sample Collected, In Progress, Completed, Cancelled). We will keep these.

-- 4. Update Investigation Results
ALTER TABLE public.investigation_results ADD COLUMN status TEXT DEFAULT 'Draft'; -- Draft, Verified
ALTER TABLE public.investigation_results ADD COLUMN critical_flag BOOLEAN DEFAULT false;

-- RLS
ALTER TABLE public.lab_test_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_test_parameters ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select test master" ON public.lab_test_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select test parameters" ON public.lab_test_parameters FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================
DO $$
DECLARE
    cbc UUID;
    lipid UUID;
BEGIN
    INSERT INTO public.lab_test_master (test_name, category, sample_type) 
    VALUES ('Complete Blood Count (CBC)', 'Hematology', 'Blood (EDTA)') 
    RETURNING id INTO cbc;

    INSERT INTO public.lab_test_parameters (test_id, parameter_name, unit, min_reference_value, max_reference_value, display_order)
    VALUES 
        (cbc, 'Hemoglobin', 'g/dL', 12.0, 15.5, 1),
        (cbc, 'White Blood Cells (WBC)', 'thou/uL', 4.5, 11.0, 2),
        (cbc, 'Platelet Count', 'thou/uL', 150, 450, 3);

    INSERT INTO public.lab_test_master (test_name, category, sample_type) 
    VALUES ('Lipid Profile', 'Biochemistry', 'Blood (Serum)') 
    RETURNING id INTO lipid;

    INSERT INTO public.lab_test_parameters (test_id, parameter_name, unit, min_reference_value, max_reference_value, display_order)
    VALUES 
        (lipid, 'Total Cholesterol', 'mg/dL', 0, 199, 1),
        (lipid, 'HDL Cholesterol', 'mg/dL', 40, 60, 2),
        (lipid, 'LDL Cholesterol', 'mg/dL', 0, 99, 3);
END;
$$;
