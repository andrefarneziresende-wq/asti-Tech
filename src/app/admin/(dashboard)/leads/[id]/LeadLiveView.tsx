"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, RUNNING_LEAD_STATUSES, type Lead } from "@/lib/leads";
import { SendEmailButton } from "./SendEmailButton";

type Step = "generate-site" | "publish-github" | "send-email";

const STEP_LABELS: Record<Step, string> = {
  "generate-site": "Gerando site com inteligência artificial...",
  "publish-github": "Publicando código no GitHub...",
  "send-email": "Enviando e-mail ao cliente...",
};

interface StepResponse {
  lead?: Lead;
  done?: boolean;
  cancelled?: boolean;
  nextStep?: Step;
  error?: string;
}

export function LeadLiveView({ initialLead }: { initialLead: Lead }) {
  const router = useRouter();
  const [lead, setLead] = useState(initialLead);
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  async function runStep(step: Step): Promise<StepResponse> {
    setCurrentStep(step);
    const res = await fetch(`/api/admin/leads/${lead.id}/run-job/${step}`, { method: "POST" });
    const body = (await res.json().catch(() => null)) as StepResponse | null;

    if (body?.lead) setLead(body.lead);
    router.refresh();

    if (!res.ok) {
      throw new Error(body?.error ?? "Falha ao executar essa etapa do robô.");
    }
    return body ?? {};
  }

  async function handleRun() {
    setRunning(true);
    setError("");

    try {
      let step: Step | undefined = "generate-site";
      while (step) {
        const result = await runStep(step);
        if (result.cancelled || result.done) break;
        step = result.nextStep;
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Falha ao rodar o robô.");
    } finally {
      setRunning(false);
      setCurrentStep(null);
      router.refresh();
    }
  }

  async function handleCancel() {
    setCancelling(true);
    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/cancel`, { method: "POST" });
      const body = await res.json().catch(() => null);
      if (res.ok && body?.lead) setLead(body.lead);
      router.refresh();
    } finally {
      setCancelling(false);
    }
  }

  const isRunningStatus = running || RUNNING_LEAD_STATUSES.includes(lead.status);

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.businessName}</h1>
          <p className="mt-1 text-sm text-muted">{lead.sourceUrl}</p>
          <span
            className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              isRunningStatus
                ? "border-primary/40 text-accent"
                : lead.status === "erro"
                  ? "border-red-500/40 text-red-400"
                  : lead.status === "cancelado"
                    ? "border-amber-500/40 text-amber-400"
                    : "border-border text-accent"
            }`}
          >
            {isRunningStatus && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {currentStep ? STEP_LABELS[currentStep] : STATUS_LABELS[lead.status]}
          </span>
        </div>
        <div className="flex items-center gap-3">
          {lead.status === "pronto_para_email" ? (
            <SendEmailButton leadId={lead.id} />
          ) : (
            <button
              type="button"
              onClick={handleRun}
              disabled={running}
              className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
            >
              {running
                ? currentStep
                  ? STEP_LABELS[currentStep]
                  : "Processando..."
                : "Rodar robô (gerar site → GitHub → e-mail)"}
            </button>
          )}
          {RUNNING_LEAD_STATUSES.includes(lead.status) && (
            <button
              type="button"
              onClick={handleCancel}
              disabled={cancelling}
              className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
            >
              {cancelling ? "Cancelando..." : "Parar robô"}
            </button>
          )}
        </div>
      </div>
      {lead.status !== "pronto_para_email" && !lead.contactEmail && (
        <p className="mt-2 text-xs text-amber-300">
          Sem e-mail de contato cadastrado: o robô vai gerar o site, mas não conseguirá enviar o e-mail final.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}

      <div className="glow-card mt-8 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-foreground">Linha do tempo</h2>
        <ol className="mt-4 space-y-4 border-l border-border pl-4">
          {running && currentStep && (
            <li className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
              <p className="text-sm font-medium text-accent">{STEP_LABELS[currentStep]}</p>
            </li>
          )}
          {lead.timeline
            .slice()
            .reverse()
            .map((entry, idx) => (
              <li key={idx} className="relative">
                <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 rounded-full bg-primary" />
                <p className="text-sm font-medium text-foreground">{entry.label}</p>
                {entry.detail && <p className="text-xs text-muted">{entry.detail}</p>}
                <p className="text-xs text-muted">{new Date(entry.at).toLocaleString("pt-BR")}</p>
              </li>
            ))}
        </ol>
      </div>
    </div>
  );
}
