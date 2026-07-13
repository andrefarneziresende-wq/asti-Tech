-- CreateEnum
CREATE TYPE "LeadStatus" AS ENUM ('novo', 'coletando_dados', 'gerando_site', 'publicando', 'email_enviado', 'respondeu_interessado', 'sem_interesse', 'erro');

-- CreateTable
CREATE TABLE "leads" (
    "id" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "businessName" TEXT NOT NULL,
    "segment" TEXT,
    "contactEmail" TEXT,
    "contactPhone" TEXT,
    "status" "LeadStatus" NOT NULL DEFAULT 'novo',
    "estimatedMonthlyCost" DOUBLE PRECISION,
    "siteIdeas" TEXT[] DEFAULT ARRAY[]::TEXT[],
    "mockupUrl" TEXT,
    "githubRepoUrl" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "leads_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "lead_timeline_entries" (
    "id" TEXT NOT NULL,
    "leadId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "label" TEXT NOT NULL,
    "detail" TEXT,

    CONSTRAINT "lead_timeline_entries_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "contact_messages" (
    "id" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "email" TEXT NOT NULL,
    "phone" TEXT,
    "business" TEXT,
    "message" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "contact_messages_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "lead_timeline_entries" ADD CONSTRAINT "lead_timeline_entries_leadId_fkey" FOREIGN KEY ("leadId") REFERENCES "leads"("id") ON DELETE CASCADE ON UPDATE CASCADE;
