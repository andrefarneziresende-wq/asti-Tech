"use client";

import { useState, type FormEvent } from "react";
import { CONTACT_EMAIL, WHATSAPP_LINK } from "@/lib/contact";
import { isBlank, isValidEmail } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

type Status = "idle" | "sending" | "sent" | "error";

interface FormValues {
  name: string;
  email: string;
  phone: string;
  business: string;
  message: string;
}

const INITIAL_VALUES: FormValues = { name: "", email: "", phone: "", business: "", message: "" };

function validate(values: FormValues): Partial<Record<keyof FormValues, string>> {
  const errors: Partial<Record<keyof FormValues, string>> = {};
  if (isBlank(values.name)) errors.name = "Informe seu nome.";
  if (isBlank(values.email)) errors.email = "Informe seu e-mail.";
  else if (!isValidEmail(values.email)) errors.email = "Informe um e-mail válido.";
  if (isBlank(values.message)) errors.message = "Escreva uma mensagem.";
  return errors;
}

export function Contact() {
  const [values, setValues] = useState<FormValues>(INITIAL_VALUES);
  const [errors, setErrors] = useState<Partial<Record<keyof FormValues, string>>>({});
  const [status, setStatus] = useState<Status>("idle");
  const [errorMessage, setErrorMessage] = useState("");

  function updateField(field: keyof FormValues, value: string) {
    setValues((prev) => ({ ...prev, [field]: value }));
    setErrors((prev) => ({ ...prev, [field]: undefined }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    const fieldErrors = validate(values);
    setErrors(fieldErrors);
    if (Object.keys(fieldErrors).length > 0) return;

    setStatus("sending");
    setErrorMessage("");

    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(values),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => null);
        throw new Error(body?.error ?? "Não foi possível enviar sua mensagem.");
      }

      setStatus("sent");
      setValues(INITIAL_VALUES);
    } catch (err) {
      setStatus("error");
      setErrorMessage(err instanceof Error ? err.message : "Erro inesperado. Tente novamente.");
    }
  }

  return (
    <section id="contato" className="mx-auto max-w-6xl px-6 py-24">
      <div className="grid gap-12 md:grid-cols-2">
        <div>
          <h2 className="text-3xl font-bold md:text-4xl">Vamos criar o site do seu negócio?</h2>
          <p className="mt-4 text-muted">
            Conte um pouco sobre a sua empresa e retornamos com uma proposta personalizada.
          </p>

          <div className="mt-8 space-y-4 text-sm">
            <a href={`mailto:${CONTACT_EMAIL}`} className="flex items-center gap-3 text-muted hover:text-foreground">
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-accent">✉</span>
              {CONTACT_EMAIL}
            </a>
            <a
              href={WHATSAPP_LINK}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-3 text-muted hover:text-foreground"
            >
              <span className="flex h-9 w-9 items-center justify-center rounded-full border border-border text-accent">📱</span>
              (11) 91000-9745
            </a>
          </div>
        </div>

        <form onSubmit={handleSubmit} noValidate className="glow-card space-y-4 rounded-2xl p-6">
          <div>
            <label htmlFor="name" className="text-xs font-medium text-muted">Nome</label>
            <input
              id="name"
              value={values.name}
              onChange={(e) => updateField("name", e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Seu nome"
            />
            <FieldError message={errors.name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="email" className="text-xs font-medium text-muted">E-mail</label>
              <input
                id="email"
                value={values.email}
                onChange={(e) => updateField("email", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="voce@empresa.com"
              />
              <FieldError message={errors.email} />
            </div>
            <div>
              <label htmlFor="phone" className="text-xs font-medium text-muted">WhatsApp</label>
              <input
                id="phone"
                value={values.phone}
                onChange={(e) => updateField("phone", e.target.value)}
                className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
                placeholder="(11) 90000-0000"
              />
            </div>
          </div>

          <div>
            <label htmlFor="business" className="text-xs font-medium text-muted">Nome do negócio</label>
            <input
              id="business"
              value={values.business}
              onChange={(e) => updateField("business", e.target.value)}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Nome da sua empresa"
            />
          </div>

          <div>
            <label htmlFor="message" className="text-xs font-medium text-muted">Mensagem</label>
            <textarea
              id="message"
              value={values.message}
              onChange={(e) => updateField("message", e.target.value)}
              rows={4}
              className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
              placeholder="Conte um pouco sobre o que você precisa"
            />
            <FieldError message={errors.message} />
          </div>

          <button
            type="submit"
            disabled={status === "sending"}
            className="w-full rounded-full bg-gradient-to-r from-primary to-primary-2 px-7 py-3 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60 disabled:hover:scale-100"
          >
            {status === "sending" ? "Enviando..." : "Enviar mensagem"}
          </button>

          {status === "sent" && (
            <p className="text-sm text-emerald-400">Mensagem enviada! Retornaremos em breve.</p>
          )}
          {status === "error" && (
            <p className="text-sm text-red-400">{errorMessage}</p>
          )}
        </form>
      </div>
    </section>
  );
}
