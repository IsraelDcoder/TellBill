import Database from "better-sqlite3";
import path from "path";
import fs from "fs";

const dbPath = path.resolve(process.cwd(), "bill-splitter.db");

// Remove old database if it exists
if (fs.existsSync(dbPath)) {
  fs.unlinkSync(dbPath);
  console.log("🗑️  Removed old database");
}

// Create new database
const db = new Database(dbPath);
db.pragma("journal_mode = WAL");
console.log("📁 Created new database at:", dbPath);

// Read and execute migrations in order
const migrations = [
  "migrations/0001_update_users_table.sql",
  "migrations/0002_add_company_info.sql",
  "migrations/0003_add_subscription_fields.sql",
  "migrations/0004_add_inventory_tables.sql",
];

for (const migration of migrations) {
  const filePath = path.resolve(process.cwd(), migration);
  if (!fs.existsSync(filePath)) {
    console.warn(`⚠️  Migration not found: ${migration}`);
    continue;
  }

  const sql = fs.readFileSync(filePath, "utf-8");
  try {
    db.exec(sql);
    console.log(`✅ Applied migration: ${migration}`);
  } catch (error) {
    console.error(`❌ Failed to apply migration ${migration}:`, error);
  }
}

db.close();
console.log("✨ Database initialization complete!");
