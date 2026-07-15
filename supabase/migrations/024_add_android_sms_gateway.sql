-- Store Android SMS Gateway settings per user
CREATE TABLE IF NOT EXISTS sms_gateway_config (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  gateway_url TEXT NOT NULL,
  api_key TEXT,
  device_name TEXT DEFAULT 'Android Device',
  status TEXT DEFAULT 'disconnected',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT unique_user_sms_gateway UNIQUE(user_id)
);

-- Enable RLS
ALTER TABLE sms_gateway_config ENABLE ROW LEVEL SECURITY;

-- Drop policy if exists and create
DROP POLICY IF EXISTS "Users can manage their own sms gateway config" ON sms_gateway_config;
CREATE POLICY "Users can manage their own sms gateway config"
  ON sms_gateway_config
  FOR ALL
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- Alter broadcasts to support channel type
ALTER TABLE broadcasts 
  ADD COLUMN IF NOT EXISTS channel TEXT DEFAULT 'whatsapp' CHECK (channel IN ('whatsapp', 'sms')),
  ADD COLUMN IF NOT EXISTS sms_body TEXT;
