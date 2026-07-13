"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

type Step = "generate-site" | "publish-github" | "send-email";

const STEP_LABELS: Record<Step, string> = {
  "generate-site": "Etapa 1/3 — Gerando site com inteligência artificial...",
  "publish-github": "Etapa 2/3 — Publicando código no GitHub...",
  "send-email": "Etapa 3/3 — Enviando e-mail ao cliente...",
};

interface StepResponse {
  lead?: unknown;
  done?: boolean;
  cancelled?: boolean;
  nextStep?: Step;
  error?: string;
}

export function RunJobButton({ leadId, hasEmail }: { leadId: string; hasEmail: boolean }) {
  const router = useRouter();
  const [running, setRunning] = useState(false);
  const [currentStep, setCurrentStep] = useState<Step | null>(null);
  const [error, setError] = useState("");

  async function runStep(step: Step): Promise<StepResponse> {
    setCurrentStep(step);
    const res = await fetch(`/api/admin/leads/${leadId}/run-job/${step}`, { method: "POST" });
    const body = (await res.json().catch(() => null)) as StepResponse | null;
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

  return (
    <div>
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
      {!hasEmail && (
        <p className="mt-2 text-xs text-amber-300">
          Sem e-mail de contato cadastrado: o robô vai gerar o site, mas não conseguirá enviar o e-mail final.
        </p>
      )}
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
