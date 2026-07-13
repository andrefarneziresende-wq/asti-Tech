interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  replyTo?: string;
}

interface SendEmailResult {
  sent: boolean;
  reason?: string;
}

/**
 * Envia e-mail via API REST da Resend (https://resend.com). Requer RESEND_API_KEY.
 * Sem a chave configurada, a mensagem apenas fica registrada localmente (ver contact-store / leads-store)
 * — útil em desenvolvimento, mas precisa de uma chave real antes de ir para produção.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.RESEND_FROM_EMAIL ?? "ASTI Tech <onboarding@resend.dev>";

  if (!apiKey) {
    return { sent: false, reason: "RESEND_API_KEY não configurada" };
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      reply_to: input.replyTo,
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    return { sent: false, reason: `Resend respondeu ${res.status}: ${body}` };
  }

  return { sent: true };
}
