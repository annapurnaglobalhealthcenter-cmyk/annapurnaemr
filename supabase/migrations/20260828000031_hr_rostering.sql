-- ============================================================
-- Migration: HR & Rostering Module
-- ============================================================

CREATE TABLE IF NOT EXISTS public.staff_shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    department_id UUID REFERENCES public.departments(id),
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    shift_type TEXT NOT NULL, -- Morning, Evening, Night
    status TEXT DEFAULT 'Scheduled', -- Scheduled, Completed, Absent
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.leave_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    leave_type TEXT NOT NULL, -- Annual, Sick, Maternity, Unpaid
    reason TEXT,
    status TEXT DEFAULT 'Pending', -- Pending, Approved, Rejected
    approved_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- RLS Policies
ALTER TABLE public.staff_shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.leave_requests ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Full access to staff_shifts for authenticated users" ON public.staff_shifts FOR ALL TO authenticated USING (true);
CREATE POLICY "Full access to leave_requests for authenticated users" ON public.leave_requests FOR ALL TO authenticated USING (true);
