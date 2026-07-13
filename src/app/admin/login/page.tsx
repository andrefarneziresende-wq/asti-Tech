"use client";

import { Suspense, useState, type FormEvent } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Logo } from "@/components/site/Logo";
import { isBlank, isValidEmail } from "@/lib/validation";
import { FieldError } from "@/components/FieldError";

function LoginForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fieldErrors, setFieldErrors] = useState<{ email?: string; password?: string }>({});
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event: FormEvent) {
    event.preventDefault();

    const errors: { email?: string; password?: string } = {};
    if (isBlank(email)) errors.email = "Informe seu e-mail.";
    else if (!isValidEmail(email)) errors.email = "Informe um e-mail válido.";
    if (isBlank(password)) errors.password = "Informe sua senha.";

    setFieldErrors(errors);
    if (Object.keys(errors).length > 0) return;

    setLoading(true);
    setError("");

    const res = await fetch("/api/admin/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    setLoading(false);

    if (!res.ok) {
      const body = await res.json().catch(() => null);
      setError(body?.error ?? "E-mail ou senha inválidos.");
      return;
    }

    router.push(searchParams.get("next") || "/admin");
    router.refresh();
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <form onSubmit={handleSubmit} noValidate className="glow-card w-full max-w-sm rounded-2xl p-8">
        <Logo className="mx-auto h-9 w-auto" />
        <h1 className="mt-6 text-center text-lg font-semibold text-foreground">Painel administrativo</h1>
        <p className="mt-1 text-center text-sm text-muted">Acesso restrito à equipe ASTI Tech</p>

        <div className="mt-6">
          <label htmlFor="email" className="text-xs font-medium text-muted">E-mail</label>
          <input
            id="email"
            autoFocus
            value={email}
            onChange={(e) => {
              setEmail(e.target.value);
              setFieldErrors((prev) => ({ ...prev, email: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <FieldError message={fieldErrors.email} />
        </div>

        <div className="mt-4">
          <label htmlFor="password" className="text-xs font-medium text-muted">Senha</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(e) => {
              setPassword(e.target.value);
              setFieldErrors((prev) => ({ ...prev, password: undefined }));
            }}
            className="mt-1 w-full rounded-lg border border-border bg-background px-4 py-2.5 text-sm outline-none focus:border-primary"
          />
          <FieldError message={fieldErrors.password} />
        </div>

        {error && <p className="mt-3 text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading}
          className="mt-6 w-full rounded-full bg-gradient-to-r from-primary to-primary-2 px-7 py-2.5 text-sm font-semibold text-white shadow-lg shadow-primary/30 transition-transform hover:scale-105 disabled:opacity-60"
        >
          {loading ? "Entrando..." : "Entrar"}
        </button>
      </form>
    </div>
  );
}

export default function AdminLoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}
