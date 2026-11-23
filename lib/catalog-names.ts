import type { Language } from "./i18n";

export type NamedItem = { id: string; name: string; nameEs: string | null };

/** Nome de um item do catálogo no idioma do cliente (sem nome em espanhol, o de sempre). */
export function catalogName(item: { name: string; nameEs: string | null }, language: Language) {
  return language === "es" && item.nameEs ? item.nameEs : item.name;
}

/** Chave para comparar nomes: sem acentos, espaços nem maiúsculas. */
export function nameKey(value: string) {
  return value
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/\s+/g, "")
    .toLowerCase();
}

/**
 * Lê a lista "Português = Español" (uma por linha; # comenta). Devolve o
 * nome exato e a chave de comparação de cada linha.
 */
export function parseNameList(text: string) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line && !line.startsWith("#"))
    .flatMap((line) => {
      const m = line.match(/^(.+?)\s*(?:=|→|\t)\s*(.+)$/);
      if (!m) return [];
      return [{ pt: m[1].trim(), es: m[2].trim(), key: nameKey(m[1]) }];
    });
}

/**
 * Nome em espanhol para um item do catálogo: primeiro a linha com o nome
 * exatamente igual (CADASTRO x Cadastro), depois a que bate ignorando
 * acentos, espaços e maiúsculas.
 */
export function findSpanishName(
  name: string,
  list: { pt: string; es: string; key: string }[],
) {
  return (
    list.find((l) => l.pt === name.trim())?.es ??
    list.find((l) => l.key === nameKey(name))?.es ??
    null
  );
}
