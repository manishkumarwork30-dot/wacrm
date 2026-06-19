-- Migration 019: Add welcome_doc_sent column to tower_leads
ALTER TABLE tower_leads ADD COLUMN IF NOT EXISTS welcome_doc_sent BOOLEAN DEFAULT FALSE;
