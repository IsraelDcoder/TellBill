-- Migration: Add user settings and preferences
-- Purpose: Persist user preferences across sessions (currency, tax rate, invoice template, payment terms)
-- Date: 2026-02-20

-- ✅ Extend preferences table with additional settings
ALTER TABLE preferences
ADD COLUMN IF NOT EXISTS default_tax_profile_id text REFERENCES tax_profiles(id) ON DELETE SET NULL,
ADD COLUMN IF NOT EXISTS invoice_template text DEFAULT 'default', -- default, minimal, detailed
ADD COLUMN IF NOT EXISTS default_payment_terms text DEFAULT 'Due upon receipt',
ADD COLUMN IF NOT EXISTS updated_at timestamp with time zone DEFAULT NOW();

-- ✅ Add user preferences fields to users table
ALTER TABLE users
ADD COLUMN IF NOT EXISTS preferred_currency text DEFAULT 'USD',
ADD COLUMN IF NOT EXISTS default_tax_rate numeric(5, 2) DEFAULT 8.00,
ADD COLUMN IF NOT EXISTS invoice_template text DEFAULT 'default',
ADD COLUMN IF NOT EXISTS default_payment_terms text DEFAULT 'Due upon receipt';

-- ✅ Create index for faster preference lookups
CREATE INDEX IF NOT EXISTS idx_preferences_user_id ON preferences(user_id);
CREATE INDEX IF NOT EXISTS idx_preferences_updated_at ON preferences(updated_at);

-- ✅ Update existing records to have current timestamp
UPDATE preferences SET updated_at = NOW() WHERE updated_at IS NULL;
