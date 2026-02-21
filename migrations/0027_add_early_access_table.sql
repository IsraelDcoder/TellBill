-- Migration: 0027_add_early_access_table.sql
-- Purpose: Create early_access table for limited early access program
-- 50-spot waitlist for contractor onboarding

CREATE TABLE IF NOT EXISTS early_access (
  id VARCHAR(36) PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  email VARCHAR(255) NOT NULL UNIQUE,
  trade VARCHAR(255),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create index for quick email lookups
CREATE INDEX IF NOT EXISTS idx_early_access_email ON early_access(email);
CREATE INDEX IF NOT EXISTS idx_early_access_created_at ON early_access(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_early_access_trade ON early_access(trade);

-- Enable RLS if not already enabled
ALTER TABLE early_access ENABLE ROW LEVEL SECURITY;

-- Allow public read access to see count (motivation)
-- Allow public insert for signups
CREATE POLICY "early_access_public_read" ON early_access
  FOR SELECT
  USING (true);

CREATE POLICY "early_access_public_insert" ON early_access
  FOR INSERT
  WITH CHECK (true);

-- Only founder can delete/update (admin dashboard)
-- This assumes founder has a specific user ID set in FOUNDER_USER_ID env var
CREATE POLICY "early_access_founder_full" ON early_access
  FOR ALL
  USING (auth.uid()::text = current_setting('app.founder_user_id', true))
  WITH CHECK (auth.uid()::text = current_setting('app.founder_user_id', true));
