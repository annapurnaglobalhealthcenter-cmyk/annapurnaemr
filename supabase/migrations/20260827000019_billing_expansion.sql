-- ============================================================
-- Migration: Billing Master, Immutability, and Refunds
-- ============================================================

-- 1. Billing Charge Master
CREATE TABLE public.billing_charge_master (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    charge_code TEXT UNIQUE NOT NULL,
    description TEXT NOT NULL,
    category TEXT NOT NULL, -- Consultation, Procedure, Laboratory, Radiology, Room, Nursing, Package
    default_price NUMERIC(10,2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Payment Methods Config
CREATE TABLE public.billing_payment_methods (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    method_name TEXT UNIQUE NOT NULL, -- Cash, Card, UPI, Bank Transfer
    is_active BOOLEAN DEFAULT true
);

-- 3. Audit Log for Billing
CREATE TABLE public.billing_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID REFERENCES public.invoices(id),
    action_type TEXT NOT NULL, -- Created, Finalized, Payment, Refund
    performed_by UUID REFERENCES public.user_profiles(id),
    action_timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    details JSONB
);

-- 4. Refunds
CREATE TABLE public.billing_refunds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    payment_id UUID REFERENCES public.payments(id) ON DELETE RESTRICT,
    invoice_id UUID REFERENCES public.invoices(id) ON DELETE RESTRICT,
    refund_amount NUMERIC(10,2) NOT NULL,
    refund_method TEXT NOT NULL,
    reason TEXT,
    processed_by UUID REFERENCES public.user_profiles(id),
    processed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. Alter Invoices
ALTER TABLE public.invoices ADD COLUMN outstanding_amount NUMERIC(10,2) DEFAULT 0.00;
-- Backfill outstanding amount for existing draft/unpaid invoices
UPDATE public.invoices SET outstanding_amount = net_amount;

-- Update Status constraint conceptually (we'll just use trigger to lock)

-- ============================================================
-- SQL Triggers for Financial Immutability and Totals
-- ============================================================

-- Trigger 1: Prevent modification of Finalized or Paid invoices
CREATE OR REPLACE FUNCTION prevent_finalized_invoice_modification()
RETURNS TRIGGER AS $$
DECLARE
    v_status TEXT;
BEGIN
    IF TG_TABLE_NAME = 'invoices' THEN
        v_status := OLD.status;
    ELSE
        -- Line items table
        SELECT status INTO v_status FROM public.invoices WHERE id = OLD.invoice_id;
    END IF;

    IF v_status IN ('Finalized', 'Paid') THEN
        -- Allow updates to outstanding_amount and status ONLY if it's the system updating it via payments
        IF TG_TABLE_NAME = 'invoices' AND TG_OP = 'UPDATE' THEN
            IF NEW.total_amount != OLD.total_amount OR NEW.net_amount != OLD.net_amount THEN
                RAISE EXCEPTION 'Cannot modify amounts of a Finalized or Paid invoice. Issue an adjustment or refund instead.';
            END IF;
        ELSE
            RAISE EXCEPTION 'Cannot modify line items of a Finalized or Paid invoice. Issue a refund or new invoice.';
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER lock_finalized_invoice
    BEFORE UPDATE OR DELETE ON public.invoices
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_invoice_modification();

CREATE TRIGGER lock_finalized_invoice_lines
    BEFORE INSERT OR UPDATE OR DELETE ON public.invoice_line_items
    FOR EACH ROW
    EXECUTE FUNCTION prevent_finalized_invoice_modification();

-- Trigger 2: Recalculate Outstanding Amount on Payment or Refund
CREATE OR REPLACE FUNCTION update_invoice_outstanding()
RETURNS TRIGGER AS $$
DECLARE
    v_invoice_id UUID;
    v_total_paid NUMERIC;
    v_total_refunded NUMERIC;
    v_net NUMERIC;
    v_outstanding NUMERIC;
BEGIN
    IF TG_TABLE_NAME = 'payments' THEN
        v_invoice_id := NEW.invoice_id;
    ELSIF TG_TABLE_NAME = 'billing_refunds' THEN
        v_invoice_id := NEW.invoice_id;
    END IF;

    IF v_invoice_id IS NULL AND TG_OP = 'DELETE' THEN
        v_invoice_id := OLD.invoice_id;
    END IF;

    -- Calculate total paid
    SELECT COALESCE(SUM(amount_paid), 0) INTO v_total_paid FROM public.payments WHERE invoice_id = v_invoice_id;
    
    -- Calculate total refunded
    SELECT COALESCE(SUM(refund_amount), 0) INTO v_total_refunded FROM public.billing_refunds WHERE invoice_id = v_invoice_id;

    -- Get net amount
    SELECT net_amount INTO v_net FROM public.invoices WHERE id = v_invoice_id;

    v_outstanding := v_net - (v_total_paid - v_total_refunded);

    -- Temporarily disable the lock trigger to allow outstanding update
    ALTER TABLE public.invoices DISABLE TRIGGER lock_finalized_invoice;

    UPDATE public.invoices 
    SET outstanding_amount = v_outstanding,
        status = CASE 
            WHEN v_outstanding <= 0 THEN 'Paid'
            WHEN v_outstanding < v_net THEN 'Partially Paid'
            ELSE status -- keep as Finalized or Unpaid
        END
    WHERE id = v_invoice_id;

    ALTER TABLE public.invoices ENABLE TRIGGER lock_finalized_invoice;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_outstanding_on_payment
    AFTER INSERT OR UPDATE OR DELETE ON public.payments
    FOR EACH ROW EXECUTE FUNCTION update_invoice_outstanding();

CREATE TRIGGER trg_update_outstanding_on_refund
    AFTER INSERT OR UPDATE OR DELETE ON public.billing_refunds
    FOR EACH ROW EXECUTE FUNCTION update_invoice_outstanding();


-- RLS
ALTER TABLE public.billing_charge_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_payment_methods ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_refunds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.billing_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow read charge master" ON public.billing_charge_master FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read payment methods" ON public.billing_payment_methods FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read refunds" ON public.billing_refunds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Allow read billing audit" ON public.billing_audit_log FOR SELECT TO authenticated USING (true);

-- Billing Admin inserts
CREATE POLICY "Allow insert refunds" ON public.billing_refunds FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Allow insert audit" ON public.billing_audit_log FOR INSERT TO authenticated WITH CHECK (true);

-- ============================================================
-- SEED DATA
-- ============================================================
DO $$
BEGIN
    INSERT INTO public.billing_payment_methods (method_name) VALUES 
        ('Cash'), ('Credit/Debit Card'), ('UPI'), ('Bank Transfer'), ('Insurance / PM-JAY')
    ON CONFLICT DO NOTHING;

    INSERT INTO public.billing_charge_master (charge_code, description, category, default_price) VALUES
        ('CON-OPD', 'OPD General Consultation', 'Consultation', 500.00),
        ('CON-SPC', 'Specialist Consultation', 'Consultation', 1000.00),
        ('RM-GEN', 'General Ward Bed - Per Day', 'Room', 1500.00),
        ('RM-ICU', 'ICU Bed - Per Day', 'Room', 5000.00),
        ('NUR-01', 'Nursing Charges - Per Day', 'Nursing', 1000.00),
        ('PKG-MTR', 'Maternity Package Normal Delivery', 'Package', 25000.00)
    ON CONFLICT (charge_code) DO NOTHING;
END;
$$;
