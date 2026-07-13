import type { Lead as PrismaLead, LeadTimelineEntry as PrismaTimelineEntry } from "@prisma/client";
import { prisma } from "./prisma";
import type { Lead, LeadStatus } from "./leads";

function toLead(record: PrismaLead & { timeline: PrismaTimelineEntry[] }): Lead {
  return {
    id: record.id,
    sourceUrl: record.sourceUrl,
    businessName: record.businessName,
    segment: record.segment ?? undefined,
    contactEmail: record.contactEmail ?? undefined,
    contactPhone: record.contactPhone ?? undefined,
    status: record.status as LeadStatus,
    estimatedMonthlyCost: record.estimatedMonthlyCost ?? undefined,
    siteIdeas: record.siteIdeas,
    slug: record.slug ?? undefined,
    siteHtml: record.siteHtml ?? undefined,
    mockupUrl: record.mockupUrl ?? undefined,
    githubRepoUrl: record.githubRepoUrl ?? undefined,
    timeline: record.timeline
      .slice()
      .sort((a, b) => a.at.getTime() - b.at.getTime())
      .map((entry) => ({
        at: entry.at.toISOString(),
        label: entry.label,
        detail: entry.detail ?? undefined,
      })),
    createdAt: record.createdAt.toISOString(),
    updatedAt: record.updatedAt.toISOString(),
  };
}

export async function listLeads(): Promise<Lead[]> {
  const records = await prisma.lead.findMany({
    include: { timeline: true },
    orderBy: { updatedAt: "desc" },
  });
  return records.map(toLead);
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const record = await prisma.lead.findUnique({ where: { id }, include: { timeline: true } });
  return record ? toLead(record) : undefined;
}

export async function getLeadBySlug(slug: string): Promise<Lead | undefined> {
  const record = await prisma.lead.findUnique({ where: { slug }, include: { timeline: true } });
  return record ? toLead(record) : undefined;
}

export async function createLead(
  input: Pick<Lead, "sourceUrl" | "businessName"> & Partial<Lead>
): Promise<Lead> {
  const record = await prisma.lead.create({
    data: {
      sourceUrl: input.sourceUrl,
      businessName: input.businessName,
      segment: input.segment,
      contactEmail: input.contactEmail,
      contactPhone: input.contactPhone,
      status: input.status ?? "novo",
      estimatedMonthlyCost: input.estimatedMonthlyCost,
      siteIdeas: input.siteIdeas ?? [],
      slug: input.slug,
      siteHtml: input.siteHtml,
      mockupUrl: input.mockupUrl,
      githubRepoUrl: input.githubRepoUrl,
      timeline: {
        create: [{ label: "Lead criado", detail: input.sourceUrl }],
      },
    },
    include: { timeline: true },
  });
  return toLead(record);
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>,
  timelineEntry?: { label: string; detail?: string }
): Promise<Lead | undefined> {
  const exists = await prisma.lead.findUnique({ where: { id } });
  if (!exists) return undefined;

  const record = await prisma.lead.update({
    where: { id },
    data: {
      ...(patch.businessName !== undefined ? { businessName: patch.businessName } : {}),
      ...(patch.segment !== undefined ? { segment: patch.segment } : {}),
      ...(patch.contactEmail !== undefined ? { contactEmail: patch.contactEmail } : {}),
      ...(patch.contactPhone !== undefined ? { contactPhone: patch.contactPhone } : {}),
      ...(patch.status !== undefined ? { status: patch.status } : {}),
      ...(patch.estimatedMonthlyCost !== undefined
        ? { estimatedMonthlyCost: patch.estimatedMonthlyCost }
        : {}),
      ...(patch.siteIdeas !== undefined ? { siteIdeas: patch.siteIdeas } : {}),
      ...(patch.slug !== undefined ? { slug: patch.slug } : {}),
      ...(patch.siteHtml !== undefined ? { siteHtml: patch.siteHtml } : {}),
      ...(patch.mockupUrl !== undefined ? { mockupUrl: patch.mockupUrl } : {}),
      ...(patch.githubRepoUrl !== undefined ? { githubRepoUrl: patch.githubRepoUrl } : {}),
      ...(timelineEntry
        ? { timeline: { create: [{ label: timelineEntry.label, detail: timelineEntry.detail }] } }
        : {}),
    },
    include: { timeline: true },
  });
  return toLead(record);
}
