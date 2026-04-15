-- Drop existing table if exists
DROP TABLE IF EXISTS public.support_tickets CASCADE;

-- Create support tickets table
CREATE TABLE public.support_tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  participant_id TEXT NOT NULL,
  participant_email TEXT NOT NULL,
  participant_username TEXT NOT NULL,
  category TEXT NOT NULL,
  subject TEXT NOT NULL,
  description TEXT NOT NULL,
  status TEXT DEFAULT 'open',
  admin_response TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes
CREATE INDEX idx_support_tickets_participant ON public.support_tickets(participant_id);
CREATE INDEX idx_support_tickets_status ON public.support_tickets(status);

-- Enable Row Level Security
ALTER TABLE public.support_tickets ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "support_tickets_select_all" ON public.support_tickets FOR SELECT USING (true);
CREATE POLICY "support_tickets_insert_all" ON public.support_tickets FOR INSERT WITH CHECK (true);
CREATE POLICY "support_tickets_update_all" ON public.support_tickets FOR UPDATE USING (true);
