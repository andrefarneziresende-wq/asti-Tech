import { NextRequest, NextResponse, after } from "next/server";
import { createLead, listLeads } from "@/lib/leads-store";
import { createJob, updateJob, getJob } from "@/lib/jobs-store";
import {
  scanGeographicArea,
  scanGeographicGrid,
  estimateMonthlyCost,
  MAX_GEO_LEADS_CAP,
  DEFAULT_GEO_LEADS,
  type ScanListingCallbacks,
  type GeoScanOptions,
  type SiteFilter,
} from "@/lib/pipeline";
import { buildSearchGrid, type GridCell } from "@/lib/geo-grid";
import { withTimeout } from "@/lib/timeout";

// Cada candidato pode envolver uma ou mais chamadas à Claude (visão +
// eventualmente visitar o site), além das buscas em grade — com Fluid
// Compute no plano Pro, o teto sobe pra 800s; usamos 600s (10min) de folga.
export const maxDuration = 600;
const SCAN_TIMEOUT_MS = 580000;

// Limite de células por varredura em grade, pra manter custo/tempo previsíveis.
const MAX_GRID_CELLS = 30;

const VALID_SITE_FILTERS: SiteFilter[] = ["sem_site", "com_site", "qualquer"];

async function runGeoScan(jobId: string, query: string, options: GeoScanOptions, cells?: GridCell[]) {
  await updateJob(jobId, { status: "processando" });

  const existing = await listLeads();
  const existingUrls = new Set(existing.map((lead) => lead.sourceUrl));
  let leadsCreated = 0;

  const callbacks: ScanListingCallbacks = {
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
  };

  try {
    const result = await withTimeout(
      cells && cells.length > 0
        ? scanGeographicGrid(query, cells, options, callbacks)
        : scanGeographicArea(query, options, callbacks),
      SCAN_TIMEOUT_MS,
      "Tempo esgotado durante a varredura (mais de 9min e meio)."
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
  const area = body?.area as { lat: number; lng: number; radiusMeters: number } | undefined;

  if (!query) {
    return NextResponse.json({ error: "Informe a busca (ex: restaurantes em Pirituba, São Paulo)." }, { status: 400 });
  }

  const siteFilter: SiteFilter = VALID_SITE_FILTERS.includes(body?.siteFilter) ? body.siteFilter : "sem_site";
  const requireEmail = body?.requireEmail === true;
  const onlyOutdatedSites = body?.onlyOutdatedSites === true;
  const excludeKeywords = Array.isArray(body?.excludeKeywords)
    ? body.excludeKeywords.filter((k: unknown): k is string => typeof k === "string" && k.trim().length > 0)
    : [];
  const maxLeads = Math.min(
    Math.max(Math.trunc(Number(body?.maxLeads) || DEFAULT_GEO_LEADS), 1),
    MAX_GEO_LEADS_CAP
  );
  const options: GeoScanOptions = { maxLeads, siteFilter, requireEmail, excludeKeywords, onlyOutdatedSites };

  let cells: GridCell[] | undefined;
  if (area && typeof area.lat === "number" && typeof area.lng === "number" && typeof area.radiusMeters === "number") {
    cells = buildSearchGrid({ lat: area.lat, lng: area.lng }, area.radiusMeters, 600, MAX_GRID_CELLS);
  }

  const job = await createJob({
    type: "geo",
    sourceUrl: cells ? `${query} (área desenhada no mapa, ${cells.length} célula(s))` : query,
    message: "Job criado, aguardando início.",
  });

  after(() => runGeoScan(job.id, query, options, cells));

  return NextResponse.json({ jobId: job.id, maxLeads, cells: cells?.length }, { status: 202 });
}
