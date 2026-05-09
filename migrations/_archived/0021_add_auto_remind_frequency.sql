-- Add auto_remind_frequency_days column to preferences table
-- Default to 3 days between reminders (Day 1 → Day 2 (48h) → Day 6 (144h) → Day 6 (144h +72h typical) patterns)
-- Users can set 1, 3, 7, or 14 days for frequency

ALTER TABLE preferences
ADD COLUMN auto_remind_frequency_days INTEGER DEFAULT 3;

-- Create index for querying by auto reminder frequency for batch operations
CREATE INDEX idx_preferences_auto_remind_frequency ON preferences(auto_remind_frequency_days);

-- Future: Log migration
-- This enables users to control how often they receive late payment reminders
-- Integrated with latePaymentScheduler.ts Day 1, Day 2, and Day 6 notification system
