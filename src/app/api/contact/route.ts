import { NextRequest, NextResponse } from "next/server";
import { sendEmail } from "@/lib/mailer";
import { appendContactMessage } from "@/lib/contact-store";
import { escapeHtml } from "@/lib/html";
import { CONTACT_EMAIL } from "@/lib/contact";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: NextRequest) {
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "JSON inválido." }, { status: 400 });
  }

  const { name, email, phone, business, message } = body as Record<string, unknown>;

  if (typeof name !== "string" || !name.trim()) {
    return NextResponse.json({ error: "Informe seu nome." }, { status: 400 });
  }
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return NextResponse.json({ error: "Informe um e-mail válido." }, { status: 400 });
  }
  if (typeof message !== "string" || !message.trim()) {
    return NextResponse.json({ error: "Escreva uma mensagem." }, { status: 400 });
  }

  const entry = {
    name: name.trim(),
    email: email.trim(),
    phone: typeof phone === "string" ? phone.trim() : undefined,
    business: typeof business === "string" ? business.trim() : undefined,
    message: message.trim(),
    createdAt: new Date().toISOString(),
  };

  await appendContactMessage(entry);

  const result = await sendEmail({
    to: CONTACT_EMAIL,
    replyTo: entry.email,
    subject: `Novo contato pelo site — ${entry.name}`,
    html: `
      <p><strong>Nome:</strong> ${escapeHtml(entry.name)}</p>
      <p><strong>E-mail:</strong> ${escapeHtml(entry.email)}</p>
      <p><strong>WhatsApp:</strong> ${escapeHtml(entry.phone || "-")}</p>
      <p><strong>Negócio:</strong> ${escapeHtml(entry.business || "-")}</p>
      <p><strong>Mensagem:</strong><br/>${escapeHtml(entry.message).replace(/\n/g, "<br/>")}</p>
    `,
  });

  return NextResponse.json({ ok: true, emailSent: result.sent });
}
