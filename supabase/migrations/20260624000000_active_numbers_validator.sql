-- Add columns for third-party number validator API keys
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS validator_provider TEXT DEFAULT 'wassenger';
ALTER TABLE whatsapp_config ADD COLUMN IF NOT EXISTS validator_api_key TEXT;
