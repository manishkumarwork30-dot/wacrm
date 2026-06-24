-- Migration 021: Create approval_queue table for scheduled next-day approvals
CREATE TABLE IF NOT EXISTS approval_queue (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  lead_id UUID REFERENCES tower_leads(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE CASCADE,
  conversation_id UUID REFERENCES conversations(id) ON DELETE SET NULL,
  phone_number_id TEXT NOT NULL,
  access_token TEXT NOT NULL,
  recipient_phone TEXT NOT NULL,
  collected_data JSONB DEFAULT '{}'::jsonb,
  scheduled_at TIMESTAMPTZ NOT NULL,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'processed', 'failed')),
  error_message TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic policy
ALTER TABLE approval_queue ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own approval_queue" ON approval_queue;
CREATE POLICY "Users can manage own approval_queue" ON approval_queue FOR ALL USING (true);
