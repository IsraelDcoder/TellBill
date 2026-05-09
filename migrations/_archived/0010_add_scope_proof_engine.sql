-- Migration 0010: Add Scope Proof & Client Approval Engine
-- Enables contractors to capture extra work, get client approval, auto-convert to invoices
-- Created: January 27, 2026

CREATE TABLE scope_proofs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  
  -- Work description (AI-extracted or manual)
  description TEXT NOT NULL,
  
  -- Cost estimation
  estimated_cost DECIMAL(10, 2) NOT NULL,
  
  -- Photo URLs (stored as JSON array)
  photos TEXT DEFAULT '[]', -- JSON array of URLs
  
  -- Status tracking
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'expired')),
  
  -- Client approval
  approval_token TEXT NOT NULL UNIQUE,
  token_expires_at TIMESTAMP,
  approved_at TIMESTAMP,
  approved_by TEXT, -- Client email
  
  -- Timestamps
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  -- Indexes for performance
  KEY idx_user_id (user_id),
  KEY idx_project_id (project_id),
  KEY idx_invoice_id (invoice_id),
  KEY idx_approval_token (approval_token),
  KEY idx_status (status),
  KEY idx_created_at (created_at)
);

-- Trigger to auto-update updated_at
CREATE OR REPLACE FUNCTION update_scope_proofs_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = CURRENT_TIMESTAMP;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER scope_proofs_updated_at_trigger
BEFORE UPDATE ON scope_proofs
FOR EACH ROW
EXECUTE FUNCTION update_scope_proofs_updated_at();

-- Table for tracking approval notifications (for reminders)
CREATE TABLE scope_proof_notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scope_proof_id UUID NOT NULL REFERENCES scope_proofs(id) ON DELETE CASCADE,
  notification_type TEXT NOT NULL CHECK (notification_type IN ('initial', 'reminder')),
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  sent_via TEXT NOT NULL CHECK (sent_via IN ('email', 'sms', 'whatsapp')),
  
  KEY idx_scope_proof_id (scope_proof_id),
  KEY idx_sent_at (sent_at)
);

-- Index for quick lookups on pending approvals
CREATE INDEX idx_scope_proofs_pending_expiry ON scope_proofs(user_id, status, token_expires_at)
WHERE status = 'pending' AND token_expires_at > CURRENT_TIMESTAMP;
