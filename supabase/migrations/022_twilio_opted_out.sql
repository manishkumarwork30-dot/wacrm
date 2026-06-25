-- Add opted_out column to contacts for Twilio DND
ALTER TABLE contacts
  ADD COLUMN IF NOT EXISTS opted_out BOOLEAN DEFAULT false;
