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
