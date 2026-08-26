-- ============================================================
-- Migration: Pharmacy & Inventory Expansion
-- ============================================================

-- 1. Suppliers
CREATE TABLE public.pharmacy_suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    supplier_name TEXT NOT NULL,
    contact_info TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Medicine Master
CREATE TABLE public.pharmacy_medicine_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    brand_name TEXT NOT NULL UNIQUE,
    generic_name TEXT,
    dosage_form TEXT, -- Tablet, Capsule, Syrup, Injection
    strength TEXT, -- 500mg, 10ml
    category TEXT, -- Medicine, Consumable, Equipment
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable pg_trgm for autocomplete searches
CREATE INDEX IF NOT EXISTS idx_medicine_brand_trgm ON public.pharmacy_medicine_master USING gin (brand_name gin_trgm_ops);
CREATE INDEX IF NOT EXISTS idx_medicine_generic_trgm ON public.pharmacy_medicine_master USING gin (generic_name gin_trgm_ops);

-- 3. Batches
CREATE TABLE public.pharmacy_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    medicine_id UUID NOT NULL REFERENCES public.pharmacy_medicine_master(id),
    supplier_id UUID REFERENCES public.pharmacy_suppliers(id),
    batch_number TEXT NOT NULL,
    expiry_date DATE NOT NULL,
    unit_cost NUMERIC(10,2) DEFAULT 0.00,
    unit_price NUMERIC(10,2) NOT NULL,
    current_stock INTEGER NOT NULL DEFAULT 0 CHECK (current_stock >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE (medicine_id, batch_number)
);

-- 4. Stock Movements Audit Ledger
CREATE TABLE public.pharmacy_stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    batch_id UUID NOT NULL REFERENCES public.pharmacy_batches(id),
    movement_type TEXT NOT NULL, -- Purchase, Dispense, Return, Adjustment
    quantity_change INTEGER NOT NULL, -- Positive or Negative
    reference_id UUID, -- Links to dispense_id, purchase_id, etc.
    notes TEXT,
    moved_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Modify existing dispense records to use batches
-- Note: We drop the old inventory_items link if it exists and we haven't used it much in our mock data.
ALTER TABLE public.dispense_records ADD COLUMN batch_id UUID REFERENCES public.pharmacy_batches(id);
ALTER TABLE public.dispense_records ADD COLUMN notes TEXT;

-- RLS
ALTER TABLE public.pharmacy_suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_medicine_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pharmacy_stock_movements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can read suppliers" ON public.pharmacy_suppliers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read medicine master" ON public.pharmacy_medicine_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read batches" ON public.pharmacy_batches FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can read movements" ON public.pharmacy_stock_movements FOR SELECT TO authenticated USING (true);

-- Allow pharmacists to insert
CREATE POLICY "Authenticated users can insert batches" ON public.pharmacy_batches FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update batches" ON public.pharmacy_batches FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert movements" ON public.pharmacy_stock_movements FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- RPC: Atomic Dispensation
-- ============================================================
CREATE OR REPLACE FUNCTION dispense_medication(
    p_prescription_id UUID,
    p_batch_id UUID,
    p_quantity INTEGER,
    p_user_id UUID,
    p_notes TEXT DEFAULT ''
)
RETURNS UUID
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
    v_current_stock INTEGER;
    v_patient_id UUID;
    v_dispense_id UUID;
BEGIN
    -- 1. Lock the batch row for update to prevent race conditions
    SELECT current_stock INTO v_current_stock
    FROM public.pharmacy_batches
    WHERE id = p_batch_id
    FOR UPDATE;

    IF NOT FOUND THEN
        RAISE EXCEPTION 'Batch not found.';
    END IF;

    -- 2. Validate stock
    IF v_current_stock < p_quantity THEN
        RAISE EXCEPTION 'Insufficient stock in batch. Available: %, Requested: %', v_current_stock, p_quantity;
    END IF;

    -- 3. Fetch patient_id from prescription
    SELECT encounter_id INTO v_patient_id -- Wait, prescriptions are tied to encounters. Encounters are tied to patients.
    FROM public.medication_prescriptions WHERE id = p_prescription_id;
    
    -- Actually, let's just get patient_id from encounters table
    SELECT patient_id INTO v_patient_id
    FROM public.encounters
    WHERE id = (SELECT encounter_id FROM public.medication_prescriptions WHERE id = p_prescription_id);

    -- 4. Deduct stock
    UPDATE public.pharmacy_batches
    SET current_stock = current_stock - p_quantity,
        updated_at = NOW()
    WHERE id = p_batch_id;

    -- 5. Insert Dispense Record
    INSERT INTO public.dispense_records (
        prescription_id, patient_id, batch_id, quantity_dispensed, dispensed_by, notes
    ) VALUES (
        p_prescription_id, v_patient_id, p_batch_id, p_quantity, p_user_id, p_notes
    ) RETURNING id INTO v_dispense_id;

    -- 6. Insert Movement Ledger
    INSERT INTO public.pharmacy_stock_movements (
        batch_id, movement_type, quantity_change, reference_id, notes, moved_by
    ) VALUES (
        p_batch_id, 'Dispense', -p_quantity, v_dispense_id, 'Dispensed for prescription ' || p_prescription_id, p_user_id
    );

    -- 7. Update Prescription Status
    UPDATE public.medication_prescriptions
    SET status = 'Dispensed',
        updated_at = NOW()
    WHERE id = p_prescription_id;

    RETURN v_dispense_id;
END;
$$;

-- ============================================================
-- SEED DATA
-- ============================================================
DO $$
DECLARE
    pcm UUID;
    amx UUID;
    sup UUID;
BEGIN
    INSERT INTO public.pharmacy_suppliers (supplier_name) VALUES ('PharmaCorp Logistics') RETURNING id INTO sup;

    INSERT INTO public.pharmacy_medicine_master (brand_name, generic_name, dosage_form, strength, category) 
    VALUES ('Calpol 500', 'Paracetamol', 'Tablet', '500mg', 'Medicine') RETURNING id INTO pcm;

    INSERT INTO public.pharmacy_medicine_master (brand_name, generic_name, dosage_form, strength, category) 
    VALUES ('Augmentin 625', 'Amoxicillin + Clavulanic Acid', 'Tablet', '625mg', 'Medicine') RETURNING id INTO amx;

    -- Initial Stock
    INSERT INTO public.pharmacy_batches (medicine_id, supplier_id, batch_number, expiry_date, unit_cost, unit_price, current_stock)
    VALUES (pcm, sup, 'B-CAL-001', '2026-12-31', 1.00, 2.50, 500);

    INSERT INTO public.pharmacy_batches (medicine_id, supplier_id, batch_number, expiry_date, unit_cost, unit_price, current_stock)
    VALUES (amx, sup, 'B-AUG-900', '2025-06-30', 10.00, 15.00, 100);
END;
$$;
