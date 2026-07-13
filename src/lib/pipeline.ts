import type { Lead } from "./leads";
import { sendEmail } from "./mailer";
import { generateSiteContent, extractBusinessInfo, selectListingLinks } from "./claude";
import { createSiteRepo } from "./github";
import { fetchPageText, fetchPageHtml, extractSameOriginLinks } from "./fetch-page";
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

/** Busca a página do anúncio e usa a Claude para extrair os dados do negócio anunciado. */
export async function scanClassifiedUrl(
  sourceUrl: string
): Promise<Array<Pick<Lead, "sourceUrl" | "businessName" | "segment" | "contactEmail" | "contactPhone">>> {
  const pageText = await fetchPageText(sourceUrl);
  const info = await extractBusinessInfo(pageText, sourceUrl);

  return [
    {
      sourceUrl,
      businessName: info.businessName || "Negócio sem nome identificado",
      segment: info.segment || undefined,
      contactEmail: info.contactEmail || undefined,
      contactPhone: info.contactPhone || undefined,
    },
  ];
}

export const MAX_LISTING_LEADS = 10;

type ScannedLead = Pick<
  Lead,
  "sourceUrl" | "businessName" | "segment" | "contactEmail" | "contactPhone"
>;

/**
 * Busca uma página de listagem/categoria, identifica (via Claude) até
 * MAX_LISTING_LEADS links que parecem anúncios individuais, e extrai os
 * dados de cada um. `onLeadFound` é chamado a cada anúncio processado com
 * sucesso, para o chamador decidir como persistir (ex: criar o lead,
 * pulando duplicatas).
 */
export async function scanListingUrl(
  listingUrl: string,
  onLeadFound: (lead: ScannedLead) => Promise<void>
): Promise<{ candidatesFound: number; leadsCreated: number; errors: string[] }> {
  const html = await fetchPageHtml(listingUrl);
  const candidateLinks = extractSameOriginLinks(html, listingUrl);

  if (candidateLinks.length === 0) {
    throw new Error("Nenhum link encontrado nessa página.");
  }

  const selected = await selectListingLinks(candidateLinks, listingUrl, MAX_LISTING_LEADS);

  let leadsCreated = 0;
  const errors: string[] = [];

  for (const adUrl of selected) {
    try {
      const pageText = await fetchPageText(adUrl);
      const info = await extractBusinessInfo(pageText, adUrl);
      await onLeadFound({
        sourceUrl: adUrl,
        businessName: info.businessName || "Negócio sem nome identificado",
        segment: info.segment || undefined,
        contactEmail: info.contactEmail || undefined,
        contactPhone: info.contactPhone || undefined,
      });
      leadsCreated += 1;
    } catch (err) {
      errors.push(`${adUrl}: ${err instanceof Error ? err.message : String(err)}`);
    }
  }

  return { candidatesFound: candidateLinks.length, leadsCreated, errors };
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

/** Cria um repositório privado no GitHub e commita o mockup gerado. */
export async function publishToGithub(lead: Lead & { slug: string; siteHtml: string }): Promise<{
  repoUrl: string;
}> {
  const { repoUrl } = await createSiteRepo({
    slug: lead.slug,
    description: `Mockup do site de ${lead.businessName}, gerado pela ASTI Tech.`,
    htmlContent: lead.siteHtml,
  });
  return { repoUrl };
}

/**
 * Manda o e-mail ao cliente usando o template configurável em /admin/email.
 * Se o modo de teste estiver ativado, o e-mail vai para o endereço de teste
 * em vez do e-mail real do lead. Exige RESEND_API_KEY configurada para o
 * envio acontecer de fato — sem isso, retorna sent: false com o motivo.
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
