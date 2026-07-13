import { prisma } from "./prisma";

export interface AppSettingsData {
  testEmailAddress: string | null;
  emailSubject: string | null;
  emailBodyHtml: string | null;
  autoSendEmail: boolean;
}

export async function getAppSettings(): Promise<AppSettingsData> {
  const row = await prisma.appSettings.findUnique({ where: { id: 1 } });
  return {
    testEmailAddress: row?.testEmailAddress ?? null,
    emailSubject: row?.emailSubject ?? null,
    emailBodyHtml: row?.emailBodyHtml ?? null,
    autoSendEmail: row?.autoSendEmail ?? true,
  };
}

export async function updateAppSettings(
  patch: Partial<AppSettingsData>
): Promise<AppSettingsData> {
  const row = await prisma.appSettings.upsert({
    where: { id: 1 },
    update: patch,
    create: { id: 1, ...patch },
  });
  return {
    testEmailAddress: row.testEmailAddress,
    emailSubject: row.emailSubject,
    emailBodyHtml: row.emailBodyHtml,
    autoSendEmail: row.autoSendEmail,
  };
}
