"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AutoSendToggle({ initialAutoSendEmail }: { initialAutoSendEmail: boolean }) {
  const router = useRouter();
  const [autoSendEmail, setAutoSendEmail] = useState(initialAutoSendEmail);
  const [saving, setSaving] = useState(false);

  async function handleChange(checked: boolean) {
    setAutoSendEmail(checked);
    setSaving(true);

    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ autoSendEmail: checked }),
    });

    setSaving(false);
    router.refresh();
  }

  return (
    <div className="glow-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-foreground">Envio de e-mail</h2>
      <p className="mt-1 text-xs text-muted">
        Controla o que acontece depois que o robô gera o site e publica no GitHub.
      </p>

      <div className="mt-4 space-y-3">
        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="radio"
            name="autoSendEmail"
            checked={autoSendEmail}
            onChange={() => handleChange(true)}
            className="mt-1 h-4 w-4 border-border"
          />
          <span>
            <strong>Enviar automaticamente</strong>
            <span className="mt-0.5 block text-xs text-muted">
              Assim que o mockup for publicado, o e-mail já sai pro cliente.
            </span>
          </span>
        </label>

        <label className="flex items-start gap-3 text-sm text-foreground">
          <input
            type="radio"
            name="autoSendEmail"
            checked={!autoSendEmail}
            onChange={() => handleChange(false)}
            className="mt-1 h-4 w-4 border-border"
          />
          <span>
            <strong>Deixar pronto pra eu revisar</strong>
            <span className="mt-0.5 block text-xs text-muted">
              O lead fica com status &quot;Pronto para enviar&quot; depois que o mockup é
              publicado. Você revisa e dispara o(s) e-mail(s) manualmente em{" "}
              <span className="text-accent">Leads</span>.
            </span>
          </span>
        </label>
      </div>

      {saving && <p className="mt-3 text-xs text-muted">Salvando...</p>}
    </div>
  );
}
