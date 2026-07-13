"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function SendEmailButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");

  async function handleSend() {
    setSending(true);
    setError("");

    const res = await fetch("/api/admin/leads/bulk-send-email", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ leadIds: [leadId] }),
    });

    setSending(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Falha ao enviar o e-mail.");
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleSend}
        disabled={sending}
        className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
      >
        {sending ? "Enviando..." : "Enviar e-mail para o cliente"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
