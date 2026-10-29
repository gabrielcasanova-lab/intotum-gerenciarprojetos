/**
 * Prepara a cópia de uma lista com pai e filhos (atividades e subatividades):
 * cada item ganha um id novo e o pai passa a apontar para o id novo do pai.
 * Devolve primeiro os itens sem pai, para poderem ser gravados antes dos filhos.
 */
export function copyTree<T extends { id: string; parentId: string | null }>(
  items: T[],
  newId: () => string,
) {
  const ids = new Map(items.map((i) => [i.id, newId()]));
  const rows = items.map((item) => ({
    item,
    id: ids.get(item.id)!,
    // Pai que não está na lista (não deveria acontecer) vira atividade principal.
    parentId: item.parentId ? (ids.get(item.parentId) ?? null) : null,
  }));
  return {
    parents: rows.filter((r) => r.parentId === null),
    children: rows.filter((r) => r.parentId !== null),
  };
}
