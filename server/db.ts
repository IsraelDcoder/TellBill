import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// ✅ PostgreSQL Connection Pool - Optimized for 2000+ concurrent users
// Reuses connections for better performance and resource management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL configuration for Supabase
  ssl: {
    rejectUnauthorized: false,
  },
  // Connection pool settings - optimized for 2000+ concurrent users
  max: 50,            // Maximum connections in pool (increased from 20)
  idleTimeoutMillis: 60000,  // Close idle connections after 60 seconds (increased from 30s)
  connectionTimeoutMillis: 5000,  // Timeout to get connection (increased from 2s to 5s)
  statement_timeout: 30000,  // Statement timeout: 30 seconds
});

// Log connection pool events
pool.on("error", (err) => {
  console.error("[DB Pool] ❌ Unexpected error on idle client:", err.message);
});

pool.on("connect", () => {
  console.log("[DB] ✅ New connection established");
});

pool.on("close", () => {
  console.warn("[DB Pool] ⚠️  Connection closed");
});

pool.on("remove", () => {
  console.log("[DB] Connection removed from pool");
});

// Log pool stats every 30 seconds in development for monitoring
if (process.env.NODE_ENV === "development") {
  setInterval(() => {
    console.log(`[DB Pool] Stats - Total: ${pool.totalCount}, Idle: ${pool.idleCount}, Waiting: ${pool.waitingCount}`);
  }, 30000);
}

// Initialize drizzle with PostgreSQL client and schema
export const db = drizzle(pool, { schema });

// ✅ Graceful shutdown
export async function closeDb() {
  await pool.end();
  console.log("[DB] Connection pool closed");
}
