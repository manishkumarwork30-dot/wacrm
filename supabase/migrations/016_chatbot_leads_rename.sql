-- Migration 016: Rename Chatbot Leads Table to tower_leads
-- Create the tower_leads table since leads table had a name conflict with the CRM calling system

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

-- Enable RLS and add basic select/management policies for tower_leads
ALTER TABLE tower_leads ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "Users can manage own tower_leads" ON tower_leads;
CREATE POLICY "Users can manage own tower_leads" ON tower_leads FOR ALL USING (auth.uid() = user_id);
