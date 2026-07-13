"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function RunJobButton({ leadId, hasEmail }: { leadId: string; hasEmail: boolean }) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleRun() {
    setLoading(true);
    setError("");

    const res = await fetch(`/api/admin/leads/${leadId}/run-job`, { method: "POST" });
    const body = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(body?.error ?? "Falha ao rodar o robô.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleRun}
        disabled={loading}
        className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
      >
        {loading ? "Rodando robô..." : "Rodar robô (gerar site → GitHub → e-mail)"}
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
