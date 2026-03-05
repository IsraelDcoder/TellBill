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
  // Connection pool settings - optimized for 2000+ concurrent users
  max: 100,           // Maximum connections in pool
  idleTimeoutMillis: 90000,  // Close idle connections after 90 seconds (increased from 30s to stop aggressive cleanup)
  connectionTimeoutMillis: 10000,  // Timeout to get connection (increased to 10s for better tolerance)
  statement_timeout: 30000,  // Statement timeout: 30 seconds (increased back to 30s)
});

// Log connection pool events
pool.on("error", (err) => {
  console.error("[DB Pool] ❌ Unexpected error on idle client:", err.message);
});

pool.on("connect", () => {
  console.log("[DB] ✅ New connection established");
});

pool.on("remove", () => {
  console.warn("[DB Pool] ⚠️  Connection removed from pool");
});

// Initialize drizzle with PostgreSQL client and schema
export const db = drizzle(pool, { schema });

// ✅ Graceful shutdown
export async function closeDb() {
  await pool.end();
  console.log("[DB] Connection pool closed");
}
