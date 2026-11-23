import type { Language } from "./i18n";

export type NamedItem = { id: string; name: string; nameEs: string | null };

/** Nome de um item do catálogo no idioma do cliente (sem nome em espanhol, o de sempre). */
export function catalogName(item: { name: string; nameEs: string | null }, language: Language) {
  return language === "es" && item.nameEs ? item.nameEs : item.name;
}
