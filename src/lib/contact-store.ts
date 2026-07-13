import { prisma } from "./prisma";

export interface ContactMessage {
  name: string;
  email: string;
  phone?: string;
  business?: string;
  message: string;
  createdAt: string;
}

export async function appendContactMessage(entry: ContactMessage): Promise<void> {
  await prisma.contactMessage.create({
    data: {
      name: entry.name,
      email: entry.email,
      phone: entry.phone,
      business: entry.business,
      message: entry.message,
    },
  });
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const records = await prisma.contactMessage.findMany({ orderBy: { createdAt: "desc" } });
  return records.map((record) => ({
    name: record.name,
    email: record.email,
    phone: record.phone ?? undefined,
    business: record.business ?? undefined,
    message: record.message,
    createdAt: record.createdAt.toISOString(),
  }));
}
