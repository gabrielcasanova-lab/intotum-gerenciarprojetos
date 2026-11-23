"use server";

import { and, eq } from "drizzle-orm";
import * as z from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { sendUserLink } from "@/lib/auth/tokens";
import { mailConfigured } from "@/lib/mail";
import { dictionary } from "@/lib/i18n";
import { cookieLanguage } from "@/lib/language";

export type ForgotState = { error?: string; done?: boolean } | undefined;

export async function requestPasswordReset(
  _state: ForgotState,
  formData: FormData,
): Promise<ForgotState> {
  const t = dictionary(await cookieLanguage()).auth;
  if (!mailConfigured()) {
    return { error: t.mailOff };
  }
  const parsed = z
    .email({ error: t.invalidEmail })
    .trim()
    .toLowerCase()
    .safeParse(formData.get("email"));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      language: users.language,
    })
    .from(users)
    .where(and(eq(users.email, parsed.data), eq(users.active, true)));
  if (user) await sendUserLink(user, "redefinir");
  // Mesma resposta com ou sem cadastro, para não revelar quais e-mails existem.
  return { done: true };
}
