import { randomUUID } from "crypto";
import { readJsonArray, writeJsonArray } from "./json-store";
import type { Lead } from "./leads";

const FILE = "leads.json";

export async function listLeads(): Promise<Lead[]> {
  const items = await readJsonArray<Lead>(FILE);
  return items.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
}

export async function getLead(id: string): Promise<Lead | undefined> {
  const items = await readJsonArray<Lead>(FILE);
  return items.find((lead) => lead.id === id);
}

export async function createLead(
  input: Pick<Lead, "sourceUrl" | "businessName"> & Partial<Lead>
): Promise<Lead> {
  const items = await readJsonArray<Lead>(FILE);
  const now = new Date().toISOString();
  const lead: Lead = {
    id: randomUUID(),
    segment: undefined,
    contactEmail: undefined,
    contactPhone: undefined,
    status: "novo",
    timeline: [{ at: now, label: "Lead criado", detail: input.sourceUrl }],
    createdAt: now,
    updatedAt: now,
    ...input,
  };
  items.push(lead);
  await writeJsonArray(FILE, items);
  return lead;
}

export async function updateLead(
  id: string,
  patch: Partial<Lead>,
  timelineEntry?: { label: string; detail?: string }
): Promise<Lead | undefined> {
  const items = await readJsonArray<Lead>(FILE);
  const idx = items.findIndex((lead) => lead.id === id);
  if (idx === -1) return undefined;

  const now = new Date().toISOString();
  const updated: Lead = {
    ...items[idx],
    ...patch,
    updatedAt: now,
    timeline: timelineEntry
      ? [...items[idx].timeline, { at: now, ...timelineEntry }]
      : items[idx].timeline,
  };
  items[idx] = updated;
  await writeJsonArray(FILE, items);
  return updated;
}
