-- Create job_sites table
CREATE TABLE IF NOT EXISTS "job_sites" (
	"id" text PRIMARY KEY NOT NULL,
	"user_id" text NOT NULL,
	"name" text NOT NULL,
	"location" text,
	"description" text,
	"status" text DEFAULT 'active',
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	FOREIGN KEY ("user_id") REFERENCES "users"("id") ON DELETE cascade
);

-- Create inventory_items table
CREATE TABLE IF NOT EXISTS "inventory_items" (
	"id" text PRIMARY KEY NOT NULL,
	"site_id" text NOT NULL,
	"name" text NOT NULL,
	"description" text,
	"category" text,
	"unit" text DEFAULT 'pcs',
	"current_stock" integer DEFAULT 0,
	"minimum_stock" integer DEFAULT 10,
	"reorder_quantity" integer DEFAULT 50,
	"unit_cost" integer DEFAULT 0,
	"created_at" integer NOT NULL,
	"updated_at" integer NOT NULL,
	FOREIGN KEY ("site_id") REFERENCES "job_sites"("id") ON DELETE cascade
);

-- Create stock_history table
CREATE TABLE IF NOT EXISTS "stock_history" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"action" text NOT NULL,
	"quantity" integer NOT NULL,
	"previous_stock" integer NOT NULL,
	"new_stock" integer NOT NULL,
	"reason" text,
	"created_at" integer NOT NULL,
	FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE cascade
);

-- Create reorder_orders table
CREATE TABLE IF NOT EXISTS "reorder_orders" (
	"id" text PRIMARY KEY NOT NULL,
	"item_id" text NOT NULL,
	"quantity" integer NOT NULL,
	"status" text DEFAULT 'pending',
	"order_date" integer NOT NULL,
	"expected_date" integer,
	"received_date" integer,
	"supplier" text,
	"notes" text,
	FOREIGN KEY ("item_id") REFERENCES "inventory_items"("id") ON DELETE cascade
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS "job_sites_user_id_idx" ON "job_sites"("user_id");
CREATE INDEX IF NOT EXISTS "inventory_items_site_id_idx" ON "inventory_items"("site_id");
CREATE INDEX IF NOT EXISTS "stock_history_item_id_idx" ON "stock_history"("item_id");
CREATE INDEX IF NOT EXISTS "reorder_orders_item_id_idx" ON "reorder_orders"("item_id");
CREATE INDEX IF NOT EXISTS "reorder_orders_status_idx" ON "reorder_orders"("status");
