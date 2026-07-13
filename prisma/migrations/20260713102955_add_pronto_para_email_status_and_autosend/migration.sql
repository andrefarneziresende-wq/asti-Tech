-- AlterEnum
ALTER TYPE "LeadStatus" ADD VALUE 'pronto_para_email';

-- AlterTable
ALTER TABLE "app_settings" ADD COLUMN     "autoSendEmail" BOOLEAN NOT NULL DEFAULT true;

