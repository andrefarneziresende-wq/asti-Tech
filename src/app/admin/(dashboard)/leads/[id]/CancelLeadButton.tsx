"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function CancelLeadButton({ leadId }: { leadId: string }) {
  const router = useRouter();
  const [cancelling, setCancelling] = useState(false);
  const [error, setError] = useState("");

  async function handleCancel() {
    setCancelling(true);
    setError("");

    const res = await fetch(`/api/admin/leads/${leadId}/cancel`, { method: "POST" });

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "Falha ao cancelar o robô.");
      setCancelling(false);
      return;
    }

    router.refresh();
  }

  return (
    <div>
      <button
        type="button"
        onClick={handleCancel}
        disabled={cancelling}
        className="rounded-full border border-red-500/40 px-5 py-2 text-sm text-red-400 transition-colors hover:bg-red-500/10 disabled:opacity-50"
      >
        {cancelling ? "Cancelando..." : "Parar robô"}
      </button>
      {error && <p className="mt-2 text-sm text-red-400">{error}</p>}
    </div>
  );
}
