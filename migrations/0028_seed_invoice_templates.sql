-- ✅ Seed default invoice templates for Professional tier
-- These are pre-built templates users can choose from or customize

-- Modern Minimal (Clean, contemporary look with minimal design)
INSERT INTO custom_invoice_templates (
  id, user_id, client_id, name, base_template, 
  primary_color, accent_color, background_color, text_color,
  company_header_text, footer_text, font_family, 
  show_project_name, show_po_number, 
  created_at, updated_at
) VALUES (
  'template_modern_minimal', 'system', NULL,
  'Modern Minimal',
  'modern',
  '#1F2937', '#3B82F6', '#FFFFFF', '#111827',
  'TellBill',
  '© 2026 - Professional Invoicing',
  'system',
  true, false,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- Bold Industrial (Strong, professional manufacturing/construction look)
INSERT INTO custom_invoice_templates (
  id, user_id, client_id, name, base_template,
  primary_color, accent_color, background_color, text_color,
  company_header_text, footer_text, font_family,
  show_project_name, show_po_number,
  created_at, updated_at
) VALUES (
  'template_bold_industrial', 'system', NULL,
  'Bold Industrial',
  'industrial',
  '#1E293B', '#EF4444', '#F8FAFC', '#0F172A',
  'TellBill Services',
  'Tax ID: [Insert] | License: [Insert]',
  'sans-serif',
  true, true,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- Blue Corporate (Traditional business look, trustworthy)
INSERT INTO custom_invoice_templates (
  id, user_id, client_id, name, base_template,
  primary_color, accent_color, background_color, text_color,
  company_header_text, footer_text, font_family,
  show_project_name, show_po_number,
  created_at, updated_at
) VALUES (
  'template_blue_corporate', 'system', NULL,
  'Blue Corporate',
  'corporate',
  '#003D7A', '#0066CC', '#FFFFFF', '#1A202C',
  'TELLBILL INC.',
  'Contact: support@tellbill.com | www.tellbill.app',
  'serif',
  true, true,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- Clean White Pro (Minimalist, elegant, high-end)
INSERT INTO custom_invoice_templates (
  id, user_id, client_id, name, base_template,
  primary_color, accent_color, background_color, text_color,
  company_header_text, footer_text, font_family,
  show_project_name, show_po_number,
  created_at, updated_at
) VALUES (
  'template_clean_white_pro', 'system', NULL,
  'Clean White Pro',
  'minimal',
  '#000000', '#9CA3AF', '#FFFFFF', '#1F2937',
  'TELLBILL',
  'Premium Contracting Platform',
  'system',
  false, false,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- Dark Premium (Modern dark theme, trendy/tech-forward)
INSERT INTO custom_invoice_templates (
  id, user_id, client_id, name, base_template,
  primary_color, accent_color, background_color, text_color,
  company_header_text, footer_text, font_family,
  show_project_name, show_po_number,
  created_at, updated_at
) VALUES (
  'template_dark_premium', 'system', NULL,
  'Dark Premium',
  'dark',
  '#FBBF24', '#FCD34D', '#1F2937', '#F3F4F6',
  'TellBill',
  'Powered by TellBill - Smart Invoicing',
  'system',
  true, true,
  NOW(), NOW()
) ON CONFLICT DO NOTHING;

-- Note: Templates with user_id = 'system' are system defaults
-- Users can select these templates, and when they do, a copy is created with their user_id
