/**
 * SQLite → PostgreSQL Data Migration Script
 * 
 * Usage:
 *   1. Export from SQLite: npx tsx scripts/migrate-sqlite-to-postgres.ts export
 *   2. Create PostgreSQL database and run migrations
 *   3. Import to PostgreSQL: npx tsx scripts/migrate-sqlite-to-postgres.ts import
 *   4. Verify: npx tsx scripts/migrate-sqlite-to-postgres.ts verify
 * 
 * Safety:
 *   - Always backup bill-splitter.db before running
 *   - Never deletes source SQLite data
 *   - Idempotent: safe to run multiple times
 */

import Database from "better-sqlite3";
import { Pool } from "pg";
import * as fs from "fs";
import * as path from "path";

const EXPORT_FILE = "migration-export.json";

interface MigrationData {
  timestamp: string;
  tables: {
    [tableName: string]: any[];
  };
  rowCounts: {
    [tableName: string]: number;
  };
}

// ============================================================================
// EXPORT: SQLite → JSON
// ============================================================================

async function exportFromSQLite() {
  console.log("[EXPORT] Starting SQLite → JSON export...\n");

  try {
    // Connect to SQLite
    const dbPath = process.env.DATABASE_URL?.replace("file:", "") || "bill-splitter.db";
    const sqlite = new Database(dbPath);
    console.log(`✓ Connected to SQLite: ${dbPath}`);

    const data: MigrationData = {
      timestamp: new Date().toISOString(),
      tables: {},
      rowCounts: {},
    };

    // Tables to export (in dependency order)
    const tablesToExport = [
      "users",
      "preferences",
      "job_sites",
      "team",
      "projects",
      "invoices",
      "payments",
      "receipts",
      "activity_log",
      "project_events",
      "inventory_items",
      "stock_history",
      "reorder_orders",
    ];

    for (const table of tablesToExport) {
      try {
        const rows = sqlite.prepare(`SELECT * FROM ${table}`).all() as any[];
        data.tables[table] = rows;
        data.rowCounts[table] = rows.length;
        console.log(`✓ Exported ${table}: ${rows.length} rows`);
      } catch (error) {
        // Table might not exist yet, skip
        console.log(`⊘ Skipped ${table} (not found)`);
      }
    }

    sqlite.close();

    // Write to file
    fs.writeFileSync(EXPORT_FILE, JSON.stringify(data, null, 2));
    console.log(`\n✓ Export complete: ${EXPORT_FILE}`);
    console.log(`\nRow Summary:`);
    Object.entries(data.rowCounts).forEach(([table, count]) => {
      console.log(`  ${table}: ${count}`);
    });
  } catch (error) {
    console.error("✗ Export failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// IMPORT: JSON → PostgreSQL
// ============================================================================

async function importToPostgreSQL() {
  console.log("[IMPORT] Starting JSON → PostgreSQL import...\n");

  try {
    // Verify export file exists
    if (!fs.existsSync(EXPORT_FILE)) {
      throw new Error(`Export file not found: ${EXPORT_FILE}\nRun: npm run migrate:export`);
    }

    // Read export file
    const data: MigrationData = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8"));
    console.log(`✓ Loaded export from: ${EXPORT_FILE}`);
    console.log(`  Timestamp: ${data.timestamp}`);

    // Connect to PostgreSQL
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set for PostgreSQL connection");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log("✓ Connected to PostgreSQL");

    // Disable foreign key constraints during import
    await pool.query("SET session_replication_role = replica");
    console.log("✓ Disabled FK constraints");

    // Import tables in dependency order
    const importOrder = [
      "users",
      "preferences",
      "job_sites",
      "team",
      "projects",
      "invoices",
      "payments",
      "receipts",
      "activity_log",
      "project_events",
      "inventory_items",
      "stock_history",
      "reorder_orders",
    ];

    for (const table of importOrder) {
      const rows = data.tables[table] || [];
      if (rows.length === 0) {
        console.log(`⊘ Skipped ${table} (no data)`);
        continue;
      }

      try {
        // Clear existing data
        await pool.query(`TRUNCATE TABLE "${table}" CASCADE`);

        // Build column list
        const columns = Object.keys(rows[0]);
        const columnStr = columns.map((c) => `"${c}"`).join(", ");
        const placeholders = columns
          .map((_, i) => `$${i + 1}`)
          .join(", ");

        // Insert rows
        for (const row of rows) {
          const values = columns.map((col) => row[col]);
          await pool.query(
            `INSERT INTO "${table}" (${columnStr}) VALUES (${placeholders})`,
            values
          );
        }

        console.log(`✓ Imported ${table}: ${rows.length} rows`);
      } catch (error) {
        console.error(`✗ Failed to import ${table}:`, error);
        throw error;
      }
    }

    // Re-enable foreign key constraints
    await pool.query("SET session_replication_role = default");
    console.log("✓ Re-enabled FK constraints");

    await pool.end();
    console.log("\n✓ Import complete!");
  } catch (error) {
    console.error("✗ Import failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// VERIFY: Data Integrity Checks
// ============================================================================

async function verify() {
  console.log("[VERIFY] Starting data integrity checks...\n");

  try {
    // Verify export file exists
    if (!fs.existsSync(EXPORT_FILE)) {
      throw new Error(`Export file not found: ${EXPORT_FILE}`);
    }

    const data: MigrationData = JSON.parse(fs.readFileSync(EXPORT_FILE, "utf-8"));

    // Connect to PostgreSQL
    if (!process.env.DATABASE_URL) {
      throw new Error("DATABASE_URL not set for PostgreSQL connection");
    }

    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    console.log("Verifying row counts:\n");

    let mismatchCount = 0;

    for (const [table, expectedCount] of Object.entries(data.rowCounts)) {
      const result = await pool.query(`SELECT COUNT(*) FROM "${table}"`);
      const actualCount = parseInt(result.rows[0].count);

      if (actualCount === expectedCount) {
        console.log(`✓ ${table}: ${actualCount} rows (expected: ${expectedCount})`);
      } else {
        console.log(
          `✗ ${table}: ${actualCount} rows (expected: ${expectedCount}) - MISMATCH!`
        );
        mismatchCount++;
      }
    }

    console.log(`\n${mismatchCount === 0 ? "✓" : "✗"} Verification ${mismatchCount === 0 ? "PASSED" : "FAILED"}`);

    // Check foreign keys
    console.log("\nChecking foreign key integrity:\n");

    try {
      const orphanResult = await pool.query(
        `SELECT COUNT(*) FROM invoices WHERE "project_id" NOT IN (SELECT id FROM projects)`
      );
      if (parseInt(orphanResult.rows[0].count) === 0) {
        console.log("✓ No orphaned invoices");
      } else {
        console.log(`✗ Found orphaned invoices: ${orphanResult.rows[0].count}`);
        mismatchCount++;
      }
    } catch (error) {
      // Table might not exist
    }

    await pool.end();

    if (mismatchCount > 0) {
      console.log("\n✗ Verification FAILED - Please review mismatches");
      process.exit(1);
    } else {
      console.log("\n✓ All checks PASSED!");
    }
  } catch (error) {
    console.error("✗ Verification failed:", error);
    process.exit(1);
  }
}

// ============================================================================
// MAIN
// ============================================================================

const command = process.argv[2];

if (!command) {
  console.log("Usage: npx tsx scripts/migrate-sqlite-to-postgres.ts [export|import|verify]");
  console.log("\nSteps:");
  console.log("  1. export - Export data from SQLite to JSON");
  console.log("  2. import - Import JSON data to PostgreSQL");
  console.log("  3. verify - Verify data integrity in PostgreSQL");
  process.exit(1);
}

switch (command) {
  case "export":
    exportFromSQLite();
    break;
  case "import":
    importToPostgreSQL();
    break;
  case "verify":
    verify();
    break;
  default:
    console.error(`Unknown command: ${command}`);
    console.log("Valid commands: export, import, verify");
    process.exit(1);
}
