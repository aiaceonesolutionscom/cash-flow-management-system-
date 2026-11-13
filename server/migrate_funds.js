const { prisma } = require('./dist/prisma');

async function migrate() {
  console.log('--- Finalizing PostgreSQL Schema for Funds ---');
  try {
    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
          CREATE TYPE "FundStatus" AS ENUM ('UNALLOCATED', 'PARTIALLY_ALLOCATED', 'FULLY_ALLOCATED');
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);

    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "company_funds" (
          "id" TEXT NOT NULL,
          "title" TEXT NOT NULL,
          "total_amount" DECIMAL(15,2) NOT NULL,
          "allocated_amount" DECIMAL(15,2) NOT NULL DEFAULT 0,
          "received_from" TEXT NOT NULL,
          "receiving_method" TEXT,
          "fund_date" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "description" TEXT,
          "attachment_url" TEXT,
          "attachment_name" TEXT,
          "status" "FundStatus" NOT NULL DEFAULT 'UNALLOCATED',
          "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
          CONSTRAINT "company_funds_pkey" PRIMARY KEY ("id")
      );
    `);

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "company_funds_status_idx" ON "company_funds"("status");`);
    console.log('1. company_funds_status_idx verified.');

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "company_funds_fund_date_idx" ON "company_funds"("fund_date");`);
    console.log('2. company_funds_fund_date_idx verified.');

    await prisma.$executeRawUnsafe(`ALTER TABLE "transactions" ADD COLUMN IF NOT EXISTS "company_fund_id" TEXT;`);
    console.log('3. transactions.company_fund_id verified.');

    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "transactions_company_fund_id_idx" ON "transactions"("company_fund_id");`);
    console.log('4. transactions_company_fund_id_idx verified.');

    await prisma.$executeRawUnsafe(`
      DO $$ BEGIN
          ALTER TABLE "transactions" 
          ADD CONSTRAINT "transactions_company_fund_id_fkey" 
          FOREIGN KEY ("company_fund_id") REFERENCES "company_funds"("id") 
          ON DELETE SET NULL ON UPDATE CASCADE;
      EXCEPTION
          WHEN duplicate_object THEN null;
      END $$;
    `);
    console.log('5. Foreign key relation verified.');

    console.log('=== MIGRATION COMPLETE: 100% SUCCESS ===');
    process.exit(0);
  } catch (err) {
    console.error('Migration failed:', err);
    process.exit(1);
  }
}

migrate();
