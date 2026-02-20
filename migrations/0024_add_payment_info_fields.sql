-- Migration 0024: Add payment info fields for non-payment-processor model
-- Users can store their own payment instructions (bank details, PayPal, etc.)
-- Invoices can override company payment info on a per-invoice basis

-- Add payment info columns to users table
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_method_type TEXT DEFAULT 'custom'; -- 'bank_transfer', 'paypal', 'stripe', 'square', 'mobile_money', 'custom'
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_account_number TEXT; -- Bank account / Mobile money
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_bank_name TEXT; -- Bank name
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_account_name TEXT; -- Account holder name
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_link TEXT; -- PayPal, Stripe, Square, etc. link
ALTER TABLE users ADD COLUMN IF NOT EXISTS payment_instructions TEXT; -- Custom instructions/text

-- Add payment info override columns to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_method_type_override TEXT; -- Override company default
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_number_override TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_bank_name_override TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_account_name_override TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_link_override TEXT;
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS payment_instructions_override TEXT;

-- Create indexes for faster queries
CREATE INDEX idx_users_payment_method_type ON users(payment_method_type);
CREATE INDEX idx_invoices_payment_method_type_override ON invoices(payment_method_type_override);
