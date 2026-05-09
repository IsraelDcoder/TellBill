-- Add reminder tracking to invoices table
ALTER TABLE invoices ADD COLUMN IF NOT EXISTS reminder_sent_at TIMESTAMP DEFAULT NULL;

-- Create an index for efficient querying of invoices that need reminders
CREATE INDEX IF NOT EXISTS idx_invoices_reminder ON invoices(due_date, reminder_sent_at, status);
