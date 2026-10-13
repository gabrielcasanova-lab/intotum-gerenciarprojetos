"use server";

import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendUserLink } from "@/lib/auth/tokens";
import { mailConfigured } from "@/lib/mail";

export type ForgotState = { error?: string; done?: boolean } | undefined;

export async function requestPasswordReset(
  _state: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  if (!mailConfigured()) {
    return { error: "O envio de e-mail não está ativo. Fale com o administrador." };
  }
  const parsed = z
    .email({ error: "Informe um e-mail válido." })
    .trim()
    .toLowerCase()
    .safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email })
    .from(users)
    .where(and(eq(users.email, parsed.data), eq(users.active, true)));
  if (user) await sendUserLink(user, "redefinir");
  // Mesma resposta com ou sem cadastro, para não revelar quais e-mails existem.
  return { done: true };
}
