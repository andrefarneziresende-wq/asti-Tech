"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import type { Lead } from "@/lib/leads";

export function LeadEditForm({ lead }: { lead: Lead }) {
  const router = useRouter();
  const [businessName, setBusinessName] = useState(lead.businessName);
  const [segment, setSegment] = useState(lead.segment ?? "");
  const [contactEmail, setContactEmail] = useState(lead.contactEmail ?? "");
  const [contactPhone, setContactPhone] = useState(lead.contactPhone ?? "");
  const [saving, setSaving] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaving(true);

    await fetch(`/api/admin/leads/${lead.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ businessName, segment, contactEmail, contactPhone }),
    });

    setSaving(false);
    router.refresh();
  }

  return (
    <form onSubmit={handleSubmit} className="glow-card space-y-4 rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-foreground">Dados do lead</h2>

      <div>
        <label className="text-xs font-medium text-muted">Nome do negócio</label>
        <input
          value={businessName}
          onChange={(e) => setBusinessName(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted">Segmento</label>
        <input
          value={segment}
          onChange={(e) => setSegment(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted">E-mail de contato</label>
        <input
          type="email"
          value={contactEmail}
          onChange={(e) => setContactEmail(e.target.value)}
          placeholder="contato@negocio.com"
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <div>
        <label className="text-xs font-medium text-muted">Telefone / WhatsApp</label>
        <input
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
          className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
        />
      </div>

      <button
        type="submit"
        disabled={saving}
        className="w-full rounded-full border border-border px-6 py-2.5 text-sm font-semibold text-foreground transition-colors hover:border-primary disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar dados"}
      </button>
    </form>
  );
}
