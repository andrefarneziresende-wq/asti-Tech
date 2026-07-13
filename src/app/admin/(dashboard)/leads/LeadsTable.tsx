"use client";

import Link from "next/link";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { STATUS_LABELS, isLeadStale, type Lead } from "@/lib/leads";

export function LeadsTable({ leads }: { leads: Lead[] }) {
  const router = useRouter();
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [sending, setSending] = useState(false);

  const readyLeads = leads.filter((lead) => lead.status === "pronto_para_email");
  const allReadySelected = readyLeads.length > 0 && readyLeads.every((lead) => selected.has(lead.id));

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  function toggleAllReady() {
    setSelected(allReadySelected ? new Set() : new Set(readyLeads.map((lead) => lead.id)));
  }

  async function handleBulkSend() {
    if (selected.size === 0) return;
    setSending(true);

    await fetch("/api/admin/leads/bulk-send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: Array.from(selected) }),
    });

    setSending(false);
    setSelected(new Set());
    router.refresh();
  }

  return (
    <div>
      {readyLeads.length > 0 && (
        <div className="mb-4 flex flex-wrap items-center gap-3 rounded-2xl border border-border bg-surface px-4 py-3">
          <button type="button" onClick={toggleAllReady} className="text-xs text-accent hover:underline">
            {allReadySelected ? "Desmarcar todos prontos" : `Selecionar todos prontos (${readyLeads.length})`}
          </button>
          <span className="text-xs text-muted">{selected.size} selecionado(s)</span>
          <button
            type="button"
            onClick={handleBulkSend}
            disabled={selected.size === 0 || sending}
            className="ml-auto rounded-full bg-gradient-to-r from-primary to-primary-2 px-5 py-2 text-xs font-semibold text-white disabled:opacity-60"
          >
            {sending ? "Enviando..." : `Enviar e-mail (${selected.size})`}
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
                  {lead.status === "pronto_para_email" && (
                    <input
                      type="checkbox"
                      checked={selected.has(lead.id)}
                      onChange={() => toggle(lead.id)}
                      className="h-4 w-4 rounded border-border"
                    />
                  )}
                </td>
                <td className="px-4 py-3">
                  <Link href={`/admin/leads/${lead.id}`} className="font-medium text-foreground hover:text-accent">
                    {lead.businessName}
                  </Link>
                </td>
                <td className="max-w-[220px] truncate px-4 py-3 text-muted">{lead.sourceUrl}</td>
                <td className="px-4 py-3 text-muted">
                  {STATUS_LABELS[lead.status]}
                  {isLeadStale(lead) && (
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
