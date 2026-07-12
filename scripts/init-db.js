#!/usr/bin/env node
/**
 * DEPRECATED — Database Initialization Script
 *
 * This script is no longer used for provisioning. The repository now uses
 * versioned Prisma migrations as the single source of truth.
 *
 * Use the following commands instead:
 *   npm run db:setup      # generate + migrate + seed
 *   npm run db:migrate    # prisma migrate deploy
 *   npm run db:seed       # prisma db seed
 *
 * scripts/schema.sql is retained for historical reference only and must not
 * be used to provision new or existing databases.
 */

console.error('❌ scripts/init-db.js is deprecated.');
console.error('   Use: npm run db:setup');
console.error('   Or:  npx prisma migrate deploy && npx prisma db seed');
process.exit(1);
