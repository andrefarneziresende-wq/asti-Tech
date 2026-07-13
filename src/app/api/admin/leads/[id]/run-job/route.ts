import { NextResponse, after } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import { getAppSettings } from "@/lib/settings";
import {
  generateSiteWithClaude,
  publishToGithub,
  sendClientEmail,
  estimateMonthlyCost,
  slugify,
} from "@/lib/pipeline";

// Gerar o site com a Claude + publicar no GitHub pode levar mais de um minuto.
// No plano gratuito da Vercel, 60s é o máximo permitido para uma função — em
// planos pagos (Pro+) dá pra aumentar esse valor se o job estiver estourando.
export const maxDuration = 60;

function siteUrlFor(slug: string): string {
  const base = process.env.SITE_URL ?? "http://localhost:3000";
  return `${base.replace(/\/$/, "")}/${slug}`;
}

async function runPipeline(id: string) {
  try {
    let lead = await getLead(id);
    if (!lead) return;

    const { ideas, html } = await generateSiteWithClaude(lead);
    const estimatedMonthlyCost = lead.estimatedMonthlyCost ?? estimateMonthlyCost(lead);
    const slug = `${slugify(lead.businessName)}-${lead.id.slice(0, 6)}`;
    const mockupUrl = siteUrlFor(slug);

    lead = (await updateLead(
      id,
      { status: "publicando", siteIdeas: ideas, siteHtml: html, slug, estimatedMonthlyCost, mockupUrl },
      { label: "Site gerado, publicando mockup", detail: mockupUrl }
    ))!;

    const { repoUrl } = await publishToGithub({ ...lead, slug, siteHtml: html });

    lead = (await updateLead(
      id,
      { githubRepoUrl: repoUrl },
      { label: "Código enviado ao GitHub", detail: repoUrl }
    ))!;

    const settings = await getAppSettings();

    if (!settings.autoSendEmail) {
      await updateLead(
        id,
        { status: "pronto_para_email" },
        { label: "Pronto para enviar e-mail (envio manual ativado)" }
      );
      return;
    }

    const emailResult = await sendClientEmail(lead);

    if (emailResult.sent) {
      await updateLead(id, { status: "email_enviado" }, { label: "E-mail enviado ao cliente", detail: lead.contactEmail });
    } else {
      await updateLead(id, {}, { label: "E-mail não enviado", detail: emailResult.reason });
    }
  } catch (err) {
    await updateLead(
      id,
      { status: "erro" },
      { label: "Erro no processo", detail: err instanceof Error ? err.message : String(err) }
    );
  }
}

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getLead(id);
  if (!existing) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  const queued = await updateLead(id, { status: "gerando_site" }, { label: "Robô iniciado" });

  // Responde na hora e continua o pipeline em segundo plano, sem bloquear a requisição.
  // Importante para quando as etapas reais (Claude/GitHub/deploy) demorarem mais do que
  // o tempo limite de uma requisição HTTP.
  after(() => runPipeline(id));

  return NextResponse.json({ lead: queued, queued: true }, { status: 202 });
}
