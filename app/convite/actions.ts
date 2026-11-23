"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import { sessions, users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";
import { consumeLink, findUserByLink } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit";
import { dictionary, type Dictionary } from "@/lib/i18n";
import { rememberLanguage } from "@/lib/language";

export type PasswordState = { error?: string } | undefined;

const newPasswordSchema = (t: Dictionary["auth"]) =>
  z
    .object({
      password: z.string().min(8, { error: t.passwordMin }).max(200),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, { error: t.passwordMismatch });

/** Cria a senha a partir do link do convite ou da redefinição e já entra. */
export async function setPasswordFromLink(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const link = await findUserByLink(String(formData.get("token") ?? ""));
  const t = dictionary(link?.language ?? "pt").auth;
  const parsed = newPasswordSchema(t).safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  if (!link || !(await consumeLink(link.tokenId))) {
    return { error: t.linkExpired };
  }

  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.password),
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, link.userId));
  // Senha nova derruba as sessões antigas (ex.: alguém que sabia a senha anterior).
  await db.delete(sessions).where(eq(sessions.userId, link.userId));
  await logAudit(link.userId, "usuario", link.userId, "alterar", {
    senha: link.purpose === "convite" ? "criada pelo convite" : "redefinida pelo link",
  });

  await createSession(link.userId);
  await rememberLanguage(link.language);
  redirect("/");
}
