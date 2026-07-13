export type LeadStatus =
  | "novo"
  | "coletando_dados"
  | "gerando_site"
  | "publicando"
  | "email_enviado"
  | "respondeu_interessado"
  | "sem_interesse"
  | "erro";

export const STATUS_LABELS: Record<LeadStatus, string> = {
  novo: "Novo",
  coletando_dados: "Coletando dados",
  gerando_site: "Gerando site com IA",
  publicando: "Publicando mockup",
  email_enviado: "E-mail enviado",
  respondeu_interessado: "Cliente interessado",
  sem_interesse: "Sem interesse",
  erro: "Erro no processo",
};

export const STATUS_ORDER: LeadStatus[] = [
  "novo",
  "coletando_dados",
  "gerando_site",
  "publicando",
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
  mockupUrl?: string;
  githubRepoUrl?: string;
  timeline: TimelineEntry[];
  createdAt: string;
  updatedAt: string;
}
