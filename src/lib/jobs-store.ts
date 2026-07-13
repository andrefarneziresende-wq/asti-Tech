import type {
  ScanJob as PrismaScanJob,
  ScanJobLogEntry as PrismaScanJobLogEntry,
} from "@prisma/client";
import { prisma } from "./prisma";
import type { ScanJob, JobStatus } from "./jobs";

function toJob(record: PrismaScanJob & { log: PrismaScanJobLogEntry[] }): ScanJob {
  return {
    id: record.id,
    type: record.type,
    sourceUrl: record.sourceUrl,
    status: record.status as JobStatus,
    candidatesFound: record.candidatesFound ?? undefined,
    totalToProcess: record.totalToProcess ?? undefined,
    leadsCreated: record.leadsCreated,
    errorMessage: record.errorMessage ?? undefined,
    log: record.log
      .slice()
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((entry) => ({ at: entry.at.toISOString(), message: entry.message })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listJobs(): Promise<ScanJob[]> {
  const records = await prisma.scanJob.findMany({
    include: { log: true },
    orderBy: { createdAt: "desc" },
    take: 30,
  });
  return records.map(toJob);
}

export async function getJob(id: string): Promise<ScanJob | undefined> {
  const record = await prisma.scanJob.findUnique({ where: { id }, include: { log: true } });
  return record ? toJob(record) : undefined;
}

export async function createJob(input: {
  type: string;
  sourceUrl: string;
  message: string;
}): Promise<ScanJob> {
  const record = await prisma.scanJob.create({
    data: {
      type: input.type,
      sourceUrl: input.sourceUrl,
      log: { create: [{ message: input.message }] },
    },
    include: { log: true },
  });
  return toJob(record);
}

export async function updateJob(
  id: string,
  patch: Partial<
    Pick<ScanJob, "status" | "candidatesFound" | "totalToProcess" | "leadsCreated" | "errorMessage">
  >,
  logMessage?: string
): Promise<ScanJob | undefined> {
  const exists = await prisma.scanJob.findUnique({ where: { id } });
  if (!exists) return undefined;

  const record = await prisma.scanJob.update({
    where: { id },
    data: {
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.candidatesFound !== undefined ? { candidatesFound: patch.candidatesFound } : {}),
      ...(patch.totalToProcess !== undefined ? { totalToProcess: patch.totalToProcess } : {}),
      ...(patch.leadsCreated !== undefined ? { leadsCreated: patch.leadsCreated } : {}),
      ...(patch.errorMessage !== undefined ? { errorMessage: patch.errorMessage } : {}),
      ...(logMessage ? { log: { create: [{ message: logMessage }] } } : {}),
    },
    include: { log: true },
  });
  return toJob(record);
}
