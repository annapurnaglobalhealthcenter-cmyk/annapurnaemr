-- ============================================================
-- Migration: Structured e-Prescription & Medicine Master
-- ============================================================

-- 1. Medicine Master
CREATE TABLE IF NOT EXISTS public.medicine_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    generic_name TEXT NOT NULL,
    brand_name TEXT,
    strength TEXT,
    dosage_form TEXT NOT NULL, -- Tablet, Syrup, Injection, Ointment
    route TEXT NOT NULL,       -- Oral, IV, IM, Topical
    unit TEXT,                 -- mg, ml, %
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX idx_medicine_master_search ON public.medicine_master USING gin ((generic_name || ' ' || COALESCE(brand_name, '')) gin_trgm_ops);

-- 2. Alter medication_prescriptions
ALTER TABLE public.medication_prescriptions
    ADD COLUMN IF NOT EXISTS medicine_id UUID REFERENCES public.medicine_master(id),
    ADD COLUMN IF NOT EXISTS quantity INTEGER,
    ADD COLUMN IF NOT EXISTS dispense_status TEXT DEFAULT 'Pending'; -- Pending, Dispensed, Cancelled

-- 3. Lock trigger function: Prevent changes if parent clinical record is finalized
CREATE OR REPLACE FUNCTION public.check_clinical_record_lock()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    -- For INSERT or UPDATE, check the NEW clinical_record_id
    IF (TG_OP = 'INSERT' OR TG_OP = 'UPDATE') THEN
        SELECT status INTO v_status FROM public.clinical_records WHERE id = NEW.clinical_record_id;
        IF v_status != 'Draft' THEN
            RAISE EXCEPTION 'Cannot modify prescriptions: clinical record is %', v_status;
        END IF;
    END IF;

    -- For DELETE, check the OLD clinical_record_id
    IF (TG_OP = 'DELETE') THEN
        SELECT status INTO v_status FROM public.clinical_records WHERE id = OLD.clinical_record_id;
        IF v_status != 'Draft' THEN
            RAISE EXCEPTION 'Cannot modify prescriptions: clinical record is %', v_status;
        END IF;
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. Apply trigger to medication_prescriptions
DROP TRIGGER IF EXISTS trigger_lock_prescriptions ON public.medication_prescriptions;
CREATE TRIGGER trigger_lock_prescriptions
    BEFORE INSERT OR UPDATE OR DELETE ON public.medication_prescriptions
    FOR EACH ROW
    EXECUTE FUNCTION public.check_clinical_record_lock();

-- Apply same trigger to diagnoses and vitals just to be safe across the board
DROP TRIGGER IF EXISTS trigger_lock_diagnoses ON public.diagnoses;
CREATE TRIGGER trigger_lock_diagnoses
    BEFORE INSERT OR UPDATE OR DELETE ON public.diagnoses
    FOR EACH ROW
    EXECUTE FUNCTION public.check_clinical_record_lock();

DROP TRIGGER IF EXISTS trigger_lock_vitals ON public.vitals;
CREATE TRIGGER trigger_lock_vitals
    BEFORE INSERT OR UPDATE OR DELETE ON public.vitals
    FOR EACH ROW
    EXECUTE FUNCTION public.check_clinical_record_lock();

-- 5. RLS for medicine_master
ALTER TABLE public.medicine_master ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Anyone authenticated can view medicines" ON public.medicine_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Pharmacy can manage medicines" ON public.medicine_master FOR ALL TO authenticated USING (auth.has_permission('pharmacy.manage'));

-- 6. Seed some default medicines
INSERT INTO public.medicine_master (generic_name, brand_name, strength, dosage_form, route, unit) VALUES
('Paracetamol', 'Dolo', '650mg', 'Tablet', 'Oral', 'mg'),
('Paracetamol', 'Calpol', '500mg', 'Tablet', 'Oral', 'mg'),
('Amoxicillin + Clavulanate', 'Augmentin', '625mg', 'Tablet', 'Oral', 'mg'),
('Pantoprazole', 'Pan40', '40mg', 'Tablet', 'Oral', 'mg'),
('Cetirizine', 'Zyrtec', '10mg', 'Tablet', 'Oral', 'mg'),
('Azithromycin', 'Azithral', '500mg', 'Tablet', 'Oral', 'mg'),
('Diclofenac', 'Voveran', '50mg', 'Tablet', 'Oral', 'mg'),
('Ondansetron', 'Emeset', '4mg', 'Tablet', 'Oral', 'mg'),
('Salbutamol', 'Asthalin', '100mcg', 'Inhaler', 'Inhalation', 'mcg'),
('Insulin Glargine', 'Lantus', '100IU/ml', 'Injection', 'Subcutaneous', 'IU')
ON CONFLICT DO NOTHING;
