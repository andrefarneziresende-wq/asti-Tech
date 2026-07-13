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

const VISUAL_STYLES = [
  "moderno minimalista: muito espaço em branco, tipografia grande e poucos elementos",
  "moderno vibrante: blocos de cor sólida, formas geométricas e contrastes fortes",
  "moderno corporativo: gradientes sutis, bastante hierarquia visual e ares premium",
  "moderno acolhedor: bordas arredondadas, texturas suaves e tom pessoal/artesanal",
  "moderno editorial: grid assimétrico inspirado em revistas, destaque pra fotos/texto",
];

/** Escolhe um estilo visual de forma determinística a partir de um texto (mesmo negócio = mesmo estilo, negócios diferentes tendem a variar). */
function pickVisualStyle(seed: string): string {
  const sum = seed.split("").reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return VISUAL_STYLES[sum % VISUAL_STYLES.length];
}

/**
 * Gera um mockup de site institucional (HTML autocontido) e ideias de conteúdo
 * para o negócio do lead, usando a API da Claude. Quando o lead já tem cores
 * de marca e/ou logo reais (extraídos das fotos do anúncio de origem), o
 * mockup é obrigado a usar esses elementos em vez de uma identidade genérica
 * inventada pra o segmento.
 */
export async function generateSiteContent(
  lead: Pick<Lead, "id" | "businessName" | "segment" | "businessDescription" | "logoUrl" | "brandColors">
): Promise<GeneratedSite> {
  const visualStyle = pickVisualStyle(lead.id + lead.businessName);

  const brandInstructions = lead.brandColors?.length
    ? `\nCores de marca reais desse negócio (extraídas das fotos do próprio anúncio) — use EXATAMENTE essas cores como paleta principal do site, não invente outra paleta: ${lead.brandColors.join(", ")}. Você pode complementar com neutros (branco/preto/cinza) para legibilidade, mas a cor de destaque do site deve vir dessa lista.`
    : "";

  const logoInstructions = lead.logoUrl
    ? `\nEsse negócio tem uma logo real, disponível nesta URL: ${lead.logoUrl}. Inclua-a no cabeçalho como <img src="${lead.logoUrl}" alt="${lead.businessName}" style="height:40px">, ao lado ou no lugar do nome em texto.`
    : "";

  const descriptionInstructions = lead.businessDescription
    ? `\nDetalhes reais desse negócio (extraídos do próprio anúncio, use-os pra escrever um conteúdo específico e não genérico): ${lead.businessDescription}`
    : "";

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
        content: `Você é um designer/desenvolvedor web de alto nível, especializado em sites institucionais modernos. Crie um mockup de site institucional de uma única página (HTML autocontido — CSS inline em uma tag <style>, sem dependências externas, responsivo, mobile-first) para o negócio abaixo, além de 5 ideias de conteúdo para esse site. Esse site precisa ser único e específico pra esse negócio — não repita uma estrutura genérica de segmento.

Negócio: ${lead.businessName}
Segmento: ${lead.segment ?? "não informado"}
Estilo visual a seguir: ${visualStyle}${brandInstructions}${logoInstructions}${descriptionInstructions}

O resultado tem que parecer um site profissional feito em 2026, não um template datado. Isso significa: tipografia contemporânea (use uma pilha de fontes moderna via font-family, ex: system-ui, "Segoe UI", Inter, Helvetica Neue, sans-serif — nunca deixe cair no Times New Roman/Arial puro), bastante espaço em branco e hierarquia visual clara entre título/subtítulo/corpo, cabeçalho fixo/sticky com navegação simples, botões de call-to-action com estados de hover/transição sutis, cantos arredondados e sombras leves onde fizer sentido pro estilo escolhido, e nenhum elemento com cara de site antigo (sem bordas duras 3D, sem gradiente arco-íris, sem fonte cursiva genérica de "logo grátis").

O HTML deve ter: cabeçalho com o nome (e logo, se houver) do negócio, uma seção principal (hero) convincente e específica pro negócio, 3-4 seções relevantes (ex: serviços, sobre, diferenciais/depoimentos, contato) e rodapé. Se não houver cores de marca reais informadas acima, escolha uma paleta condizente com o segmento. Não invente dados de contato reais — use placeholders claros como "[telefone]" e "[e-mail]".`,
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
  description: string;
}

const EXTRACT_SCHEMA = {
  type: "object",
  properties: {
    businessName: { type: "string" },
    segment: { type: "string" },
    contactEmail: { type: "string" },
    contactPhone: { type: "string" },
    description: { type: "string" },
  },
  required: ["businessName", "segment", "contactEmail", "contactPhone", "description"],
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
        content: `Abaixo está o texto extraído de uma página de anúncio classificado (URL de origem: ${sourceUrl}). Extraia as informações do negócio anunciado: nome do negócio, segmento/ramo de atuação, e-mail de contato e telefone de contato. Além disso, escreva um resumo de 2-4 frases com o que há de específico/diferenciado nesse negócio segundo o texto (serviços exatos oferecidos, diferenciais, tom de comunicação, público-alvo) — esse resumo vai ser usado depois para gerar um site sob medida, então deve capturar detalhes concretos do anúncio, não generalidades do segmento. Se alguma informação não estiver presente no texto, deixe o campo correspondente como string vazia. Não invente informações que não estejam no texto.

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

export interface BrandAnalysis {
  logoUrl: string;
  colors: string[];
}

const BRAND_ANALYSIS_SCHEMA = {
  type: "object",
  properties: {
    logoUrl: { type: "string" },
    colors: { type: "array", items: { type: "string" } },
  },
  required: ["logoUrl", "colors"],
  additionalProperties: false,
} as const;

/**
 * Analisa as fotos de um anúncio (via visão da Claude) pra tentar identificar
 * uma logo real do negócio entre elas e extrair as cores de marca predominantes
 * (fachada, produtos, uniformes, materiais gráficos) — usadas depois para gerar
 * um mockup fiel à identidade visual real, em vez de uma paleta genérica do
 * segmento. Se nenhuma imagem parecer útil, devolve logoUrl vazio e cores vazias.
 */
export async function analyzeBrandImages(
  imageUrls: string[],
  businessName: string
): Promise<BrandAnalysis> {
  if (imageUrls.length === 0) {
    return { logoUrl: "", colors: [] };
  }

  const stream = client.messages.stream({
    model: "claude-opus-4-8",
    max_tokens: 1000,
    thinking: { type: "adaptive" },
    output_config: {
      effort: "low",
      format: { type: "json_schema", schema: BRAND_ANALYSIS_SCHEMA },
    },
    messages: [
      {
        role: "user",
        content: [
          ...imageUrls.map((url) => ({
            type: "image" as const,
            source: { type: "url" as const, url },
          })),
          {
            type: "text" as const,
            text: `Essas são fotos de um anúncio classificado do negócio "${businessName}". 1) Se alguma dessas imagens for claramente uma logo/marca gráfica desse negócio (não uma foto de produto/ambiente/pessoa), devolva a URL exata dela em "logoUrl" — se nenhuma parecer ser uma logo, devolva "logoUrl" vazio. 2) Observando as fotos (fachada, produtos, ambiente, uniformes, materiais gráficos), identifique de 2 a 4 cores que representem a identidade visual real desse negócio, como códigos hexadecimais (ex: "#1a5f3f"). Não invente cores que não apareçam nas imagens.

URLs na ordem enviada:
${imageUrls.map((url, i) => `${i + 1}. ${url}`).join("\n")}`,
          },
        ],
      },
    ],
  });

  const response = await stream.finalMessage();

  if (response.stop_reason === "refusal") {
    return { logoUrl: "", colors: [] };
  }

  const textBlock = response.content.find(
    (block): block is Anthropic.TextBlock => block.type === "text"
  );

  if (!textBlock) {
    return { logoUrl: "", colors: [] };
  }

  try {
    return JSON.parse(textBlock.text) as BrandAnalysis;
  } catch {
    return { logoUrl: "", colors: [] };
  }
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
