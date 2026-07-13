import { NextRequest, NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { sendClientEmail } from "@/lib/pipeline";

export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const leadIds = Array.isArray(body?.leadIds)
    ? body.leadIds.filter((id: unknown): id is string => typeof id === "string")
    : [];

  if (leadIds.length === 0) {
    return NextResponse.json({ error: "Selecione ao menos um lead." }, { status: 400 });
  }

  const results: Array<{ id: string; sent: boolean; reason?: string }> = [];

  for (const id of leadIds) {
    const lead = await getLead(id);
    if (!lead) {
      results.push({ id, sent: false, reason: "Lead não encontrado." });
      continue;
    }

    const emailResult = await sendClientEmail(lead);

    if (emailResult.sent) {
      await updateLead(
        id,
        { status: "email_enviado" },
        { label: "E-mail enviado ao cliente (envio em lote)", detail: lead.contactEmail }
      );
    } else {
      await updateLead(
        id,
        {},
        { label: "E-mail não enviado (envio em lote)", detail: emailResult.reason }
      );
    }

    results.push({ id, sent: emailResult.sent, reason: emailResult.reason });
  }

  return NextResponse.json({ results });
}
