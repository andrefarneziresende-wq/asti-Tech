-- AlterTable
ALTER TABLE "leads" ADD COLUMN     "siteHtml" TEXT,
ADD COLUMN     "slug" TEXT;

-- CreateIndex
CREATE UNIQUE INDEX "leads_slug_key" ON "leads"("slug");

