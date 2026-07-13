import { NextRequest, NextResponse, after } from "next/server";
import { createLead, listLeads } from "@/lib/leads-store";
import { createJob, updateJob } from "@/lib/jobs-store";
import { scanListingUrl, estimateMonthlyCost, MAX_LISTING_LEADS } from "@/lib/pipeline";
import { assertPublicHttpUrl } from "@/lib/fetch-page";

export const maxDuration = 60;

async function runListingScan(jobId: string, listingUrl: string) {
  await updateJob(jobId, { status: "processando" });

  const existing = await listLeads();
  const existingUrls = new Set(existing.map((lead) => lead.sourceUrl));
  let leadsCreated = 0;

  try {
    const result = await scanListingUrl(listingUrl, {
      onProgress: async (message) => {
        await updateJob(jobId, {}, message);
      },
      onCandidatesFound: async (count) => {
        await updateJob(jobId, { candidatesFound: count });
      },
      onLinksSelected: async (count) => {
        await updateJob(jobId, { totalToProcess: count });
      },
      onLeadFound: async (item) => {
        if (existingUrls.has(item.sourceUrl)) {
          await updateJob(jobId, {}, `Já existe um lead para ${item.sourceUrl}, pulando.`);
          return;
        }
        await createLead({
          sourceUrl: item.sourceUrl,
          businessName: item.businessName,
          segment: item.segment,
          contactEmail: item.contactEmail,
          contactPhone: item.contactPhone,
          estimatedMonthlyCost: estimateMonthlyCost(item),
        });
        existingUrls.add(item.sourceUrl);
        leadsCreated += 1;
        await updateJob(jobId, { leadsCreated });
      },
    });

    await updateJob(
      jobId,
      { status: "concluido" },
      `Varredura concluída: ${result.leadsCreated} lead(s) criado(s) de ${result.candidatesFound} link(s) encontrados.${
        result.errors.length ? ` ${result.errors.length} falha(s).` : ""
      }`
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    await updateJob(jobId, { status: "erro", errorMessage: message }, `Erro: ${message}`);
  }
}

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  const listingUrl = typeof body?.listingUrl === "string" ? body.listingUrl.trim() : "";

  if (!listingUrl) {
    return NextResponse.json({ error: "Informe a URL da lista de anúncios." }, { status: 400 });
  }

  try {
    assertPublicHttpUrl(listingUrl);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : "URL inválida." },
      { status: 400 }
    );
  }

  const job = await createJob({
    type: "listing",
    sourceUrl: listingUrl,
    message: "Job criado, aguardando início.",
  });

  after(() => runListingScan(job.id, listingUrl));

  return NextResponse.json({ jobId: job.id, maxLeads: MAX_LISTING_LEADS }, { status: 202 });
}
