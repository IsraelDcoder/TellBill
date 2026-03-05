import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// ✅ PostgreSQL Connection Pool - Optimized for stability under load
// Reuses connections for better performance and resource management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL configuration for Supabase
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings - aggressively optimized for OAuth load spikes
  max: 150,           // Maximum connections - increased from 100 to handle OAuth surge
  idleTimeoutMillis: 120000,  // Keep connections alive longer (2 minutes)
  connectionTimeoutMillis: 15000,  // Wait up to 15 seconds for a connection
  statement_timeout: 45000,  // Statements get 45 seconds max
});

// Log connection pool events
pool.on("error", (err) => {
  console.error("[DB Pool] ❌ Critical error on client:", err.message);
});

pool.on("connect", () => {
  // Suppress noisy logging - only log in debug mode
  if (process.env.DEBUG_POOL) {
    console.log("[DB] New connection established");
  }
});

// Initialize drizzle with PostgreSQL client and schema
export const db = drizzle(pool, { schema });

// ✅ Graceful shutdown
export async function closeDb() {
  await pool.end();
  console.log("[DB] Connection pool closed");
}
