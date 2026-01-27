-- Migration 0009: Remove Team and Inventory features
-- TellBill is focusing on core value: Voice → Invoice → Payment
-- Removing Team Management and Inventory Tracking features entirely
-- Date: January 27, 2026

-- Drop team management tables
DROP TABLE IF EXISTS team CASCADE;

-- Drop inventory tracking tables  
DROP TABLE IF EXISTS reorder_orders CASCADE;
DROP TABLE IF EXISTS stock_history CASCADE;
DROP TABLE IF EXISTS inventory_items CASCADE;

-- Drop job sites table (was used for team/inventory organization)
DROP TABLE IF EXISTS job_sites CASCADE;

-- Migration complete
-- Database is now simplified to core features only:
-- - Voice recording and transcription
-- - Invoice creation and management
-- - Receipt scanning
-- - Project management
-- - Payment integration
