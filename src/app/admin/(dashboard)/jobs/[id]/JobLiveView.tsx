"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { JOB_STATUS_LABELS, type ScanJob } from "@/lib/jobs";

const POLL_INTERVAL_MS = 2000;

export function JobLiveView({ initialJob }: { initialJob: ScanJob }) {
  const [job, setJob] = useState(initialJob);
  const pollRef = useRef<number | null>(null);

  useEffect(() => {
    if (job.status === "concluido" || job.status === "erro") return;

    pollRef.current = window.setInterval(async () => {
      const res = await fetch(`/api/admin/jobs/${job.id}`);
      if (!res.ok) return;
      const body = await res.json();
      setJob(body.job);
      if (body.job.status === "concluido" || body.job.status === "erro") {
        if (pollRef.current) window.clearInterval(pollRef.current);
      }
    }, POLL_INTERVAL_MS);

    return () => {
      if (pollRef.current) window.clearInterval(pollRef.current);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [job.id]);

  const running = job.status === "pendente" || job.status === "processando";
  const progressPct =
    job.totalToProcess && job.totalToProcess > 0
      ? Math.min(100, Math.round((job.leadsCreated / job.totalToProcess) * 100))
      : null;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Varredura de listagem</h1>
          <p className="mt-1 max-w-xl break-all text-sm text-muted">{job.sourceUrl}</p>
          <span
            className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              running
                ? "border-primary/40 text-accent"
                : job.status === "concluido"
                  ? "border-emerald-500/40 text-emerald-400"
                  : "border-red-500/40 text-red-400"
            }`}
          >
            {running && (
              <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />
            )}
            {JOB_STATUS_LABELS[job.status]}
          </span>
        </div>
        <Link
          href="/admin/leads"
          className="rounded-full border border-border px-5 py-2 text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
        >
          Ver leads
        </Link>
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_280px]">
        <div className="glow-card rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Log de progresso</h2>
          <ol className="mt-4 max-h-[480px] space-y-3 overflow-y-auto border-l border-border pl-4">
            {job.log
              .slice()
              .reverse()
              .map((entry, idx) => (
                <li key={idx} className="relative">
                  <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                  <p className="break-all text-sm text-foreground">{entry.message}</p>
                  <p className="text-xs text-muted">{new Date(entry.at).toLocaleTimeString("pt-BR")}</p>
                </li>
              ))}
          </ol>
        </div>

        <div className="glow-card h-fit rounded-2xl p-6">
          <h2 className="text-sm font-semibold text-foreground">Progresso</h2>
          <dl className="mt-4 space-y-3 text-sm">
            <div>
              <dt className="text-xs text-muted">Links encontrados na página</dt>
              <dd className="text-foreground">{job.candidatesFound ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Anúncios selecionados</dt>
              <dd className="text-foreground">{job.totalToProcess ?? "—"}</dd>
            </div>
            <div>
              <dt className="text-xs text-muted">Leads criados</dt>
              <dd className="text-foreground">
                {job.leadsCreated}
                {job.totalToProcess ? ` / ${job.totalToProcess}` : ""}
              </dd>
            </div>
            {progressPct !== null && (
              <div className="h-2 overflow-hidden rounded-full bg-surface-2">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-primary to-primary-2 transition-all"
                  style={{ width: `${progressPct}%` }}
                />
              </div>
            )}
            {job.errorMessage && (
              <div>
                <dt className="text-xs text-muted">Erro</dt>
                <dd className="text-red-400">{job.errorMessage}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>
    </div>
  );
}
