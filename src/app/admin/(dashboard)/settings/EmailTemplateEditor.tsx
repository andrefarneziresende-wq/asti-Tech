"use client";

import { useMemo, useRef, useState } from "react";
import {
  DEFAULT_EMAIL_BODY_HTML,
  DEFAULT_EMAIL_SUBJECT,
  EMAIL_PLACEHOLDERS,
  renderEmailTemplate,
} from "@/lib/email-template";
import { isBlank } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

const SAMPLE_DATA = {
  businessName: "Oficina Mecânica Silva",
  segment: "Serviços locais",
  mockupUrl: "https://astitech.com.br/oficina-mecanica-silva-abc123",
  estimatedMonthlyCost: 129,
  siteIdeas: [
    "Página de agendamento online de revisões",
    "Galeria de fotos antes/depois dos reparos",
    "Seção de depoimentos de clientes",
  ],
};

export function EmailTemplateEditor({
  initialSubject,
  initialBodyHtml,
}: {
  initialSubject: string;
  initialBodyHtml: string;
}) {
  const [subject, setSubject] = useState(initialSubject);
  const [bodyHtml, setBodyHtml] = useState(initialBodyHtml);
  const [errors, setErrors] = useState<{ subject?: string; bodyHtml?: string }>({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const preview = useMemo(
    () => renderEmailTemplate({ subject, bodyHtml }, SAMPLE_DATA),
    [subject, bodyHtml]
  );

  function insertPlaceholder(token: string) {
    const textarea = textareaRef.current;
    if (!textarea) return;
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const next = bodyHtml.slice(0, start) + token + bodyHtml.slice(end);
    setBodyHtml(next);
    requestAnimationFrame(() => {
      textarea.focus();
      textarea.selectionStart = textarea.selectionEnd = start + token.length;
    });
  }

  async function handleSave() {
    setSaved(false);

    const nextErrors: { subject?: string; bodyHtml?: string } = {};
    if (isBlank(subject)) nextErrors.subject = "Informe o assunto do e-mail.";
    if (isBlank(bodyHtml)) nextErrors.bodyHtml = "O corpo do e-mail não pode ficar vazio.";
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length > 0) return;

    setSaving(true);

    await fetch("/api/admin/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emailSubject: subject, emailBodyHtml: bodyHtml }),
    });

    setSaving(false);
    setSaved(true);
  }

  function handleReset() {
    setSubject(DEFAULT_EMAIL_SUBJECT);
    setBodyHtml(DEFAULT_EMAIL_BODY_HTML);
  }

  return (
    <div className="glow-card rounded-2xl p-6">
      <h2 className="text-sm font-semibold text-foreground">E-mail para o cliente</h2>
      <p className="mt-1 text-xs text-muted">
        Esse é o e-mail que o robô manda para o lead com o link do mockup, as ideias e o custo
        estimado. Clique nos campos abaixo para inserir os dados dinâmicos no texto.
      </p>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div>
          <label htmlFor="subject" className="text-xs font-medium text-muted">
            Assunto
          </label>
          <input
            id="subject"
            value={subject}
            onChange={(e) => {
              setSubject(e.target.value);
              setErrors((prev) => ({ ...prev, subject: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <FieldError message={errors.subject} />

          <div className="mt-4 flex flex-wrap gap-2">
            {EMAIL_PLACEHOLDERS.map((placeholder) => (
              <button
                key={placeholder.token}
                type="button"
                onClick={() => insertPlaceholder(placeholder.token)}
                className="rounded-full border border-border px-3 py-1 text-xs text-muted transition-colors hover:border-primary hover:text-accent"
              >
                + {placeholder.label}
              </button>
            ))}
          </div>

          <label htmlFor="bodyHtml" className="mt-4 block text-xs font-medium text-muted">
            Corpo (HTML)
          </label>
          <textarea
            ref={textareaRef}
            id="bodyHtml"
            value={bodyHtml}
            onChange={(e) => {
              setBodyHtml(e.target.value);
              setErrors((prev) => ({ ...prev, bodyHtml: undefined }));
            }}
            rows={16}
            spellCheck={false}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-3 font-mono text-xs leading-relaxed outline-none focus:border-primary"
          />
          <FieldError message={errors.bodyHtml} />

          <div className="mt-4 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={handleSave}
              disabled={saving}
              className="rounded-full bg-gradient-to-r from-primary to-primary-2 px-6 py-2.5 text-sm font-semibold text-white disabled:opacity-60"
            >
              {saving ? "Salvando..." : "Salvar e-mail"}
            </button>
            <button
              type="button"
              onClick={handleReset}
              className="rounded-full border border-border px-6 py-2.5 text-sm text-muted transition-colors hover:border-primary hover:text-foreground"
            >
              Restaurar padrão
            </button>
            {saved && <span className="text-sm text-emerald-400">Salvo.</span>}
          </div>
        </div>

        <div>
          <span className="text-xs font-medium text-muted">Pré-visualização (com dados de exemplo)</span>
          <div className="mt-1 overflow-hidden rounded-lg border border-border bg-white">
            <div className="border-b border-border bg-slate-50 px-4 py-2 text-xs text-slate-600">
              <strong className="text-slate-900">Assunto:</strong> {preview.subject}
            </div>
            <iframe
              title="Pré-visualização do e-mail"
              srcDoc={preview.html}
              sandbox=""
              className="h-[520px] w-full"
            />
          </div>
        </div>
      </div>
    </div>
  );
}
