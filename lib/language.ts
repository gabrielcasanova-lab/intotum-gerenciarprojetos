import "server-only";
import { cookies } from "next/headers";
import { dictionary, isLanguage, LANGUAGE_COOKIE, type Language } from "@/lib/i18n";
import { readSessionUser } from "@/lib/auth/session";

/** Idioma escolhido no navegador (telas de login e senha), ou português. */
export async function cookieLanguage(): Promise<Language> {
  const value = (await cookies()).get(LANGUAGE_COOKIE)?.value;
  return isLanguage(value) ? value : "pt";
}

/** Grava o idioma no navegador, para o login já abrir nele da próxima vez. */
export async function rememberLanguage(language: Language) {
  (await cookies()).set(LANGUAGE_COOKIE, language, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 365 * 24 * 60 * 60,
  });
}

/** Idioma de quem está usando: o do usuário logado ou o do navegador. */
export async function currentLanguage(): Promise<Language> {
  const user = await readSessionUser();
  return user?.language ?? (await cookieLanguage());
}

export async function currentDictionary() {
  return dictionary(await currentLanguage());
}
