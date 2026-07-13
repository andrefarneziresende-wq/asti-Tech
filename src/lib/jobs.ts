export type JobStatus = "pendente" | "processando" | "concluido" | "erro";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pendente: "Pendente",
  processando: "Processando",
  concluido: "Concluído",
  erro: "Erro",
};

export interface ScanJobLogEntry {
  at: string;
  message: string;
}

export interface ScanJob {
  id: string;
  type: string;
  sourceUrl: string;
  status: JobStatus;
  candidatesFound?: number;
  totalToProcess?: number;
  leadsCreated: number;
  errorMessage?: string;
  log: ScanJobLogEntry[];
  createdAt: string;
  updatedAt: string;
}
