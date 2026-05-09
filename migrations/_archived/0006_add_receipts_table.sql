-- Feature 4.1: Receipt Scanner
-- AI-powered receipt extraction for automatic material/cost tracking
-- Adds receipt storage and duplicate detection capability

-- Receipts table: Store extracted receipt data
CREATE TABLE receipts (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  purchase_date TEXT NOT NULL,
  photo_url TEXT NOT NULL,
  photo_base64 TEXT,
  total_amount REAL NOT NULL,
  extracted_items TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'approved',
  created_by TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  updated_at INTEGER NOT NULL,
  FOREIGN KEY (project_id) REFERENCES projects(id) ON DELETE CASCADE,
  FOREIGN KEY (created_by) REFERENCES users(id) ON DELETE CASCADE
);

-- Receipt duplicates tracking: Track detected duplicates for analytics
CREATE TABLE receipt_duplicates (
  id TEXT PRIMARY KEY,
  original_receipt_id TEXT NOT NULL,
  duplicate_receipt_id TEXT NOT NULL,
  vendor TEXT NOT NULL,
  amount REAL NOT NULL,
  detected_at INTEGER NOT NULL,
  FOREIGN KEY (original_receipt_id) REFERENCES receipts(id) ON DELETE CASCADE,
  FOREIGN KEY (duplicate_receipt_id) REFERENCES receipts(id) ON DELETE CASCADE
);

-- Indexes for fast queries
CREATE INDEX idx_receipts_project ON receipts(project_id);
CREATE INDEX idx_receipts_vendor ON receipts(vendor);
CREATE INDEX idx_receipts_date ON receipts(purchase_date);
CREATE INDEX idx_receipts_created_by ON receipts(created_by);
CREATE INDEX idx_receipts_created_at ON receipts(created_at);
CREATE INDEX idx_receipt_duplicates_original ON receipt_duplicates(original_receipt_id);
CREATE INDEX idx_receipt_duplicates_duplicate ON receipt_duplicates(duplicate_receipt_id);

-- Unique constraint: Prevent exact duplicates on vendor + amount + date
CREATE UNIQUE INDEX idx_receipts_unique_combo ON receipts(project_id, vendor, total_amount, purchase_date);
