-- Investigation Orders (Lab, Radiology)
CREATE TABLE public.investigation_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    ordered_by UUID REFERENCES public.user_profiles(id),
    department TEXT NOT NULL, -- Laboratory, Radiology
    test_name TEXT NOT NULL,
    priority TEXT DEFAULT 'Routine', -- Routine, Urgent, STAT
    status TEXT NOT NULL DEFAULT 'Ordered', -- Ordered, Sample Collected, In Progress, Completed, Cancelled
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Investigation Results
CREATE TABLE public.investigation_results (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id UUID REFERENCES public.investigation_orders(id) ON DELETE CASCADE,
    parameter_name TEXT NOT NULL,
    result_value TEXT NOT NULL,
    unit TEXT,
    reference_range TEXT,
    is_abnormal BOOLEAN DEFAULT false,
    remarks TEXT,
    verified_by UUID REFERENCES public.user_profiles(id),
    verified_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Pharmacy Inventory
CREATE TABLE public.inventory_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    item_name TEXT NOT NULL,
    sku TEXT UNIQUE,
    category TEXT, -- Medicine, Consumable, Equipment
    quantity_in_stock INTEGER NOT NULL DEFAULT 0,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Dispense Records
CREATE TABLE public.dispense_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID REFERENCES public.medication_prescriptions(id),
    patient_id UUID REFERENCES public.patients(id),
    inventory_item_id UUID REFERENCES public.inventory_items(id),
    quantity_dispensed INTEGER NOT NULL,
    dispensed_by UUID REFERENCES public.user_profiles(id),
    dispensed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoices
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    invoice_number TEXT UNIQUE NOT NULL,
    total_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    discount_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    tax_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    net_amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Unpaid, Partially Paid, Paid, Cancelled
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Invoice Line Items
CREATE TABLE public.invoice_line_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    item_description TEXT NOT NULL,
    category TEXT, -- Consultation, Laboratory, Pharmacy, Room Charge
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    total_price NUMERIC(10, 2) NOT NULL,
    reference_id UUID, -- Can link to order_id or dispense_id
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Payments
CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id),
    receipt_number TEXT UNIQUE NOT NULL,
    amount_paid NUMERIC(10, 2) NOT NULL,
    payment_method TEXT NOT NULL, -- Cash, Card, UPI, Insurance
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    collected_by UUID REFERENCES public.user_profiles(id),
    notes TEXT
);

-- Enable RLS
ALTER TABLE public.investigation_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.investigation_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.dispense_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_line_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
CREATE POLICY "Authenticated users can select ancillary" ON public.investigation_orders FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select results" ON public.investigation_results FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select inventory" ON public.inventory_items FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select billing" ON public.invoices FOR SELECT TO authenticated USING (true);
-- In production, insert/update permissions for billing should be strictly limited to billing roles
CREATE POLICY "Authenticated users can insert billing" ON public.invoices FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update billing" ON public.invoices FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert items" ON public.invoice_line_items FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can insert payments" ON public.payments FOR INSERT TO authenticated WITH CHECK (true);
