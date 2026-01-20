-- Add company information columns to users table
ALTER TABLE users ADD COLUMN company_name TEXT;
ALTER TABLE users ADD COLUMN company_phone TEXT;
ALTER TABLE users ADD COLUMN company_email TEXT;
ALTER TABLE users ADD COLUMN company_address TEXT;
ALTER TABLE users ADD COLUMN company_website TEXT;
ALTER TABLE users ADD COLUMN company_tax_id TEXT;
