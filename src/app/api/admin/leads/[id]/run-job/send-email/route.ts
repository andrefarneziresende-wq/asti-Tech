import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { sendClientEmail } from "@/lib/pipeline";
import { withTimeout } from "@/lib/timeout";

// Etapa 3/3 do robô: enviar o e-mail ao cliente (só chamada quando o envio
// automático está ativado — no modo manual o lead já parou em
// "pronto_para_email" na etapa anterior).
export const maxDuration = 60;
const STEP_TIMEOUT_MS = 30000;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  if (lead.status === "cancelado") {
    return NextResponse.json({ lead, cancelled: true, done: true });
  }

  try {
    const emailResult = await withTimeout(
      sendClientEmail(lead),
      STEP_TIMEOUT_MS,
      "Tempo esgotado enviando o e-mail (mais de 30s)."
    );

    const updated = emailResult.sent
      ? await updateLead(
          id,
          { status: "email_enviado" },
          { label: "E-mail enviado ao cliente", detail: lead.contactEmail }
        )
      : await updateLead(id, {}, { label: "E-mail não enviado", detail: emailResult.reason });

    return NextResponse.json({ lead: updated, done: true });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateLead(id, { status: "erro" }, { label: "Erro ao enviar o e-mail", detail: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
