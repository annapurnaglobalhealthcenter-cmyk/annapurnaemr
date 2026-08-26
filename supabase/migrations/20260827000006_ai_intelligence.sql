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
