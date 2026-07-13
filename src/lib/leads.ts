export type LeadStatus =
  | "novo"
  | "coletando_dados"
  | "gerando_site"
  | "publicando"
  | "pronto_para_email"
  | "email_enviado"
  | "respondeu_interessado"
  | "sem_interesse"
  | "erro"
  | "cancelado";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  coletando_dados: "Coletando dados",
  gerando_site: "Gerando site com IA",
  publicando: "Publicando mockup",
  pronto_para_email: "Pronto para enviar",
  email_enviado: "E-mail enviado",
  respondeu_interessado: "Cliente interessado",
  sem_interesse: "Sem interesse",
  erro: "Erro no processo",
  cancelado: "Cancelado pelo usuário",
};

// Status em que o robô está rodando em segundo plano e pode ser cancelado.
export const RUNNING_LEAD_STATUSES: LeadStatus[] = ["gerando_site", "publicando"];

// Cada etapa tem no máximo ~55s de orçamento interno (ver withTimeout nas
// rotas de run-job); acima disso com folga, sem nenhuma atualização, é sinal
// de que a função foi interrompida pela plataforma antes de conseguir
// registrar um erro — não é mais "só lento".
export const LEAD_STALE_THRESHOLD_MS = 90_000;

export function isLeadStale(lead: Pick<Lead, "status" | "updatedAt">, now: number = Date.now()): boolean {
  if (!RUNNING_LEAD_STATUSES.includes(lead.status)) return false;
  return now - new Date(lead.updatedAt).getTime() > LEAD_STALE_THRESHOLD_MS;
}

export const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "coletando_dados",
  "gerando_site",
  "publicando",
  "pronto_para_email",
  "email_enviado",
  "respondeu_interessado",
];

export interface TimelineEntry {
  at: string;
  label: string;
  detail?: string;
}

export interface Lead {
  id: string;
  sourceUrl: string;
  businessName: string;
  segment?: string;
  contactEmail?: string;
  contactPhone?: string;
  status: LeadStatus;
  estimatedMonthlyCost?: number;
  siteIdeas?: string[];
  slug?: string;
  siteHtml?: string;
  mockupUrl?: string;
  githubRepoUrl?: string;
  // Detalhes reais extraídos do anúncio de origem, usados pra gerar um site
  // fiel ao negócio (e não um template genérico do segmento).
  businessDescription?: string;
  logoUrl?: string;
  brandColors?: string[];
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}
