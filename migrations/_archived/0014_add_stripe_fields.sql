-- Migration: Add Stripe subscription tracking fields
-- This adds Stripe payment gateway integration for modern PCI-compliant payments

ALTER TABLE users
ADD COLUMN stripe_customer_id TEXT,
ADD COLUMN stripe_subscription_id TEXT,
ADD COLUMN stripe_price_id TEXT;

-- Create indexes for faster lookups on Stripe customer ID (used in webhook handlers)
CREATE INDEX users_stripe_customer_id_idx ON users(stripe_customer_id);
CREATE INDEX users_stripe_subscription_id_idx ON users(stripe_subscription_id);

-- Add comments documenting Stripe fields
COMMENT ON COLUMN users.stripe_customer_id IS 'Stripe customer ID for this user (maps all invoices, cards, subscriptions)';
COMMENT ON COLUMN users.stripe_subscription_id IS 'Current active Stripe subscription ID';
COMMENT ON COLUMN users.stripe_price_id IS 'Current Stripe price ID (solo, professional, or enterprise price)';
