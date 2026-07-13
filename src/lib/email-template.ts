import { escapeHtml } from "./html";

export const DEFAULT_EMAIL_SUBJECT = "{{businessName}}, preparamos um site para o seu negócio";

export const DEFAULT_EMAIL_BODY_HTML = `<div style="font-family: sans-serif; color: #111;">
  <p>Olá, {{businessName}}!</p>
  <p>Preparamos um mockup gratuito do site do seu negócio, feito com Inteligência Artificial:</p>
  <p><a href="{{mockupUrl}}">{{mockupUrl}}</a></p>
  <p>Algumas ideias para o seu site:</p>
  {{ideasList}}
  <p>Custo mensal estimado (hospedagem + manutenção): <strong>R$ {{estimatedMonthlyCost}}</strong></p>
  <p>Gostou do que viu? É só responder este e-mail dizendo que tem interesse que damos continuidade ao projeto com você.</p>
  <p>— Equipe ASTI Tech</p>
</div>`;

export const EMAIL_PLACEHOLDERS = [
  { token: "{{businessName}}", label: "Nome do negócio" },
  { token: "{{segment}}", label: "Segmento" },
  { token: "{{mockupUrl}}", label: "Link do mockup" },
  { token: "{{estimatedMonthlyCost}}", label: "Custo mensal estimado" },
  { token: "{{ideasList}}", label: "Lista de ideias (HTML)" },
] as const;

export interface EmailTemplateData {
  businessName: string;
  segment?: string;
  mockupUrl?: string;
  estimatedMonthlyCost?: number;
  siteIdeas?: string[];
}

function ideasListHtml(ideas: string[] | undefined): string {
  if (!ideas || ideas.length === 0) {
    return "<ul><li>(nenhuma ideia gerada ainda)</li></ul>";
  }
  return `<ul>${ideas.map((idea) => `<li>${escapeHtml(idea)}</li>`).join("")}</ul>`;
}

/** Preenche um template (assunto + HTML) com os dados de um lead, substituindo os placeholders {{...}}. */
export function renderEmailTemplate(
  template: { subject: string; bodyHtml: string },
  data: EmailTemplateData
): { subject: string; html: string } {
  const values: Record<string, string> = {
    businessName: escapeHtml(data.businessName),
    segment: escapeHtml(data.segment ?? ""),
    mockupUrl: data.mockupUrl ?? "",
    estimatedMonthlyCost:
      data.estimatedMonthlyCost != null ? data.estimatedMonthlyCost.toFixed(2) : "",
    ideasList: ideasListHtml(data.siteIdeas),
  };

  function substitute(text: string): string {
    return text.replace(/\{\{(\w+)\}\}/g, (_match, key: string) => values[key] ?? "");
  }

  return {
    subject: substitute(template.subject),
    html: substitute(template.bodyHtml),
  };
}
