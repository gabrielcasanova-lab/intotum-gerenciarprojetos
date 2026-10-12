"use server";

import { and, eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { redirect } from "next/navigation";
import * as z from "zod";
import { db } from "@/lib/db";
import { accessGrants, sessions, users } from "@/lib/db/schema";
import { requireAdmin } from "@/lib/auth/dal";
import { hashPassword } from "@/lib/auth/password";
import { sendUserLink } from "@/lib/auth/tokens";
import { logAudit } from "@/lib/audit";

const id = z.guid();
const password = z
  .string()
  .min(8, { error: "A senha precisa ter pelo menos 8 caracteres." })
  .max(200);

export type FormState =
  | { error?: string; ok?: boolean; link?: string; sent?: boolean }
  | undefined;

export async function createUser(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({
      name: z.string().trim().min(1, { error: "Informe o nome." }).max(200),
      email: z.email({ error: "Informe um e-mail válido." }).trim().toLowerCase(),
      role: z.enum(["admin", "equipe", "cliente"]),
      // Em branco: a pessoa recebe um convite por e-mail e cria a própria senha.
      password: z.union([password, z.literal("")]),
    })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { password: plain, ...data } = parsed.data;
  const [user] = await db
    .insert(users)
    .values({ ...data, passwordHash: plain ? await hashPassword(plain) : null })
    .onConflictDoNothing({ target: users.email })
    .returning({ id: users.id });
  if (!user) return { error: "Já existe um usuário com esse e-mail." };

  await logAudit(admin.id, "usuario", user.id, "criar", data);
  let query = "";
  if (!plain) {
    const { sent } = await sendUserLink({ id: user.id, ...data }, "convite");
    query = sent ? "?convite=enviado" : "?convite=pendente";
  }
  redirect(`/admin/usuarios/${user.id}${query}`);
}

export async function setUserActive(formData: FormData) {
  const admin = await requireAdmin();
  const { userId, active } = z
    .object({ userId: id, active: z.enum(["true", "false"]) })
    .parse(Object.fromEntries(formData));
  if (userId === admin.id) throw new Error("Você não pode desativar a si mesmo.");

  await db
    .update(users)
    .set({ active: active === "true" })
    .where(eq(users.id, userId));
  // Desativar derruba as sessões abertas na hora.
  if (active === "false") await db.delete(sessions).where(eq(sessions.userId, userId));
  await logAudit(admin.id, "usuario", userId, "alterar", { active });
  refresh();
}

export async function resetPassword(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const parsed = z
    .object({ userId: id, password })
    .safeParse(Object.fromEntries(formData));
  if (!parsed.success) return { error: parsed.error.issues[0].message };

  const { userId } = parsed.data;
  await db
    .update(users)
    .set({
      passwordHash: await hashPassword(parsed.data.password),
      failedLoginAttempts: 0,
      lockedUntil: null,
    })
    .where(eq(users.id, userId));
  await db.delete(sessions).where(eq(sessions.userId, userId));
  await logAudit(admin.id, "usuario", userId, "alterar", { senha: "redefinida" });
  return { ok: true };
}

/** scope vem como "p:<projectId>" ou "pc:<projectClientId>". */
export async function addGrant(formData: FormData) {
  const admin = await requireAdmin();
  const data = z
    .object({
      userId: id,
      scope: z.string().regex(/^(p|pc):[0-9a-f-]{36}$/),
      level: z.enum(["visualizar", "editar"]),
    })
    .parse(Object.fromEntries(formData));

  const [kind, scopeId] = data.scope.split(":");
  const [user] = await db
    .select({ role: users.role })
    .from(users)
    .where(eq(users.id, data.userId));
  if (!user) throw new Error("Usuário não encontrado.");
  if (user.role === "cliente" && kind !== "pc") {
    throw new Error("Usuário de cliente só pode ser vinculado a um cliente.");
  }

  const [grant] = await db
    .insert(accessGrants)
    .values({
      userId: data.userId,
      projectId: kind === "p" ? scopeId : null,
      projectClientId: kind === "pc" ? scopeId : null,
      // Cliente nunca edita (a regra também é aplicada na leitura).
      level: user.role === "cliente" ? "visualizar" : data.level,
    })
    .returning();
  await logAudit(admin.id, "vinculo", grant.id, "criar", data);
  refresh();
}

export async function removeGrant(formData: FormData) {
  const admin = await requireAdmin();
  const { userId, grantId } = z
    .object({ userId: id, grantId: id })
    .parse(Object.fromEntries(formData));
  await db
    .delete(accessGrants)
    .where(and(eq(accessGrants.id, grantId), eq(accessGrants.userId, userId)));
  await logAudit(admin.id, "vinculo", grantId, "excluir");
  refresh();
}

/** Gera um link novo (convite ou redefinição) e tenta mandar por e-mail. */
export async function sendLink(
  _state: FormState,
  formData: FormData,
): Promise<FormState> {
  const admin = await requireAdmin();
  const userId = id.parse(formData.get("userId"));
  const [user] = await db
    .select({
      id: users.id,
      name: users.name,
      email: users.email,
      passwordHash: users.passwordHash,
    })
    .from(users)
    .where(eq(users.id, userId));
  if (!user) return { error: "Usuário não encontrado." };

  const purpose = user.passwordHash ? "redefinir" : "convite";
  const { link, sent } = await sendUserLink(user, purpose);
  await logAudit(admin.id, "usuario", userId, "alterar", { link: purpose, enviado: sent });
  // O link só aparece na tela quando o e-mail não saiu, para o admin repassar.
  return sent ? { ok: true, sent } : { ok: true, sent, link };
}
