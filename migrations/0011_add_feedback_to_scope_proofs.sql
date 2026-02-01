-- Migration: Add feedback fields to scope proofs table
-- Purpose: Support client feedback on scope proofs

ALTER TABLE scope_proofs 
ADD COLUMN feedback text,
ADD COLUMN feedback_from text,
ADD COLUMN feedback_at timestamp with time zone;

-- Create index for feedback lookups
CREATE INDEX scope_proofs_feedback_at_idx ON scope_proofs(feedback_at) WHERE feedback IS NOT NULL;

-- Update status column comment
COMMENT ON COLUMN scope_proofs.status IS 'pending | approved | feedback | expired';
