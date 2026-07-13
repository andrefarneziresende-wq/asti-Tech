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

/** Commita o mockup gerado no repositório do GitHub (branch dedicado a mockups). */
export async function publishToGithub(lead: Lead & { slug: string; siteHtml: string }): Promise<{
  repoUrl: string;
}> {
  const { repoUrl } = await publishMockup({ slug: lead.slug, htmlContent: lead.siteHtml });
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
