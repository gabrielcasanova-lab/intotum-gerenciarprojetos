import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { connection } from "next/server";
import { and, eq, gt, isNull } from "drizzle-orm";
import { db } from "@/lib/db";
import { userTokens, users } from "@/lib/db/schema";
import { appUrl, sendMail } from "@/lib/mail";
import { dictionary, type Language } from "@/lib/i18n";

export type TokenPurpose = "convite" | "redefinir";

// Convite fica válido uma semana; redefinição, só duas horas.
const VALID_HOURS: Record<TokenPurpose, number> = { convite: 24 * 7, redefinir: 2 };

const hashToken = (token: string) =>
  createHash("sha256").update(token).digest("hex");

/** Cria um link novo e invalida os anteriores ainda não usados do usuário. */
export async function createUserLink(userId: string, purpose: TokenPurpose) {
  const token = randomBytes(32).toString("base64url");
  const now = new Date();
  await db.transaction(async (tx) => {
    await tx
      .update(userTokens)
      .set({ usedAt: now })
      .where(and(eq(userTokens.userId, userId), isNull(userTokens.usedAt)));
    await tx.insert(userTokens).values({
      id: hashToken(token),
      userId,
      purpose,
      expiresAt: new Date(now.getTime() + VALID_HOURS[purpose] * 3600_000),
    });
  });
  return `${appUrl()}/convite/${token}`;
}

/** Usuário dono de um link ainda válido, ou null. */
export async function findUserByLink(token: string) {
  await connection(); // compara com a hora atual: só na hora do pedido
  const [row] = await db
    .select({
      tokenId: userTokens.id,
      purpose: userTokens.purpose,
      userId: users.id,
      name: users.name,
      email: users.email,
      language: users.language,
    })
    .from(userTokens)
    .innerJoin(users, eq(users.id, userTokens.userId))
    .where(
      and(
        eq(userTokens.id, hashToken(token)),
        isNull(userTokens.usedAt),
        gt(userTokens.expiresAt, new Date()),
        eq(users.active, true),
      ),
    );
  return row ?? null;
}

/** Marca o link como usado; false se outra aba já o usou. */
export async function consumeLink(tokenId: string) {
  const used = await db
    .update(userTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(userTokens.id, tokenId), isNull(userTokens.usedAt)))
    .returning({ id: userTokens.id });
  return used.length === 1;
}

/** Gera o link e manda por e-mail, no idioma do usuário. Devolve o link e se o e-mail saiu. */
export async function sendUserLink(
  user: { id: string; name: string; email: string; language: Language },
  purpose: TokenPurpose,
) {
  const link = await createUserLink(user.id, purpose);
  const t = dictionary(user.language).mail;
  const text =
    purpose === "convite"
      ? t.invite(user.name, link, `${appUrl()}/login`, user.email)
      : t.reset(user.name, link);
  const sent = await sendMail(
    user.email,
    purpose === "convite" ? t.inviteSubject : t.resetSubject,
    text,
  );
  return { link, sent };
}
