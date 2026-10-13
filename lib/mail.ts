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
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  // No cPanel o aplicativo costuma ser impedido de abrir SMTP "para fora";
  // o caminho é o servidor de e-mail da própria máquina (localhost), cujo
  // certificado tem o nome do servidor e não "localhost".
  const local = host === "localhost" || host === "127.0.0.1";
  transport ??= createTransport({
    host,
    port,
    secure: port === 465,
    tls: local ? { rejectUnauthorized: false } : undefined,
    auth: process.env.SMTP_USER
      ? { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS }
      : undefined,
  });
  return transport;
}

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) {
    console.error("E-mail não enviado: a variável SMTP_HOST não está configurada.");
    return false;
  }
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
