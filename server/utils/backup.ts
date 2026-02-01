import * as fs from "fs";
import * as path from "path";
import { execSync } from "child_process";
import { db } from "../db";

/**
 * ✅ DATABASE BACKUP STRATEGY
 *
 * Three-tier backup approach:
 * 1. DAILY automated backups (retention: 30 days)
 * 2. WEEKLY backups (retention: 12 weeks)
 * 3. MONTHLY backups (retention: 12 months)
 *
 * Backup locations:
 * - Local: /backups directory
 * - Production: Cloud storage (S3/Google Cloud)
 */

interface BackupConfig {
  backupDir: string;
  databaseUrl: string;
  retentionDays: number;
  compressionEnabled: boolean;
}

interface BackupResult {
  success: boolean;
  filename: string;
  filepath: string;
  size: number;
  duration: number;
  timestamp: Date;
  error?: string;
}

interface BackupMetadata {
  filename: string;
  timestamp: Date;
  size: number;
  type: "daily" | "weekly" | "monthly";
  verified: boolean;
  verificationDate?: Date;
}

/**
 * Get backup configuration
 */
export function getBackupConfig(): BackupConfig {
  const backupDir = process.env.BACKUP_DIR || "./backups";
  const databaseUrl = process.env.DATABASE_URL || "";
  const retentionDays = parseInt(process.env.BACKUP_RETENTION_DAYS || "30", 10);
  const compressionEnabled = process.env.BACKUP_COMPRESSION !== "false";

  return {
    backupDir,
    databaseUrl,
    retentionDays,
    compressionEnabled,
  };
}

/**
 * Create backup directory if it doesn't exist
 */
export function ensureBackupDir(backupDir: string): void {
  if (!fs.existsSync(backupDir)) {
    fs.mkdirSync(backupDir, { recursive: true });
    console.log(`[Backup] Created backup directory: ${backupDir}`);
  }
}

/**
 * Generate backup filename with timestamp
 */
export function generateBackupFilename(
  type: "daily" | "weekly" | "monthly" = "daily"
): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, "-").split("Z")[0];
  // Skip gzip extension on Windows since gzip is not available
  const isWindows = process.platform === "win32";
  const extension = (process.env.BACKUP_COMPRESSION !== "false" && !isWindows) ? ".sql.gz" : ".sql";
  return `tellbill_${type}_backup_${timestamp}${extension}`;
}

/**
 * Parse PostgreSQL connection URL
 */
export function parseConnectionUrl(url: string): {
  user: string;
  password: string;
  host: string;
  port: number;
  database: string;
} {
  try {
    // Format: postgresql://user:password@host:port/database
    const urlObj = new URL(url);
    return {
      user: decodeURIComponent(urlObj.username),
      password: decodeURIComponent(urlObj.password),
      host: urlObj.hostname,
      port: parseInt(urlObj.port || "5432", 10),
      database: urlObj.pathname.slice(1),
    };
  } catch (error) {
    console.error("[Backup] Failed to parse DATABASE_URL:", error);
    throw new Error("Invalid DATABASE_URL format");
  }
}

/**
 * Create database backup using pg_dump
 */
export async function createBackup(
  type: "daily" | "weekly" | "monthly" = "daily"
): Promise<BackupResult> {
  const startTime = Date.now();
  const config = getBackupConfig();
  const filename = generateBackupFilename(type);
  const filepath = path.join(config.backupDir, filename);

  try {
    // Ensure backup directory exists
    ensureBackupDir(config.backupDir);

    // Parse connection details
    const connDetails = parseConnectionUrl(config.databaseUrl);

    console.log(`[Backup] Starting ${type} backup...`);
    console.log(`[Backup] Database: ${connDetails.database}`);
    console.log(`[Backup] Host: ${connDetails.host}`);

    // Build pg_dump command
    let command = `pg_dump`;

    // Add connection parameters
    command += ` --host=${connDetails.host}`;
    command += ` --port=${connDetails.port}`;
    command += ` --username=${connDetails.user}`;
    command += ` --dbname=${connDetails.database}`;

    // Backup options
    command += ` --verbose`;           // Show progress
    command += ` --no-password`;       // Use PGPASSWORD env var
    command += ` --format=plain`;      // Plain SQL format
    command += ` --no-owner`;          // Don't include owner commands
    command += ` --no-privileges`;     // Don't include privilege commands

    // Compression (skip on Windows as gzip is not available)
    const isWindows = process.platform === "win32";
    if (config.compressionEnabled && !isWindows) {
      command += ` | gzip`;
    }

    // Output to file
    command += ` > "${filepath}"`;

    // Execute backup with environment variable for password
    const env = {
      ...process.env,
      PGPASSWORD: connDetails.password,
    };

    console.log(`[Backup] Executing pg_dump...`);
    execSync(command, {
      stdio: "pipe",
      env,
      encoding: "utf-8",
    });

    // Verify backup file was created
    if (!fs.existsSync(filepath)) {
      throw new Error("Backup file was not created");
    }

    // Get file size
    const stats = fs.statSync(filepath);
    const size = stats.size;
    const duration = Date.now() - startTime;

    console.log(`[Backup] ✅ ${type.toUpperCase()} backup completed successfully`);
    console.log(`[Backup] Filename: ${filename}`);
    console.log(`[Backup] Size: ${formatBytes(size)}`);
    console.log(`[Backup] Duration: ${duration}ms`);

    return {
      success: true,
      filename,
      filepath,
      size,
      duration,
      timestamp: new Date(),
    };
  } catch (error) {
    const duration = Date.now() - startTime;
    const errorMsg = error instanceof Error ? error.message : String(error);

    console.error(`[Backup] ❌ ${type.toUpperCase()} backup failed`);
    console.error(`[Backup] Error: ${errorMsg}`);
    console.error(`[Backup] Duration: ${duration}ms`);

    return {
      success: false,
      filename,
      filepath,
      size: 0,
      duration,
      timestamp: new Date(),
      error: errorMsg,
    };
  }
}

/**
 * Restore database from backup file
 */
export async function restoreBackup(backupFilepath: string): Promise<{ success: boolean; error?: string }> {
  try {
    if (!fs.existsSync(backupFilepath)) {
      throw new Error(`Backup file not found: ${backupFilepath}`);
    }

    const config = getBackupConfig();
    const connDetails = parseConnectionUrl(config.databaseUrl);

    console.log(`[Restore] Starting restore from: ${path.basename(backupFilepath)}`);

    // Build psql command
    let command = ``;

    // Check if file is compressed
    if (backupFilepath.endsWith(".gz")) {
      command += `gzip -dc "${backupFilepath}" | `;
    } else {
      command += `cat "${backupFilepath}" | `;
    }

    command += `psql`;
    command += ` --host=${connDetails.host}`;
    command += ` --port=${connDetails.port}`;
    command += ` --username=${connDetails.user}`;
    command += ` --dbname=${connDetails.database}`;
    command += ` --no-password`;
    command += ` --verbose`;

    // Execute restore with environment variable for password
    const env = {
      ...process.env,
      PGPASSWORD: connDetails.password,
    };

    console.log(`[Restore] ⚠️  WARNING: This will replace the current database`);
    console.log(`[Restore] Database: ${connDetails.database}`);

    execSync(command, {
      stdio: "inherit",
      env,
    });

    console.log(`[Restore] ✅ Restore completed successfully`);
    return { success: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    console.error(`[Restore] ❌ Restore failed: ${errorMsg}`);
    return { success: false, error: errorMsg };
  }
}

/**
 * List all backups
 */
export function listBackups(): BackupMetadata[] {
  const config = getBackupConfig();
  const backups: BackupMetadata[] = [];

  try {
    if (!fs.existsSync(config.backupDir)) {
      console.log(`[Backup] Backup directory does not exist: ${config.backupDir}`);
      return backups;
    }

    const files = fs.readdirSync(config.backupDir);

    for (const file of files) {
      if (!file.startsWith("tellbill_") || (!file.endsWith(".sql") && !file.endsWith(".sql.gz"))) {
        continue;
      }

      const filepath = path.join(config.backupDir, file);
      const stats = fs.statSync(filepath);

      // Parse backup type from filename
      let type: "daily" | "weekly" | "monthly" = "daily";
      if (file.includes("_weekly_")) type = "weekly";
      if (file.includes("_monthly_")) type = "monthly";

      backups.push({
        filename: file,
        timestamp: stats.mtime,
        size: stats.size,
        type,
        verified: false,
      });
    }

    // Sort by timestamp (newest first)
    backups.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());

    return backups;
  } catch (error) {
    console.error(`[Backup] Error listing backups:`, error);
    return backups;
  }
}

/**
 * Delete old backups based on retention policy
 */
export async function cleanupOldBackups(): Promise<{ deleted: number; freed: number }> {
  const config = getBackupConfig();
  const backups = listBackups();
  const now = new Date();
  let deleted = 0;
  let freed = 0;

  try {
    for (const backup of backups) {
      const ageMs = now.getTime() - backup.timestamp.getTime();
      const ageDays = ageMs / (1000 * 60 * 60 * 24);

      // Determine retention based on type
      let retentionDays = config.retentionDays;
      if (backup.type === "weekly") retentionDays = 84; // 12 weeks
      if (backup.type === "monthly") retentionDays = 365; // 12 months

      // Delete if older than retention period
      if (ageDays > retentionDays) {
        const filepath = path.join(config.backupDir, backup.filename);
        fs.unlinkSync(filepath);
        deleted++;
        freed += backup.size;

        console.log(`[Backup] Deleted old backup: ${backup.filename} (${ageDays.toFixed(1)} days old)`);
      }
    }

    if (deleted > 0) {
      console.log(`[Backup] Cleanup completed: ${deleted} backups deleted, ${formatBytes(freed)} freed`);
    }

    return { deleted, freed };
  } catch (error) {
    console.error(`[Backup] Error during cleanup:`, error);
    return { deleted, freed };
  }
}

/**
 * Verify backup integrity
 */
export async function verifyBackup(backupFilepath: string): Promise<{ valid: boolean; error?: string }> {
  try {
    if (!fs.existsSync(backupFilepath)) {
      return { valid: false, error: "Backup file not found" };
    }

    console.log(`[Backup] Verifying backup: ${path.basename(backupFilepath)}`);

    // For gzip files, verify compression
    if (backupFilepath.endsWith(".gz")) {
      try {
        execSync(`gzip -t "${backupFilepath}"`, { stdio: "pipe" });
        console.log(`[Backup] ✅ Gzip file is valid`);
      } catch (error) {
        return { valid: false, error: "Gzip file is corrupted" };
      }
    }

    // For SQL files, check for basic SQL syntax
    if (backupFilepath.endsWith(".sql")) {
      const content = fs.readFileSync(backupFilepath, "utf-8");
      if (!content.includes("PostgreSQL database dump")) {
        return { valid: false, error: "Not a valid PostgreSQL dump" };
      }
    }

    console.log(`[Backup] ✅ Backup verified successfully`);
    return { valid: true };
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    return { valid: false, error: errorMsg };
  }
}

/**
 * Get backup statistics
 */
export function getBackupStats(): {
  totalBackups: number;
  totalSize: number;
  latestBackup?: BackupMetadata;
  oldestBackup?: BackupMetadata;
} {
  const backups = listBackups();
  const totalSize = backups.reduce((sum, b) => sum + b.size, 0);

  return {
    totalBackups: backups.length,
    totalSize,
    latestBackup: backups[0],
    oldestBackup: backups[backups.length - 1],
  };
}

/**
 * Format bytes to human-readable format
 */
export function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 Bytes";
  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return Math.round((bytes / Math.pow(k, i)) * 100) / 100 + " " + sizes[i];
}

/**
 * Schedule backup - DAILY
 */
export function scheduleDailyBackup(): void {
  // Run backup at 2:00 AM every day
  const scheduleDailyBackupAtTime = () => {
    const now = new Date();
    let nextBackup = new Date(now);
    nextBackup.setHours(2, 0, 0, 0);

    // If 2:00 AM has already passed today, schedule for tomorrow
    if (nextBackup <= now) {
      nextBackup.setDate(nextBackup.getDate() + 1);
    }

    const timeUntilNextRun = nextBackup.getTime() - now.getTime();

    // Ensure timeUntilNextRun is positive (safety check)
    if (timeUntilNextRun < 0) {
      console.error(`[Backup] ERROR: Daily backup scheduled in the past. Skipping to next day.`);
      nextBackup.setDate(nextBackup.getDate() + 1);
      return scheduleDailyBackupAtTime();
    }

    console.log(`[Backup] Daily backup scheduled for ${nextBackup.toLocaleString()}`);
    console.log(`[Backup] Time until next run: ${Math.round(timeUntilNextRun / 1000 / 60)} minutes`);

    setTimeout(() => {
      createBackup("daily").catch((error) => {
        console.error(`[Backup] Daily backup failed:`, error);
      });

      // Cleanup old backups
      cleanupOldBackups().catch((error) => {
        console.error(`[Backup] Cleanup failed:`, error);
      });

      // Schedule next backup (recursively)
      scheduleDailyBackupAtTime();
    }, timeUntilNextRun);
  };

  scheduleDailyBackupAtTime();
}

/**
 * Schedule backup - WEEKLY
 */
export function scheduleWeeklyBackup(): void {
  // Run backup every Sunday at 3:00 AM
  const scheduleWeeklyBackupAtTime = () => {
    const now = new Date();
    let nextSunday = new Date(now);
    nextSunday.setDate(
      nextSunday.getDate() + ((7 - nextSunday.getDay()) % 7 || 7)
    );
    nextSunday.setHours(3, 0, 0, 0);

    let timeUntilNextRun = nextSunday.getTime() - now.getTime();

    // If we're past 3:00 AM on Sunday, move to next Sunday
    if (timeUntilNextRun < 0) {
      nextSunday.setDate(nextSunday.getDate() + 7);
      timeUntilNextRun = nextSunday.getTime() - now.getTime();
    }

    // Ensure timeUntilNextRun is positive (safety check)
    if (timeUntilNextRun <= 0) {
      console.error(`[Backup] ERROR: Weekly backup scheduled in the past. Skipping to next week.`);
      nextSunday.setDate(nextSunday.getDate() + 7);
      return scheduleWeeklyBackupAtTime();
    }

    console.log(`[Backup] Weekly backup scheduled for ${nextSunday.toLocaleString()}`);
    console.log(`[Backup] Time until next run: ${Math.round(timeUntilNextRun / 1000 / 60 / 60)} hours`);

    setTimeout(() => {
      createBackup("weekly").catch((error) => {
        console.error(`[Backup] Weekly backup failed:`, error);
      });

      // Schedule next backup (recursively)
      scheduleWeeklyBackupAtTime();
    }, timeUntilNextRun);
  };

  scheduleWeeklyBackupAtTime();
}

/**
 * Schedule backup - MONTHLY
 */
export function scheduleMonthlyBackup(): void {
  // Run backup on the 1st of every month at 4:00 AM
  const scheduleMonthlyBackupAtTime = () => {
    const now = new Date();
    let nextMonth = new Date(now);
    nextMonth.setMonth(nextMonth.getMonth() + 1);
    nextMonth.setDate(1);
    nextMonth.setHours(4, 0, 0, 0);

    let timeUntilNextRun = nextMonth.getTime() - now.getTime();

    // If we're past 4:00 AM on the 1st, move to next month
    if (timeUntilNextRun < 0) {
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      timeUntilNextRun = nextMonth.getTime() - now.getTime();
    }

    // Ensure timeUntilNextRun is positive (safety check)
    if (timeUntilNextRun <= 0) {
      console.error(`[Backup] ERROR: Monthly backup scheduled in the past. Skipping to next month.`);
      nextMonth.setMonth(nextMonth.getMonth() + 1);
      timeUntilNextRun = nextMonth.getTime() - now.getTime();
      // Don't continue with zero or negative timeout
      if (timeUntilNextRun <= 0) {
        timeUntilNextRun = 24 * 60 * 60 * 1000; // Default to 24 hours
      }
    }

    console.log(`[Backup] Monthly backup scheduled for ${nextMonth.toLocaleString()}`);
    console.log(`[Backup] Time until next run: ${Math.round(timeUntilNextRun / 1000 / 60 / 60 / 24)} days`);

    setTimeout(() => {
      createBackup("monthly").catch((error) => {
        console.error(`[Backup] Monthly backup failed:`, error);
      });

      // Schedule next backup (recursively)
      scheduleMonthlyBackupAtTime();
    }, timeUntilNextRun);
  };

  scheduleMonthlyBackupAtTime();
}

/**
 * Initialize backup system
 */
export function initializeBackupSystem(): void {
  const config = getBackupConfig();

  console.log(`[Backup] Initializing backup system...`);
  console.log(`[Backup] Backup directory: ${config.backupDir}`);
  console.log(`[Backup] Retention period: ${config.retentionDays} days`);
  console.log(`[Backup] Compression: ${config.compressionEnabled ? "enabled" : "disabled"}`);

  // Ensure backup directory exists
  ensureBackupDir(config.backupDir);

  // Schedule backups - Check every 30 minutes if a backup is due
  setInterval(() => {
    const now = new Date();
    
    // Daily backup at 2:00 AM
    if (now.getHours() === 2 && now.getMinutes() < 30) {
      createBackup("daily").catch(err => console.error("[Backup] Daily backup failed:", err));
      cleanupOldBackups().catch(err => console.error("[Backup] Cleanup failed:", err));
    }
    
    // Weekly backup every Sunday at 3:00 AM
    if (now.getDay() === 0 && now.getHours() === 3 && now.getMinutes() < 30) {
      createBackup("weekly").catch(err => console.error("[Backup] Weekly backup failed:", err));
    }
    
    // Monthly backup on 1st at 4:00 AM
    if (now.getDate() === 1 && now.getHours() === 4 && now.getMinutes() < 30) {
      createBackup("monthly").catch(err => console.error("[Backup] Monthly backup failed:", err));
    }
  }, 30 * 60 * 1000); // Check every 30 minutes

  // Get initial stats
  const stats = getBackupStats();
  console.log(`[Backup] Current backups: ${stats.totalBackups}`);
  console.log(`[Backup] Total backup size: ${formatBytes(stats.totalSize)}`);
}
