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
