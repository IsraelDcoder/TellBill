-- Migration: Add late payment automation fields
-- Date: 2026-02-24
-- Description: Add fields to support automatic late payment reminders

-- Add day6_reminder_sent_at to invoices table
ALTER TABLE invoices 
ADD COLUMN IF NOT EXISTS day6_reminder_sent_at TIMESTAMP WITH TIME ZONE;

-- Add late_payment_reminders toggle to preferences table
ALTER TABLE preferences 
ADD COLUMN IF NOT EXISTS late_payment_reminders BOOLEAN DEFAULT true;

-- Create index on invoices for late payment queries (performance)
CREATE INDEX IF NOT EXISTS idx_invoices_late_payment 
ON invoices(user_id, status, paid_at, due_date, reminder_sent_at)
WHERE paid_at IS NULL AND status = 'sent';

-- Add comment to explain the fields
COMMENT ON COLUMN invoices.day6_reminder_sent_at IS 'Track when Day 6 firm late payment reminder was sent';
COMMENT ON COLUMN preferences.late_payment_reminders IS 'Boolean toggle for automatic late payment reminders (Pro feature)';

