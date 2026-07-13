import Anthropic from "@anthropic-ai/sdk";
import type { Lead } from "./leads";

const client = new Anthropic();

export interface GeneratedSite {
  siteIdeas: string[];
  html: string;
}

const OUTPUT_SCHEMA = {
  type: "object",
  properties: {
    siteIdeas: { type: "array", items: { type: "string" } },
    html: { type: "string" },
  },
  required: ["siteIdeas", "html"],
  additionalProperties: false,
} as const;

/**
 * Gera um mockup de site institucional (HTML autocontido) e ideias de conteúdo
 * para o negócio do lead, usando a API da Claude.
 */
export async function generateSiteContent(
  lead: Pick<Lead, "businessName" | "segment">
): Promise<GeneratedSite> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "high",
      format: { type: "json_schema", schema: OUTPUT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Você é um designer/desenvolvedor web. Crie um mockup de site institucional de uma única página (HTML autocontido — CSS inline em uma tag <style>, sem dependências externas, responsivo, visual moderno) para o negócio abaixo, além de 5 ideias de conteúdo para esse site.

Negócio: ${lead.businessName}
Segmento: ${lead.segment ?? "não informado"}

O HTML deve ter: cabeçalho com o nome do negócio, uma seção principal (hero) convincente, 3-4 seções relevantes ao segmento (ex: serviços, sobre, diferenciais/depoimentos, contato) e rodapé. Use uma paleta de cores condizente com o segmento. Não invente dados de contato reais — use placeholders claros como "[telefone]" e "[e-mail]".`,
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("A Claude recusou gerar o conteúdo para esse lead.");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock) {
    throw new Error("A Claude não retornou conteúdo de texto.");
  }

  const parsed = JSON.parse(textBlock.text) as GeneratedSite;
  return parsed;
}

export interface ExtractedBusinessInfo {
  businessName: string;
  segment: string;
  contactEmail: string;
  contactPhone: string;
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    segment: { type: "string" },
    contactEmail: { type: "string" },
    contactPhone: { type: "string" },
  },
  required: ["businessName", "segment", "contactEmail", "contactPhone"],
  additionalProperties: false,
} as const;

/**
 * Analisa o texto de uma página de anúncio/classificado e extrai os dados do
 * negócio anunciado, usando a API da Claude.
 */
export async function extractBusinessInfo(
  pageText: string,
  sourceUrl: string
): Promise<ExtractedBusinessInfo> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: EXTRACT_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Abaixo está o texto extraído de uma página de anúncio classificado (URL de origem: ${sourceUrl}). Extraia as informações do negócio anunciado: nome do negócio, segmento/ramo de atuação, e-mail de contato e telefone de contato. Se alguma informação não estiver presente no texto, deixe o campo correspondente como string vazia. Não invente informações que não estejam no texto.

---
${pageText}
---`,
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("A Claude recusou processar essa página.");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock) {
    throw new Error("A Claude não retornou conteúdo de texto.");
  }

  return JSON.parse(textBlock.text) as ExtractedBusinessInfo;
}

const LISTING_LINKS_SCHEMA = {
  type: "object",
  properties: {
    urls: { type: "array", items: { type: "string" } },
  },
  required: ["urls"],
  additionalProperties: false,
} as const;

/**
 * Dada uma lista de URLs encontradas numa página de listagem/categoria, pede
 * pra Claude identificar quais parecem ser páginas de detalhe de um anúncio
 * individual (e não paginação, categorias, login, redes sociais etc).
 */
export async function selectListingLinks(
  candidateUrls: string[],
  listingUrl: string,
  max = 10
): Promise<string[]> {
  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1500,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: LISTING_LINKS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: `Esta é uma lista de URLs encontradas numa página de listagem de anúncios classificados (URL de origem: ${listingUrl}). Identifique quais dessas URLs provavelmente são páginas de detalhe de um anúncio individual (não são página de categoria, paginação, "sobre", "contato", "termos", login, redes sociais, etc). Retorne até ${max} URLs únicas, sem duplicatas, priorizando as que parecem anúncios de negócios/serviços reais.

URLs:
${candidateUrls.join("\n")}`,
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    throw new Error("A Claude recusou processar essa lista de anúncios.");
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock) {
    throw new Error("A Claude não retornou conteúdo de texto.");
  }

  const parsed = JSON.parse(textBlock.text) as { urls: string[] };
  return parsed.urls.slice(0, max);
}
