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
  max: 100,           // Maximum connections in pool (increased from 50 for more buffer)
  idleTimeoutMillis: 30000,  // Close idle connections after 30 seconds (reduced from 60s to clean up stale connections faster)
  connectionTimeoutMillis: 8000,  // Timeout to get connection (increased from 5s to 8s for better tolerance)
  statement_timeout: 20000,  // Statement timeout: 20 seconds
});

// Log connection pool events
pool.on("error", (err) => {
  console.error("[DB Pool] ❌ Unexpected error on idle client:", err.message);
});

pool.on("connect", () => {
  console.log("[DB] ✅ New connection established");
});

pool.on("remove", () => {
  console.warn("[DB Pool] ⚠️  Connection closed (normal cleanup)");
});

pool.on("remove", () => {
  console.warn("[DB Pool] ⚠️  Connection removed (may indicate timeout/error)");
});

// Health check interval - test a connection every 120 seconds (less aggressive)
let healthCheckInterval: NodeJS.Timeout | null = null;

function startHealthCheck() {
  if (healthCheckInterval) return;
  
  // Delay health check start by 30 seconds to let pool stabilize
  setTimeout(() => {
    healthCheckInterval = setInterval(async () => {
      try {
        const client = await pool.connect();
        await client.query("SELECT 1");
        client.release();
        console.log("[DB Health Check] ✅ Connection healthy");
      } catch (err) {
        console.warn("[DB Health Check] ⚠️  Connection unhealthy:", (err as Error).message);
      }
    }, 120000); // Check every 120 seconds (less aggressive than 60s)
  }, 30000);
}

// Start health check after initialization (defer until pool is stable)
startHealthCheck();

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
