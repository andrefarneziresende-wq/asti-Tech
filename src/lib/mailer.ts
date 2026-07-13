import nodemailer, { type Transporter } from "nodemailer";

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

let cachedTransporter: Transporter | null = null;

function getTransporter(user: string, pass: string): Transporter {
  if (cachedTransporter) return cachedTransporter;

  cachedTransporter = nodemailer.createTransport({
    host: process.env.ZOHO_SMTP_HOST ?? "smtp.zoho.com",
    port: Number(process.env.ZOHO_SMTP_PORT ?? 465),
    secure: true,
    auth: { user, pass },
  });

  return cachedTransporter;
}

/**
 * Envia e-mail via SMTP do Zoho Mail. Requer ZOHO_SMTP_USER (a caixa
 * completa, ex: contato@astitech.com.br) e ZOHO_SMTP_PASS (senha de
 * aplicativo gerada no Zoho — não é a senha normal da conta).
 * Sem essas variáveis, a mensagem apenas fica registrada localmente (ver
 * contact-store / leads-store) — útil em desenvolvimento, mas precisa das
 * credenciais reais antes de ir para produção.
 */
export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const user = process.env.ZOHO_SMTP_USER;
  const pass = process.env.ZOHO_SMTP_PASS;

  if (!user || !pass) {
    return { sent: false, reason: "ZOHO_SMTP_USER / ZOHO_SMTP_PASS não configuradas" };
  }

  const from = process.env.ZOHO_FROM_EMAIL ?? `ASTI Tech <${user}>`;

  try {
    await getTransporter(user, pass).sendMail({
      from,
      to: input.to,
      replyTo: input.replyTo,
      subject: input.subject,
      html: input.html,
    });
    return { sent: true };
  } catch (err) {
    return { sent: false, reason: err instanceof Error ? err.message : String(err) };
  }
}
