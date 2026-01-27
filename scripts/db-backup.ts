#!/usr/bin/env node

/**
 * ✅ DATABASE BACKUP CLI
 *
 * Manual backup and restore commands
 * Usage:
 *   npm run db:backup         - Create daily backup
 *   npm run db:backup:weekly  - Create weekly backup
 *   npm run db:backup:monthly - Create monthly backup
 *   npm run db:restore <file> - Restore from backup file
 *   npm run db:backups        - List all backups
 *   npm run db:verify <file>  - Verify backup integrity
 */

import {
  createBackup,
  restoreBackup,
  listBackups,
  verifyBackup,
  getBackupStats,
  cleanupOldBackups,
  formatBytes,
} from "../server/utils/backup";
import * as path from "path";

const command = process.argv[2];
const args = process.argv.slice(3);

async function main() {
  try {
    switch (command) {
      case "backup":
      case "backup:daily": {
        console.log("\n📦 Creating Daily Backup...\n");
        const result = await createBackup("daily");
        if (result.success) {
          console.log(`\n✅ Backup created: ${result.filepath}`);
          console.log(`📊 Size: ${formatBytes(result.size)}`);
          process.exit(0);
        } else {
          console.error(`\n❌ Backup failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "backup:weekly": {
        console.log("\n📦 Creating Weekly Backup...\n");
        const result = await createBackup("weekly");
        if (result.success) {
          console.log(`\n✅ Backup created: ${result.filepath}`);
          console.log(`📊 Size: ${formatBytes(result.size)}`);
          process.exit(0);
        } else {
          console.error(`\n❌ Backup failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "backup:monthly": {
        console.log("\n📦 Creating Monthly Backup...\n");
        const result = await createBackup("monthly");
        if (result.success) {
          console.log(`\n✅ Backup created: ${result.filepath}`);
          console.log(`📊 Size: ${formatBytes(result.size)}`);
          process.exit(0);
        } else {
          console.error(`\n❌ Backup failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "restore": {
        const backupFile = args[0];
        if (!backupFile) {
          console.error("❌ Error: Backup file path is required");
          console.error("\nUsage: npm run db:restore <file>\n");
          process.exit(1);
        }

        const fullPath = path.isAbsolute(backupFile)
          ? backupFile
          : path.join(process.cwd(), backupFile);

        console.log("\n🔄 Restoring Database from Backup...\n");
        console.log(`📁 File: ${fullPath}`);

        const result = await restoreBackup(fullPath);
        if (result.success) {
          console.log("\n✅ Database restored successfully");
          process.exit(0);
        } else {
          console.error(`\n❌ Restore failed: ${result.error}`);
          process.exit(1);
        }
        break;
      }

      case "list":
      case "backups": {
        console.log("\n📋 Available Backups:\n");
        const backups = listBackups();

        if (backups.length === 0) {
          console.log("   No backups found\n");
          process.exit(0);
        }

        console.log(
          "   Filename                                    Type      Size         Age"
        );
        console.log(
          "   " +
            "-".repeat(80)
        );

        const now = new Date();
        for (const backup of backups) {
          const ageMs = now.getTime() - backup.timestamp.getTime();
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          const ageStr =
            ageDays === 0
              ? "today"
              : ageDays === 1
                ? "1 day ago"
                : `${ageDays} days ago`;

          console.log(
            `   ${backup.filename.padEnd(40)} ${backup.type.padEnd(8)} ${formatBytes(backup.size).padEnd(12)} ${ageStr}`
          );
        }

        const stats = getBackupStats();
        console.log(
          "\n   " +
            "-".repeat(80)
        );
        console.log(
          `   Total: ${stats.totalBackups} backups, ${formatBytes(stats.totalSize)} total size\n`
        );
        process.exit(0);
        break;
      }

      case "verify": {
        const backupFile = args[0];
        if (!backupFile) {
          console.error("❌ Error: Backup file path is required");
          console.error("\nUsage: npm run db:verify <file>\n");
          process.exit(1);
        }

        const fullPath = path.isAbsolute(backupFile)
          ? backupFile
          : path.join(process.cwd(), backupFile);

        console.log("\n✔️  Verifying Backup...\n");
        console.log(`📁 File: ${fullPath}`);

        const result = await verifyBackup(fullPath);
        if (result.valid) {
          console.log("\n✅ Backup is valid\n");
          process.exit(0);
        } else {
          console.error(`\n❌ Verification failed: ${result.error}\n`);
          process.exit(1);
        }
        break;
      }

      case "cleanup": {
        console.log("\n🧹 Cleaning up old backups...\n");
        const result = await cleanupOldBackups();
        console.log(
          `\n✅ Cleanup completed: ${result.deleted} backups deleted, ${formatBytes(result.freed)} freed\n`
        );
        process.exit(0);
        break;
      }

      case "stats": {
        console.log("\n📊 Backup Statistics:\n");
        const stats = getBackupStats();

        console.log(`   Total Backups: ${stats.totalBackups}`);
        console.log(`   Total Size: ${formatBytes(stats.totalSize)}`);

        if (stats.latestBackup) {
          console.log(`   Latest Backup: ${stats.latestBackup.filename}`);
          console.log(`   Latest Date: ${stats.latestBackup.timestamp.toLocaleString()}`);
        }

        if (stats.oldestBackup) {
          console.log(`   Oldest Backup: ${stats.oldestBackup.filename}`);
          console.log(`   Oldest Date: ${stats.oldestBackup.timestamp.toLocaleString()}`);
        }

        console.log();
        process.exit(0);
        break;
      }

      default:
        console.log("\n❌ Unknown command: " + command);
        console.log("\n📖 Available commands:\n");
        console.log("   backup              Create daily backup");
        console.log("   backup:weekly       Create weekly backup");
        console.log("   backup:monthly      Create monthly backup");
        console.log("   restore <file>      Restore from backup file");
        console.log("   backups             List all backups");
        console.log("   verify <file>       Verify backup integrity");
        console.log("   cleanup             Delete old backups");
        console.log("   stats               Show backup statistics\n");
        process.exit(1);
    }
  } catch (error) {
    console.error("\n❌ Error:", error);
    process.exit(1);
  }
}

main();
