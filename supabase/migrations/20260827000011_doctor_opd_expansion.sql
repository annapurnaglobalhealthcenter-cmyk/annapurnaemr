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
