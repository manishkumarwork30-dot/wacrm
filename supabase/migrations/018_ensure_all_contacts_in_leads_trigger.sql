-- Migration 018: Trigger to automatically create tower_leads row for any contact in inbox
-- Also backfills existing conversations.

-- Trigger function to ensure contact has a lead record in tower_leads
CREATE OR REPLACE FUNCTION ensure_contact_in_tower_leads()
RETURNS TRIGGER AS $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM tower_leads WHERE contact_id = NEW.contact_id
  ) THEN
    INSERT INTO tower_leads (user_id, contact_id, name, mobile_no, location, status)
    SELECT NEW.user_id, NEW.contact_id, name, phone, 'Pending Chatbot', 'Pending'
    FROM contacts
    WHERE id = NEW.contact_id;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Bind trigger to conversations table
DROP TRIGGER IF EXISTS ensure_contact_in_tower_leads_trigger ON conversations;
CREATE TRIGGER ensure_contact_in_tower_leads_trigger
AFTER INSERT ON conversations
FOR EACH ROW
EXECUTE FUNCTION ensure_contact_in_tower_leads();

-- Backfill existing conversations into tower_leads if they don't already exist
INSERT INTO tower_leads (user_id, contact_id, name, mobile_no, location, status, created_at, updated_at)
SELECT conv.user_id, conv.contact_id, c.name, c.phone, 'Pending Chatbot', 'Pending', conv.created_at, conv.created_at
FROM conversations conv
JOIN contacts c ON conv.contact_id = c.id
LEFT JOIN tower_leads tl ON tl.contact_id = conv.contact_id
WHERE tl.id IS NULL;
