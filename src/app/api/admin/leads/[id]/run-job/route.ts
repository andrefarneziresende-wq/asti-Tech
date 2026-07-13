import { NextResponse } from "next/server";
import { getLead, updateLead } from "@/lib/leads-store";
import {
  generateSiteWithClaude,
  publishToGithub,
  deployMockup,
  sendClientEmail,
  estimateMonthlyCost,
} from "@/lib/pipeline";

export async function POST(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const existing = await getLead(id);
  if (!existing) {
    return NextResponse.json({ error: "Lead não encontrado." }, { status: 404 });
  }

  try {
    let lead = (await updateLead(id, { status: "gerando_site" }, { label: "Gerando site com IA" }))!;

    const { ideas } = await generateSiteWithClaude(lead);
    const estimatedMonthlyCost = lead.estimatedMonthlyCost ?? estimateMonthlyCost(lead);

    lead = (await updateLead(
      id,
      { status: "publicando", siteIdeas: ideas, estimatedMonthlyCost },
      { label: "Site gerado, publicando mockup" }
    ))!;

    const githubRepoUrl = await publishToGithub(lead);
    const mockupUrl = await deployMockup(lead);

    lead = (await updateLead(
      id,
      { githubRepoUrl, mockupUrl },
      { label: "Mockup publicado e código enviado ao GitHub", detail: mockupUrl }
    ))!;

    const emailResult = await sendClientEmail(lead);

    lead = emailResult.sent
      ? (await updateLead(id, { status: "email_enviado" }, { label: "E-mail enviado ao cliente", detail: lead.contactEmail }))!
      : (await updateLead(id, {}, { label: "E-mail não enviado", detail: emailResult.reason }))!;

    return NextResponse.json({ lead });
  } catch (err) {
    await updateLead(
      id,
      { status: "erro" },
      { label: "Erro no processo", detail: err instanceof Error ? err.message : String(err) }
    );
    return NextResponse.json({ error: "Falha ao rodar o robô." }, { status: 500 });
  }
}
