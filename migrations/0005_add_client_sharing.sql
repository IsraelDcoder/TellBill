-- Feature 2.2: Client Progress Hub
-- Adds client visibility and approval tracking to project events
-- Creates secure token system for shareable client portals

-- Extend project_events table with client sharing fields
ALTER TABLE project_events ADD COLUMN visible_to_client INTEGER DEFAULT 1; -- true by default
ALTER TABLE project_events ADD COLUMN approval_status TEXT DEFAULT 'PENDING'; -- PENDING | APPROVED | REJECTED
ALTER TABLE project_events ADD COLUMN approved_at INTEGER; -- timestamp when client approved
ALTER TABLE project_events ADD COLUMN approval_notes TEXT; -- client notes on approval/rejection
ALTER TABLE project_events ADD COLUMN photos TEXT; -- JSON array of photo URLs

-- New table: Client Share Tokens (Magic Links)
CREATE TABLE client_share_tokens (
  token_id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  token TEXT NOT NULL UNIQUE,
  created_at INTEGER NOT NULL,
  expires_at INTEGER, -- NULL = never expires, can be revoked manually
  revoked_at INTEGER, -- NULL = active
  access_count INTEGER DEFAULT 0,
  last_accessed INTEGER,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

-- Index for fast token lookups
CREATE INDEX idx_client_share_tokens_token ON client_share_tokens(token);
CREATE INDEX idx_client_share_tokens_project ON client_share_tokens(project_id, user_id);

-- New table: Client Portal Payment Records
CREATE TABLE client_portal_payments (
  payment_id TEXT PRIMARY KEY,
  token_id TEXT NOT NULL,
  project_id TEXT NOT NULL,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL, -- in cents
  currency TEXT DEFAULT 'USD',
  payment_status TEXT NOT NULL, -- PENDING | SUCCESS | FAILED
  flutterwave_reference TEXT,
  paid_at INTEGER,
  created_at INTEGER NOT NULL,
  FOREIGN KEY (token_id) REFERENCES client_share_tokens(token_id) ON DELETE CASCADE,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE INDEX idx_client_payments_token ON client_portal_payments(token_id);
CREATE INDEX idx_client_payments_project ON client_portal_payments(project_id);
