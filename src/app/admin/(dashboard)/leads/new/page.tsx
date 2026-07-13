"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import { isBlank, isValidUrl } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

export default function NewLeadPage() {
  const router = useRouter();
  const [url, setUrl] = useState("");
  const [urlError, setUrlError] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const [listingUrl, setListingUrl] = useState("");
  const [listingUrlError, setListingUrlError] = useState("");
  const [listingLoading, setListingLoading] = useState(false);
  const [listingError, setListingError] = useState("");

  function validateUrlField(value: string): string {
    if (isBlank(value)) return "Informe a URL do anúncio.";
    if (!isValidUrl(value)) return "Informe uma URL válida (começando com http:// ou https://).";
    return "";
  }

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const validationError = validateUrlField(url);
    setUrlError(validationError);
    if (validationError) return;

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

  async function handleListingSubmit(event: FormEvent) {
    event.preventDefault();

    const validationError = validateUrlField(listingUrl);
    setListingUrlError(validationError);
    if (validationError) return;

    setListingLoading(true);
    setListingError("");

    const res = await fetch("/api/admin/leads/scan-listing", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ listingUrl }),
    });

    const body = await res.json().catch(() => null);

    if (!res.ok) {
      setListingLoading(false);
      setListingError(body?.error ?? "Não foi possível escanear essa lista.");
      return;
    }

    router.push(`/admin/jobs/${body.jobId}`);
  }

  return (
    <div className="mx-auto max-w-xl space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Escanear anúncio</h1>
        <p className="mt-1 text-sm text-muted">
          Cole a URL de um classificado ou anúncio de um negócio sem site. O robô vai analisar a
          página e criar um lead a partir dela.
        </p>

        <div className="mt-4 rounded-xl border border-border bg-surface px-4 py-3 text-xs text-muted">
          A Claude vai acessar a página e extrair nome do negócio, segmento e contato (quando
          disponíveis). Pode levar alguns segundos.
        </div>

        <form onSubmit={handleSubmit} noValidate className="glow-card mt-6 space-y-4 rounded-2xl p-6">
          <div>
            <label htmlFor="sourceUrl" className="text-xs font-medium text-muted">URL do anúncio</label>
            <input
              id="sourceUrl"
              value={url}
              onChange={(e) => {
                setUrl(e.target.value);
                setUrlError("");
              }}
              placeholder="https://www.exemplo.com/anuncio/123"
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <FieldError message={urlError} />
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

      <div>
        <h2 className="text-lg font-bold text-foreground">Escanear lista de anúncios</h2>
        <p className="mt-1 text-sm text-muted">
          Cole a URL de uma página de listagem/categoria (com vários anúncios). A Claude identifica
          os anúncios individuais e cria um lead para cada um — até 5 por vez.
        </p>

        <form onSubmit={handleListingSubmit} noValidate className="glow-card mt-6 space-y-4 rounded-2xl p-6">
          <div>
            <label htmlFor="listingUrl" className="text-xs font-medium text-muted">URL da lista/categoria</label>
            <input
              id="listingUrl"
              value={listingUrl}
              onChange={(e) => {
                setListingUrl(e.target.value);
                setListingUrlError("");
              }}
              placeholder="https://www.exemplo.com/categoria/servicos"
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
            />
            <FieldError message={listingUrlError} />
          </div>

          {listingError && <p className="text-sm text-red-400">{listingError}</p>}

          <button
            type="submit"
            disabled={listingLoading}
            className="w-full rounded-full border border-border px-7 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"
          >
            {listingLoading ? "Iniciando..." : "Escanear lista (até 5 leads)"}
          </button>
        </form>
      </div>
    </div>
  );
}
