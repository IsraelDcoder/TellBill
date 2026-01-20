import { drizzle } from "drizzle-orm/better-sqlite3";
import Database from "better-sqlite3";
import path from "path";

if (!process.env.DATABASE_URL) {
  throw new Error("DATABASE_URL environment variable is required");
}

// Parse SQLite database path
const dbPath = process.env.DATABASE_URL.replace("file:", "");
const absolutePath = path.resolve(process.cwd(), dbPath);

// Create SQLite connection
const sqlite = new Database(absolutePath);
sqlite.pragma("journal_mode = WAL");

// Initialize drizzle with SQLite client
export const db = drizzle(sqlite);
