-- Add display_phone_number column to whatsapp_config so we can show
-- the human-readable phone number in the header without a Meta API call.
ALTER TABLE whatsapp_config
  ADD COLUMN IF NOT EXISTS display_phone_number TEXT;
