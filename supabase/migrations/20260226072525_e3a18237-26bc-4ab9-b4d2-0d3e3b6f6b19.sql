ALTER TABLE public.automation_bots
  ADD COLUMN IF NOT EXISTS system_prompt text,
  ADD COLUMN IF NOT EXISTS last_output text;