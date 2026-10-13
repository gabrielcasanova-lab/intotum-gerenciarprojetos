import "server-only";
import { createTransport, type Transporter } from "nodemailer";

/**
 * Envio de e-mail. Dois jeitos:
 * - MAIL_TRANSPORT=sendmail: entrega ao programa de e-mail do próprio servidor
 *   (/usr/sbin/sendmail), como o PHP faz. É o que funciona no cPanel, que
 *   bloqueia o aplicativo de abrir conexões SMTP, até para localhost.
 * - SMTP_HOST (+ SMTP_PORT, SMTP_USER, SMTP_PASS): SMTP comum.
 * Sem nenhum dos dois (ex.: no computador de desenvolvimento) nada é enviado e
 * quem chamou mostra o link na tela para ser copiado.
 */
const useSendmail = () => process.env.MAIL_TRANSPORT === "sendmail";

export function mailConfigured() {
  return useSendmail() || Boolean(process.env.SMTP_HOST);
}

let transport: Transporter | undefined;

function getTransport() {
  if (useSendmail()) {
    transport ??= createTransport({
      sendmail: true,
      newline: "unix",
      path: process.env.SENDMAIL_PATH ?? "/usr/sbin/sendmail",
    });
    return transport;
  }
  const host = process.env.SMTP_HOST;
  const port = Number(process.env.SMTP_PORT ?? 465);
  // O servidor de e-mail local tem certificado com o nome da máquina, não "localhost".
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

/**
 * Remetente. MAIL_FROM pode vir só com o nome ("Intotum Projetos"); nesse caso
 * o endereço é o SMTP_USER.
 */
export function mailFrom(
  mailFromEnv = process.env.MAIL_FROM,
  user = process.env.SMTP_USER,
) {
  const value = mailFromEnv?.trim();
  if (!value) return user;
  if (value.includes("@") || !user) return value;
  return `"${value.replace(/"/g, "")}" <${user}>`;
}

export async function sendMail(to: string, subject: string, text: string) {
  if (!mailConfigured()) {
    console.error(
      "E-mail não enviado: configure MAIL_TRANSPORT=sendmail ou SMTP_HOST.",
    );
    return false;
  }
  try {
    await getTransport().sendMail({ from: mailFrom(), to, subject, text });
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
