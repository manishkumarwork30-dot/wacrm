-- Migration 023: Create agent_id_cards table for managing multiple generated ID cards
CREATE TABLE IF NOT EXISTS agent_id_cards (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID,
  name TEXT NOT NULL,
  designation TEXT,
  id_number TEXT,
  aadhar_no TEXT,
  email TEXT,
  phone TEXT,
  valid_upto TEXT,
  company_name TEXT,
  logo_url TEXT,
  photo_base64 TEXT,
  theme_name TEXT,
  orientation TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Enable RLS and add basic policy
ALTER TABLE agent_id_cards ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own ID cards" ON agent_id_cards;
CREATE POLICY "Users can manage own ID cards" ON agent_id_cards FOR ALL USING (true);
