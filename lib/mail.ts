import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Envio de e-mail pelo SMTP do cPanel. Sem SMTP_HOST configurado (ex.: no
 * computador de desenvolvimento) nada é enviado e quem chamou mostra o link
 * na tela para ser copiado.
 */
export function mailConfigured() {
  return Boolean(process.env.SMTP_HOST);
}

let transport: Transporter | undefined;

function getTransport() {
  const port = Number(process.env.SMTP_PORT ?? 465);
  transport ??= createTransport({
    host: process.env.SMTP_HOST,
    port,
    secure: port === 465,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transport;
}

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) return false;
  try {
    await getTransport().sendMail({
      from: process.env.MAIL_FROM ?? process.env.SMTP_USER,
      to,
      subject,
      text,
    });
    return true;
  } catch (error) {
    console.error("Falha ao enviar e-mail:", error);
    return false;
  }
}

/** Endereço público do sistema, usado nos links dos e-mails. */
export function appUrl() {
  return (process.env.APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
}
