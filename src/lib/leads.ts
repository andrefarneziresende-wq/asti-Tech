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
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}
