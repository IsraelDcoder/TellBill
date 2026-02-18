import { sql } from "drizzle-orm";

export async function up(db: any) {
  // Add payment link fields to invoices table
  await db.run(
    sql`ALTER TABLE invoices ADD COLUMN payment_link_url TEXT`
  );
  await db.run(
    sql`ALTER TABLE invoices ADD COLUMN stripe_checkout_session_id TEXT`
  );
  await db.run(
    sql`ALTER TABLE invoices ADD COLUMN stripe_payment_intent_id TEXT`
  );
  console.log("✅ Migration 0007: Added payment link fields to invoices");
}

export async function down(db: any) {
  // Remove payment link fields
  await db.run(
    sql`ALTER TABLE invoices DROP COLUMN payment_link_url`
  );
  await db.run(
    sql`ALTER TABLE invoices DROP COLUMN stripe_checkout_session_id`
  );
  await db.run(
    sql`ALTER TABLE invoices DROP COLUMN stripe_payment_intent_id`
  );
  console.log("✅ Migration 0007: Removed payment link fields from invoices");
}
