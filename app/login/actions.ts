"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { nextLockState, verifyPassword } from "@/lib/auth/password";
import { createSession, destroySession } from "@/lib/auth/session";
import { dictionary } from "@/lib/i18n";
import { cookieLanguage, rememberLanguage } from "@/lib/language";

export type LoginState = { error?: string } | undefined;

export async function login(
  _state: LoginState,
  formData: FormData,
): Promise<LoginState> {
  const t = dictionary(await cookieLanguage()).auth;
  const LoginSchema = z.object({
    email: z.email({ error: t.invalidEmail }).trim().toLowerCase(),
    password: z.string().min(1, { error: t.passwordRequired }),
  });
  // Mesma mensagem para e-mail inexistente e senha errada, para não revelar
  // quais e-mails têm cadastro.
  const INVALID = t.invalidLogin;

  const parsed = LoginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { error: parsed.error.issues[0].message };
  }
  const { email, password } = parsed.data;

  const [user] = await db
    .select()
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  if (!user || !user.active || !user.passwordHash) {
    return { error: INVALID };
  }

  const now = new Date();
  if (user.lockedUntil && user.lockedUntil > now) {
    return {
      error: t.locked,
    };
  }

  const ok = await verifyPassword(password, user.passwordHash);
  await db
    .update(users)
    .set(nextLockState(user.failedLoginAttempts, ok, now))
    .where(eq(users.id, user.id));

  if (!ok) return { error: INVALID };

  await createSession(user.id);
  // A tela de login abre no idioma desta pessoa da próxima vez.
  await rememberLanguage(user.language);
  redirect("/");
}

export async function logout() {
  await destroySession();
  redirect("/login");
}
