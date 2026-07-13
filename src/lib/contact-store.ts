import { readJsonArray, writeJsonArray } from "./json-store";

export interface ContactMessage {
  name: string;
  email: string;
  phone?: string;
  business?: string;
  message: string;
  createdAt: string;
}

const FILE = "contact-messages.json";

export async function appendContactMessage(entry: ContactMessage): Promise<void> {
  const items = await readJsonArray<ContactMessage>(FILE);
  items.push(entry);
  await writeJsonArray(FILE, items);
}

export async function listContactMessages(): Promise<ContactMessage[]> {
  const items = await readJsonArray<ContactMessage>(FILE);
  return items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
}
