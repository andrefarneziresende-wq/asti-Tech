import { NextRequest, NextResponse } from "next/server";
import { getAppSettings, updateAppSettings, type AppSettingsData } from "@/lib/settings";

export async function GET() {
  const settings = await getAppSettings();
  return NextResponse.json(settings);
}

export async function PATCH(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const patch: Partial<AppSettingsData> = {};
  if ("testEmailAddress" in body) {
    patch.testEmailAddress =
      typeof body.testEmailAddress === "string" && body.testEmailAddress.trim()
        ? body.testEmailAddress.trim()
        : null;
  }
  if ("emailSubject" in body) {
    patch.emailSubject = typeof body.emailSubject === "string" ? body.emailSubject : null;
  }
  if ("emailBodyHtml" in body) {
    patch.emailBodyHtml = typeof body.emailBodyHtml === "string" ? body.emailBodyHtml : null;
  }
  if ("autoSendEmail" in body) {
    patch.autoSendEmail = Boolean(body.autoSendEmail);
  }

  const settings = await updateAppSettings(patch);
  return NextResponse.json(settings);
}
