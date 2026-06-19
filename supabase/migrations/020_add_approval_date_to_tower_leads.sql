-- Migration 020: Add approval_date to tower_leads
-- Add approval_date column to store the decided approval date for each lead

ALTER TABLE tower_leads ADD COLUMN IF NOT EXISTS approval_date TEXT;
