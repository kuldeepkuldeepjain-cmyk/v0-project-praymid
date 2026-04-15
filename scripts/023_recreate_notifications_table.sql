-- Drop existing table if it exists
DROP TABLE IF EXISTS notifications CASCADE;

-- Create notifications table for admin broadcasts and system notifications
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_email TEXT NOT NULL,
  title TEXT NOT NULL,
  message TEXT NOT NULL,
  type TEXT DEFAULT 'info' CHECK (type IN ('info', 'success', 'warning', 'error')),
  read_status BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Add indexes for performance
CREATE INDEX idx_notifications_user_email ON notifications(user_email);
CREATE INDEX idx_notifications_read_status ON notifications(user_email, read_status);
CREATE INDEX idx_notifications_created_at ON notifications(created_at DESC);
