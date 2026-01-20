/**
 * Database Reset Script - DEVELOPMENT ONLY
 * 
 * Safely resets the users table by deleting all rows.
 * Preserves:
 * - Table structure
 * - Constraints (email UNIQUE, etc.)
 * - Indexes
 * - Foreign keys
 * 
 * Use: npm run db:reset
 * 
 * ⚠️  ONLY run in development mode
 * ⚠️  Deletes ALL users - no recovery possible
 */

// Load environment variables first
import * as dotenv from "dotenv";
dotenv.config();

import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";
import { users } from "../shared/schema";

async function resetDatabase() {
  try {
    // Safety check - only allow in development mode
    if (process.env.NODE_ENV === "production") {
      throw new Error(
        "❌ Cannot reset database in production mode. Set NODE_ENV=development"
      );
    }

    const databaseUrl = process.env.DATABASE_URL;
    if (!databaseUrl) {
      throw new Error(
        "❌ DATABASE_URL environment variable is not set. Check your .env file"
      );
    }

    console.log("🔄 Starting database reset...");
    console.log("⚠️  This will delete ALL users from the database");

    // Create database connection
    const dbPath = databaseUrl.replace("file:", "");
    const absolutePath = path.resolve(process.cwd(), dbPath);
    const sqlite = new Database(absolutePath);
    const db = drizzle(sqlite);

    // Delete all users (preserves table structure)
    const result = await db.delete(users);

    console.log("✅ Database reset successful!");
    console.log("📊 All users have been deleted");
    console.log("🎯 Table structure and constraints preserved");
    console.log("\n💡 You can now test signup/login with fresh accounts");

    sqlite.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ Database reset failed:", error);
    process.exit(1);
  }
}

// Run the reset
resetDatabase();
