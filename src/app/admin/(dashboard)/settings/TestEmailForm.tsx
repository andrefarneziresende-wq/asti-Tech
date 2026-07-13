"use client";

import { useState, type FormEvent } from "react";
import { isBlank, isValidEmail } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

export function TestEmailForm({ initialTestEmailAddress }: { initialTestEmailAddress: string | null }) {
  const [enabled, setEnabled] = useState(Boolean(initialTestEmailAddress));
  const [email, setEmail] = useState(initialTestEmailAddress ?? "");
  const [emailError, setEmailError] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();
    setSaved(false);

    if (enabled) {
      if (isBlank(email)) {
        setEmailError("Informe o e-mail que vai receber os testes.");
        return;
      }
      if (!isValidEmail(email)) {
        setEmailError("Informe um e-mail válido.");
        return;
      }
    }
    setEmailError("");

    setSaving(true);

    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ testEmailAddress: enabled ? email : null }),
    });

    setSaving(false);
    setSaved(true);
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="glow-card space-y-4 rounded-2xl p-6">
      <div>
        <h2 className="text-sm font-semibold text-foreground">Modo de teste de e-mail</h2>
        <p className="mt-1 text-xs text-muted">
          Quando ativado, todo e-mail que o robô mandaria pro cliente vai para o endereço abaixo
          em vez do e-mail real do lead — útil para testar o fluxo sem mandar nada para um negócio
          de verdade.
        </p>
      </div>

      <label className="flex items-center gap-3 text-sm text-foreground">
        <input
          type="checkbox"
          checked={enabled}
          onChange={(e) => {
            setEnabled(e.target.checked);
            setEmailError("");
          }}
          className="h-4 w-4 rounded border-border"
        />
        Ativar modo de teste
      </label>

      {enabled && (
        <div>
          <label htmlFor="testEmail" className="text-xs font-medium text-muted">
            E-mail para receber os testes
          </label>
          <input
            id="testEmail"
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setEmailError("");
            }}
            placeholder="voce@astitech.com.br"
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <FieldError message={emailError} />
        </div>
      )}

      <button
        type="submit"
        disabled={saving}
        className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
      >
        {saving ? "Salvando..." : "Salvar"}
      </button>
      {saved && <p className="text-sm text-emerald-400">Configuração salva.</p>}
    </form>
  );
}
