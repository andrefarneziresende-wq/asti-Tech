import { NextRequest, NextResponse, after } from "next/server";
import { createLead, listLeads } from "@/lib/leads-store";
import { createJob, updateJob, getJob } from "@/lib/jobs-store";
import { scanListingUrl, estimateMonthlyCost, MAX_LISTING_LEADS } from "@/lib/pipeline";
import { assertPublicHttpUrl } from "@/lib/fetch-page";
import { withTimeout } from "@/lib/timeout";

// Processa até MAX_LISTING_LEADS anúncios em sequência (cada um com sua
// própria chamada à Claude); com Fluid Compute no plano Pro, o teto sobe
// pra 800s — usamos 600s (10min) de folga pra varreduras mais completas.
export const maxDuration = 600;

// Deixa uma margem antes do limite da função, pra garantir que o erro seja
// gravado no job antes da plataforma matar a execução sem aviso — importante
// quando o site de destino está fora do ar ou muito lento.
const SCAN_TIMEOUT_MS = 580000;

async function runListingScan(jobId: string, listingUrl: string) {
  await updateJob(jobId, { status: "processando" });

  const existing = await listLeads();
  const existingUrls = new Set(existing.map((lead) => lead.sourceUrl));
  let leadsCreated = 0;

  try {
    const result = await withTimeout(
      scanListingUrl(listingUrl, {
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
            businessDescription: item.businessDescription,
            logoUrl: item.logoUrl,
            brandColors: item.brandColors,
            estimatedMonthlyCost: estimateMonthlyCost(item),
          });
          existingUrls.add(item.sourceUrl);
          leadsCreated += 1;
          await updateJob(jobId, { leadsCreated });
        },
        shouldStop: async () => {
          const current = await getJob(jobId);
          return current?.status === "cancelado";
        },
      }),
      SCAN_TIMEOUT_MS,
      "Tempo esgotado durante a varredura (mais de 9min e meio). O site de destino pode estar fora do ar ou muito lento."
    );

    if (result.cancelled) {
      await updateJob(
        jobId,
        {},
        `Varredura cancelada: ${result.leadsCreated} lead(s) criado(s) de ${result.candidatesFound} link(s) encontrados antes do cancelamento.`
      );
      return;
    }

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
