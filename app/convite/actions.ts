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

export type PasswordState = { error?: string } | undefined;

const NewPasswordSchema = z
  .object({
    password: z
      .string()
      .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
      .max(200),
    confirm: z.string(),
  })
  .refine((d) => d.password === d.confirm, {
    error: "As duas senhas não são iguais.",
  });

/** Cria a senha a partir do link do convite ou da redefinição e já entra. */
export async function setPasswordFromLink(
  _state: PasswordState,
  formData: FormData,
): Promise<PasswordState> {
  const parsed = NewPasswordSchema.safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const link = await findUserByLink(String(formData.get("token") ?? ""));
  if (!link || !(await consumeLink(link.tokenId))) {
    return { error: "Este link expirou ou já foi usado. Peça um novo." };
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
  redirect("/");
}
