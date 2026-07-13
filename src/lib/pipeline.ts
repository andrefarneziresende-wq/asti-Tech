import type { Lead } from "./leads";
import { sendEmail } from "./mailer";
import { escapeHtml } from "./html";

function delay(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function slugify(input: string): string {
  return (
    input
      .toLowerCase()
      .normalize("NFD")
      .replace(new RegExp("[\\u0300-\\u036f]", "g"), "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") || "negocio"
  );
}

/**
 * Fase 2 (pendente): buscar o HTML da página informada e usar a API da Claude
 * para extrair nome do negócio, segmento e contato reais. Por enquanto, gera
 * um lead simulado a partir do domínio da URL só para demonstrar o fluxo do painel.
 */
export async function scanClassifiedUrl(
  sourceUrl: string
): Promise<Array<Pick<Lead, "sourceUrl" | "businessName" | "segment">>> {
  await delay(300);

  let hostname = "negocio-exemplo.com.br";
  try {
    hostname = new URL(sourceUrl).hostname.replace(/^www\./, "");
  } catch {
    // URL inválida: segue com o valor padrão simulado.
  }

  const businessName =
    hostname
      .split(".")[0]
      .split(/[-_]/)
      .filter(Boolean)
      .map((word) => word.charAt(0).toUpperCase() + word.slice(1))
      .join(" ") || "Negócio Encontrado";

  return [{ sourceUrl, businessName, segment: "Serviços locais" }];
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

export function suggestSiteIdeas(lead: Pick<Lead, "businessName">): string[] {
  return [
    `Página inicial com identidade visual própria para ${lead.businessName}`,
    "Botão de contato direto via WhatsApp em destaque",
    "Seção de depoimentos e avaliações de clientes",
    "Formulário de contato integrado por e-mail",
    "Otimização para aparecer no Google (SEO local)",
  ];
}

/**
 * Fase 2 (pendente): chamar a API da Claude (Messages API, requer ANTHROPIC_API_KEY)
 * para gerar o código-fonte completo do site a partir do nome/segmento do negócio.
 */
export async function generateSiteWithClaude(lead: Lead): Promise<{ ideas: string[] }> {
  await delay(400);
  return { ideas: suggestSiteIdeas(lead) };
}

/**
 * Fase 2 (pendente): usar a API do GitHub (Octokit, requer GITHUB_TOKEN e GITHUB_ORG)
 * para criar um repositório privado e commitar o código gerado.
 */
export async function publishToGithub(lead: Lead): Promise<string> {
  await delay(400);
  return `https://github.com/astitech-clientes/${slugify(lead.businessName)} (simulação — configurar GITHUB_TOKEN)`;
}

/** Fase 2 (pendente): disparar deploy real (ex: API da Vercel) do repositório gerado. */
export async function deployMockup(lead: Lead): Promise<string> {
  await delay(400);
  return `https://${slugify(lead.businessName)}.mockups.astitech.com.br (simulação)`;
}

function buildClientEmailHtml(lead: Lead): string {
  const ideas = (lead.siteIdeas ?? []).map((idea) => `<li>${escapeHtml(idea)}</li>`).join("");
  return `
    <div style="font-family: sans-serif; color: #111;">
      <p>Olá, ${escapeHtml(lead.businessName)}!</p>
      <p>Preparamos um mockup gratuito do site do seu negócio, feito com Inteligência Artificial:</p>
      <p><a href="${lead.mockupUrl ?? "#"}">${escapeHtml(lead.mockupUrl ?? "")}</a></p>
      <p>Algumas ideias para o seu site:</p>
      <ul>${ideas}</ul>
      <p>Custo mensal estimado (hospedagem + manutenção): <strong>R$ ${(lead.estimatedMonthlyCost ?? 0).toFixed(2)}</strong></p>
      <p>Gostou do que viu? É só responder este e-mail dizendo que tem interesse que damos continuidade ao projeto com você.</p>
      <p>— Equipe ASTI Tech</p>
    </div>
  `;
}

/**
 * Fase 2 (pendente): exige e-mail real do lead e RESEND_API_KEY configurada para
 * o envio acontecer de fato — sem isso, retorna sent: false com o motivo.
 */
export async function sendClientEmail(lead: Lead): Promise<{ sent: boolean; reason?: string }> {
  if (!lead.contactEmail) {
    return { sent: false, reason: "Lead sem e-mail de contato cadastrado." };
  }

  return sendEmail({
    to: lead.contactEmail,
    subject: `${lead.businessName}, preparamos um site para o seu negócio`,
    html: buildClientEmailHtml(lead),
  });
}
