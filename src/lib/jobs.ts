export type JobStatus = "pendente" | "processando" | "concluido" | "erro" | "cancelado";

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  pendente: "Pendente",
  processando: "Processando",
  concluido: "Concluído",
  erro: "Erro",
  cancelado: "Cancelado",
};

export const RUNNING_JOB_STATUSES: JobStatus[] = ["pendente", "processando"];

// A varredura escreve no log a cada anúncio processado; se passar bem mais
// do que o orçamento interno de uma etapa (~50s) sem nenhuma atualização, a
// função provavelmente foi interrompida pela plataforma antes de conseguir
// registrar um erro.
export const JOB_STALE_THRESHOLD_MS = 90_000;

export function isJobStale(job: Pick<ScanJob, "status" | "updatedAt">, now: number = Date.now()): boolean {
  if (!RUNNING_JOB_STATUSES.includes(job.status)) return false;
  return now - new Date(job.updatedAt).getTime() > JOB_STALE_THRESHOLD_MS;
}

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
