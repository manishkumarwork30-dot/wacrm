-- Migration 017: Update tower_leads Columns
-- Make location nullable and add ownership column to tower_leads

ALTER TABLE tower_leads ALTER COLUMN location DROP NOT NULL;
ALTER TABLE tower_leads ADD COLUMN IF NOT EXISTS ownership TEXT;
