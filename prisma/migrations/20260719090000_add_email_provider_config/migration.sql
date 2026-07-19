-- CreateTable
CREATE TABLE "email_provider_config" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "provider" TEXT NOT NULL,
    "domain" TEXT NOT NULL,
    "is_active" BOOLEAN NOT NULL DEFAULT true,
    "config" JSONB NOT NULL DEFAULT '{}',
    "default_password" TEXT,
    "password_policy" TEXT,
    "email_pattern" TEXT,
    "custom_pattern" TEXT,
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "email_provider_config_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "email_provider_config_school_id_idx" ON "email_provider_config"("school_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "email_provider_config_school_id_provider_key" ON "email_provider_config"("school_id", "provider");

-- CreateTable
CREATE TABLE "student_email_account" (
    "id" SERIAL NOT NULL,
    "school_id" TEXT NOT NULL,
    "student_id" INTEGER NOT NULL,
    "email_address" TEXT NOT NULL,
    "password" TEXT,
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "student_email_account_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "student_email_account_school_id_idx" ON "student_email_account"("school_id");

-- CreateIndex
CREATE INDEX "student_email_account_student_id_idx" ON "student_email_account"("student_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "student_email_account_student_id_key" ON "student_email_account"("student_id");

-- CreateUniqueIndex
CREATE UNIQUE INDEX "student_email_account_email_address_key" ON "student_email_account"("email_address");

-- AddForeignKey
ALTER TABLE "email_provider_config" ADD CONSTRAINT "email_provider_config_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "student_email_account" ADD CONSTRAINT "student_email_account_school_id_fkey" FOREIGN KEY ("school_id") REFERENCES "school"("id") ON DELETE CASCADE;

-- AddForeignKey
ALTER TABLE "student_email_account" ADD CONSTRAINT "student_email_account_student_id_fkey" FOREIGN KEY ("student_id") REFERENCES "student"("id") ON DELETE CASCADE;
