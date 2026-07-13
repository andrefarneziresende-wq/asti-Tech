import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { getAppSettings } from "@/lib/settings";
import { publishToGithub } from "@/lib/pipeline";
import { withTimeout } from "@/lib/timeout";

// Etapa 2/3 do robô: criar o repositório no GitHub e commitar o mockup.
export const maxDuration = 60;
const STEP_TIMEOUT_MS = 55000;

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  if (lead.status === "cancelado") {
    return NextResponse.json({ lead, cancelled: true, done: true });
  }

  if (!lead.slug || !lead.siteHtml) {
    return NextResponse.json(
      { error: "O site ainda não foi gerado para esse lead. Rode a etapa de geração primeiro." },
      { status: 400 }
    );
  }

  try {
    const { repoUrl } = await withTimeout(
      publishToGithub({ ...lead, slug: lead.slug, siteHtml: lead.siteHtml }),
      STEP_TIMEOUT_MS,
      "Tempo esgotado publicando no GitHub (mais de 55s). Tente rodar essa etapa de novo."
    );

    const updated = await updateLead(
      id,
      { githubRepoUrl: repoUrl },
      { label: "Código enviado ao GitHub", detail: repoUrl }
    );

    const settings = await getAppSettings();

    if (!settings.autoSendEmail) {
      const finished = await updateLead(
        id,
        { status: "pronto_para_email" },
        { label: "Pronto para enviar e-mail (envio manual ativado)" }
      );
      return NextResponse.json({ lead: finished, done: true });
    }

    return NextResponse.json({ lead: updated, done: false, nextStep: "send-email" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateLead(id, { status: "erro" }, { label: "Erro ao publicar no GitHub", detail: message });
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
