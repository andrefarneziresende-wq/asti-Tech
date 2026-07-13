"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";

export default function NewLeadPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/leads", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sourceUrl: url }),
    });

    const body = await res.json().catch(() => null);
    setLoading(false);

    if (!res.ok) {
      setError(body?.error ?? "Não foi possível escanear essa URL.");
      return;
    }

    const lead = body.leads?.[0];
    if (lead) {
      router.push(`/admin/leads/${lead.id}`);
    } else {
      router.push("/admin/leads");
    }
  }

  return (
    <div className="mx-auto max-w-xl">
      <h1 className="text-2xl font-bold text-foreground">Escanear anúncio</h1>
      <p className="mt-1 text-sm text-muted">
        Cole a URL de um classificado ou anúncio de um negócio sem site. O robô vai analisar a
        página e criar um lead a partir dela.
      </p>

      <div className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-xs text-amber-300">
        Fase atual: a extração de dados reais da página (via Claude API) ainda não está ligada —
        o lead é criado com dados simulados a partir do domínio da URL, só para demonstrar o fluxo.
      </div>

      <form onSubmit={handleSubmit} className="glow-card mt-6 space-y-4 rounded-2xl p-6">
        <div>
          <label htmlFor="sourceUrl" className="text-xs font-medium text-muted">URL do anúncio</label>
          <input
            id="sourceUrl"
            type="url"
            required
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://www.exemplo.com/anuncio/123"
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
        </div>

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-full bg-gradient-to-r from-primary to-primary-2 px-7 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
        >
          {loading ? "Escaneando..." : "Escanear e criar lead"}
        </button>
      </form>
    </div>
  );
}
