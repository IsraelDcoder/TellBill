-- Add custom template support for professional users
CREATE TABLE IF NOT EXISTS custom_invoice_templates (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  client_id TEXT, -- NULL = user's default template, filled = per-client template
  client_email TEXT,
  name TEXT NOT NULL, -- e.g., "Minimalist", "Corporate Blue", etc.
  base_template TEXT NOT NULL, -- professional, modern, minimal, formal
  
  -- Color customization
  primary_color TEXT DEFAULT '#667eea',
  accent_color TEXT DEFAULT '#764ba2',
  background_color TEXT DEFAULT '#ffffff',
  text_color TEXT DEFAULT '#333333',
  
  -- Logo and branding
  logo_url TEXT,
  company_header_text TEXT, -- Custom header text
  footer_text TEXT, -- Custom footer (e.g., "Thank you for your business!")
  
  -- Custom fields
  show_project_name BOOLEAN DEFAULT false,
  show_po_number BOOLEAN DEFAULT false,
  show_work_order_number BOOLEAN DEFAULT false,
  custom_field_1_name TEXT,
  custom_field_1_value TEXT,
  custom_field_2_name TEXT,
  custom_field_2_value TEXT,
  
  -- Font settings
  font_family TEXT DEFAULT 'system', -- system, serif, sans-serif, monospace
  
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
  
  UNIQUE(user_id, client_id, name)
);

-- Index for finding user's templates
CREATE INDEX IF NOT EXISTS idx_custom_templates_user ON custom_invoice_templates(user_id);
CREATE INDEX IF NOT EXISTS idx_custom_templates_client ON custom_invoice_templates(user_id, client_id);
