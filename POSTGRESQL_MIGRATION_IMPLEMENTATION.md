# PostgreSQL Migration - Step-by-Step Implementation Guide

**Status:** Ready for Implementation  
**Risk Level:** Low (with proper sequence)  
**Estimated Time:** 5-6 hours

---

## BEFORE YOU START

### Prerequisites Checklist

- [ ] PostgreSQL 12+ installed locally or access to PostgreSQL server
- [ ] PostgreSQL credentials ready (host, port, user, password)
- [ ] SQLite database backed up: `cp bill-splitter.db bill-splitter.db.backup`
- [ ] All code committed to git: `git status` shows clean working directory
- [ ] Node.js and npm updated: `node -v` and `npm -v`

### Safety Measures

```bash
# 1. Create backup of SQLite database
cp bill-splitter.db bill-splitter.db.backup

# 2. Commit all current changes
git add -A
git commit -m "pre-migration: backup before PostgreSQL migration"

# 3. Create new branch for migration
git checkout -b feature/migrate-to-postgresql
```

---

## PHASE 1: Dependencies Update (30 minutes)

### Step 1.1: Remove SQLite Drivers

```bash
npm uninstall better-sqlite3 @types/better-sqlite3
```

### Step 1.2: Verify pg is installed

```bash
npm list pg
# Should output: pg@8.16.3 (already in dependencies)
```

### Step 1.3: Add types for pg (if not present)

```bash
npm install --save-dev @types/pg
```

### Verification

```bash
npm list | grep -E "pg|drizzle|sqlite"
# Should show:
# ├── @types/pg
# ├── drizzle-kit
# ├── drizzle-orm
# └── pg
```

---

## PHASE 2: Configuration Files (1 hour)

### Step 2.1: Update server/db.ts

**Current file:** `server/db.ts` (uses better-sqlite3)  
**New file:** `server/db.ts.pg` (uses pg)

```bash
# Backup current
cp server/db.ts server/db.ts.sqlite

# Replace with PostgreSQL version
cp server/db.ts.pg server/db.ts
```

### Step 2.2: Update drizzle.config.ts

**Current file:** `drizzle.config.ts` (SQLite dialect)  
**New file:** `drizzle.config.ts.pg` (PostgreSQL dialect)

```bash
# Backup current
cp drizzle.config.ts drizzle.config.ts.sqlite

# Replace with PostgreSQL version
cp drizzle.config.ts.pg drizzle.config.ts
```

### Step 2.3: Update shared/schema.ts

**Current file:** `shared/schema.ts` (uses sqliteTable)  
**New file:** `shared/schema.ts.pg` (uses pgTable)

```bash
# Backup current
cp shared/schema.ts shared/schema.ts.sqlite

# Replace with PostgreSQL version
cp shared/schema.ts.pg shared/schema.ts
```

### Step 2.4: Create .env for PostgreSQL (Development)

**For local PostgreSQL on localhost:**

```bash
# .env
DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tellbill_dev
DATABASE_SSL=false
NODE_ENV=development

# Keep other vars from existing .env
```

**For production PostgreSQL:**

```bash
# .env.production
DATABASE_URL=postgresql://user:securepassword@prod-db.example.com:5432/tellbill_prod
DATABASE_SSL=true
DATABASE_SSL_REJECT_UNAUTHORIZED=false
NODE_ENV=production
```

### Step 2.5: Verify Configuration

```bash
# Test database connection
npm run db:push --dry-run
# Should show PostgreSQL migration preview (not SQLite)
```

---

## PHASE 3: Generate PostgreSQL Migrations (1 hour)

### Step 3.1: Clean up old migrations

```bash
# Backup existing migrations
cp -r migrations migrations.sqlite.backup

# Create new migrations for PostgreSQL
npm run db:generate
# Drizzle will create PostgreSQL-compatible SQL migrations
```

### Step 3.2: Review generated migrations

```bash
ls -la migrations/
# Should see files like: 0001_*.sql, 0002_*.sql, etc.
# (or a new set of migrations for PostgreSQL)
```

**⚠️ IMPORTANT:** Check migration files for PostgreSQL syntax

```bash
cat migrations/0001_*.sql
# Should contain: CREATE TABLE, postgres datatypes (timestamp, boolean, numeric)
# NOT SQLite syntax (INTEGER PRIMARY KEY, julianday())
```

### Step 3.3: Validate migrations

```bash
# Syntax check (requires PostgreSQL running)
npm run db:push --dry-run
# Should show: "Migrations to be executed" with PostgreSQL syntax
```

---

## PHASE 4: Prepare PostgreSQL Database (30 minutes)

### Step 4.1: Create PostgreSQL database

```bash
# Using psql command-line
createdb tellbill_dev

# Or if using connection string:
psql -h localhost -U postgres -c "CREATE DATABASE tellbill_dev;"

# Verify creation
psql -h localhost -U postgres -c "\l" | grep tellbill_dev
```

### Step 4.2: Test connection

```bash
# Test with DATABASE_URL
psql postgresql://postgres:postgres@localhost:5432/tellbill_dev -c "\dt"
# Should output: (no tables yet) "Did not find any relations."
```

---

## PHASE 5: Data Migration (1 hour)

### Step 5.1: Export from SQLite

```bash
# Ensure .env points to SQLite (temporary)
# DATABASE_URL=file:bill-splitter.db

npm run migrate:export
# Creates: migration-export.json (~500KB typically)
```

### Step 5.2: Apply PostgreSQL migrations

```bash
# Now .env should point to PostgreSQL
# DATABASE_URL=postgresql://postgres:postgres@localhost:5432/tellbill_dev

npm run db:push
# Creates all tables in PostgreSQL
```

### Step 5.3: Import data to PostgreSQL

```bash
npm run migrate:import
# Reads migration-export.json
# Inserts all data into PostgreSQL tables
```

### Step 5.4: Verify data integrity

```bash
npm run migrate:verify
# Checks row counts match
# Validates foreign keys
# Reports any issues
```

**Example output:**
```
✓ users: 5 rows (expected: 5)
✓ projects: 12 rows (expected: 12)
✓ invoices: 42 rows (expected: 42)
✓ All checks PASSED!
```

---

## PHASE 6: Server Testing (1.5 hours)

### Step 6.1: Start development server

```bash
# Ensure DATABASE_URL points to PostgreSQL
npm run server:dev
# Should start without errors
# Check logs: "express server serving on port 3000"
```

### Step 6.2: Test API endpoints manually

**Test authentication:**
```bash
# Signup
curl -X POST http://localhost:3000/api/auth/signup \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'

# Signin
curl -X POST http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"TestPassword123!"}'
```

**Test data loading:**
```bash
# Get user ID from signin response, then:
curl "http://localhost:3000/api/data/all?userId=USER_ID_HERE"
# Should return user data (projects, invoices, etc.)
```

### Step 6.3: Test critical routes

| Route | Method | Test Command |
|-------|--------|--------------|
| Auth | POST | `curl -X POST http://localhost:3000/api/auth/signin ...` |
| Projects | GET | `curl http://localhost:3000/api/projects?userId=...` |
| Invoices | GET | `curl http://localhost:3000/api/invoices?userId=...` |
| Data Load | GET | `curl http://localhost:3000/api/data/all?userId=...` |

### Step 6.4: Verify response format

**Response should be identical before/after migration:**

```bash
# Save PostgreSQL response
curl http://localhost:3000/api/data/all?userId=test > postgres-response.json

# Should match original SQLite format
# (timestamps might differ by <1 second, but structure identical)
```

---

## PHASE 7: Mobile Client Testing (30 minutes)

### Step 7.1: Start Expo client

```bash
# In separate terminal
npm run expo:start
```

### Step 7.2: Test on mobile/emulator

- [ ] Login with test account
- [ ] View projects list
- [ ] Open a project
- [ ] Record audio item
- [ ] View activity/history
- [ ] Logout and login again (verify data restored)

### Step 7.3: Verify no client code broke

- [ ] No TypeScript errors
- [ ] No console errors
- [ ] All screens render correctly
- [ ] Navigation works
- [ ] Data displays correctly

---

## PHASE 8: Cleanup & Finalization (30 minutes)

### Step 8.1: Remove backup/temporary files

```bash
# Keep backups for 24 hours, then:
rm migration-export.json                # Exported data
rm -rf migrations.sqlite.backup/        # Old migrations
rm server/db.ts.sqlite                  # SQLite db.ts
rm server/db.ts.pg                      # PostgreSQL template
rm drizzle.config.ts.sqlite             # SQLite config
rm drizzle.config.ts.pg                 # PostgreSQL template
rm shared/schema.ts.sqlite              # SQLite schema
rm shared/schema.ts.pg                  # PostgreSQL template
```

### Step 8.2: Update .env example

```bash
# .env.example (for new developers)
DATABASE_URL=postgresql://user:password@localhost:5432/tellbill_dev
DATABASE_SSL=false
NODE_ENV=development
```

### Step 8.3: Update documentation

Edit README.md:
```markdown
## Database

Bill Splitter uses PostgreSQL for backend database.

### Local Development Setup

1. Install PostgreSQL 12+
2. Create database: `createdb tellbill_dev`
3. Set DATABASE_URL in .env
4. Run migrations: `npm run db:push`
```

### Step 8.4: Commit changes

```bash
git add -A
git commit -m "feat: migrate backend database from SQLite to PostgreSQL

BREAKING CHANGE (Internal Only):
- Replaced better-sqlite3 with pg driver
- Updated to PostgreSQL-compatible schema (pgTable, timestamp, numeric types)
- Connection pooling enabled for better concurrency
- SSL support for production deployments

Benefits:
- Support for 1000+ concurrent users (vs 10-20 with SQLite)
- Better scalability for production deployment
- Improved backup/restore capabilities
- Native support for cloud databases (AWS RDS, Heroku, etc.)

NO CLIENT IMPACT:
- API routes unchanged
- Request/response shapes identical
- Mobile app requires no updates
- Backward compatible data format

Migration:
- Exported all data from SQLite
- Ran PostgreSQL migrations
- Imported data with integrity verification
- All row counts verified
- All FK relationships intact

Testing:
- All auth routes functional
- Data loading verified
- API responses identical to SQLite version
- Mobile client tested and working"
```

---

## PHASE 9: Troubleshooting

### Issue: Connection refused on PostgreSQL

**Symptom:** `Error: connect ECONNREFUSED 127.0.0.1:5432`

**Solutions:**
```bash
# 1. Ensure PostgreSQL is running
sudo systemctl status postgresql
# or
brew services list | grep postgres

# 2. Start PostgreSQL if not running
sudo systemctl start postgresql
# or
brew services start postgresql

# 3. Verify connection string
echo $DATABASE_URL
# Should be: postgresql://user:password@host:5432/dbname

# 4. Test connection
psql "$DATABASE_URL" -c "\dt"
```

### Issue: Migration fails with type errors

**Symptom:** `TypeError: Cannot read property 'x' of undefined` or similar

**Solutions:**
```bash
# 1. Verify schema files updated
grep "pgTable" shared/schema.ts
# Should show pgTable usage

# 2. Regenerate migrations
rm -rf migrations/
npm run db:generate

# 3. Verify Drizzle config
cat drizzle.config.ts
# Should show: dialect: "postgresql"
```

### Issue: Data integrity mismatch after import

**Symptom:** `✗ projects: 5 rows (expected: 10) - MISMATCH!`

**Solutions:**
```bash
# 1. Check if import was interrupted
npm run migrate:import  # Idempotent, safe to retry

# 2. Verify export file
cat migration-export.json | grep "rowCounts"

# 3. Manual verification
psql "$DATABASE_URL" -c "SELECT COUNT(*) FROM projects;"

# 4. Clear and re-import
psql "$DATABASE_URL" -c "TRUNCATE projects CASCADE;"
npm run migrate:import
npm run migrate:verify
```

### Issue: Server starts but API returns 500 errors

**Symptom:** All requests return `{"message": "Internal Server Error"}`

**Solutions:**
```bash
# 1. Check server logs
npm run server:dev 2>&1 | head -50

# 2. Verify database connection
psql "$DATABASE_URL" -c "\dt"
# Should list all tables

# 3. Check environment variables
echo "DATABASE_URL=$DATABASE_URL"
echo "DATABASE_SSL=$DATABASE_SSL"

# 4. Reset and try again
npm run db:push --dry-run
npm run db:push
npm run server:dev
```

---

## ROLLBACK PROCEDURE (If Needed)

### Quick Rollback to SQLite (< 5 minutes)

```bash
# 1. Stop Express server
killall node

# 2. Restore configuration files
cp server/db.ts.sqlite server/db.ts
cp drizzle.config.ts.sqlite drizzle.config.ts
cp shared/schema.ts.sqlite shared/schema.ts

# 3. Restore .env to SQLite
cat > .env << EOF
DATABASE_URL=file:bill-splitter.db
NODE_ENV=development
EOF

# 4. Restore dependencies
git checkout package.json package-lock.json
npm install

# 5. Start server on SQLite
npm run server:dev
# Should see: "express server serving on port 3000"

# 6. Verify SQLite is working
curl http://localhost:3000/api/auth/signin \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com","password":"test"}'
```

### Data Safety During Rollback

- ✅ SQLite database (`bill-splitter.db`) remains untouched during PostgreSQL testing
- ✅ All data preserved on rollback
- ✅ No data loss risk

---

## VERIFICATION CHECKLIST

Before considering migration complete:

- [ ] All dependencies updated (better-sqlite3 removed, pg verified)
- [ ] Configuration files updated (db.ts, drizzle.config.ts, schema.ts)
- [ ] PostgreSQL database created and migrations applied
- [ ] Data exported from SQLite and imported to PostgreSQL
- [ ] Data integrity verified (row counts, FK relationships)
- [ ] Server starts without errors
- [ ] API endpoints tested and responding correctly
- [ ] Mobile client tested and working
- [ ] Response shapes identical to SQLite version
- [ ] No TypeScript compilation errors
- [ ] Backup files archived (optional but recommended)
- [ ] Git commit created with migration details
- [ ] Documentation updated

---

## SUMMARY

| Phase | Step | Time | Status |
|-------|------|------|--------|
| 1 | Dependencies | 30m | ⏳ Ready |
| 2 | Configuration | 1h | ⏳ Ready |
| 3 | Migrations | 1h | ⏳ Ready |
| 4 | PostgreSQL Setup | 30m | ⏳ Ready |
| 5 | Data Migration | 1h | ⏳ Ready |
| 6 | Server Testing | 1.5h | ⏳ Ready |
| 7 | Client Testing | 30m | ⏳ Ready |
| 8 | Cleanup | 30m | ⏳ Ready |

**Total Time:** 5-6 hours  
**Zero API Breaking Changes:** ✅ Yes  
**Zero Client Code Changes:** ✅ Yes  
**Data Safety:** ✅ Guaranteed

---

**Ready to proceed? Run Phase 1 first to remove SQLite dependencies.**
