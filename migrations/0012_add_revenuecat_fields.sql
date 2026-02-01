-- Migration: Add RevenueCat subscription tracking fields
-- This replaces Flutterwave payment tracking with RevenueCat subscription tracking

ALTER TABLE users
ADD COLUMN revenuecat_app_user_id TEXT,
ADD COLUMN subscription_platform TEXT CHECK (subscription_platform IN ('ios', 'android', NULL)),
ADD COLUMN subscription_status TEXT DEFAULT 'inactive' CHECK (subscription_status IN ('active', 'inactive', 'cancelled', 'paused')),
ADD COLUMN subscription_tier TEXT DEFAULT 'free' CHECK (subscription_tier IN ('free', 'solo', 'professional', 'enterprise')),
ADD COLUMN subscription_expiry_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_renewal_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN subscription_cancellation_date TIMESTAMP WITH TIME ZONE,
ADD COLUMN is_trialing BOOLEAN DEFAULT FALSE,
ADD COLUMN subscription_updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP;

-- Create indexes for faster lookups
CREATE INDEX users_revenuecat_app_user_id_idx ON users(revenuecat_app_user_id);
CREATE INDEX users_subscription_status_idx ON users(subscription_status);
CREATE INDEX users_subscription_expiry_date_idx ON users(subscription_expiry_date);

-- Drop old Flutterwave columns (if they exist)
ALTER TABLE users
DROP COLUMN IF EXISTS flutterwave_transaction_id CASCADE,
DROP COLUMN IF EXISTS payment_status CASCADE,
DROP COLUMN IF EXISTS payment_reference CASCADE;

-- Add comment documenting RevenueCat fields
COMMENT ON TABLE users IS 'User accounts with RevenueCat subscription tracking';
COMMENT ON COLUMN users.revenuecat_app_user_id IS 'RevenueCat customer ID for this user';
COMMENT ON COLUMN users.subscription_platform IS 'Platform where subscription was purchased: ios or android';
COMMENT ON COLUMN users.subscription_status IS 'Current subscription status: active, inactive, cancelled, or paused';
COMMENT ON COLUMN users.subscription_tier IS 'Subscription plan: free, solo, professional, or enterprise';
COMMENT ON COLUMN users.subscription_expiry_date IS 'When current subscription expires (updated by RevenueCat webhooks)';
COMMENT ON COLUMN users.subscription_renewal_date IS 'When subscription will automatically renew';
COMMENT ON COLUMN users.subscription_cancellation_date IS 'When subscription was cancelled (if applicable)';
COMMENT ON COLUMN users.is_trialing IS 'Whether user is currently in a trial period';
COMMENT ON COLUMN users.subscription_updated_at IS 'Last time subscription status was verified';
