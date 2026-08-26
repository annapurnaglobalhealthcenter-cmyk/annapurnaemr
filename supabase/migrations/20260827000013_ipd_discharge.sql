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
