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
