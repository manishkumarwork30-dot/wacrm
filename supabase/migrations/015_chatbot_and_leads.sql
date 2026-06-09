-- Migration 015: Stateful Chatbot & Leads Table
-- Add tables to support the ITL Network 4G/5G Tower Installation Chatbot

-- Leads Table: stores parsed leads locally for CSV/Excel export
CREATE TABLE IF NOT EXISTS tower_leads (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID REFERENCES contacts(id) ON DELETE SET NULL,
  name TEXT,
  mobile_no TEXT,
  location TEXT,
  state TEXT,
  pin_code TEXT,
  land_size TEXT,
  ownership TEXT,
  status TEXT DEFAULT 'Pending' CHECK (status IN ('Pending', 'Interested – Payment Pending', 'Converted', 'Not Interested', 'No Response')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Chatbot Runs Table: stores current conversational state for each contact
CREATE TABLE IF NOT EXISTS chatbot_runs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  contact_id UUID NOT NULL REFERENCES contacts(id) ON DELETE CASCADE,
  state TEXT NOT NULL,
  collected_data JSONB DEFAULT '{}'::jsonb,
  last_message_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(contact_id)
);

-- Enable RLS and add basic select/management policies for both tables
ALTER TABLE tower_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tower_leads" ON tower_leads;
CREATE POLICY "Users can manage own tower_leads" ON tower_leads FOR ALL USING (auth.uid() = user_id);

ALTER TABLE chatbot_runs ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own chatbot runs" ON chatbot_runs;
CREATE POLICY "Users can manage own chatbot runs" ON chatbot_runs FOR ALL USING (auth.uid() = user_id);
