"use server";

import { eq } from "drizzle-orm";
import { refresh } from "next/cache";
import { db } from "@/lib/db";
import { users } from "@/lib/db/schema";
import { readSessionUser } from "@/lib/auth/session";
import { isLanguage } from "@/lib/i18n";
import { rememberLanguage } from "@/lib/language";

/** Troca o idioma: do usuário logado (fica salvo no cadastro) e do navegador. */
export async function changeLanguage(formData: FormData) {
  const language = formData.get("language");
  if (!isLanguage(language)) return;
  await rememberLanguage(language);
  const user = await readSessionUser();
  if (user) await db.update(users).set({ language }).where(eq(users.id, user.id));
  refresh();
}
