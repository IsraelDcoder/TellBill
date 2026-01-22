-- Migration 0008: Add userId tracking to invoices
-- Track which user created each invoice for activity restoration

ALTER TABLE invoices ADD COLUMN created_by TEXT;
