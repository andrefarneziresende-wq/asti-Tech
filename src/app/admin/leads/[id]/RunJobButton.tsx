"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";

const POLL_INTERVAL_MS = 2000;
const MAX_POLLS = 60; // ~2 minutos
const STABLE_POLLS_TO_STOP = 2;

type RunState = "idle" | "running" | "error";

export function RunJobButton({ leadId, hasEmail }: { leadId: string; hasEmail: boolean }) {
  const router = useRouter();
  const [state, setState] = useState<RunState>("idle");
  const [error, setError] = useState("");
  const pollIdRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (pollIdRef.current) window.clearInterval(pollIdRef.current);
    };
  }, []);

  function stopPolling() {
    if (pollIdRef.current) {
      window.clearInterval(pollIdRef.current);
      pollIdRef.current = null;
    }
    setState("idle");
  }

  function startPolling() {
    let lastTimelineLength = -1;
    let stableCount = 0;
    let attempts = 0;

    pollIdRef.current = window.setInterval(async () => {
      attempts += 1;

      const res = await fetch(`/api/admin/leads/${leadId}`);
      const body = await res.json().catch(() => null);
      const timelineLength: number = body?.lead?.timeline?.length ?? -1;

      router.refresh();

      if (timelineLength === lastTimelineLength) {
        stableCount += 1;
      } else {
        stableCount = 0;
        lastTimelineLength = timelineLength;
      }

      if (stableCount >= STABLE_POLLS_TO_STOP || attempts >= MAX_POLLS) {
        stopPolling();
      }
    }, POLL_INTERVAL_MS);
  }

  async function handleRun() {
    setState("running");
    setError("");

    const res = await fetch(`/api/admin/leads/${leadId}/run-job`, { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Falha ao iniciar o robô.");
      setState("error");
      return;
    }

    router.refresh();
    startPolling();
  }

  const running = state === "running";

  return (
    <div>
      <button
        type="button"
        onClick={handleRun}
        disabled={running}
        className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
      >
        {running ? "Robô rodando..." : "Rodar robô (gerar site → GitHub → e-mail)"}
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
