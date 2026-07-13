import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { generateSiteWithClaude, estimateMonthlyCost, slugify } from "@/lib/pipeline";
import { withTimeout } from "@/lib/timeout";

// Etapa 1/3 do robô: gerar o mockup com a Claude (thinking em "high effort",
// pode levar bastante tempo sozinho). Cada etapa roda como uma requisição
// própria — assim nenhuma fica perto do limite de 60s da função, e o painel
// mostra em tempo real qual etapa está em andamento.
export const maxDuration = 60;
const STEP_TIMEOUT_MS = 55000;

function siteUrlFor(slug: string): string {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${slug}`;
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const lead = await getLead(id);

  if (!lead) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  if (lead.status === "cancelado") {
    return NextResponse.json({ lead, cancelled: true, done: true });
  }

  await updateLead(id, { status: "gerando_site" }, { label: "Gerando site com IA..." });

  try {
    const { ideas, html } = await withTimeout(
      generateSiteWithClaude(lead),
      STEP_TIMEOUT_MS,
      "Tempo esgotado gerando o site com a IA (mais de 55s). Tente rodar o robô de novo."
    );

    const estimatedMonthlyCost = lead.estimatedMonthlyCost ?? estimateMonthlyCost(lead);
    const slug = `${slugify(lead.businessName)}-${lead.id.slice(0, 6)}`;
    const mockupUrl = siteUrlFor(slug);

    const updated = await updateLead(
      id,
      { status: "publicando", siteIdeas: ideas, siteHtml: html, slug, estimatedMonthlyCost, mockupUrl },
      { label: "Site gerado, mockup publicado", detail: mockupUrl }
    );

    return NextResponse.json({ lead: updated, done: false, nextStep: "publish-github" });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    const failed = await updateLead(id, { status: "erro" }, { label: "Erro ao gerar o site", detail: message });
    return NextResponse.json({ error: message, lead: failed }, { status: 500 });
  }
}
