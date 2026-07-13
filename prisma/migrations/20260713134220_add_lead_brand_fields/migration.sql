-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "brandColors" TEXT[] DEFAULT ARRAY[]::TEXT[],
ADD COLUMN     "businessDescription" TEXT,
ADD COLUMN     "logoUrl" TEXT;

