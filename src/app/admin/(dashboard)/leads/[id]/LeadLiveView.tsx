"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, RUNNING_LEAD_STATUSES, isLeadStale, type Lead } from "@/lib/leads";
import { SendEmailButton } from "./SendEmailButton";

type Step = "generate-site" | "publish-github" | "send-email";

const STEP_LABELS: Record<Step, string> = {
  "generate-site": "Gerando site com inteligência artificial...",
  "publish-github": "Publicando código no GitHub...",
  "send-email": "Enviando e-mail ao cliente...",
};

// Um pouco acima do orçamento interno de cada etapa no servidor (ver
// STEP_TIMEOUT_MS nas rotas de run-job) — se o navegador não recebe resposta
// nem depois disso, algo travou de verdade (rede ou plataforma).
const CLIENT_STEP_TIMEOUT_MS: Record<Step, number> = {
  "generate-site": 160000,
  "publish-github": 160000,
  "send-email": 40000,
};

const STALE_POLL_MS = 15000;

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
  const [elapsed, setElapsed] = useState(0);
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");
  const [now, setNow] = useState(0);
  const elapsedTimerRef = useRef<number | null>(null);

  // "now" só existe pra calcular "há quanto tempo travado" sem chamar
  // Date.now() direto no corpo do componente (render precisa ser puro).
  useEffect(() => {
    const update = () => setNow(Date.now());
    const initial = setTimeout(update, 0);
    if (running || !RUNNING_LEAD_STATUSES.includes(lead.status)) {
      return () => clearTimeout(initial);
    }
    const tick = setInterval(update, 5000);
    return () => {
      clearTimeout(initial);
      clearInterval(tick);
    };
  }, [running, lead.status]);

  // Enquanto ninguém está de olho ativamente rodando uma etapa, mas o status
  // no banco continua "rodando", refaz a leitura de vez em quando — assim,
  // se a página for aberta numa hora em que o lead já estava travado (ou
  // travar entre uma visita e outra), a gente detecta sem precisar recarregar.
  useEffect(() => {
    if (running) return;
    if (!RUNNING_LEAD_STATUSES.includes(lead.status)) return;

    const interval = setInterval(async () => {
      const res = await fetch(`/api/admin/leads/${lead.id}`);
      if (!res.ok) return;
      const body = await res.json().catch(() => null);
      if (body?.lead) setLead(body.lead);
    }, STALE_POLL_MS);

    return () => clearInterval(interval);
  }, [running, lead.status, lead.id]);

  async function fetchStep(step: Step): Promise<StepResponse> {
    const controller = new AbortController();
    const timeoutId = window.setTimeout(() => controller.abort(), CLIENT_STEP_TIMEOUT_MS[step]);

    try {
      const res = await fetch(`/api/admin/leads/${lead.id}/run-job/${step}`, {
        method: "POST",
        signal: controller.signal,
      });
      const body = (await res.json().catch(() => null)) as StepResponse | null;

      if (body?.lead) setLead(body.lead);
      router.refresh();

      if (!res.ok) {
        throw new Error(body?.error ?? "Falha ao executar essa etapa do robô.");
      }
      return body ?? {};
    } finally {
      window.clearTimeout(timeoutId);
    }
  }

  async function runStep(step: Step): Promise<StepResponse> {
    setCurrentStep(step);
    setElapsed(0);

    try {
      return await fetchStep(step);
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError")) throw err;

      // Sem resposta a tempo — tenta mais uma vez antes de desistir, em vez
      // de já mostrar erro pra uma instabilidade passageira de rede.
      setElapsed(0);
      try {
        return await fetchStep(step);
      } catch (retryErr) {
        if (retryErr instanceof DOMException && retryErr.name === "AbortError") {
          throw new Error(
            "O servidor não respondeu a tempo, mesmo depois de tentar de novo. Pode ser uma instabilidade passageira — tente rodar o robô de novo em alguns instantes."
          );
        }
        throw retryErr;
      }
    }
  }

  useEffect(() => {
    if (!running || !currentStep) {
      if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
      return;
    }
    elapsedTimerRef.current = window.setInterval(() => setElapsed((s) => s + 1), 1000);
    return () => {
      if (elapsedTimerRef.current) window.clearInterval(elapsedTimerRef.current);
    };
  }, [running, currentStep]);

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

  async function handleMarkStale() {
    const res = await fetch(`/api/admin/leads/${lead.id}/mark-stale`, { method: "POST" });
    const body = await res.json().catch(() => null);
    if (res.ok && body?.lead) setLead(body.lead);
    router.refresh();
  }

  const isRunningStatus = running || RUNNING_LEAD_STATUSES.includes(lead.status);
  const stale = !running && now > 0 && isLeadStale(lead, now);
  const staleMinutes = now > 0 ? Math.floor((now - new Date(lead.updatedAt).getTime()) / 60000) : 0;

  return (
    <div>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">{lead.businessName}</h1>
          <p className="mt-1 text-sm text-muted">{lead.sourceUrl}</p>
          <span
            className={`mt-2 inline-flex items-center gap-2 rounded-full border px-3 py-1 text-xs ${
              stale
                ? "border-amber-500/40 text-amber-400"
                : isRunningStatus
                  ? "border-primary/40 text-accent"
                  : lead.status === "erro"
                    ? "border-red-500/40 text-red-400"
                    : lead.status === "cancelado"
                      ? "border-amber-500/40 text-amber-400"
                      : "border-border text-accent"
            }`}
          >
            {isRunningStatus && !stale && <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-current" />}
            {currentStep
              ? `${STEP_LABELS[currentStep]} (${elapsed}s)`
              : stale
                ? `Parece travado (sem atividade há ${staleMinutes} min)`
                : STATUS_LABELS[lead.status]}
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
                  ? `${STEP_LABELS[currentStep]} (${elapsed}s)`
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

      {stale && (
        <div className="mt-4 rounded-xl border border-amber-500/40 bg-amber-500/5 p-4 text-sm">
          <p className="font-medium text-amber-300">Esse lead parece travado</p>
          <p className="mt-1 text-muted">
            Sem nenhuma atualização há {staleMinutes} min enquanto estava em &quot;{STATUS_LABELS[lead.status]}&quot;.
            A função provavelmente foi interrompida pela plataforma antes de conseguir registrar um erro — não é um
            problema com os dados desse lead. Pode marcar como erro e rodar o robô de novo com segurança.
          </p>
          <button
            type="button"
            onClick={handleMarkStale}
            className="mt-3 rounded-full border border-amber-500/40 px-4 py-1.5 text-xs font-medium text-amber-300 transition-colors hover:bg-amber-500/10"
          >
            Marcar como erro
          </button>
        </div>
      )}

      <div className="glow-card mt-8 rounded-2xl p-6">
        <h2 className="text-sm font-semibold text-foreground">Linha do tempo</h2>
        <ol className="mt-4 space-y-4 border-l border-border pl-4">
          {running && currentStep && (
            <li className="relative">
              <span className="absolute -left-[21px] top-1 h-2.5 w-2.5 animate-pulse rounded-full bg-accent" />
              <p className="text-sm font-medium text-accent">
                {STEP_LABELS[currentStep]} ({elapsed}s)
              </p>
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
