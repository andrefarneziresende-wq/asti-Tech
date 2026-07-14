import type { Lead } from "./leads";
import { sendEmail } from "./mailer";
import { generateSiteContent, extractBusinessInfo, selectListingLinks, analyzeBrandImages } from "./claude";
import { publishMockup } from "./github";
import {
  fetchPageHtml,
  assertPublicHttpUrl,
  htmlToText,
  extractSameOriginLinks,
  extractImageUrls,
} from "./fetch-page";
import { withBrowser, renderPageHtml } from "./browser";
import { searchPlacesByText, resolvePlacePhotoUrl, segmentFromTypes, type PlaceResult } from "./places";
import { getAppSettings } from "./settings";
import { DEFAULT_EMAIL_SUBJECT, DEFAULT_EMAIL_BODY_HTML, renderEmailTemplate } from "./email-template";

export function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "negocio"
  );
}

type ScannedLead = Pick<
  Lead,
  | "sourceUrl"
  | "businessName"
  | "segment"
  | "contactEmail"
  | "contactPhone"
  | "businessDescription"
  | "logoUrl"
  | "brandColors"
>;

/**
 * Extrai os dados do negócio a partir do HTML de uma página de anúncio já
 * renderizada, e tenta identificar a logo/paleta de cores reais a partir das
 * fotos do anúncio (via visão da Claude) — usados depois pra gerar um site
 * fiel à identidade visual do negócio, em vez de um template genérico.
 */
async function analyzeAdPage(html: string, sourceUrl: string): Promise<ScannedLead> {
  const pageText = htmlToText(html).slice(0, 15000);
  const info = await extractBusinessInfo(pageText, sourceUrl);
  const businessName = info.businessName || "Negócio sem nome identificado";

  const imageUrls = extractImageUrls(html, sourceUrl);
  const brand = await analyzeBrandImages(imageUrls, businessName);

  return {
    sourceUrl,
    businessName,
    segment: info.segment || undefined,
    contactEmail: info.contactEmail || undefined,
    contactPhone: info.contactPhone || undefined,
    businessDescription: info.description || undefined,
    // Só aceita a logo se a Claude devolveu exatamente uma das URLs que
    // enviamos — evita salvar uma URL inventada/alterada.
    logoUrl: brand.logoUrl && imageUrls.includes(brand.logoUrl) ? brand.logoUrl : undefined,
    brandColors: brand.colors.length ? brand.colors : undefined,
  };
}

/** Busca a página do anúncio e usa a Claude para extrair os dados do negócio anunciado. */
export async function scanClassifiedUrl(sourceUrl: string): Promise<ScannedLead[]> {
  const html = await fetchPageHtml(sourceUrl);
  return [await analyzeAdPage(html, sourceUrl)];
}

// Limite conservador: cada anúncio precisa renderizar a página num navegador
// real + chamar a Claude, e no plano gratuito da Vercel uma função tem no
// máximo 60s. Em planos pagos (Pro+), dá pra aumentar tanto isso quanto o
// maxDuration da rota se quiser processar mais anúncios por varredura.
export const MAX_LISTING_LEADS = 5;

export interface ScanListingCallbacks {
  onProgress?: (message: string) => Promise<void> | void;
  onCandidatesFound?: (count: number) => Promise<void> | void;
  onLinksSelected?: (count: number) => Promise<void> | void;
  onLeadFound: (lead: ScannedLead) => Promise<void>;
  /** Checado antes de cada anúncio; se retornar true, a varredura para nesse ponto. */
  shouldStop?: () => Promise<boolean>;
}

/**
 * Busca uma página de listagem/categoria, identifica (via Claude) até
 * MAX_LISTING_LEADS links que parecem anúncios individuais, e extrai os
 * dados de cada um. Reaproveita um único navegador para todas as páginas
 * dessa varredura. `onLeadFound` é chamado a cada anúncio processado com
 * sucesso, para o chamador decidir como persistir (ex: criar o lead,
 * pulando duplicatas); os demais callbacks são opcionais, para acompanhar o
 * progresso (ex: gravar num log de job).
 */
export async function scanListingUrl(
  listingUrl: string,
  callbacks: ScanListingCallbacks
): Promise<{ candidatesFound: number; leadsCreated: number; errors: string[]; cancelled: boolean }> {
  const url = assertPublicHttpUrl(listingUrl);

  return withBrowser(async (browser) => {
    await callbacks.onProgress?.("Abrindo a página de listagem...");
    const listingHtml = await renderPageHtml(browser, url.toString());
    const candidateLinks = extractSameOriginLinks(listingHtml, listingUrl);

    if (candidateLinks.length === 0) {
      throw new Error("Nenhum link encontrado nessa página.");
    }

    await callbacks.onCandidatesFound?.(candidateLinks.length);
    await callbacks.onProgress?.(
      `${candidateLinks.length} links encontrados. Pedindo pra Claude identificar quais são anúncios...`
    );

    const selected = await selectListingLinks(candidateLinks, listingUrl, MAX_LISTING_LEADS);
    await callbacks.onLinksSelected?.(selected.length);
    await callbacks.onProgress?.(`${selected.length} anúncios selecionados para processar.`);

    let leadsCreated = 0;
    const errors: string[] = [];

    for (const [index, adUrl] of selected.entries()) {
      if (await callbacks.shouldStop?.()) {
        await callbacks.onProgress?.("Varredura cancelada pelo usuário.");
        return { candidatesFound: candidateLinks.length, leadsCreated, errors, cancelled: true };
      }

      await callbacks.onProgress?.(`Processando anúncio ${index + 1}/${selected.length}: ${adUrl}`);
      try {
        const adHtml = await renderPageHtml(browser, adUrl);
        const scanned = await analyzeAdPage(adHtml, adUrl);
        await callbacks.onLeadFound(scanned);
        leadsCreated += 1;
        await callbacks.onProgress?.(`Lead criado: ${scanned.businessName}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        errors.push(`${adUrl}: ${message}`);
        await callbacks.onProgress?.(`Falha em ${adUrl}: ${message}`);
      }
    }

    return { candidatesFound: candidateLinks.length, leadsCreated, errors, cancelled: false };
  });
}

// Teto de segurança pro número de leads por varredura — cada candidato pode
// envolver uma ou mais chamadas à Claude (visão + eventualmente visitar o
// site), mantendo custo e tempo de execução previsíveis.
export const MAX_GEO_LEADS_CAP = 20;
export const DEFAULT_GEO_LEADS = 5;

export type SiteFilter = "sem_site" | "com_site" | "qualquer";

export interface GeoScanOptions {
  /** Quantos leads criar no máximo por varredura (1 a MAX_GEO_LEADS_CAP). */
  maxLeads?: number;
  /** Filtra comércios sem site (padrão, alvo do serviço principal), com site (leads de redesign), ou qualquer um. */
  siteFilter?: SiteFilter;
  /** Se true, só cria o lead quando conseguir achar um e-mail de contato (visitando o site, quando houver). */
  requireEmail?: boolean;
}

function resolveGeoOptions(options: GeoScanOptions): Required<GeoScanOptions> {
  return {
    maxLeads: Math.min(Math.max(Math.trunc(options.maxLeads ?? DEFAULT_GEO_LEADS), 1), MAX_GEO_LEADS_CAP),
    siteFilter: options.siteFilter ?? "sem_site",
    requireEmail: options.requireEmail ?? false,
  };
}

function passesSiteFilter(place: PlaceResult, siteFilter: SiteFilter): boolean {
  if (siteFilter === "sem_site") return !place.websiteUri;
  if (siteFilter === "com_site") return Boolean(place.websiteUri);
  return true;
}

/** Visita o site já cadastrado do comércio pra tentar achar e-mail, descrição e identidade visual reais. */
async function enrichFromWebsite(websiteUrl: string, businessName: string): Promise<Partial<ScannedLead>> {
  try {
    const html = await fetchPageHtml(websiteUrl);
    const pageText = htmlToText(html).slice(0, 15000);
    const info = await extractBusinessInfo(pageText, websiteUrl);
    const imageUrls = extractImageUrls(html, websiteUrl);
    const brand = await analyzeBrandImages(imageUrls, businessName);

    return {
      contactEmail: info.contactEmail || undefined,
      businessDescription: info.description || undefined,
      logoUrl: brand.logoUrl && imageUrls.includes(brand.logoUrl) ? brand.logoUrl : undefined,
      brandColors: brand.colors.length ? brand.colors : undefined,
    };
  } catch {
    // Site fora do ar, bloqueando o robô, etc. — segue sem esses dados extras.
    return {};
  }
}

/**
 * Converte um resultado do Places num ScannedLead. Quando o comércio já tem
 * site, visita esse site pra tentar achar e-mail/descrição/identidade visual
 * reais; sem site (ou se o site não render nada útil), tenta identificar
 * logo/cores a partir das fotos cadastradas no Google Places. Devolve `null`
 * quando `requireEmail` está ativo e nenhum e-mail foi encontrado — sinal
 * pro chamador pular esse candidato sem contar como erro.
 */
async function placeToScannedLead(
  place: PlaceResult,
  options: Required<GeoScanOptions>
): Promise<ScannedLead | null> {
  const enriched = place.websiteUri ? await enrichFromWebsite(place.websiteUri, place.displayName) : {};

  if (options.requireEmail && !enriched.contactEmail) {
    return null;
  }

  let logoUrl = enriched.logoUrl;
  let brandColors = enriched.brandColors;

  if (!logoUrl && !brandColors?.length) {
    const photoUrls = (
      await Promise.all(place.photoNames.slice(0, 4).map((name) => resolvePlacePhotoUrl(name)))
    ).filter((url): url is string => Boolean(url));
    const brand = await analyzeBrandImages(photoUrls, place.displayName);
    logoUrl = brand.logoUrl && photoUrls.includes(brand.logoUrl) ? brand.logoUrl : undefined;
    brandColors = brand.colors.length ? brand.colors : undefined;
  }

  const descriptionParts = [
    place.formattedAddress,
    place.rating ? `avaliação ${place.rating}/5 (${place.userRatingCount ?? 0} avaliações no Google)` : undefined,
  ].filter(Boolean);

  return {
    sourceUrl: place.websiteUri || `https://www.google.com/maps/place/?q=place_id:${place.id}`,
    businessName: place.displayName,
    segment: segmentFromTypes(place.types),
    contactEmail: enriched.contactEmail,
    contactPhone: place.nationalPhoneNumber || undefined,
    businessDescription:
      enriched.businessDescription || (descriptionParts.length ? descriptionParts.join(" — ") : undefined),
    logoUrl,
    brandColors,
  };
}

/** Processa candidatos do Places em sequência até atingir maxLeads, chamando onLeadFound pra cada um aceito. */
async function processPlaceCandidates(
  candidates: PlaceResult[],
  totalFound: number,
  options: Required<GeoScanOptions>,
  callbacks: ScanListingCallbacks
): Promise<{ candidatesFound: number; leadsCreated: number; errors: string[]; cancelled: boolean }> {
  let leadsCreated = 0;
  const errors: string[] = [];

  for (const [index, place] of candidates.entries()) {
    if (leadsCreated >= options.maxLeads) break;

    if (await callbacks.shouldStop?.()) {
      await callbacks.onProgress?.("Varredura cancelada pelo usuário.");
      return { candidatesFound: totalFound, leadsCreated, errors, cancelled: true };
    }

    await callbacks.onProgress?.(`Processando ${index + 1}/${candidates.length}: ${place.displayName}`);
    try {
      const scanned = await placeToScannedLead(place, options);
      if (!scanned) {
        await callbacks.onProgress?.(`Pulado (sem e-mail encontrado): ${place.displayName}`);
        continue;
      }
      await callbacks.onLeadFound(scanned);
      leadsCreated += 1;
      await callbacks.onProgress?.(`Lead criado: ${scanned.businessName}`);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      errors.push(`${place.displayName}: ${message}`);
      await callbacks.onProgress?.(`Falha em ${place.displayName}: ${message}`);
    }
  }

  return { candidatesFound: totalFound, leadsCreated, errors, cancelled: false };
}

/**
 * Busca comércios de verdade numa região via Google Places (texto livre, ex:
 * "restaurantes em Pirituba, São Paulo"). Por padrão filtra só os que NÃO têm
 * site cadastrado no Google (o alvo ideal da ASTI Tech), mas isso é
 * configurável via `options` — inclusive pra achar leads de redesign (quem
 * já tem site) e/ou exigir e-mail de contato encontrado.
 */
export async function scanGeographicArea(
  query: string,
  options: GeoScanOptions,
  callbacks: ScanListingCallbacks
): Promise<{ candidatesFound: number; leadsCreated: number; errors: string[]; cancelled: boolean }> {
  const resolved = resolveGeoOptions(options);
  await callbacks.onProgress?.(`Buscando comércios no Google Places: "${query}"...`);

  // Quando precisa de e-mail, vários candidatos podem ser descartados por
  // não ter um — busca mais páginas de antemão pra ter candidatos de sobra.
  const targetPoolSize = resolved.requireEmail ? resolved.maxLeads * 4 : resolved.maxLeads;

  const candidates: PlaceResult[] = [];
  let totalFound = 0;
  let pageToken: string | undefined;

  for (let page = 0; page < 3 && candidates.length < targetPoolSize; page += 1) {
    const { places, nextPageToken } = await searchPlacesByText(query, pageToken);
    totalFound += places.length;
    candidates.push(...places.filter((p) => passesSiteFilter(p, resolved.siteFilter)));
    if (!nextPageToken) break;
    pageToken = nextPageToken;
    // A API do Places exige uma pequena espera antes do pageToken ficar válido.
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  if (totalFound === 0) {
    throw new Error("Nenhum comércio encontrado pra essa busca.");
  }

  await callbacks.onCandidatesFound?.(totalFound);
  await callbacks.onLinksSelected?.(Math.min(candidates.length, resolved.maxLeads));
  await callbacks.onProgress?.(
    `${totalFound} comércio(s) encontrado(s), ${candidates.length} correspondem ao filtro. Processando até ${resolved.maxLeads}.`
  );

  return processPlaceCandidates(candidates, totalFound, resolved, callbacks);
}

/**
 * Igual a scanGeographicArea, mas cobrindo uma área desenhada no mapa: em vez
 * de uma única busca por texto, roda uma busca por célula da grade (cada uma
 * com viés de localização pro seu pedaço da área), deduplicando os comércios
 * encontrados entre células vizinhas por place ID antes de filtrar/processar.
 */
export async function scanGeographicGrid(
  query: string,
  cells: { lat: number; lng: number; radiusMeters: number }[],
  options: GeoScanOptions,
  callbacks: ScanListingCallbacks
): Promise<{ candidatesFound: number; leadsCreated: number; errors: string[]; cancelled: boolean }> {
  const resolved = resolveGeoOptions(options);
  await callbacks.onProgress?.(`Buscando comércios no Google Places em ${cells.length} célula(s) da área...`);

  const seen = new Map<string, PlaceResult>();
  let totalFound = 0;

  for (const [index, cell] of cells.entries()) {
    if (await callbacks.shouldStop?.()) {
      await callbacks.onProgress?.("Varredura cancelada pelo usuário.");
      return { candidatesFound: totalFound, leadsCreated: 0, errors: [], cancelled: true };
    }

    await callbacks.onProgress?.(`Buscando célula ${index + 1}/${cells.length}...`);
    try {
      const { places } = await searchPlacesByText(query, undefined, cell);
      totalFound += places.length;
      for (const place of places) {
        if (passesSiteFilter(place, resolved.siteFilter)) seen.set(place.id, place);
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      await callbacks.onProgress?.(`Falha na célula ${index + 1}: ${message}`);
    }
  }

  if (totalFound === 0) {
    throw new Error("Nenhum comércio encontrado nessa área.");
  }

  await callbacks.onCandidatesFound?.(totalFound);

  const candidates = Array.from(seen.values());
  await callbacks.onLinksSelected?.(Math.min(candidates.length, resolved.maxLeads));
  await callbacks.onProgress?.(
    `${totalFound} comércio(s) encontrado(s) na área, ${candidates.length} correspondem ao filtro. Processando até ${resolved.maxLeads}.`
  );

  return processPlaceCandidates(candidates, totalFound, resolved, callbacks);
}

const SEGMENT_MONTHLY_EXTRA: Record<string, number> = {
  "e-commerce": 120,
  restaurante: 40,
  "serviços locais": 20,
  saúde: 60,
  educação: 30,
};

/** Fase 1: heurística de ponto de partida para a estimativa — deve ser refinada com dados reais de custo. */
export function estimateMonthlyCost(lead: Pick<Lead, "segment">): number {
  const base = 89;
  const extra = lead.segment ? SEGMENT_MONTHLY_EXTRA[lead.segment.toLowerCase()] ?? 20 : 20;
  return base + extra;
}

/** Gera o mockup (HTML) e as ideias de conteúdo do site via API da Claude. */
export async function generateSiteWithClaude(
  lead: Lead
): Promise<{ ideas: string[]; html: string }> {
  const { siteIdeas, html } = await generateSiteContent(lead);
  return { ideas: siteIdeas, html };
}

/**
 * Monta o CLAUDE.md com o contexto do negócio, salvo junto do mockup — se o
 * cliente aceitar a proposta, quem continuar o desenvolvimento (inclusive
 * via Claude Code) já parte com o contexto do negócio, sem precisar
 * reconstruir do zero a partir do anúncio original.
 */
function buildProjectClaudeMd(lead: Lead): string {
  const lines = [
    `# ${lead.businessName} — site institucional`,
    "",
    "Mockup gerado automaticamente pela ASTI Tech a partir de um anúncio classificado, como proposta comercial pro cliente. `index.html` é um HTML autocontido de página única, com CSS inline — sem backend, sem formulário funcional, com placeholders de contato. Antes de evoluir o projeto, confirme com o cliente o que ele aceitou e quais próximos passos ele quer (múltiplas páginas? formulário de contato de verdade? CMS? domínio próprio?).",
    "",
    "## Sobre o negócio",
    `- Segmento: ${lead.segment ?? "não informado"}`,
    `- Anúncio de origem: ${lead.sourceUrl}`,
    `- Contato informado: ${lead.contactEmail ?? "—"} / ${lead.contactPhone ?? "—"}`,
    `- Custo mensal estimado (proposta ASTI Tech): R$ ${lead.estimatedMonthlyCost?.toFixed(2) ?? "—"}`,
  ];

  if (lead.businessDescription) {
    lines.push("", "## Detalhes extraídos do anúncio", lead.businessDescription);
  }

  lines.push(
    "",
    "## Identidade visual usada no mockup",
    lead.brandColors?.length
      ? `- Cores de marca reais (extraídas das fotos do anúncio): ${lead.brandColors.join(", ")}`
      : "- Nenhuma cor de marca real identificada no anúncio — paleta escolhida por segmento.",
    lead.logoUrl
      ? `- Logo real identificada: ${lead.logoUrl}`
      : "- Nenhuma logo real identificada no anúncio."
  );

  if (lead.siteIdeas?.length) {
    lines.push("", "## Ideias de conteúdo sugeridas", ...lead.siteIdeas.map((idea) => `- ${idea}`));
  }

  return lines.join("\n") + "\n";
}

/** Commita o mockup gerado no repositório do GitHub (branch dedicado a mockups), junto com um CLAUDE.md de contexto. */
export async function publishToGithub(lead: Lead & { slug: string; siteHtml: string }): Promise<{
  repoUrl: string;
}> {
  const { repoUrl } = await publishMockup({
    slug: lead.slug,
    htmlContent: lead.siteHtml,
    claudeMd: buildProjectClaudeMd(lead),
  });
  return { repoUrl };
}

/**
 * Manda o e-mail ao cliente usando o template configurável em /admin/email.
 * Se o modo de teste estiver ativado, o e-mail vai para o endereço de teste
 * em vez do e-mail real do lead. Exige ZOHO_SMTP_USER/ZOHO_SMTP_PASS
 * configuradas para o envio acontecer de fato — sem isso, retorna sent:
 * false com o motivo.
 */
export async function sendClientEmail(lead: Lead): Promise<{ sent: boolean; reason?: string }> {
  const settings = await getAppSettings();
  const recipient = settings.testEmailAddress || lead.contactEmail;

  if (!recipient) {
    return { sent: false, reason: "Lead sem e-mail de contato cadastrado." };
  }

  const { subject, html } = renderEmailTemplate(
    {
      subject: settings.emailSubject ?? DEFAULT_EMAIL_SUBJECT,
      bodyHtml: settings.emailBodyHtml ?? DEFAULT_EMAIL_BODY_HTML,
    },
    {
      businessName: lead.businessName,
      segment: lead.segment,
      mockupUrl: lead.mockupUrl,
      estimatedMonthlyCost: lead.estimatedMonthlyCost,
      siteIdeas: lead.siteIdeas,
    }
  );

  const result = await sendEmail({ to: recipient, subject, html });

  if (settings.testEmailAddress) {
    return {
      sent: result.sent,
      reason: result.sent
        ? `Modo de teste: enviado para ${settings.testEmailAddress} em vez do e-mail do lead.`
        : result.reason,
    };
  }

  return result;
}
