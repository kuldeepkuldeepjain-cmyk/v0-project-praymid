-- Drop existing table if exists
DROP TABLE IF EXISTS public.activity_logs CASCADE;

-- Create activity logs table
CREATE TABLE public.activity_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  action TEXT NOT NULL,
  actor_id TEXT,
  actor_email TEXT,
  target_type TEXT,
  details TEXT,
  timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index
CREATE INDEX idx_activity_logs_timestamp ON public.activity_logs(timestamp DESC);

-- Enable Row Level Security
ALTER TABLE public.activity_logs ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "activity_logs_select_all" ON public.activity_logs FOR SELECT USING (true);
CREATE POLICY "activity_logs_insert_all" ON public.activity_logs FOR INSERT WITH CHECK (true);
