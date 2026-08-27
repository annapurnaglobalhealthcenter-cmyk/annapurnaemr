-- Core Roles and Permissions
CREATE TABLE public.roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    PRIMARY KEY (role_id, permission_id)
);

-- Extended User Profile
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name TEXT,
    last_name TEXT,
    phone_number TEXT,
    department TEXT,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- User Roles Mapping
CREATE TABLE public.user_roles (
    user_id UUID REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    PRIMARY KEY (user_id, role_id)
);

-- Enable RLS
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Initial RLS Policies (Draft)
-- Only authenticated users can read roles and permissions
CREATE POLICY "Allow read access to authenticated users for roles"
    ON public.roles FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for permissions"
    ON public.permissions FOR SELECT TO authenticated USING (true);

CREATE POLICY "Allow read access to authenticated users for role_permissions"
    ON public.role_permissions FOR SELECT TO authenticated USING (true);

-- Users can read their own profile, admins can read all
CREATE POLICY "Users can read own profile"
    ON public.user_profiles FOR SELECT TO authenticated 
    USING (auth.uid() = id);

CREATE POLICY "Users can read own roles"
    ON public.user_roles FOR SELECT TO authenticated 
    USING (auth.uid() = user_id);

-- Note: We will need a function to check if a user is an admin to allow broader access,
-- but for now this sets up the fundamental schema.
-- Patient Registry
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    first_name TEXT NOT NULL,
    last_name TEXT NOT NULL,
    date_of_birth DATE NOT NULL,
    gender TEXT NOT NULL,
    phone_number TEXT,
    email TEXT,
    address TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Identity Records (UHID, ABHA, PM-JAY, etc.)
CREATE TABLE public.identity_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    identity_type TEXT NOT NULL, -- e.g., 'UHID', 'ABHA', 'PMJAY'
    identity_value TEXT NOT NULL,
    is_primary BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(identity_type, identity_value)
);

-- Appointments
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id), -- The doctor
    department TEXT,
    appointment_time TIMESTAMP WITH TIME ZONE NOT NULL,
    status TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Cancelled, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Encounters (The actual visit)
CREATE TABLE public.encounters (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id),
    provider_id UUID REFERENCES public.user_profiles(id),
    encounter_type TEXT NOT NULL, -- OPD, IPD, Emergency
    status TEXT NOT NULL DEFAULT 'Planned', -- Planned, Arrived, In-Progress, Completed, Cancelled
    start_time TIMESTAMP WITH TIME ZONE,
    end_time TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.identity_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.encounters ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (Draft for development)
-- Authenticated users can read and write patients
CREATE POLICY "Authenticated users can select patients" ON public.patients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert patients" ON public.patients FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update patients" ON public.patients FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write identities
CREATE POLICY "Authenticated users can select identities" ON public.identity_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert identities" ON public.identity_records FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update identities" ON public.identity_records FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write encounters
CREATE POLICY "Authenticated users can select encounters" ON public.encounters FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert encounters" ON public.encounters FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update encounters" ON public.encounters FOR UPDATE TO authenticated USING (true);

-- Authenticated users can read and write appointments
CREATE POLICY "Authenticated users can select appointments" ON public.appointments FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert appointments" ON public.appointments FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update appointments" ON public.appointments FOR UPDATE TO authenticated USING (true);
-- Clinical Records (The main document for an encounter)
CREATE TABLE public.clinical_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id),
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Finalized, Amended
    parent_record_id UUID REFERENCES public.clinical_records(id), -- For amendments
    chief_complaint TEXT,
    history_of_present_illness TEXT,
    examination_notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE,
    finalized_by UUID REFERENCES public.user_profiles(id)
);

-- Vitals
CREATE TABLE public.vitals (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    height_cm NUMERIC,
    weight_kg NUMERIC,
    systolic_bp INTEGER,
    diastolic_bp INTEGER,
    heart_rate INTEGER,
    temperature_c NUMERIC,
    spo2_percent INTEGER,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    recorded_by UUID REFERENCES public.user_profiles(id)
);

-- Diagnoses
CREATE TABLE public.diagnoses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    code TEXT, -- e.g., ICD-10 or SNOMED
    code_system TEXT,
    certainty TEXT DEFAULT 'Provisional', -- Provisional, Confirmed, Refuted
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Medications (Prescriptions)
CREATE TABLE public.medication_prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    medication_name TEXT NOT NULL,
    dosage TEXT NOT NULL,
    frequency TEXT NOT NULL,
    route TEXT,
    duration_days INTEGER,
    instructions TEXT,
    status TEXT DEFAULT 'Active', -- Active, Discontinued, Completed
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.clinical_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vitals ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.diagnoses ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.medication_prescriptions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies
CREATE POLICY "Authenticated users can select clinical_records" ON public.clinical_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert clinical_records" ON public.clinical_records FOR INSERT TO authenticated WITH CHECK (true);

-- IMPORTANT: Prevent updates to Finalized or Amended records
CREATE POLICY "Prevent updates to finalized records" 
    ON public.clinical_records 
    FOR UPDATE TO authenticated 
    USING (status = 'Draft')
    WITH CHECK (status IN ('Draft', 'Finalized')); 
    -- Allows transitioning from Draft to Finalized, but if it's already Finalized, the USING clause blocks it.

CREATE POLICY "Authenticated users can select vitals" ON public.vitals FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert vitals" ON public.vitals FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update vitals" ON public.vitals FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select diagnoses" ON public.diagnoses FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert diagnoses" ON public.diagnoses FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update diagnoses" ON public.diagnoses FOR UPDATE TO authenticated USING (true);

CREATE POLICY "Authenticated users can select medications" ON public.medication_prescriptions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert medications" ON public.medication_prescriptions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update medications" ON public.medication_prescriptions FOR UPDATE TO authenticated USING (true);
-- Wards & Rooms
CREATE TABLE public.wards (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    type TEXT, -- General, ICU, NICU, Private, etc.
    capacity INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Beds
CREATE TABLE public.beds (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES public.wards(id) ON DELETE CASCADE,
    bed_number TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'Available', -- Available, Occupied, Maintenance
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ward_id, bed_number)
);

-- Admissions (Extension of encounters)
CREATE TABLE public.admissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    attending_provider_id UUID REFERENCES public.user_profiles(id),
    admission_reason TEXT NOT NULL,
    expected_discharge_date TIMESTAMP WITH TIME ZONE,
    actual_discharge_date TIMESTAMP WITH TIME ZONE,
    discharge_summary_id UUID REFERENCES public.clinical_records(id), -- Final discharge summary
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Bed Allocations
CREATE TABLE public.bed_allocations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    bed_id UUID REFERENCES public.beds(id),
    start_time TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    end_time TIMESTAMP WITH TIME ZONE,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Transferred, Discharged
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Daily Progress Notes (Doctor's Notes)
CREATE TABLE public.daily_progress_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id),
    subjective TEXT,
    objective TEXT,
    assessment TEXT,
    plan TEXT,
    status TEXT NOT NULL DEFAULT 'Draft', -- Draft, Finalized
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    finalized_at TIMESTAMP WITH TIME ZONE
);

-- Nursing Records
CREATE TABLE public.nursing_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID REFERENCES public.admissions(id) ON DELETE CASCADE,
    nurse_id UUID REFERENCES public.user_profiles(id),
    shift TEXT, -- Morning, Evening, Night
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Enable RLS
ALTER TABLE public.wards ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.beds ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admissions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bed_allocations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_progress_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.nursing_records ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
CREATE POLICY "Authenticated users can select wards" ON public.wards FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select beds" ON public.beds FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can update beds" ON public.beds FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select admissions" ON public.admissions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert admissions" ON public.admissions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update admissions" ON public.admissions FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select allocations" ON public.bed_allocations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert allocations" ON public.bed_allocations FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update allocations" ON public.bed_allocations FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select notes" ON public.daily_progress_notes FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert notes" ON public.daily_progress_notes FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update notes" ON public.daily_progress_notes FOR UPDATE TO authenticated USING (true);
CREATE POLICY "Authenticated users can select nursing" ON public.nursing_records FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nursing" ON public.nursing_records FOR INSERT TO authenticated WITH CHECK (true);
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
-- AI Interactions Audit Table
CREATE TABLE public.ai_interactions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID REFERENCES public.clinical_records(id) ON DELETE CASCADE,
    provider_id UUID REFERENCES public.user_profiles(id),
    interaction_type TEXT NOT NULL, -- e.g., 'Differential_Diagnosis', 'Medication_Safety', 'Summarization'
    prompt_context JSONB NOT NULL, -- The clinical data sent to the AI
    ai_response JSONB NOT NULL, -- The raw response from the AI
    status TEXT NOT NULL DEFAULT 'Pending', -- Pending, Accepted, Rejected, Modified
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    resolved_at TIMESTAMP WITH TIME ZONE
);

-- Enable RLS
ALTER TABLE public.ai_interactions ENABLE ROW LEVEL SECURITY;

-- Basic RLS Policies (For Development)
CREATE POLICY "Authenticated users can select ai interactions" ON public.ai_interactions FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert ai interactions" ON public.ai_interactions FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "Authenticated users can update ai interactions" ON public.ai_interactions FOR UPDATE TO authenticated USING (true);
-- Permissions Table
CREATE TABLE public.permissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE, -- e.g., 'patient.view', 'patient.create'
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Role Permissions Mapping
CREATE TABLE public.role_permissions (
    role_id UUID REFERENCES public.roles(id) ON DELETE CASCADE,
    permission_id UUID REFERENCES public.permissions(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    PRIMARY KEY (role_id, permission_id)
);

-- RLS Helper Function: Check if user has permission
CREATE OR REPLACE FUNCTION auth.has_permission(required_permission TEXT)
RETURNS BOOLEAN AS $$
DECLARE
    user_role_id UUID;
BEGIN
    -- Get user's role
    SELECT role_id INTO user_role_id 
    FROM public.user_profiles 
    WHERE id = auth.uid();
    
    -- Check if role has permission
    RETURN EXISTS (
        SELECT 1
        FROM public.role_permissions rp
        JOIN public.permissions p ON p.id = rp.permission_id
        WHERE rp.role_id = user_role_id
        AND p.name = required_permission
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Insert Base Roles
INSERT INTO public.roles (name, description) VALUES
    ('Super Admin', 'Full system access'),
    ('Hospital Admin', 'Hospital management'),
    ('Doctor', 'Clinical access'),
    ('Nurse', 'Nursing access'),
    ('Receptionist', 'Front desk and appointments'),
    ('Lab Technician', 'Laboratory management'),
    ('Radiology Technician', 'Radiology management'),
    ('Pharmacist', 'Pharmacy management'),
    ('Billing Staff', 'Billing and invoicing'),
    ('Accountant', 'Financial reporting'),
    ('Insurance/TPA Staff', 'Private insurance claims'),
    ('PM-JAY Staff', 'Government scheme management'),
    ('Medical Records Staff', 'Health records management'),
    ('Auditor', 'Read-only audit access')
ON CONFLICT (name) DO NOTHING;

-- Insert Granular Permissions
INSERT INTO public.permissions (name) VALUES
    ('patient.view'), ('patient.create'), ('patient.edit'),
    ('appointment.view'), ('appointment.create'),
    ('opd.view'), ('opd.create'), ('opd.finalize'),
    ('ipd.view'), ('ipd.admit'), ('ipd.transfer'), ('ipd.discharge'),
    ('nursing.view'), ('nursing.create'),
    ('lab.order'), ('lab.result'), ('lab.verify'),
    ('pharmacy.view'), ('pharmacy.dispense'),
    ('billing.create'), ('billing.view'),
    ('insurance.manage'), ('pmjay.manage'),
    ('ai.clinical'), ('ai.documentation'), ('ai.analytics'),
    ('abdm.manage')
ON CONFLICT (name) DO NOTHING;

-- Map Permissions to Roles (Examples)
DO $$
DECLARE
    super_admin UUID;
    doctor UUID;
    nurse UUID;
    receptionist UUID;
BEGIN
    SELECT id INTO super_admin FROM public.roles WHERE name = 'Super Admin';
    SELECT id INTO doctor FROM public.roles WHERE name = 'Doctor';
    SELECT id INTO nurse FROM public.roles WHERE name = 'Nurse';
    SELECT id INTO receptionist FROM public.roles WHERE name = 'Receptionist';

    -- Super Admin gets everything
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT super_admin, id FROM public.permissions
    ON CONFLICT DO NOTHING;

    -- Doctor gets clinical
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT doctor, id FROM public.permissions WHERE name IN (
        'patient.view', 'appointment.view', 'opd.view', 'opd.create', 'opd.finalize',
        'ipd.view', 'lab.order', 'lab.result', 'pharmacy.view', 'ai.clinical'
    )
    ON CONFLICT DO NOTHING;

    -- Nurse gets nursing and vitals
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT nurse, id FROM public.permissions WHERE name IN (
        'patient.view', 'ipd.view', 'nursing.view', 'nursing.create', 'pharmacy.view'
    )
    ON CONFLICT DO NOTHING;

    -- Receptionist gets front desk
    INSERT INTO public.role_permissions (role_id, permission_id)
    SELECT receptionist, id FROM public.permissions WHERE name IN (
        'patient.view', 'patient.create', 'appointment.view', 'appointment.create'
    )
    ON CONFLICT DO NOTHING;
END;
$$;
-- 1. Expand Patients Table
ALTER TABLE public.patients
ADD COLUMN IF NOT EXISTS blood_group TEXT,
ADD COLUMN IF NOT EXISTS city TEXT,
ADD COLUMN IF NOT EXISTS state TEXT,
ADD COLUMN IF NOT EXISTS pin TEXT,
ADD COLUMN IF NOT EXISTS emergency_contact JSONB;

-- 2. Longitudinal Tables
CREATE TABLE IF NOT EXISTS public.patient_allergies (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    allergen TEXT NOT NULL,
    severity TEXT NOT NULL, -- Mild, Moderate, Severe
    reaction TEXT,
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_conditions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    condition_name TEXT NOT NULL,
    diagnosis_date DATE,
    status TEXT NOT NULL DEFAULT 'Active', -- Active, Resolved, Chronic
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    document_type TEXT, -- ID, Lab Report, Old Record
    file_url TEXT NOT NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.patient_timeline (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    event_type TEXT NOT NULL, -- Registration, Admission, Discharge, Diagnosis
    description TEXT NOT NULL,
    actor_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Robust UHID Generation Sequence and RPC
CREATE SEQUENCE IF NOT EXISTS uhid_sequence START 10001;

CREATE OR REPLACE FUNCTION public.register_patient(
    p_first_name TEXT,
    p_last_name TEXT,
    p_dob DATE,
    p_gender TEXT,
    p_phone TEXT,
    p_email TEXT,
    p_address TEXT,
    p_city TEXT,
    p_state TEXT,
    p_pin TEXT,
    p_blood_group TEXT,
    p_emergency_contact JSONB,
    p_abha_number TEXT
) RETURNS UUID AS $$
DECLARE
    new_patient_id UUID;
    new_uhid TEXT;
    seq_val INT;
    date_prefix TEXT;
BEGIN
    -- Only allow if user has permission
    IF NOT auth.has_permission('patient.create') THEN
        RAISE EXCEPTION 'Access Denied: Missing patient.create permission';
    END IF;

    -- 1. Insert Patient
    INSERT INTO public.patients (
        first_name, last_name, date_of_birth, gender, 
        phone_number, email, address, city, state, pin, 
        blood_group, emergency_contact, created_by
    ) VALUES (
        p_first_name, p_last_name, p_dob, p_gender,
        p_phone, p_email, p_address, p_city, p_state, p_pin,
        p_blood_group, p_emergency_contact, auth.uid()
    ) RETURNING id INTO new_patient_id;

    -- 2. Generate UHID (Format: UHID-YYMM-XXXXX)
    date_prefix := to_char(CURRENT_DATE, 'YYMM');
    seq_val := nextval('uhid_sequence');
    new_uhid := 'UHID-' || date_prefix || '-' || seq_val::TEXT;

    -- 3. Insert UHID Identity
    INSERT INTO public.identity_records (patient_id, identity_type, identity_value, is_primary)
    VALUES (new_patient_id, 'UHID', new_uhid, true);

    -- 4. Insert ABHA if provided
    IF p_abha_number IS NOT NULL AND p_abha_number != '' THEN
        INSERT INTO public.identity_records (patient_id, identity_type, identity_value, is_primary)
        VALUES (new_patient_id, 'ABHA', p_abha_number, false);
    END IF;

    -- 5. Add Timeline Event
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (new_patient_id, 'Registration', 'Patient registered and UHID assigned', auth.uid());

    RETURN new_patient_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 4. RLS for new tables
ALTER TABLE public.patient_allergies ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_conditions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patient_timeline ENABLE ROW LEVEL SECURITY;

-- Note: In a real system, these would use auth.has_permission() deeply, 
-- but for now we enforce basic authenticated access to prevent UI breaks,
-- since the RPC handles the strict permission enforcement for creation.
CREATE POLICY "View allergies" ON public.patient_allergies FOR SELECT TO authenticated USING (auth.has_permission('patient.view'));
CREATE POLICY "Manage allergies" ON public.patient_allergies FOR ALL TO authenticated USING (auth.has_permission('patient.edit'));

CREATE POLICY "View conditions" ON public.patient_conditions FOR SELECT TO authenticated USING (auth.has_permission('patient.view'));
CREATE POLICY "Manage conditions" ON public.patient_conditions FOR ALL TO authenticated USING (auth.has_permission('patient.edit'));

CREATE POLICY "View timeline" ON public.patient_timeline FOR SELECT TO authenticated USING (auth.has_permission('patient.view'));

-- Tighten the Patients Policy based on expanded RBAC
DROP POLICY IF EXISTS "Authenticated users can select patients" ON public.patients;
CREATE POLICY "Users with patient.view can select" ON public.patients FOR SELECT TO authenticated USING (auth.has_permission('patient.view'));

DROP POLICY IF EXISTS "Authenticated users can update patients" ON public.patients;
CREATE POLICY "Users with patient.edit can update" ON public.patients FOR UPDATE TO authenticated USING (auth.has_permission('patient.edit'));
-- Atomic IPD Admission Logic
CREATE OR REPLACE FUNCTION public.admit_patient_to_bed(
    p_encounter_id UUID,
    p_patient_id UUID,
    p_bed_id UUID,
    p_reason TEXT
) RETURNS UUID AS $$
DECLARE
    new_admission_id UUID;
    v_bed_status TEXT;
BEGIN
    -- Verify permission
    IF NOT auth.has_permission('ipd.admit') THEN
        RAISE EXCEPTION 'Access Denied: Missing ipd.admit permission';
    END IF;

    -- Lock the bed row for update to prevent concurrent admission
    SELECT status INTO v_bed_status FROM public.beds WHERE id = p_bed_id FOR UPDATE;

    IF v_bed_status != 'Available' THEN
        RAISE EXCEPTION 'Bed is no longer available.';
    END IF;

    -- 1. Create Admission
    INSERT INTO public.admissions (
        encounter_id, patient_id, attending_provider_id, admission_reason
    ) VALUES (
        p_encounter_id, p_patient_id, auth.uid(), p_reason
    ) RETURNING id INTO new_admission_id;

    -- 2. Update Bed Status
    UPDATE public.beds SET status = 'Occupied' WHERE id = p_bed_id;

    -- 3. Create Bed Allocation
    INSERT INTO public.bed_allocations (
        admission_id, bed_id, created_by
    ) VALUES (
        new_admission_id, p_bed_id, auth.uid()
    );

    -- 4. Add Timeline Event
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (p_patient_id, 'Admission', 'Admitted to IPD (Bed: ' || p_bed_id || ')', auth.uid());

    RETURN new_admission_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;


-- Atomic Bed Transfer Logic
CREATE OR REPLACE FUNCTION public.transfer_bed(
    p_admission_id UUID,
    p_old_bed_id UUID,
    p_new_bed_id UUID
) RETURNS VOID AS $$
DECLARE
    v_new_bed_status TEXT;
    v_patient_id UUID;
BEGIN
    IF NOT auth.has_permission('ipd.transfer') THEN
        RAISE EXCEPTION 'Access Denied: Missing ipd.transfer permission';
    END IF;

    -- Lock new bed
    SELECT status INTO v_new_bed_status FROM public.beds WHERE id = p_new_bed_id FOR UPDATE;

    IF v_new_bed_status != 'Available' THEN
        RAISE EXCEPTION 'New bed is no longer available.';
    END IF;

    -- Close old allocation
    UPDATE public.bed_allocations 
    SET end_time = NOW(), status = 'Transferred' 
    WHERE admission_id = p_admission_id AND bed_id = p_old_bed_id AND status = 'Active';

    -- Open new allocation
    INSERT INTO public.bed_allocations (admission_id, bed_id, created_by)
    VALUES (p_admission_id, p_new_bed_id, auth.uid());

    -- Swap Bed Statuses
    UPDATE public.beds SET status = 'Available' WHERE id = p_old_bed_id;
    UPDATE public.beds SET status = 'Occupied' WHERE id = p_new_bed_id;

    -- Timeline event
    SELECT patient_id INTO v_patient_id FROM public.admissions WHERE id = p_admission_id;
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (v_patient_id, 'Transfer', 'Transferred to new bed', auth.uid());

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Migration: Appointments Scheduling & Queue System
-- ============================================================

-- 1. Departments Master Table
CREATE TABLE IF NOT EXISTS public.departments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    code TEXT UNIQUE, -- Short code e.g. CARD, ORTHO
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. Doctor Schedules (Recurring Weekly Templates)
CREATE TABLE IF NOT EXISTS public.doctor_schedules (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    day_of_week SMALLINT NOT NULL CHECK (day_of_week BETWEEN 0 AND 6), -- 0=Sun, 1=Mon...
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    slot_duration_minutes INTEGER NOT NULL DEFAULT 15,
    max_appointments INTEGER NOT NULL DEFAULT 20,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(doctor_id, day_of_week, start_time)
);

-- 3. Alter Appointments Table to Full Feature Set
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS department_id UUID REFERENCES public.departments(id),
    ADD COLUMN IF NOT EXISTS appointment_type TEXT NOT NULL DEFAULT 'Scheduled', -- Scheduled, Walk-in
    ADD COLUMN IF NOT EXISTS token_number TEXT,
    ADD COLUMN IF NOT EXISTS queue_position INTEGER,
    ADD COLUMN IF NOT EXISTS check_in_time TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS notes TEXT,
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

-- Update status check to include all statuses
-- (Existing status column already exists, we just ensure proper values)

-- 4. Daily Token Sequences (per doctor per date)
CREATE TABLE IF NOT EXISTS public.daily_token_counters (
    doctor_id UUID REFERENCES public.user_profiles(id),
    token_date DATE NOT NULL,
    last_token INTEGER NOT NULL DEFAULT 0,
    PRIMARY KEY (doctor_id, token_date)
);

-- 5. Appointment Audit Log (immutable)
CREATE TABLE IF NOT EXISTS public.appointment_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    appointment_id UUID NOT NULL REFERENCES public.appointments(id),
    old_status TEXT,
    new_status TEXT NOT NULL,
    changed_by UUID REFERENCES public.user_profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES for performance
-- ============================================================

-- Unique partial index: prevent double-booking same doctor same slot
CREATE UNIQUE INDEX IF NOT EXISTS idx_appointments_no_double_book
    ON public.appointments(provider_id, appointment_time)
    WHERE status NOT IN ('Cancelled', 'No-show');

-- Performance indexes
CREATE INDEX IF NOT EXISTS idx_appointments_date
    ON public.appointments(DATE(appointment_time));

CREATE INDEX IF NOT EXISTS idx_appointments_patient
    ON public.appointments(patient_id);

CREATE INDEX IF NOT EXISTS idx_appointments_provider
    ON public.appointments(provider_id);

CREATE INDEX IF NOT EXISTS idx_appointments_status
    ON public.appointments(status);

CREATE INDEX IF NOT EXISTS idx_appointments_dept
    ON public.appointments(department_id);

CREATE INDEX IF NOT EXISTS idx_doctor_schedules_doctor
    ON public.doctor_schedules(doctor_id);

-- ============================================================
-- ATOMIC RPC: book_appointment
-- Prevents double-booking at DB level
-- ============================================================
CREATE OR REPLACE FUNCTION public.book_appointment(
    p_patient_id UUID,
    p_provider_id UUID,
    p_department_id UUID,
    p_slot_time TIMESTAMP WITH TIME ZONE,
    p_notes TEXT DEFAULT NULL,
    p_appointment_type TEXT DEFAULT 'Scheduled'
) RETURNS UUID AS $$
DECLARE
    new_appointment_id UUID;
BEGIN
    IF NOT auth.has_permission('appointment.create') THEN
        RAISE EXCEPTION 'Access Denied: Missing appointment.create permission';
    END IF;

    -- Insert appointment; unique index will reject duplicates automatically
    INSERT INTO public.appointments (
        patient_id, provider_id, department_id,
        appointment_time, appointment_type, notes,
        status, created_by
    ) VALUES (
        p_patient_id, p_provider_id, p_department_id,
        p_slot_time, p_appointment_type, p_notes,
        'Scheduled', auth.uid()
    ) RETURNING id INTO new_appointment_id;

    -- Audit log
    INSERT INTO public.appointment_audit_log (appointment_id, new_status, changed_by, notes)
    VALUES (new_appointment_id, 'Scheduled', auth.uid(), 'Appointment created');

    -- Patient timeline
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (p_patient_id, 'Appointment', 'Appointment scheduled', auth.uid());

    RETURN new_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- ATOMIC RPC: checkin_appointment
-- Assigns a unique daily token per doctor
-- ============================================================
CREATE OR REPLACE FUNCTION public.checkin_appointment(
    p_appointment_id UUID
) RETURNS TEXT AS $$
DECLARE
    v_doctor_id UUID;
    v_patient_id UUID;
    v_today DATE := CURRENT_DATE;
    v_next_token INTEGER;
    v_token_text TEXT;
BEGIN
    -- Fetch doctor from appointment
    SELECT provider_id, patient_id INTO v_doctor_id, v_patient_id
    FROM public.appointments
    WHERE id = p_appointment_id AND status = 'Scheduled';

    IF v_doctor_id IS NULL THEN
        RAISE EXCEPTION 'Appointment not found or not in Scheduled status';
    END IF;

    -- Get/increment daily token counter atomically
    INSERT INTO public.daily_token_counters (doctor_id, token_date, last_token)
    VALUES (v_doctor_id, v_today, 1)
    ON CONFLICT (doctor_id, token_date)
    DO UPDATE SET last_token = daily_token_counters.last_token + 1
    RETURNING last_token INTO v_next_token;

    v_token_text := 'T-' || LPAD(v_next_token::TEXT, 3, '0');

    -- Update appointment
    UPDATE public.appointments SET
        status = 'Checked-in',
        token_number = v_token_text,
        queue_position = v_next_token,
        check_in_time = NOW()
    WHERE id = p_appointment_id;

    -- Audit log
    INSERT INTO public.appointment_audit_log (appointment_id, old_status, new_status, changed_by)
    VALUES (p_appointment_id, 'Scheduled', 'Checked-in', auth.uid());

    -- Patient timeline
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (v_patient_id, 'Check-in', 'Patient checked in, token ' || v_token_text, auth.uid());

    RETURN v_token_text;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================================
-- RLS Policies
-- ============================================================
ALTER TABLE public.departments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.doctor_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.daily_token_counters ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointment_audit_log ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone authenticated can view departments"
    ON public.departments FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage departments"
    ON public.departments FOR ALL TO authenticated
    USING (auth.has_permission('appointment.create'));

CREATE POLICY "Anyone authenticated can view doctor schedules"
    ON public.doctor_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Admins manage doctor schedules"
    ON public.doctor_schedules FOR ALL TO authenticated
    USING (auth.has_permission('appointment.create'));

-- Tighten appointment RLS to use RBAC
DROP POLICY IF EXISTS "Authenticated users can select appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can insert appointments" ON public.appointments;
DROP POLICY IF EXISTS "Authenticated users can update appointments" ON public.appointments;

CREATE POLICY "View appointments"
    ON public.appointments FOR SELECT TO authenticated
    USING (auth.has_permission('appointment.view'));

CREATE POLICY "Audit log is append-only read"
    ON public.appointment_audit_log FOR SELECT TO authenticated
    USING (auth.has_permission('appointment.view'));

-- Seed default departments
INSERT INTO public.departments (name, code) VALUES
    ('General Medicine', 'GM'),
    ('Paediatrics', 'PAED'),
    ('Gynaecology & Obstetrics', 'GYNO'),
    ('Orthopaedics', 'ORTHO'),
    ('Cardiology', 'CARD'),
    ('Dermatology', 'DERM'),
    ('Ophthalmology', 'OPTHAL'),
    ('ENT', 'ENT'),
    ('Neurology', 'NEURO'),
    ('Surgery', 'SURG'),
    ('Emergency', 'EMER')
ON CONFLICT (name) DO NOTHING;
-- ============================================================
-- Migration: Doctor OPD Expansion & Versioning
-- ============================================================

-- 1. Expand clinical_records table
ALTER TABLE public.clinical_records
    ADD COLUMN IF NOT EXISTS symptoms TEXT,
    ADD COLUMN IF NOT EXISTS past_history TEXT,
    ADD COLUMN IF NOT EXISTS assessment TEXT,
    ADD COLUMN IF NOT EXISTS advice TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_plan TEXT,
    ADD COLUMN IF NOT EXISTS version_number INTEGER NOT NULL DEFAULT 1;

-- 2. Clinical Audit Log
CREATE TABLE IF NOT EXISTS public.clinical_audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    clinical_record_id UUID NOT NULL REFERENCES public.clinical_records(id),
    action TEXT NOT NULL, -- Created, Finalized, Amended
    actor_id UUID REFERENCES public.user_profiles(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

ALTER TABLE public.clinical_audit_log ENABLE ROW LEVEL SECURITY;
CREATE POLICY "View clinical audit log" ON public.clinical_audit_log FOR SELECT TO authenticated USING (auth.has_permission('opd.view'));

-- 3. Atomic RPC for Amendment
CREATE OR REPLACE FUNCTION public.amend_clinical_record(
    p_record_id UUID
) RETURNS UUID AS $$
DECLARE
    v_old_record RECORD;
    v_new_record_id UUID;
BEGIN
    IF NOT auth.has_permission('opd.create') THEN
        RAISE EXCEPTION 'Access Denied: Missing opd.create permission';
    END IF;

    -- Fetch old record
    SELECT * INTO v_old_record FROM public.clinical_records WHERE id = p_record_id FOR UPDATE;

    IF v_old_record.status != 'Finalized' THEN
        RAISE EXCEPTION 'Only Finalized records can be amended';
    END IF;

    -- Update old record to Amended
    UPDATE public.clinical_records SET status = 'Amended' WHERE id = p_record_id;
    
    -- Log amendment
    INSERT INTO public.clinical_audit_log (clinical_record_id, action, actor_id, notes)
    VALUES (p_record_id, 'Amended', auth.uid(), 'Superseded by new version');

    -- Insert new draft record as a copy
    INSERT INTO public.clinical_records (
        encounter_id, patient_id, provider_id, status, parent_record_id, version_number,
        chief_complaint, history_of_present_illness, examination_notes,
        symptoms, past_history, assessment, advice, follow_up_plan
    ) VALUES (
        v_old_record.encounter_id, v_old_record.patient_id, auth.uid(), 'Draft', p_record_id, v_old_record.version_number + 1,
        v_old_record.chief_complaint, v_old_record.history_of_present_illness, v_old_record.examination_notes,
        v_old_record.symptoms, v_old_record.past_history, v_old_record.assessment, v_old_record.advice, v_old_record.follow_up_plan
    ) RETURNING id INTO v_new_record_id;

    -- Log draft creation
    INSERT INTO public.clinical_audit_log (clinical_record_id, action, actor_id, notes)
    VALUES (v_new_record_id, 'Created', auth.uid(), 'New version draft created');

    -- Note: Vitals, diagnoses, and prescriptions are technically separate tables.
    -- In a real full EMR, you might want to clone those linked entities as well to the new record,
    -- or keep them linked to the encounter and just version the core note.
    -- For this prototype, we'll version the core note.

    RETURN v_new_record_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
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
-- ============================================================
-- Migration: IPD Discharge Logic
-- ============================================================

CREATE OR REPLACE FUNCTION public.discharge_patient(
    p_admission_id UUID,
    p_discharge_summary_id UUID
) RETURNS VOID AS $$
DECLARE
    v_patient_id UUID;
    v_bed_allocation_id UUID;
    v_bed_id UUID;
BEGIN
    -- 1. Get Admission Info
    SELECT patient_id INTO v_patient_id
    FROM public.admissions
    WHERE id = p_admission_id;

    IF v_patient_id IS NULL THEN
        RAISE EXCEPTION 'Admission not found';
    END IF;

    -- 2. Update Admission Record
    UPDATE public.admissions
    SET 
        actual_discharge_date = NOW(),
        discharge_summary_id = p_discharge_summary_id,
        updated_at = NOW()
    WHERE id = p_admission_id;

    -- 3. Release the Bed
    -- Find the active bed allocation for this admission
    SELECT id, bed_id INTO v_bed_allocation_id, v_bed_id
    FROM public.bed_allocations
    WHERE admission_id = p_admission_id AND status = 'Active'
    LIMIT 1;

    IF v_bed_allocation_id IS NOT NULL THEN
        -- End the allocation
        UPDATE public.bed_allocations
        SET end_time = NOW(), status = 'Discharged'
        WHERE id = v_bed_allocation_id;

        -- Mark bed for Housekeeping
        UPDATE public.beds
        SET status = 'Housekeeping'
        WHERE id = v_bed_id;
    END IF;

    -- 4. Audit Trail
    INSERT INTO public.patient_timeline (patient_id, event_type, description, actor_id)
    VALUES (
        v_patient_id, 
        'Discharge', 
        'Patient discharged from IPD. Bed marked for housekeeping.', 
        auth.uid()
    );

END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
-- ============================================================
-- Migration: IPD Spatial Hierarchy Expansion
-- ============================================================

CREATE TABLE public.floors (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    level INTEGER NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add floor_id to wards
ALTER TABLE public.wards ADD COLUMN floor_id UUID REFERENCES public.floors(id);

CREATE TABLE public.rooms (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    ward_id UUID REFERENCES public.wards(id) ON DELETE CASCADE,
    room_number TEXT NOT NULL,
    room_type TEXT, -- Private, Semi-Private, General
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    UNIQUE(ward_id, room_number)
);

-- Add room_id to beds
ALTER TABLE public.beds ADD COLUMN room_id UUID REFERENCES public.rooms(id);

-- Since we are expanding the constraint of beds.status, we don't strictly need a CHECK constraint if we just enforce in UI, 
-- but let's update any existing data just in case, and rely on app logic.
-- Allow 'Reserved', 'Blocked', 'Cleaning' etc.

ALTER TABLE public.floors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select floors" ON public.floors FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can select rooms" ON public.rooms FOR SELECT TO authenticated USING (true);

-- ============================================================
-- SEED DATA
-- ============================================================
DO $$
DECLARE
    f1 UUID;
    w1 UUID;
    w2 UUID;
    r1 UUID;
    r2 UUID;
BEGIN
    INSERT INTO public.floors (name, level) VALUES ('First Floor', 1) RETURNING id INTO f1;

    -- Update or insert Wards
    INSERT INTO public.wards (name, type, capacity, floor_id) VALUES ('General Ward A', 'General', 10, f1) 
    ON CONFLICT (name) DO UPDATE SET floor_id = f1 RETURNING id INTO w1;
    
    INSERT INTO public.wards (name, type, capacity, floor_id) VALUES ('ICU', 'ICU', 5, f1) 
    ON CONFLICT (name) DO UPDATE SET floor_id = f1 RETURNING id INTO w2;

    -- Insert Rooms
    INSERT INTO public.rooms (ward_id, room_number, room_type) VALUES (w1, '101', 'General') RETURNING id INTO r1;
    INSERT INTO public.rooms (ward_id, room_number, room_type) VALUES (w1, '102', 'General') RETURNING id INTO r2;

    -- Insert Beds
    INSERT INTO public.beds (ward_id, room_id, bed_number, status) VALUES 
        (w1, r1, '101-A', 'Available'),
        (w1, r1, '101-B', 'Available'),
        (w1, r2, '102-A', 'Available'),
        (w2, NULL, 'ICU-1', 'Available'), -- ICU beds might not have a specific room, just ward
        (w2, NULL, 'ICU-2', 'Available');
END;
$$;
-- ============================================================
-- Migration: Nursing Module Expansion
-- ============================================================

-- 1. Alter Vitals
-- Allow vitals to be linked directly to an encounter/patient without needing a clinical record wrapper
ALTER TABLE public.vitals ADD COLUMN encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE;
ALTER TABLE public.vitals ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.vitals ADD COLUMN recorded_by UUID REFERENCES public.user_profiles(id);

-- Make clinical_record_id nullable so independent nursing vitals can exist
ALTER TABLE public.vitals ALTER COLUMN clinical_record_id DROP NOT NULL;

-- 2. Medication Administration Record (MAR)
CREATE TABLE public.medication_administrations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    prescription_id UUID NOT NULL REFERENCES public.medication_prescriptions(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    administered_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    status TEXT NOT NULL, -- Administered, Refused, Missed
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. Intake / Output (Fluid Balance)
CREATE TABLE public.fluid_balance (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    record_type TEXT NOT NULL, -- Intake, Output
    fluid_type TEXT NOT NULL, -- Oral, IV, Urine, Drain, Emesis
    volume_ml INTEGER NOT NULL,
    recorded_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    notes TEXT
);

-- 4. Shift Handovers
CREATE TABLE public.shift_handovers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    admission_id UUID NOT NULL REFERENCES public.admissions(id) ON DELETE CASCADE,
    outgoing_nurse_id UUID NOT NULL REFERENCES public.user_profiles(id),
    incoming_nurse_id UUID REFERENCES public.user_profiles(id), -- Can be null if broadcasting to shift
    handover_time TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    shift TEXT NOT NULL, -- Morning, Evening, Night
    clinical_summary TEXT NOT NULL,
    pending_tasks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.medication_administrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.fluid_balance ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.shift_handovers ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Authenticated users can select nursing" ON public.medication_administrations FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert nursing" ON public.medication_administrations FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select fluid" ON public.fluid_balance FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert fluid" ON public.fluid_balance FOR INSERT TO authenticated WITH CHECK (true);

CREATE POLICY "Authenticated users can select handover" ON public.shift_handovers FOR SELECT TO authenticated USING (true);
CREATE POLICY "Authenticated users can insert handover" ON public.shift_handovers FOR INSERT TO authenticated WITH CHECK (true);
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
-- ============================================================
-- Migration: AI Infrastructure Hardening
-- ============================================================

-- 1. Upgrade AI Interactions Table
ALTER TABLE public.ai_interactions ADD COLUMN patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE;
ALTER TABLE public.ai_interactions ADD COLUMN encounter_id UUID REFERENCES public.encounters(id) ON DELETE CASCADE;
ALTER TABLE public.ai_interactions ADD COLUMN role_at_time TEXT; -- Role of the user who triggered it (e.g., Doctor)
ALTER TABLE public.ai_interactions ADD COLUMN model_used TEXT NOT NULL DEFAULT 'mock-ai';
ALTER TABLE public.ai_interactions ADD COLUMN context_identifier TEXT; -- Hash or ID of the context payload sent
ALTER TABLE public.ai_interactions ADD COLUMN execution_time_ms INTEGER;

-- 2. AI Usage & Rate Limiting Logs
CREATE TABLE public.ai_usage_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    provider_id UUID NOT NULL REFERENCES public.user_profiles(id),
    interaction_id UUID REFERENCES public.ai_interactions(id),
    model TEXT NOT NULL,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    total_tokens INTEGER DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS
ALTER TABLE public.ai_usage_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can insert their own ai usage" ON public.ai_usage_logs FOR INSERT TO authenticated WITH CHECK (provider_id = auth.uid());
CREATE POLICY "Users can view their own ai usage" ON public.ai_usage_logs FOR SELECT TO authenticated USING (provider_id = auth.uid());
CREATE POLICY "Admins can view all ai usage" ON public.ai_usage_logs FOR SELECT TO authenticated USING (
    EXISTS (SELECT 1 FROM public.user_roles ur JOIN public.roles r ON ur.role_id = r.id WHERE ur.user_id = auth.uid() AND r.name = 'Admin')
);
-- Operation Theatre (OT) Module

CREATE TABLE ot_rooms (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name VARCHAR(255) NOT NULL,
    department VARCHAR(255),
    status VARCHAR(50) DEFAULT 'Active', -- Active, Maintenance, Out of Order
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_procedure_master (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    code VARCHAR(50) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    base_duration_minutes INTEGER DEFAULT 60,
    status VARCHAR(50) DEFAULT 'Active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_schedules (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    patient_id UUID REFERENCES patients(id) ON DELETE CASCADE,
    ot_room_id UUID REFERENCES ot_rooms(id),
    procedure_id UUID REFERENCES ot_procedure_master(id),
    primary_surgeon_id UUID REFERENCES user_profiles(id),
    anesthetist_id UUID REFERENCES user_profiles(id),
    scheduled_start TIMESTAMP WITH TIME ZONE NOT NULL,
    scheduled_end TIMESTAMP WITH TIME ZONE NOT NULL,
    status VARCHAR(50) DEFAULT 'Scheduled', -- Scheduled, PAC_Cleared, In_Progress, Recovery, Completed, Cancelled
    admission_id UUID REFERENCES admissions(id) ON DELETE SET NULL, -- Optional, if part of an IPD admission
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_pac_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    anesthetist_id UUID REFERENCES user_profiles(id),
    asa_grade VARCHAR(50),
    allergies_reviewed BOOLEAN DEFAULT false,
    airway_assessment TEXT,
    anesthesia_plan TEXT,
    fitness_status VARCHAR(50) DEFAULT 'Fit', -- Fit, Unfit, Review
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_intraop_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    patient_in_time TIMESTAMP WITH TIME ZONE,
    anesthesia_start_time TIMESTAMP WITH TIME ZONE,
    incision_time TIMESTAMP WITH TIME ZONE,
    surgery_end_time TIMESTAMP WITH TIME ZONE,
    patient_out_time TIMESTAMP WITH TIME ZONE,
    anesthesia_type VARCHAR(100),
    surgical_notes TEXT,
    implants_used TEXT,
    complications TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ot_postop_records (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    schedule_id UUID UNIQUE REFERENCES ot_schedules(id) ON DELETE CASCADE,
    pacu_in_time TIMESTAMP WITH TIME ZONE,
    pacu_out_time TIMESTAMP WITH TIME ZONE,
    recovery_score INTEGER,
    post_op_orders TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample data
INSERT INTO ot_rooms (name, department) VALUES 
('OT-1 (Cardiac)', 'Cardiology'),
('OT-2 (General)', 'General Surgery'),
('OT-3 (Ortho)', 'Orthopedics');

INSERT INTO ot_procedure_master (code, name, base_duration_minutes) VALUES
('PROC001', 'Appendectomy', 60),
('PROC002', 'CABG', 240),
('PROC003', 'Total Knee Replacement', 120),
('PROC004', 'Laparoscopic Cholecystectomy', 90);
-- Add RLS to OT Module

ALTER TABLE ot_rooms ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_procedure_master ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_schedules ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_pac_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_intraop_records ENABLE ROW LEVEL SECURITY;
ALTER TABLE ot_postop_records ENABLE ROW LEVEL SECURITY;

-- ot_rooms (Viewable by all logged-in, managed by Admin/OT Manager)
CREATE POLICY "Enable read access for all authenticated users on ot_rooms"
ON ot_rooms FOR SELECT TO authenticated USING (true);

-- ot_procedure_master (Viewable by all logged-in)
CREATE POLICY "Enable read access for all authenticated users on ot_procedure_master"
ON ot_procedure_master FOR SELECT TO authenticated USING (true);

-- ot_schedules (Viewable by authenticated, manageable by ot.manage)
CREATE POLICY "Enable read access for all authenticated users on ot_schedules"
ON ot_schedules FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_schedules"
ON ot_schedules FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

CREATE POLICY "Enable update for ot.manage on ot_schedules"
ON ot_schedules FOR UPDATE TO authenticated 
USING (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_pac_records
CREATE POLICY "Enable read access for all authenticated users on ot_pac_records"
ON ot_pac_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_pac_records"
ON ot_pac_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_intraop_records
CREATE POLICY "Enable read access for all authenticated users on ot_intraop_records"
ON ot_intraop_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_intraop_records"
ON ot_intraop_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));

-- ot_postop_records
CREATE POLICY "Enable read access for all authenticated users on ot_postop_records"
ON ot_postop_records FOR SELECT TO authenticated USING (true);

CREATE POLICY "Enable insert for ot.manage on ot_postop_records"
ON ot_postop_records FOR INSERT TO authenticated 
WITH CHECK (EXISTS (SELECT 1 FROM user_roles ur JOIN role_permissions rp ON ur.role_id = rp.role_id JOIN permissions p ON rp.permission_id = p.id WHERE ur.user_id = auth.uid() AND p.code = 'ot.manage'));
