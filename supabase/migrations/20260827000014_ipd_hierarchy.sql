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
