-- Add subscription fields to users table
ALTER TABLE users ADD COLUMN current_plan TEXT DEFAULT 'free';
ALTER TABLE users ADD COLUMN is_subscribed INTEGER DEFAULT 0;
ALTER TABLE users ADD COLUMN subscription_status TEXT DEFAULT 'inactive';
