-- CreateEnum
CREATE TYPE "JobStatus" AS ENUM ('pendente', 'processando', 'concluido', 'erro');

-- CreateTable
CREATE TABLE "scan_jobs" (
    "id" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "sourceUrl" TEXT NOT NULL,
    "status" "JobStatus" NOT NULL DEFAULT 'pendente',
    "candidatesFound" INTEGER,
    "totalToProcess" INTEGER,
    "leadsCreated" INTEGER NOT NULL DEFAULT 0,
    "errorMessage" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "scan_jobs_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "scan_job_log_entries" (
    "id" TEXT NOT NULL,
    "jobId" TEXT NOT NULL,
    "at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "message" TEXT NOT NULL,

    CONSTRAINT "scan_job_log_entries_pkey" PRIMARY KEY ("id")
);

-- AddForeignKey
ALTER TABLE "scan_job_log_entries" ADD CONSTRAINT "scan_job_log_entries_jobId_fkey" FOREIGN KEY ("jobId") REFERENCES "scan_jobs"("id") ON DELETE CASCADE ON UPDATE CASCADE;

