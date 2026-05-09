-- ============================================================================
-- MIGRATION: Add Tax System
-- Date: 2026-01-30
-- Description: Implements user-configurable invoice-level tax system
-- ============================================================================

-- Create tax_profiles table
-- Each user has one active tax profile per jurisdiction/type
CREATE TABLE IF NOT EXISTS tax_profiles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  
  -- Tax configuration
  name VARCHAR(40) NOT NULL,                    -- e.g., "Sales Tax", "VAT", "GST"
  rate NUMERIC(5, 2) NOT NULL,                  -- 0.00 to 30.00 (percentage)
  applies_to VARCHAR(30) NOT NULL,              -- labor_only, materials_only, labor_and_materials
  enabled BOOLEAN NOT NULL DEFAULT false,       -- Tax turned on/off
  is_default BOOLEAN NOT NULL DEFAULT true,     -- User's default tax profile
  
  -- Timestamps
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  -- Constraints
  CONSTRAINT rate_range CHECK (rate >= 0 AND rate <= 30),
  CONSTRAINT name_length CHECK (char_length(name) <= 40),
  CONSTRAINT valid_applies_to CHECK (applies_to IN ('labor_only', 'materials_only', 'labor_and_materials')),
  CONSTRAINT one_default_per_user UNIQUE (user_id, is_default) WHERE is_default = true
);

-- Create index for quick lookup
CREATE INDEX idx_tax_profiles_user_id ON tax_profiles(user_id);
CREATE INDEX idx_tax_profiles_user_default ON tax_profiles(user_id, is_default);

-- ============================================================================
-- Extend invoices table with tax snapshot fields
-- These values are immutable once invoice is created
-- ============================================================================

ALTER TABLE invoices ADD COLUMN IF NOT EXISTS subtotal NUMERIC(12, 2) DEFAULT '0',
                     ADD COLUMN IF NOT EXISTS tax_name VARCHAR(40),
                     ADD COLUMN IF NOT EXISTS tax_rate NUMERIC(5, 2),
                     ADD COLUMN IF NOT EXISTS tax_applies_to VARCHAR(30),
                     ADD COLUMN IF NOT EXISTS tax_amount NUMERIC(12, 2) DEFAULT '0';

-- Note: 'total' column already exists - it's the final amount including tax

-- Create indexes for invoice lookups
CREATE INDEX idx_invoices_user_id ON invoices(user_id);
CREATE INDEX idx_invoices_project_id ON invoices(project_id);

-- Add comment explaining immutability
COMMENT ON COLUMN invoices.tax_rate IS 'Snapshot of tax rate at time of invoice creation - IMMUTABLE';
COMMENT ON COLUMN invoices.tax_name IS 'Snapshot of tax name at time of invoice creation - IMMUTABLE';
COMMENT ON COLUMN invoices.tax_amount IS 'Calculated tax amount at time of invoice creation - IMMUTABLE';
COMMENT ON COLUMN invoices.subtotal IS 'Total before tax - IMMUTABLE';

-- ============================================================================
-- Data validation: Ensure new invoices have either complete tax info or none
-- ============================================================================

ALTER TABLE invoices ADD CONSTRAINT tax_info_consistency CHECK (
  (tax_name IS NULL AND tax_rate IS NULL AND tax_applies_to IS NULL AND tax_amount = 0) OR
  (tax_name IS NOT NULL AND tax_rate IS NOT NULL AND tax_applies_to IS NOT NULL)
);
