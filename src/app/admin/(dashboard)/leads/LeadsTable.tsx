"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, isLeadStale, type Lead } from "@/lib/leads";

type Step = "generate-site" | "publish-github" | "send-email";

interface StepResponse {
  done?: boolean;
  cancelled?: boolean;
  nextStep?: Step;
  error?: string;
}

const RUN_CONCURRENCY = 3;

async function runLeadPipeline(leadId: string): Promise<{ ok: boolean; error?: string }> {
  try {
    let step: Step | undefined = "generate-site";
    while (step) {
      const res = await fetch(`/api/admin/leads/${leadId}/run-job/${step}`, { method: "POST" });
      const body = (await res.json().catch(() => null)) as StepResponse | null;
      if (!res.ok) throw new Error(body?.error ?? "Falha ao rodar o robô.");
      if (body?.cancelled || body?.done) break;
      step = body?.nextStep;
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, error: err instanceof Error ? err.message : "Erro desconhecido." };
  }
}

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);
  const [runningBulk, setRunningBulk] = useState(false);
  const [leadStatusById, setLeadStatusById] = useState<Record<string, string>>({});

  const readySelected = leads.filter((lead) => selected.has(lead.id) && lead.status === "pronto_para_email");

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAll() {
    setSelected(selected.size === leads.length ? new Set() : new Set(leads.map((lead) => lead.id)));
  }

  async function handleBulkSend() {
    if (readySelected.length === 0) return;
    setSending(true);

    await fetch("/api/admin/leads/bulk-send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: readySelected.map((lead) => lead.id) }),
    });

    setSending(false);
    setSelected(new Set());
    router.refresh();
  }

  async function handleBulkRun() {
    const ids = Array.from(selected);
    if (ids.length === 0) return;

    setRunningBulk(true);
    setLeadStatusById((prev) => {
      const next = { ...prev };
      for (const id of ids) next[id] = "Na fila...";
      return next;
    });

    let cursor = 0;
    async function worker() {
      while (cursor < ids.length) {
        const id = ids[cursor];
        cursor += 1;
        setLeadStatusById((prev) => ({ ...prev, [id]: "Rodando..." }));
        const result = await runLeadPipeline(id);
        setLeadStatusById((prev) => ({ ...prev, [id]: result.ok ? "Concluído" : `Erro: ${result.error}` }));
        router.refresh();
      }
    }

    await Promise.all(Array.from({ length: Math.min(RUN_CONCURRENCY, ids.length) }, worker));
    setRunningBulk(false);
    setSelected(new Set());
  }

  return (
    <div>
      {leads.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <button type="button" onClick={toggleAll} className="text-xs text-accent hover:underline">
            {selected.size === leads.length ? "Desmarcar todos" : `Selecionar todos (${leads.length})`}
          </button>
          <span className="text-xs text-muted">{selected.size} selecionado(s)</span>

          <button
            type="button"
            onClick={handleBulkRun}
            disabled={selected.size === 0 || runningBulk}
            className="ml-auto rounded-full border border-border px-5 py-2 text-xs font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"
          >
            {runningBulk ? "Rodando robô..." : `Rodar robô (${selected.size})`}
          </button>
          <button
            type="button"
            onClick={handleBulkSend}
            disabled={readySelected.length === 0 || sending}
            className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Enviando..." : `Enviar e-mail (${readySelected.length})`}
          </button>
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-border">
        <table className="w-full text-left text-sm">
          <thead className="bg-surface text-xs uppercase text-muted">
            <tr>
              <th className="w-10 px-4 py-3" />
              <th className="px-4 py-3">Negócio</th>
              <th className="px-4 py-3">Origem</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Custo estimado</th>
              <th className="px-4 py-3">Atualizado em</th>
            </tr>
          </thead>
          <tbody>
            {leads.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-6 text-center text-muted">
                  Nenhum lead cadastrado ainda.
                </td>
              </tr>
            )}
            {leads.map((lead) => (
              <tr key={lead.id} className="border-t border-border hover:bg-surface">
                <td className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selected.has(lead.id)}
                    onChange={() => toggle(lead.id)}
                    className="h-4 w-4 rounded border-border"
                  />
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-foreground hover:text-accent">
                    {lead.businessName}
                  </Link>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted">{lead.sourceUrl}</td>
                <td className="px-4 py-3 text-muted">
                  {leadStatusById[lead.id] ?? STATUS_LABELS[lead.status]}
                  {!leadStatusById[lead.id] && isLeadStale(lead) && (
                    <span className="ml-2 rounded-full border border-amber-500/40 px-2 py-0.5 text-xs text-amber-400">
                      travado?
                    </span>
                  )}
                </td>
                <td className="px-4 py-3 text-muted">
                  {lead.estimatedMonthlyCost ? `R$ ${lead.estimatedMonthlyCost.toFixed(2)}` : "-"}
                </td>
                <td className="px-4 py-3 text-muted">{new Date(lead.updatedAt).toLocaleString("pt-BR")}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
