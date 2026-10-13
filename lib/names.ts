/**
 * Separa uma lista digitada ("Estoque, Vendas; Fiscal") em nomes.
 * Ignora vazios e repetidos (sem diferenciar maiúsculas) e os que já existem.
 */
export function splitNames(input: string, existing: string[] = []): string[] {
  const seen = new Set(
    existing.map((n) => n.trim().toLocaleLowerCase("pt-BR")),
  );
  const names: string[] = [];
  for (const raw of input.split(/[,;\n]/)) {
    const name = raw.trim().replace(/\s+/g, " ");
    const key = name.toLocaleLowerCase("pt-BR");
    if (!name || seen.has(key)) continue;
    seen.add(key);
    names.push(name);
  }
  return names;
}
