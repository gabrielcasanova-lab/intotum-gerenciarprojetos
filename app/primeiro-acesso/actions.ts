"use server";

import { count, sql } from "drizzle-orm";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { hashPassword } from "@/lib/auth/password";
import { createSession } from "@/lib/auth/session";

export type SetupState = { error?: string } | undefined;

/**
 * Cria o primeiro administrador. Só funciona com o banco sem nenhum usuário,
 * então serve uma única vez, logo depois da publicação.
 */
export async function createFirstAdmin(
  _state: SetupState,
  formData: FormData,
): Promise<SetupState> {
  const parsed = z
    .object({
      name: z.string().trim().min(1, { error: "Informe o nome." }).max(200),
      email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
      password: z
        .string()
        .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
        .max(200),
      confirm: z.string(),
    })
    .refine((d) => d.password === d.confirm, {
      error: "As duas senhas não são iguais.",
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { name, email, password } = parsed.data;
  const passwordHash = await hashPassword(password);
  const created = await db.transaction(async (tx) => {
    // Trava para dois envios ao mesmo tempo não criarem dois administradores.
    await tx.execute(sql`select pg_advisory_xact_lock(4815162342)`);
    const [{ value }] = await tx.select({ value: count() }).from(users);
    if (value > 0) return null;
    const [user] = await tx
      .insert(users)
      .values({ name, email, role: "admin", passwordHash })
      .returning({ id: users.id });
    return user;
  });
  if (!created) redirect("/login");

  await createSession(created.id);
  redirect("/");
}
