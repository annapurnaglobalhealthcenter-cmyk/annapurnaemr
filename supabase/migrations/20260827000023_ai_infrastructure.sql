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
