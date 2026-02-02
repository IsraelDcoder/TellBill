import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
import * as schema from "../shared/schema";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// ✅ PostgreSQL Connection Pool
// Reuses connections for better performance and resource management
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // SSL configuration for production
  ssl: process.env.DATABASE_SSL === "true" ? {
    rejectUnauthorized: process.env.DATABASE_SSL_REJECT_UNAUTHORIZED !== "false",
  } : false,
  // Connection pool settings
  max: 20,           // Maximum connections in pool
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds
  connectionTimeoutMillis: 2000,  // Fail fast if can't get connection
});

// Log connection pool events
pool.on("error", (err) => {
  console.error("[DB Pool] Unexpected error on idle client:", err);
});

pool.on("connect", () => {
  console.log("[DB] New connection established");
});

// Initialize drizzle with PostgreSQL client and schema
export const db = drizzle(pool, { schema });

// ✅ Graceful shutdown
export async function closeDb() {
  await pool.end();
  console.log("[DB] Connection pool closed");
}
