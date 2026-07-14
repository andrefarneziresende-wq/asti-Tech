import { NextRequest, NextResponse, after } from "next/server";
import { createLead, listLeads } from "@/lib/leads-store";
import { createJob, updateJob, getJob } from "@/lib/jobs-store";
import { scanGeographicArea, estimateMonthlyCost, MAX_GEO_LEADS } from "@/lib/pipeline";
import { withTimeout } from "@/lib/timeout";

// Cada candidato pode envolver uma chamada de visão da Claude (fotos do
// Google Places), além das próprias chamadas de busca — plano Pro permite
// margem generosa acima dos 60s do Hobby.
export const maxDuration = 280;
const SCAN_TIMEOUT_MS = 260000;

async function runGeoScan(jobId: string, query: string) {
  await updateJob(jobId, { status: "processando" });

  const existing = await listLeads();
  const existingUrls = new Set(existing.map((lead) => lead.sourceUrl));
  let leadsCreated = 0;

  try {
    const result = await withTimeout(
      scanGeographicArea(query, {
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
            await updateJob(jobId, {}, `Já existe um lead para ${item.businessName}, pulando.`);
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
      "Tempo esgotado durante a varredura (mais de 4min)."
    );

    if (result.cancelled) {
      await updateJob(
        jobId,
        {},
        `Varredura cancelada: ${result.leadsCreated} lead(s) criado(s) de ${result.candidatesFound} comércio(s) encontrados antes do cancelamento.`
      );
      return;
    }

    await updateJob(
      jobId,
      { status: "concluido" },
      `Varredura concluída: ${result.leadsCreated} lead(s) criado(s) de ${result.candidatesFound} comércio(s) encontrados.${
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
  const query = typeof body?.query === "string" ? body.query.trim() : "";

  if (!query) {
    return NextResponse.json({ error: "Informe a busca (ex: restaurantes em Pirituba, São Paulo)." }, { status: 400 });
  }

  const job = await createJob({
    type: "geo",
    sourceUrl: query,
    message: "Job criado, aguardando início.",
  });

  after(() => runGeoScan(job.id, query));

  return NextResponse.json({ jobId: job.id, maxLeads: MAX_GEO_LEADS }, { status: 202 });
}
